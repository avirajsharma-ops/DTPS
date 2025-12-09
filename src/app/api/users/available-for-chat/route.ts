import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import Message from '@/lib/db/models/Message';
import { UserRole } from '@/types';

// GET /api/users/available-for-chat - Get users available for starting conversations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get users that the current user can chat with
    let query: any = {
      _id: { $ne: session.user.id }, // Exclude current user
      $or: []
    };

    // Define who can chat with whom
    if (session.user.role === UserRole.CLIENT) {
      // Clients can chat with:
      // 1. Their assigned dietitians (from assignedDietitians array)
      // 2. Any dietitian if they don't have one assigned
      const currentUser = await User.findById(session.user.id).select('assignedDietitian assignedDietitians');
      
      if (currentUser?.assignedDietitians && currentUser.assignedDietitians.length > 0) {
        // Chat with all assigned dietitians
        query.$or.push({ _id: { $in: currentUser.assignedDietitians } });
      } else if (currentUser?.assignedDietitian) {
        // Chat with assigned dietitian (backwards compatibility)
        query.$or.push({ _id: currentUser.assignedDietitian });
      } else {
        // Chat with any dietitian
        query.$or.push({ role: UserRole.DIETITIAN });
      }
    } else if (session.user.role === UserRole.DIETITIAN || session.user.role === UserRole.HEALTH_COUNSELOR) {
      // Dietitians and Health Counselors can chat with:
      // 1. Their assigned clients (from both assignedDietitian and assignedDietitians)
      // 2. Any unassigned clients
      // 3. Other dietitians and health counselors (for collaboration)
      query.$or.push(
        { assignedDietitian: session.user.id }, // Assigned clients (primary)
        { assignedDietitians: session.user.id }, // Assigned clients (from array)
        { role: UserRole.CLIENT, assignedDietitian: { $exists: false } }, // Unassigned clients
        { role: UserRole.CLIENT, assignedDietitian: null }, // Clients with null assignment
        { role: { $in: [UserRole.DIETITIAN, UserRole.HEALTH_COUNSELOR] } } // Other dietitians and health counselors
      );
    } else if (session.user.role === UserRole.ADMIN) {
      // Admins can chat with everyone
      query = { _id: { $ne: session.user.id } };
    }

    // Add search filter
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex }
        ]
      });
    }

    // Get users
    const users = await User.find(query)
      .select('firstName lastName email avatar role assignedDietitian')
      .sort({ firstName: 1, lastName: 1 })
      .limit(limit);

    // Get existing conversations to mark users we already have conversations with
    const existingConversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: session.user.id },
            { receiver: session.user.id }
          ]
        }
      },
      {
        $addFields: {
          conversationWith: {
            $cond: {
              if: { $eq: ['$sender', session.user.id] },
              then: '$receiver',
              else: '$sender'
            }
          }
        }
      },
      {
        $group: {
          _id: '$conversationWith'
        }
      }
    ]);

    const existingConversationIds = existingConversations.map(conv => conv._id.toString());

    // Mark users with existing conversations
    const usersWithConversationStatus = users.map(user => ({
      ...user.toJSON(),
      hasExistingConversation: existingConversationIds.includes(user._id.toString())
    }));

    return NextResponse.json({
      users: usersWithConversationStatus,
      total: usersWithConversationStatus.length
    });

  } catch (error) {
    console.error('Error fetching available users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available users' },
      { status: 500 }
    );
  }
}
