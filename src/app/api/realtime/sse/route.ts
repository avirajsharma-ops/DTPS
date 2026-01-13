import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { SSEManager } from '@/lib/realtime/sse-manager';
import { onlineStatusManager } from '@/lib/realtime/online-status';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version || '1.0.0';

// Rate limiting: track connection attempts per user (increased limits)
const connectionAttempts = new Map<string, number[]>();
const MAX_CONNECTIONS_PER_USER = 10; // Increased from 3
const MAX_ATTEMPTS_PER_MINUTE = 100; // Increased from 10
const ATTEMPT_WINDOW_MS = 60000;

function canConnect(userId: string): { allowed: boolean; reason?: string; retryAfter?: number } {
  const now = Date.now();
  const attempts = connectionAttempts.get(userId) || [];
  
  // Clean old attempts
  const recentAttempts = attempts.filter(t => now - t < ATTEMPT_WINDOW_MS);
  connectionAttempts.set(userId, recentAttempts);
  
  // Check rate limit
  if (recentAttempts.length >= MAX_ATTEMPTS_PER_MINUTE) {
    const oldestAttempt = Math.min(...recentAttempts);
    const retryAfter = Math.ceil((oldestAttempt + ATTEMPT_WINDOW_MS - now) / 1000);
    return { 
      allowed: false, 
      reason: `Too many connection attempts. Please try again in ${retryAfter} seconds.`,
      retryAfter
    };
  }
  
  // Check connection count
  const sseManager = SSEManager.getInstance();
  const userConns = sseManager.getUserConnections(userId);
  if (userConns && userConns.size >= MAX_CONNECTIONS_PER_USER) {
    return { allowed: false, reason: 'Maximum active connections reached. Please close other tabs and try again.', retryAfter: 5 };
  }
  
  return { allowed: true };
}

function recordAttempt(userId: string): void {
  const attempts = connectionAttempts.get(userId) || [];
  attempts.push(Date.now());
  connectionAttempts.set(userId, attempts);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'X-App-Version': APP_VERSION,
        },
      });
    }

    const userId = session.user.id;
    
    // Check rate limiting
    const { allowed, reason, retryAfter } = canConnect(userId);
    if (!allowed) {
      return new Response(JSON.stringify({ 
        error: reason, 
        retry: true, 
        retryAfter: retryAfter || 60,
        code: 'RATE_LIMIT_EXCEEDED'
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter || 60),
          'X-App-Version': APP_VERSION,
        },
      });
    }
    
    recordAttempt(userId);
    const connectionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get SSE manager instance
    const sseManager = SSEManager.getInstance();

    // Create SSE stream
    let cleanupFn: (() => void) | null = null;
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        // Create a writer for this connection
        let closed = false;
        const writer = {
          write: (chunk: Uint8Array) => {
            if (closed) return;
            try {
              controller.enqueue(chunk);
            } catch (error) {
              // Mark closed and rethrow so manager can clean up silently
              closed = true;
              throw error;
            }
          },
          close: () => {
            if (closed) return;
            closed = true;
            try { controller.close(); } catch {}
          }
        } as unknown as WritableStreamDefaultWriter;

        // Set browser auto-retry to 5s to avoid rapid reconnection loops
        controller.enqueue(encoder.encode(`retry: 5000\n\n`));

        // Send initial connection message
        const welcomeMessage = `event: connected\ndata: ${JSON.stringify({
          status: 'connected',
          userId,
          connectionId,
          timestamp: Date.now()
        })}\n\n`;
        controller.enqueue(encoder.encode(welcomeMessage));

        // Store connection in SSE manager
        sseManager.addConnection(userId, connectionId, writer);

        // Send initial online snapshot to this client
        const snapshotMessage = `event: online_snapshot\ndata: ${JSON.stringify({
          onlineUsers: onlineStatusManager.getOnlineUsers(),
          timestamp: Date.now()
        })}\n\n`;
        controller.enqueue(encoder.encode(snapshotMessage));

        // Notify others this user came online
        sseManager.sendToUsers(
          sseManager.getOnlineUsers().filter(id => id !== userId),
          'user_online',
          { userId, timestamp: Date.now() }
        );

        // Handle connection cleanup
        const cleanup = () => {
          sseManager.removeConnection(userId, connectionId);
          sseManager.sendToUsers(
            sseManager.getOnlineUsers(),
            'user_offline',
            { userId, timestamp: Date.now() }
          );
        };

        // Set up periodic heartbeat
        const heartbeat = setInterval(() => {
          try {
            // Keep presence fresh
            onlineStatusManager.updateLastSeen(userId);

            const heartbeatMessage = `event: heartbeat\ndata: ${JSON.stringify({
              timestamp: Date.now()
            })}\n\n`;
            controller.enqueue(encoder.encode(heartbeatMessage));
          } catch (error) {
            clearInterval(heartbeat);
            cleanup();
            try {
              controller.close();
            } catch (closeError) {
              // Controller already closed, ignore
            }
          }
        }, 30000); // Send heartbeat every 30 seconds

        // Store cleanup function for later use
        cleanupFn = () => {
          clearInterval(heartbeat);
          cleanup();
        };
      },
      
      cancel() {
        // Cleanup when connection is closed
        cleanupFn?.();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable NGINX buffering
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-App-Version': APP_VERSION,
      },
    });

  } catch (error) {
    console.error('SSE connection error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', retry: true }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '5',
        'X-App-Version': APP_VERSION,
      },
    });
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'X-App-Version': APP_VERSION,
    },
  });
}
