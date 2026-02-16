import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import MessageGroup from '@/lib/db/models/MessageGroup';
import GroupMessage from '@/lib/db/models/GroupMessage';
import User from '@/lib/db/models/User';
import mongoose from 'mongoose';
import { z } from 'zod';

const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
  description: z.string().max(500).optional(),
  memberIds: z.array(z.string().min(1)).min(1, 'At least one member is required')
});

// GET /api/messages/groups - List groups the user belongs to
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const userId = new mongoose.Types.ObjectId(session.user.id);

    const groups = await MessageGroup.aggregate([
      {
        $match: {
          'members.user': userId,
          isActive: true
        }
      },
      {
        $lookup: {
          from: 'groupmessages',
          let: { groupId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$group', '$$groupId'] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            {
              $lookup: {
                from: 'users',
                localField: 'sender',
                foreignField: '_id',
                as: 'senderInfo',
                pipeline: [{ $project: { firstName: 1, lastName: 1, avatar: 1 } }]
              }
            },
            { $unwind: { path: '$senderInfo', preserveNullAndEmptyArrays: true } }
          ],
          as: 'lastMessages'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'members.user',
          foreignField: '_id',
          as: 'memberDetails',
          pipeline: [{ $project: { firstName: 1, lastName: 1, avatar: 1, role: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creatorDetails',
          pipeline: [{ $project: { firstName: 1, lastName: 1, avatar: 1 } }]
        }
      },
      {
        $addFields: {
          lastMessage: { $arrayElemAt: ['$lastMessages', 0] },
          creator: { $arrayElemAt: ['$creatorDetails', 0] },
          memberCount: { $size: '$members' },
          // Calculate unread count for current user
          unreadCount: {
            $let: {
              vars: {
                currentMember: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$members',
                        cond: { $eq: ['$$this.user', userId] }
                      }
                    },
                    0
                  ]
                }
              },
              in: {
                $cond: {
                  if: { $and: [{ $gt: [{ $size: '$lastMessages' }, 0] }, '$$currentMember.lastReadAt'] },
                  then: 0, // Simplified; real count done in separate query
                  else: 0
                }
              }
            }
          }
        }
      },
      {
        $project: {
          name: 1,
          description: 1,
          avatar: 1,
          createdBy: 1,
          creator: 1,
          members: 1,
          memberDetails: 1,
          memberCount: 1,
          lastMessage: 1,
          lastMessageAt: 1,
          createdAt: 1,
          updatedAt: 1
        }
      },
      { $sort: { lastMessageAt: -1, createdAt: -1 } }
    ]);

    // Calculate actual unread counts per group
    for (const group of groups) {
      const member = group.members.find((m: any) => m.user.toString() === session.user.id);
      const lastReadAt = member?.lastReadAt;
      
      if (lastReadAt) {
        group.unreadCount = await GroupMessage.countDocuments({
          group: group._id,
          createdAt: { $gt: lastReadAt },
          sender: { $ne: userId }
        });
      } else {
        // Never read - count all messages not sent by user
        group.unreadCount = await GroupMessage.countDocuments({
          group: group._id,
          sender: { $ne: userId }
        });
      }
    }

    return NextResponse.json({ groups });

  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

// POST /api/messages/groups - Create a new group
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only staff can create groups
    const allowedRoles = ['admin', 'dietitian', 'health_counselor'];
    if (!allowedRoles.includes(session.user.role?.toLowerCase())) {
      return NextResponse.json({ error: 'Only staff can create groups' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createGroupSchema.parse(body);

    await connectDB();

    // Verify all members exist
    const members = await User.find({ _id: { $in: validatedData.memberIds } })
      .select('_id')
      .lean();

    const validMemberIds = members.map((m: any) => m._id.toString());

    // Build members array - creator is admin, others are members
    const memberEntries = [
      { user: session.user.id, role: 'admin', joinedAt: new Date() },
      ...validMemberIds
        .filter(id => id !== session.user.id)
        .map(id => ({ user: id, role: 'member' as const, joinedAt: new Date() }))
    ];

    const group = new MessageGroup({
      name: validatedData.name,
      description: validatedData.description,
      createdBy: session.user.id,
      members: memberEntries,
      isActive: true
    });

    await group.save();

    // Populate for response
    const populatedGroup = await MessageGroup.findById(group._id)
      .populate('members.user', 'firstName lastName avatar role')
      .populate('createdBy', 'firstName lastName avatar')
      .lean();

    // Notify all members via SSE
    const { SSEManager } = await import('@/lib/realtime/sse-manager');
    const sseManager = SSEManager.getInstance();

    validMemberIds.forEach(memberId => {
      sseManager.sendToUser(memberId, 'group_created', {
        group: populatedGroup,
        timestamp: Date.now()
      });
    });

    return NextResponse.json({ group: populatedGroup }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating group:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
