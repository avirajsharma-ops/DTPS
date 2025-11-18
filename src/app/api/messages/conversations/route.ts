import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Message from '@/lib/db/models/Message';
import User from '@/lib/db/models/User';
import mongoose from 'mongoose';

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
    const conversations = await Message.aggregate([
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
    ]);



    // Populate user details for conversation partners
    const conversationList = await Promise.all(
      conversations.map(async (conv) => {
        const user = await User.findById(conv._id).select('firstName lastName avatar role');
        if (!user) {
          return null;
        }

        // For clients, only show conversations with their assigned dietitian
        if (session.user.role === 'client') {
          const currentUser = await User.findById(session.user.id).select('assignedDietitian');
          if (currentUser?.assignedDietitian &&
              user._id.toString() !== currentUser.assignedDietitian.toString()) {
            return null; // Skip conversations with non-assigned dietitians
          }
        }

        // For dietitians, only show conversations with their assigned clients
        if (session.user.role === 'dietitian' || session.user.role === 'health_counselor') {
          if (user.role === 'client') {
            const clientUser = await User.findById(user._id).select('assignedDietitian');
            if (clientUser?.assignedDietitian?.toString() !== session.user.id) {
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
