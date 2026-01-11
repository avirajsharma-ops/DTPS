import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { SSEManager } from '@/lib/realtime/sse-manager';
import { onlineStatusManager } from '@/lib/realtime/online-status';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;
    const connectionId = `${userId}-${Date.now()}-${Math.random()}`;

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
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error('SSE connection error:', error);
    return new Response('Internal Server Error', { status: 500 });
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
    },
  });
}
