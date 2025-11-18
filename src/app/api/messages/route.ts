import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Message from '@/lib/db/models/Message';
import { UserRole } from '@/types';
import { SSEManager } from '@/lib/realtime/sse-manager';
import { createMessageWebhook } from '@/lib/webhooks/webhook-manager';
import { z } from 'zod';

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

    // Populate the created message
    await message.populate('sender', 'firstName lastName avatar');
    await message.populate('receiver', 'firstName lastName avatar');

    // Send real-time notification to recipient
    const sseManager = SSEManager.getInstance();
    sseManager.sendToUser(validatedData.recipientId, 'new_message', {
      message: message.toJSON(),
      timestamp: Date.now()
    });

    // Trigger webhook for message sent
    await createMessageWebhook(message.toJSON(), 'sent');

    return NextResponse.json(message, { status: 201 });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
