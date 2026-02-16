import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import MessageGroup from '@/lib/db/models/MessageGroup';
import GroupMessage from '@/lib/db/models/GroupMessage';
import { SSEManager } from '@/lib/realtime/sse-manager';
import { sendNewMessageNotification } from '@/lib/notifications/notificationService';
import { z } from 'zod';
import mongoose from 'mongoose';

const groupMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(2000, 'Message too long'),
  type: z.enum(['text', 'image', 'video', 'audio', 'voice', 'file', 'emoji', 'sticker', 'location', 'contact']).default('text'),
  attachments: z.array(z.object({
    url: z.string().min(1),
    filename: z.string().min(1),
    size: z.number().min(1),
    mimeType: z.string().min(1),
    thumbnail: z.string().optional(),
    duration: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional()
  })).optional(),
  replyTo: z.string().optional()
});

// GET /api/messages/groups/[groupId]/messages - Get group messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    await connectDB();

    // Verify user is a member
    const group = await MessageGroup.findOne({
      _id: groupId,
      'members.user': session.user.id,
      isActive: true
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found or you are not a member' }, { status: 404 });
    }

    const messages = await GroupMessage.find({ group: groupId })
      .populate('sender', 'firstName lastName avatar')
      .sort({ createdAt: 1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const total = await GroupMessage.countDocuments({ group: groupId });

    // Mark messages as read: update the member's lastReadAt
    await MessageGroup.updateOne(
      { _id: groupId, 'members.user': new mongoose.Types.ObjectId(session.user.id) },
      { $set: { 'members.$.lastReadAt': new Date() } }
    );

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching group messages:', error);
    return NextResponse.json({ error: 'Failed to fetch group messages' }, { status: 500 });
  }
}

// POST /api/messages/groups/[groupId]/messages - Send message to group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId } = await params;
    const body = await request.json();
    const validatedData = groupMessageSchema.parse(body);

    await connectDB();

    // Verify user is a member
    const group = await MessageGroup.findOne({
      _id: groupId,
      'members.user': session.user.id,
      isActive: true
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found or you are not a member' }, { status: 404 });
    }

    // Create the message
    const message = new GroupMessage({
      group: groupId,
      sender: session.user.id,
      content: validatedData.content,
      type: validatedData.type,
      attachments: validatedData.attachments,
      replyTo: validatedData.replyTo,
      readBy: [{ user: session.user.id, readAt: new Date() }]
    });

    await message.save();

    // Update group's lastMessage and lastMessageAt
    group.lastMessage = message._id;
    group.lastMessageAt = new Date();
    
    // Update sender's lastReadAt
    const memberIndex = group.members.findIndex(
      (m: any) => m.user.toString() === session.user.id
    );
    if (memberIndex !== -1) {
      group.members[memberIndex].lastReadAt = new Date();
    }
    
    await group.save();

    // Populate the message for response
    const populatedMessage = await GroupMessage.findById(message._id)
      .populate('sender', 'firstName lastName avatar')
      .lean();

    // Send real-time notifications to all group members
    const sseManager = SSEManager.getInstance();
    const messagePayload = {
      message: populatedMessage,
      groupId,
      groupName: group.name,
      timestamp: Date.now()
    };

    // Get sender name for push notifications
    const senderInfo = (populatedMessage as any)?.sender;
    const senderName = senderInfo ? `${senderInfo.firstName} ${senderInfo.lastName}` : 'Someone';

    for (const member of group.members) {
      const memberId = member.user.toString();

      // Send SSE event to all members (including sender for multi-device sync)
      sseManager.sendToUser(memberId, 'new_group_message', messagePayload);

      // Send push notification to all members except sender
      if (memberId !== session.user.id) {
        try {
          await sendNewMessageNotification(
            memberId,
            `${senderName} in ${group.name}`,
            validatedData.content,
            message._id.toString()
          );
        } catch (notifErr) {
          // Don't fail if notification fails
        }
      }
    }

    return NextResponse.json({ message: populatedMessage }, { status: 201 });

  } catch (error: any) {
    console.error('Error sending group message:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to send group message' }, { status: 500 });
  }
}
