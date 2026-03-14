import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import ActivityLog from '@/lib/db/models/ActivityLog';

// SSE endpoint – streams new ActivityLog entries in real time to admin
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const role = (session.user as any).role?.toLowerCase?.() ?? '';
    if (role !== 'admin') {
        return new Response('Forbidden', { status: 403 });
    }

    // Track the latest _id we've already sent so we only push new docs
    let latestId: string | null = null;
    let closed = false;

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            const enqueue = (msg: string) => {
                if (closed) return;
                try {
                    controller.enqueue(encoder.encode(msg));
                } catch {
                    closed = true;
                }
            };

            // Auto-retry 3 s on disconnect
            enqueue('retry: 3000\n\n');
            enqueue(
                `event: connected\ndata: ${JSON.stringify({ status: 'connected', ts: Date.now() })}\n\n`
            );

            // Connect once
            await connectDB();

            // Fetch last 100 logs and send as initial batch
            try {
                const initial = await ActivityLog.find()
                    .sort({ createdAt: -1 })
                    .limit(100)
                    .lean();

                if (initial.length > 0) {
                    latestId = String(initial[0]._id);
                }

                enqueue(
                    `event: initial\ndata: ${JSON.stringify(initial)}\n\n`
                );
            } catch (err) {
                console.error('[smart-people-sse] initial fetch error', err);
            }

            // Poll DB every 5 s for new entries (efficient – indexed query on _id)
            const pollInterval = setInterval(async () => {
                if (closed) {
                    clearInterval(pollInterval);
                    return;
                }
                try {
                    const query: any = {};
                    if (latestId) {
                        query._id = { $gt: latestId };
                    }
                    const fresh = await ActivityLog.find(query)
                        .sort({ createdAt: -1 })
                        .limit(50)
                        .lean();

                    if (fresh.length > 0) {
                        latestId = String(fresh[0]._id);
                        enqueue(
                            `event: new_logs\ndata: ${JSON.stringify(fresh)}\n\n`
                        );
                    }
                } catch (err) {
                    console.error('[smart-people-sse] poll error', err);
                }
            }, 5000);

            // Heartbeat every 25 s to keep connection alive
            const heartbeat = setInterval(() => {
                if (closed) {
                    clearInterval(heartbeat);
                    return;
                }
                enqueue(`: heartbeat ${Date.now()}\n\n`);
            }, 25000);

            // Cleanup on client disconnect
            request.signal.addEventListener('abort', () => {
                closed = true;
                clearInterval(pollInterval);
                clearInterval(heartbeat);
                try {
                    controller.close();
                } catch {
                    // already closed
                }
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
