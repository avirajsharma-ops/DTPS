import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Message from '@/lib/db/models/Message';
import User from '@/lib/db/models/User';
import mongoose from 'mongoose';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

// GET /api/messages/conversations - Get conversation list
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Convert session user ID to ObjectId for proper matching
    const userId = new mongoose.Types.ObjectId(session.user.id);

    // Get all unique conversation partners
    const conversations = await withCache(
      `messages:conversations:${JSON.stringify([
      {
        $match: {
          $or: [
            { sender: userId },
            { receiver: userId }
          ]
        }
      },
      {
        $addFields: {
          conversationWith: {
            $cond: {
              if: { $eq: ['$sender', userId] },
              then: '$receiver',
              else: '$sender'
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversationWith',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', userId] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ])}`,
      async () => await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { receiver: userId }
          ]
        }
      },
      {
        $addFields: {
          conversationWith: {
            $cond: {
              if: { $eq: ['$sender', userId] },
              then: '$receiver',
              else: '$sender'
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversationWith',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', userId] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]),
      { ttl: 30000, tags: ['messages'] }
    );



    // Populate user details for conversation partners
    const conversationList = await Promise.all(
      conversations.map(async (conv) => {
        const user = await withCache(
      `messages:conversations:${JSON.stringify(conv._id).select('firstName lastName avatar role')}`,
      async () => await User.findById(conv._id).select('firstName lastName avatar role').lean(),
      { ttl: 30000, tags: ['messages'] }
    );
        if (!user) {
          return null;
        }

        // For clients, only show conversations with their assigned dietitians
        if (session.user.role === 'client') {
          const currentUser = await withCache(
      `messages:conversations:${JSON.stringify(session.user.id).select('assignedDietitian assignedDietitians')}`,
      async () => await User.findById(session.user.id).select('assignedDietitian assignedDietitians').lean(),
      { ttl: 30000, tags: ['messages'] }
    );
          const assignedIds = [
            ...(currentUser?.assignedDietitian ? [currentUser.assignedDietitian.toString()] : []),
            ...(currentUser?.assignedDietitians?.map((d: any) => d.toString()) || [])
          ];
          if (assignedIds.length > 0 && !assignedIds.includes(user._id.toString())) {
            return null; // Skip conversations with non-assigned dietitians
          }
        }

        // For dietitians, only show conversations with their assigned clients
        if (session.user.role === 'dietitian' || session.user.role === 'health_counselor') {
          if (user.role === 'client') {
            const clientUser = await withCache(
      `messages:conversations:${JSON.stringify(user._id).select('assignedDietitian assignedDietitians assignedHealthCounselor')}`,
      async () => await User.findById(user._id).select('assignedDietitian assignedDietitians assignedHealthCounselor').lean(),
      { ttl: 30000, tags: ['messages'] }
    );
            const isAssignedAsDietitian = 
              clientUser?.assignedDietitian?.toString() === session.user.id ||
              clientUser?.assignedDietitians?.some((d: any) => d.toString() === session.user.id);
            const isAssignedAsHealthCounselor = clientUser?.assignedHealthCounselor?.toString() === session.user.id;
            
            if (!isAssignedAsDietitian && !isAssignedAsHealthCounselor) {
              return null; // Skip conversations with non-assigned clients
            }
          }
        }

        return {
          user: {
            ...user.toObject(),
            _id: user._id.toString()
          },
          lastMessage: conv.lastMessage,
          unreadCount: conv.unreadCount
        };
      })
    );

    // Filter out null entries (users not found or not assigned)
    const validConversations = conversationList.filter(conv => conv !== null);

    return NextResponse.json({ conversations: validConversations });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
