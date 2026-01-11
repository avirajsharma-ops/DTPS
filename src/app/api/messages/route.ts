import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Message from '@/lib/db/models/Message';
import User from '@/lib/db/models/User';
import { UserRole } from '@/types';
import { SSEManager } from '@/lib/realtime/sse-manager';
import { createMessageWebhook } from '@/lib/webhooks/webhook-manager';
import { z } from 'zod';
import { logHistoryServer } from '@/lib/server/history';
import { sendNewMessageNotification } from '@/lib/notifications/notificationService';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

// Message validation schema
const messageSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  content: z.string().min(1, 'Message content is required').max(2000, 'Message too long'),
  type: z.enum(['text', 'image', 'video', 'audio', 'voice', 'file', 'emoji', 'sticker', 'location', 'contact', 'call_missed']).default('text'),
  attachments: z.array(z.object({
    url: z.string().min(1, 'Attachment URL is required'),
    filename: z.string().min(1, 'Filename is required'),
    size: z.number().min(1, 'File size must be positive'),
    mimeType: z.string().min(1, 'MIME type is required'),
    thumbnail: z.string().optional(),
    duration: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional()
  })).optional(),
  replyTo: z.string().optional() // For replying to specific messages
});

// GET /api/messages - Get messages for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const conversationWith = searchParams.get('conversationWith');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    // For health counselors, validate they can message this client
    if (conversationWith && session.user.role === 'health_counselor') {
      const otherUser = await User.findById(conversationWith);
      if (!otherUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Check if this is a client and if they're assigned to this health counselor
      if (otherUser.role === 'client') {
        if (otherUser.assignedHealthCounselor?.toString() !== session.user.id) {
          return NextResponse.json({ error: 'You can only message clients assigned to you' }, { status: 403 });
        }
      }
    }

    let query: any = {};

    if (conversationWith) {
      // Get messages between current user and specific user
      query = {
        $or: [
          { sender: session.user.id, receiver: conversationWith },
          { sender: conversationWith, receiver: session.user.id }
        ]
      };
    } else {
      // Get all messages for current user
      query = {
        $or: [
          { sender: session.user.id },
          { receiver: session.user.id }
        ]
      };
    }

    // NO CACHE for real-time messaging - always fetch fresh data
    const messages = await Message.find(query)
      .populate('sender', 'firstName lastName avatar')
      .populate('receiver', 'firstName lastName avatar')
      .sort({ createdAt: 1 }) // Sort oldest first for proper chat order
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments(query);

    // Mark messages as read if viewing conversation
    if (conversationWith) {
      await Message.updateMany(
        {
          sender: conversationWith,
          receiver: session.user.id,
          isRead: false
        },
        { isRead: true, readAt: new Date() }
      );

      // Broadcast SSE update for staff unread counts
      try {
        const { broadcastStaffUnreadCounts } = await import('@/app/api/staff/unread-counts/stream/route');
        const messageCount = await Message.countDocuments({
          receiver: session.user.id,
          isRead: false
        });
        broadcastStaffUnreadCounts(session.user.id, { messages: messageCount });
      } catch (error) {
        // Silently handle broadcast errors
      }
    }

    return NextResponse.json({
      messages, // No need to reverse - already in correct order (oldest first)
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/messages - Send new message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validatedData = messageSchema.parse(body);

    await connectDB();

    // For health counselors, validate they can message this client
    if (session.user.role === 'health_counselor') {
      const recipientUser = await User.findById(validatedData.recipientId);
      if (!recipientUser) {
        return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
      }

      // Check if this is a client and if they're assigned to this health counselor
      if (recipientUser.role === 'client') {
        if (recipientUser.assignedHealthCounselor?.toString() !== session.user.id) {
          return NextResponse.json({ error: 'You can only message clients assigned to you' }, { status: 403 });
        }
      }
    }

    // Create message
    const message = new Message({
      sender: session.user.id,
      receiver: validatedData.recipientId,
      content: validatedData.content,
      type: validatedData.type,
      attachments: validatedData.attachments,
      replyTo: validatedData.replyTo,
      isRead: false
    });

    await message.save();

    // Clear messages cache for both sender and recipient
    clearCacheByTag(`messages:${session.user.id}`);
    clearCacheByTag(`messages:${validatedData.recipientId}`);
    clearCacheByTag('messages');

    // Populate the created message
    await message.populate('sender', 'firstName lastName avatar');
    await message.populate('receiver', 'firstName lastName avatar');

    // Send real-time notification to BOTH sender and recipient
    const sseManager = SSEManager.getInstance();
    const messagePayload = {
      message: message.toJSON(),
      timestamp: Date.now()
    };
    
    // Send to recipient
    sseManager.sendToUser(validatedData.recipientId, 'new_message', messagePayload);
    
    // Also send to sender (for multi-device sync)
    sseManager.sendToUser(session.user.id, 'new_message', messagePayload);

    // Trigger webhook for message sent
    await createMessageWebhook(message.toJSON(), 'sent');

    // Send push notification to recipient
    const senderName = `${(message.sender as any).firstName} ${(message.sender as any).lastName}`;
    try {
      await sendNewMessageNotification(
        validatedData.recipientId,
        senderName,
        validatedData.content,
        message._id.toString()
      );
    } catch (notifError) {
      console.error('Failed to send push notification:', notifError);
      // Don't fail the message send if notification fails
    }

    // Log history for message sent (for both sender and recipient)
    await logHistoryServer({
      userId: validatedData.recipientId,
      action: 'create',
      category: 'other',
      description: `Message received from ${session.user.role}`,
      performedById: session.user.id,
      metadata: {
        messageId: message._id,
        type: validatedData.type,
        hasAttachments: (validatedData.attachments || []).length > 0
      }
    });

    return NextResponse.json(message, { status: 201 });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
