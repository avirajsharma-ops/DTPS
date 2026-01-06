import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import Message from '@/lib/db/models/Message';
import { Notification } from '@/lib/db/models';

// Store active SSE connections by user ID
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

// Function to broadcast updates to all connections for a user
export function broadcastUnreadCounts(userId: string, counts: { notifications: number; messages: number }) {
  const userConnections = connections.get(userId);
  if (userConnections) {
    console.log(`[SSE Broadcast] Sending to ${userConnections.size} connection(s) for user ${userId}:`, counts);
    const data = `data: ${JSON.stringify(counts)}\n\n`;
    userConnections.forEach((controller) => {
      try {
        controller.enqueue(new TextEncoder().encode(data));
      } catch (error) {
        // Connection might be closed
        console.error('Error sending SSE update:', error);
      }
    });
  } else {
    console.log(`[SSE Broadcast] No active connections for user ${userId}, counts not broadcast:`, counts);
  }
}

// GET /api/client/unread-counts/stream - SSE endpoint for real-time unread counts
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
        
        const [notificationCount, messageCount] = await Promise.all([
          Notification.countDocuments({ userId, read: false }),
          Message.countDocuments({ receiver: userId, isRead: false })
        ]);

        const initialData = `data: ${JSON.stringify({ 
          notifications: notificationCount, 
          messages: messageCount 
        })}\n\n`;
        
        controller.enqueue(new TextEncoder().encode(initialData));
      } catch (error) {
        console.error('Error fetching initial counts:', error);
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
