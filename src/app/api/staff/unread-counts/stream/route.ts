import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import Message from '@/lib/db/models/Message';

// Store active SSE connections by user ID
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

// Function to broadcast updates to all connections for a user
export function broadcastStaffUnreadCounts(userId: string, counts: { messages: number }) {
  const userConnections = connections.get(userId);
  if (userConnections) {
    const data = `data: ${JSON.stringify(counts)}\n\n`;
    userConnections.forEach((controller) => {
      try {
        controller.enqueue(new TextEncoder().encode(data));
      } catch (error) {
        // Connection might be closed - silently ignore
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
      } catch (error) {
        // Silently handle initial count errors
      }

      // Keep connection alive with heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
        } catch (error) {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        const userConnections = connections.get(userId);
        if (userConnections) {
          userConnections.delete(controller);
          if (userConnections.size === 0) {
            connections.delete(userId);
          }
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

// Export the connections map for use in other routes
export { connections };
