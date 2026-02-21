import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

/**
 * Server-Sent Events endpoint for real-time logout notifications
 * Notifies client if their account was deactivated/suspended
 * Usage: Open SSE connection and listen for 'logout' events
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    let isClosed = false;

    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          // Send initial connection message
          controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));

          // Keep connection alive with heartbeat
          const heartbeat = setInterval(() => {
            if (!isClosed) {
              controller.enqueue(encoder.encode(': heartbeat\n\n'));
            } else {
              clearInterval(heartbeat);
              controller.close();
            }
          }, 30000); // Every 30 seconds

          // Listen for abort signal
          request.signal.addEventListener('abort', () => {
            isClosed = true;
            clearInterval(heartbeat);
            controller.close();
          });
        } catch (error) {
          console.error('SSE error:', error);
          controller.close();
        }
      },
    });

    return new NextResponse(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering for streaming
      },
    });
  } catch (error) {
    console.error('Error in logout notification:', error);
    return NextResponse.json(
      { error: 'Failed to establish connection' },
      { status: 500 }
    );
  }
}
