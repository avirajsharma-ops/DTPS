import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import Message from '@/lib/db/models/Message';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Store active SSE connections by user ID
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

function removeConnection(userId: string, controller: ReadableStreamDefaultController) {
  const userConnections = connections.get(userId);
  if (!userConnections) return;

  userConnections.delete(controller);
  if (userConnections.size === 0) {
    connections.delete(userId);
  }
}

// Function to broadcast updates to all connections for a user
export function broadcastStaffUnreadCounts(userId: string, counts: { messages: number }) {
  const userConnections = connections.get(userId);
  if (userConnections) {
    const data = `data: ${JSON.stringify(counts)}\n\n`;
    userConnections.forEach((controller) => {
      try {
        controller.enqueue(new TextEncoder().encode(data));
      } catch {
        // Connection is stale/closed; remove it
        removeConnection(userId, controller);
      }
    });
  }
}

// GET /api/staff/unread-counts/stream - SSE endpoint for real-time unread counts
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;

  // Create readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      let heartbeatInterval: NodeJS.Timeout | null = null;
      const cleanup = () => {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        removeConnection(userId, controller);
      };

      // Add this connection to the map
      if (!connections.has(userId)) {
        connections.set(userId, new Set());
      }
      connections.get(userId)!.add(controller);

      // Send initial counts
      try {
        await connectDB();

        // For staff, only count unread messages (no notifications for now)
        const messageCount = await Message.countDocuments({
          receiver: userId,
          isRead: false
        });

        const initialData = `data: ${JSON.stringify({
          messages: messageCount
        })}\n\n`;

        controller.enqueue(new TextEncoder().encode(initialData));
      } catch {
        // If initial fetch fails, still keep stream alive and let heartbeat continue
      }

      // Keep connection alive with heartbeat every 30 seconds
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
        } catch {
          cleanup();
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        cleanup();
      });
    },
    cancel() {
      // Additional safeguard: cleanup when client cancels stream
      const userConnections = connections.get(userId);
      if (!userConnections) return;
      userConnections.forEach((controller) => removeConnection(userId, controller));
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

// Export the connections map for use in other routes
export { connections };
