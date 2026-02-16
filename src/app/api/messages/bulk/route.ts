import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Message from '@/lib/db/models/Message';
import User from '@/lib/db/models/User';
import { z } from 'zod';
import { SSEManager } from '@/lib/realtime/sse-manager';
import { sendNewMessageNotification } from '@/lib/notifications/notificationService';
import { clearCacheByTag } from '@/lib/api/utils';
import { logHistoryServer } from '@/lib/server/history';

const bulkMessageSchema = z.object({
  recipientIds: z.array(z.string().min(1)).min(1, 'At least one recipient is required').max(100, 'Maximum 100 recipients per bulk message'),
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
  })).optional()
});

// POST /api/messages/bulk - Send the same message to multiple people individually
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only staff roles (admin, dietitian, health_counselor) can send bulk messages
    const allowedRoles = ['admin', 'dietitian', 'health_counselor'];
    if (!allowedRoles.includes(session.user.role?.toLowerCase())) {
      return NextResponse.json({ error: 'Bulk messaging is only available for staff' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = bulkMessageSchema.parse(body);

    await connectDB();

    // Verify all recipients exist
    const recipients = await User.find({ _id: { $in: validatedData.recipientIds } })
      .select('_id firstName lastName avatar role')
      .lean();

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No valid recipients found' }, { status: 400 });
    }

    const validRecipientIds = recipients.map((r: any) => r._id.toString());
    const invalidIds = validatedData.recipientIds.filter(id => !validRecipientIds.includes(id));

    // Create individual messages for each recipient
    const messageDocs = validRecipientIds.map(recipientId => ({
      sender: session.user.id,
      receiver: recipientId,
      content: validatedData.content,
      type: validatedData.type,
      attachments: validatedData.attachments || [],
      isRead: false,
      status: 'sent'
    }));

    const messages = await Message.insertMany(messageDocs);

    // Populate sender info for SSE payloads
    const sender = await User.findById(session.user.id)
      .select('firstName lastName avatar')
      .lean();

    const sseManager = SSEManager.getInstance();
    const senderName = `${(sender as any)?.firstName || ''} ${(sender as any)?.lastName || ''}`.trim();

    // Send real-time notifications and push for each recipient
    const results = {
      sent: 0,
      failed: 0,
      skipped: invalidIds.length
    };

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const recipientId = validRecipientIds[i];

      try {
        // Populate for SSE
        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'firstName lastName avatar')
          .populate('receiver', 'firstName lastName avatar')
          .lean();

        const messagePayload = {
          message: populatedMessage,
          timestamp: Date.now()
        };

        // Send SSE to recipient
        sseManager.sendToUser(recipientId, 'new_message', messagePayload);
        // Send SSE to sender (multi-device sync)
        sseManager.sendToUser(session.user.id, 'new_message', messagePayload);

        // Clear cache
        clearCacheByTag(`messages:${recipientId}`);

        // Send push notification
        try {
          await sendNewMessageNotification(
            recipientId,
            senderName,
            validatedData.content,
            message._id.toString()
          );
        } catch (notifErr) {
          // Don't fail bulk send if notification fails
        }

        // Log history
        await logHistoryServer({
          userId: recipientId,
          action: 'create',
          category: 'other',
          description: `Bulk message received from ${session.user.role}`,
          performedById: session.user.id,
          metadata: {
            messageId: message._id,
            type: validatedData.type,
            isBulkMessage: true
          }
        });

        results.sent++;
      } catch (err) {
        console.error(`Failed to process bulk message for ${recipientId}:`, err);
        results.failed++;
      }
    }

    // Clear sender's cache
    clearCacheByTag(`messages:${session.user.id}`);
    clearCacheByTag('messages');

    return NextResponse.json({
      success: true,
      results: {
        totalRecipients: validatedData.recipientIds.length,
        sent: results.sent,
        failed: results.failed,
        skipped: results.skipped
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error sending bulk message:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send bulk message' },
      { status: 500 }
    );
  }
}
