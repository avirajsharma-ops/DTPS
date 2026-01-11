import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import Message from '@/lib/db/models/Message';
import User from '@/lib/db/models/User';
import mongoose from 'mongoose';

// GET /api/client/messages/conversations - Get list of conversations for client
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const userId = new mongoose.Types.ObjectId(session.user.id);

    // NO CACHE for real-time messaging - always fetch fresh data
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
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', userId] },
              '$receiver',
              '$sender'
            ]
          },
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
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: 1,
          user: {
            _id: '$user._id',
            firstName: '$user.firstName',
            lastName: '$user.lastName',
            avatar: '$user.avatar',
            role: '$user.role'
          },
          lastMessage: {
            content: '$lastMessage.content',
            type: '$lastMessage.type',
            createdAt: '$lastMessage.createdAt',
            isRead: '$lastMessage.isRead'
          },
          unreadCount: 1
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    // If no conversations exist, get assigned dietitian as potential conversation
    if (conversations.length === 0) {
      const client = await User.findById(session.user.id)
        .select('assignedDietitian assignedDietitians')
        .populate('assignedDietitian', 'firstName lastName avatar role')
        .populate('assignedDietitians', 'firstName lastName avatar role');

      const dietitians: any[] = [];
      
      if (client?.assignedDietitian) {
        dietitians.push({
          _id: client.assignedDietitian._id,
          user: {
            _id: client.assignedDietitian._id,
            firstName: client.assignedDietitian.firstName,
            lastName: client.assignedDietitian.lastName,
            avatar: client.assignedDietitian.avatar,
            role: client.assignedDietitian.role
          },
          lastMessage: null,
          unreadCount: 0
        });
      }

      if (client?.assignedDietitians && Array.isArray(client.assignedDietitians)) {
        for (const dietitian of client.assignedDietitians) {
          if (!dietitians.find(d => d._id.toString() === dietitian._id.toString())) {
            dietitians.push({
              _id: dietitian._id,
              user: {
                _id: dietitian._id,
                firstName: dietitian.firstName,
                lastName: dietitian.lastName,
                avatar: dietitian.avatar,
                role: dietitian.role
              },
              lastMessage: null,
              unreadCount: 0
            });
          }
        }
      }

      return NextResponse.json({ conversations: dietitians });
    }

    return NextResponse.json({ conversations });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
