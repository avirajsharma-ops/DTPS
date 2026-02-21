import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import { UserRole } from '@/types';
import { adminSSEManager } from '@/lib/realtime/admin-sse-manager';

// GET /api/admin/clients/sse - SSE endpoint for real-time client updates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Check if user has admin role
    const userRole = session.user.role?.toLowerCase();
    if (!userRole || (!userRole.includes('admin') && userRole !== 'admin')) {
      return new Response('Forbidden - Admin access required', { status: 403 });
    }

    const userId = session.user.id;
    const connectionId = `admin-${userId}-${Date.now()}-${Math.random()}`;

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let closed = false;
        let heartbeatInterval: NodeJS.Timeout;

        const enqueue = (message: string) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(message));
          } catch (error) {
            closed = true;
            throw error;
          }
        };

        // Create a writer for this connection
        const writer = {
          write: (chunk: Uint8Array) => {
            if (closed) return;
            try {
              controller.enqueue(chunk);
            } catch (error) {
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

        // Set browser auto-retry to 5s
        enqueue(`retry: 5000\n\n`);

        // Send initial connection message
        const welcomeMessage = `event: connected\ndata: ${JSON.stringify({
          status: 'connected',
          userId,
          connectionId,
          timestamp: Date.now()
        })}\n\n`;
        enqueue(welcomeMessage);

        // Store connection using the manager
        adminSSEManager.addConnection(connectionId, userId, writer);

        // Send initial clients data
        try {
          await connectDB();
          const clients = await User.find({ role: UserRole.CLIENT })
            .select('-password')
            .populate('assignedDietitian', 'firstName lastName email avatar')
            .populate('assignedDietitians', 'firstName lastName email avatar')
            .populate('assignedHealthCounselor', 'firstName lastName email avatar')
            .populate('assignedHealthCounselors', 'firstName lastName email avatar')
            .populate({
              path: 'createdBy.userId',
              select: 'firstName lastName role',
              strictPopulate: false
            })
            .sort({ createdAt: -1 });

          const total = await User.countDocuments({ role: UserRole.CLIENT });
          const assignedCount = await User.countDocuments({ 
            role: UserRole.CLIENT, 
            $or: [
              { assignedDietitian: { $ne: null } },
              { assignedDietitians: { $exists: true, $not: { $size: 0 } } }
            ]
          });
          const unassignedCount = await User.countDocuments({ 
            role: UserRole.CLIENT, 
            assignedDietitian: null,
            $or: [
              { assignedDietitians: { $exists: false } },
              { assignedDietitians: { $size: 0 } }
            ]
          });

          const initialDataMessage = `event: initial_data\ndata: ${JSON.stringify({
            clients,
            stats: {
              total,
              assigned: assignedCount,
              unassigned: unassignedCount
            },
            timestamp: Date.now()
          })}\n\n`;
          enqueue(initialDataMessage);
        } catch (error) {
          console.error('Error fetching initial clients data:', error);
        }

        // Set up periodic heartbeat
        heartbeatInterval = setInterval(() => {
          try {
            const heartbeatMessage = `event: heartbeat\ndata: ${JSON.stringify({
              timestamp: Date.now()
            })}\n\n`;
            enqueue(heartbeatMessage);
          } catch (error) {
            clearInterval(heartbeatInterval);
            adminSSEManager.removeConnection(connectionId);
            try {
              controller.close();
            } catch {}
          }
        }, 30000);

        // Store cleanup function
        (controller as any).cleanup = () => {
          clearInterval(heartbeatInterval);
          adminSSEManager.removeConnection(connectionId);
        };
      },
      
      cancel() {
        if ((this as any).cleanup) {
          (this as any).cleanup();
        }
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
    console.error('Admin SSE connection error:', error);
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
