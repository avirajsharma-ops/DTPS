import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import Message from '@/lib/db/models/Message';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

/**
 * GET /api/client/messages/unread-count
 * Returns the total count of unread messages for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Count all unread messages where current user is the receiver
    const count = await Message.countDocuments({
      receiver: session.user.id,
      isRead: false
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching unread messages count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unread count' },
      { status: 500 }
    );
  }
}
