import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import MessageGroup from '@/lib/db/models/MessageGroup';
import User from '@/lib/db/models/User';
import { SSEManager } from '@/lib/realtime/sse-manager';
import { z } from 'zod';

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  avatar: z.string().optional()
});

const membersSchema = z.object({
  action: z.enum(['add', 'remove']),
  memberIds: z.array(z.string().min(1)).min(1)
});

// GET /api/messages/groups/[groupId] - Get group details
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
    await connectDB();

    const group = await MessageGroup.findById(groupId)
      .populate('members.user', 'firstName lastName avatar role email')
      .populate('createdBy', 'firstName lastName avatar')
      .lean();

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is a member
    const isMember = (group as any).members.some(
      (m: any) => m.user?._id?.toString() === session.user.id
    );

    if (!isMember) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    return NextResponse.json({ group });

  } catch (error) {
    console.error('Error fetching group:', error);
    return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
  }
}

// PUT /api/messages/groups/[groupId] - Update group or manage members
export async function PUT(
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
    await connectDB();

    const group = await MessageGroup.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is admin of the group
    const memberEntry = group.members.find(
      (m: any) => m.user.toString() === session.user.id
    );

    if (!memberEntry || memberEntry.role !== 'admin') {
      return NextResponse.json({ error: 'Only group admins can update the group' }, { status: 403 });
    }

    // Handle member management
    if (body.action) {
      const validated = membersSchema.parse(body);

      if (validated.action === 'add') {
        // Verify members exist
        const newMembers = await User.find({ _id: { $in: validated.memberIds } })
          .select('_id')
          .lean();

        const existingMemberIds = group.members.map((m: any) => m.user.toString());

        for (const member of newMembers) {
          const memberId = (member as any)._id.toString();
          if (!existingMemberIds.includes(memberId)) {
            group.members.push({
              user: (member as any)._id,
              role: 'member',
              joinedAt: new Date()
            } as any);
          }
        }

        await group.save();

        // Notify new members via SSE
        const sseManager = SSEManager.getInstance();
        const populatedGroup = await MessageGroup.findById(groupId)
          .populate('members.user', 'firstName lastName avatar role')
          .populate('createdBy', 'firstName lastName avatar')
          .lean();

        validated.memberIds.forEach(memberId => {
          sseManager.sendToUser(memberId, 'group_member_added', {
            group: populatedGroup,
            timestamp: Date.now()
          });
        });

      } else if (validated.action === 'remove') {
        // Can't remove the creator
        if (validated.memberIds.includes(group.createdBy.toString())) {
          return NextResponse.json({ error: 'Cannot remove the group creator' }, { status: 400 });
        }

        group.members = group.members.filter(
          (m: any) => !validated.memberIds.includes(m.user.toString())
        ) as any;
        await group.save();

        // Notify removed members
        const sseManager = SSEManager.getInstance();
        validated.memberIds.forEach(memberId => {
          sseManager.sendToUser(memberId, 'group_member_removed', {
            groupId,
            timestamp: Date.now()
          });
        });
      }
    } else {
      // Update group info
      const validated = updateGroupSchema.parse(body);

      if (validated.name) group.name = validated.name;
      if (validated.description !== undefined) group.description = validated.description;
      if (validated.avatar) group.avatar = validated.avatar;

      await group.save();

      // Notify all members
      const sseManager = SSEManager.getInstance();
      group.members.forEach((m: any) => {
        sseManager.sendToUser(m.user.toString(), 'group_updated', {
          groupId,
          name: group.name,
          description: group.description,
          avatar: group.avatar,
          timestamp: Date.now()
        });
      });
    }

    const updatedGroup = await MessageGroup.findById(groupId)
      .populate('members.user', 'firstName lastName avatar role email')
      .populate('createdBy', 'firstName lastName avatar')
      .lean();

    return NextResponse.json({ group: updatedGroup });

  } catch (error: any) {
    console.error('Error updating group:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

// DELETE /api/messages/groups/[groupId] - Delete (deactivate) a group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId } = await params;
    await connectDB();

    const group = await MessageGroup.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Only creator or admin role can delete
    const isCreator = group.createdBy.toString() === session.user.id;
    const isAdmin = session.user.role?.toLowerCase() === 'admin';

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Only the group creator or admin can delete this group' }, { status: 403 });
    }

    // Soft delete
    group.isActive = false;
    await group.save();

    // Notify all members
    const sseManager = SSEManager.getInstance();
    group.members.forEach((m: any) => {
      sseManager.sendToUser(m.user.toString(), 'group_deleted', {
        groupId,
        timestamp: Date.now()
      });
    });

    return NextResponse.json({ success: true, message: 'Group deleted successfully' });

  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
