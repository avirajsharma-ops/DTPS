import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { SSEManager } from '@/lib/realtime/sse-manager';
import { typingManager } from '@/lib/realtime/online-status';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { receiverId, isTyping } = await request.json();
    
    if (!receiverId) {
      return NextResponse.json({ error: 'Receiver ID is required' }, { status: 400 });
    }

    const sseManager = SSEManager.getInstance();
    const eventType = isTyping ? 'typing_start' : 'typing_stop';

    // Update typing manager
    if (isTyping) {
      typingManager.setUserTyping(session.user.id, receiverId);
    } else {
      typingManager.setUserNotTyping(session.user.id);
    }

    // Send typing indicator to the receiver
    sseManager.sendToUser(receiverId, eventType, {
      userId: session.user.id,
      userName: `${session.user.firstName} ${session.user.lastName}`,
      timestamp: Date.now()
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Typing indicator error:', error);
    return NextResponse.json(
      { error: 'Failed to send typing indicator' },
      { status: 500 }
    );
  }
}
