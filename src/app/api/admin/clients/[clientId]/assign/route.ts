import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import UnifiedPayment from '@/lib/db/models/UnifiedPayment';
import { UserRole } from '@/types';
import { logActivity } from '@/lib/utils/activityLogger';
import { adminSSEManager } from '@/lib/realtime/admin-sse-manager';
import { clearCacheByTag } from '@/lib/api/utils';

// PATCH /api/admin/clients/[clientId]/assign - Assign/Add dietitian to client
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role (case-insensitive and flexible)
    const userRole = session.user.role?.toLowerCase();
    
    if (!userRole || (!userRole.includes('admin') && userRole !== 'admin')) {
      return NextResponse.json({ 
        error: 'Forbidden - Admin access required', 
        userRole: session.user.role 
      }, { status: 403 });
    }

    const body = await request.json();
    const { dietitianId, healthCounselorId, healthCounselorIds, action, mode, dietitianIds } = body;
    // Support both 'action' and 'mode' for backwards compatibility
    const assignAction = action || mode || 'replace';
    // action/mode: 'replace' (default) - replace primary dietitian
    // action/mode: 'add' - add to assignedDietitians array
    // action/mode: 'remove' - remove from assignedDietitians array
    // action/mode: 'transfer' - transfer client to new primary dietitian (keeping history)

    await connectDB();

    // Validate client exists and is a client
    const client = await User.findById(clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    if (client.role !== UserRole.CLIENT) {
      return NextResponse.json({ error: 'User is not a client' }, { status: 400 });
    }

    // Build update object for MongoDB
    const updateObj: any = {};

    // Handle multiple health counselors assignment
    if (healthCounselorIds && Array.isArray(healthCounselorIds)) {
      // Validate all health counselors
      for (const hcId of healthCounselorIds) {
        if (hcId && hcId.trim() !== '') {
          const hc = await User.findById(hcId);
          if (!hc) {
            return NextResponse.json({ error: `Health counselor ${hcId} not found` }, { status: 404 });
          }
          if (hc.role !== UserRole.HEALTH_COUNSELOR) {
            return NextResponse.json({ error: `User ${hcId} is not a health counselor` }, { status: 400 });
          }
        }
      }
      // Set primary and array
      if (healthCounselorIds.length > 0) {
        updateObj.assignedHealthCounselor = healthCounselorIds[0];
        updateObj.assignedHealthCounselors = healthCounselorIds;
      }
    } else if (healthCounselorId !== undefined) {
      // Handle single health counselor assignment (legacy)
      if (healthCounselorId && healthCounselorId.trim() !== '') {
        const healthCounselor = await User.findById(healthCounselorId);
        if (!healthCounselor) {
          return NextResponse.json({ error: 'Health counselor not found' }, { status: 404 });
        }
        if (healthCounselor.role !== UserRole.HEALTH_COUNSELOR) {
          return NextResponse.json({ error: 'User is not a health counselor' }, { status: 400 });
        }
        updateObj.assignedHealthCounselor = healthCounselorId;
        updateObj.assignedHealthCounselors = [healthCounselorId];
      } else {
        // Unassign health counselor if empty string or null
        updateObj.assignedHealthCounselor = null;
        updateObj.assignedHealthCounselors = [];
      }
    }

    // Handle different actions for dietitians
    if (assignAction === 'add' && dietitianIds && Array.isArray(dietitianIds)) {
      // Validate and add multiple dietitians
      const validDietitianIds = [];
      for (const dId of dietitianIds) {
        const dietitian = await User.findById(dId);
        if (dietitian && dietitian.role === UserRole.DIETITIAN) {
          validDietitianIds.push(dId);
        }
      }
      if (validDietitianIds.length > 0) {
        if (!updateObj.$addToSet) updateObj.$addToSet = {};
        updateObj.$addToSet.assignedDietitians = { $each: validDietitianIds };
        if (!client.assignedDietitian) {
          updateObj.assignedDietitian = validDietitianIds[0];
        }
      }
    } else if (assignAction === 'add' && dietitianId) {
      // Add single dietitian
      const dietitian = await User.findById(dietitianId);
      if (!dietitian) {
        return NextResponse.json({ error: 'Dietitian not found' }, { status: 404 });
      }
      if (dietitian.role !== UserRole.DIETITIAN) {
        return NextResponse.json({ error: 'User is not a dietitian' }, { status: 400 });
      }
      if (!updateObj.$addToSet) updateObj.$addToSet = {};
      updateObj.$addToSet.assignedDietitians = dietitianId;
      if (!client.assignedDietitian) {
        updateObj.assignedDietitian = dietitianId;
      }
    } else if (assignAction === 'remove' && dietitianId) {
      // Remove dietitian from array
      if (!updateObj.$pull) updateObj.$pull = {};
      updateObj.$pull.assignedDietitians = dietitianId;
      // If removing the primary, set a new primary
      if (client.assignedDietitian?.toString() === dietitianId) {
        const remainingDietitians = client.assignedDietitians?.filter(
          (d: any) => d.toString() !== dietitianId
        ) || [];
        updateObj.assignedDietitian = remainingDietitians.length > 0 ? remainingDietitians[0] : null;
      }
    } else if (assignAction === 'transfer' && dietitianId) {
      // Transfer to new primary dietitian
      const dietitian = await User.findById(dietitianId);
      if (!dietitian) {
        return NextResponse.json({ error: 'Dietitian not found' }, { status: 404 });
      }
      if (dietitian.role !== UserRole.DIETITIAN) {
        return NextResponse.json({ error: 'User is not a dietitian' }, { status: 400 });
      }
      
      // Add current primary to the array if not already there (for history)
      if (!updateObj.$addToSet) updateObj.$addToSet = {};
      if (client.assignedDietitian) {
        updateObj.$addToSet.assignedDietitians = client.assignedDietitian;
      } else {
        updateObj.$addToSet.assignedDietitians = dietitianId;
      }
      
      // Set new primary
      updateObj.assignedDietitian = dietitianId;
    } else {
      // Default: Replace primary dietitian
      if (dietitianId) {
        const dietitian = await User.findById(dietitianId);
        if (!dietitian) {
          return NextResponse.json({ error: 'Dietitian not found' }, { status: 404 });
        }
        if (dietitian.role !== UserRole.DIETITIAN) {
          return NextResponse.json({ error: 'User is not a dietitian' }, { status: 400 });
        }
        updateObj.assignedDietitian = dietitianId;
        if (!updateObj.$addToSet) {
          updateObj.$addToSet = { assignedDietitians: dietitianId };
        }
      } else {
        updateObj.assignedDietitian = null;
      }
    }

    // Update client using findByIdAndUpdate with proper operators
    const updatedClient = await User.findByIdAndUpdate(
      clientId,
      updateObj,
      { new: true }
    );

    // Sync dietitian assignment to UnifiedPayment records
    // This ensures the user dashboard shows correct dietitian status
    const dietitianToSync = updatedClient.assignedDietitian;
    if (dietitianToSync) {
      // Update all active purchases for this client with the assigned dietitian
      await UnifiedPayment.updateMany(
        { 
          client: updatedClient._id,
          status: { $in: ['active', 'pending', 'on_hold', 'paid'] }
        },
        { 
          $set: { dietitian: dietitianToSync } 
        }
      );
    }

    // Populate the assigned dietitian and health counselor info
    await updatedClient.populate('assignedDietitian', 'firstName lastName email avatar');
    await updatedClient.populate('assignedDietitians', 'firstName lastName email avatar');
    await updatedClient.populate('assignedHealthCounselor', 'firstName lastName email avatar');
    await updatedClient.populate('assignedHealthCounselors', 'firstName lastName email avatar');

    const actionMessages: Record<string, string> = {
      'add': 'Dietitian(s) added successfully',
      'remove': 'Dietitian removed successfully',
      'transfer': 'Client transferred successfully',
      'replace': dietitianId ? 'Dietitian assigned successfully' : 'Dietitian unassigned successfully'
    };

    // Build success message including HC if assigned
    let successMessage = actionMessages[assignAction] || 'Dietitian updated successfully';
    if (healthCounselorId && healthCounselorId.trim() !== '') {
      successMessage += ' and Health Counselor assigned successfully';
    }
    if (!healthCounselorId || healthCounselorId === '') {
      successMessage += ' (Health Counselor removed)';
    }

    // Log activity
    const dietitianInfo = await User.findById(dietitianId || updatedClient.assignedDietitian);
    await logActivity({
      userId: session.user.id,
      userRole: session.user.role as any,
      userName: session.user.name || 'Unknown',
      userEmail: session.user.email || '',
      action: `Client ${assignAction === 'add' ? 'Assigned' : assignAction === 'remove' ? 'Unassigned' : 'Transferred'} to Dietitian`,
      actionType: 'assign',
      category: 'client_assignment',
      description: `${assignAction === 'add' ? 'Assigned' : assignAction === 'remove' ? 'Removed' : 'Transferred'} ${updatedClient.firstName} ${updatedClient.lastName} ${dietitianInfo ? `${assignAction === 'remove' ? 'from' : 'to'} ${dietitianInfo.firstName} ${dietitianInfo.lastName}` : ''}`,
      targetUserId: clientId,
      targetUserName: `${updatedClient.firstName} ${updatedClient.lastName}`,
      details: { dietitianId, action: assignAction }
    });

    // Broadcast real-time update to all admin connections
    // Recalculate stats for the broadcast
    const total = await User.countDocuments({ role: UserRole.CLIENT });
    const assignedCount = await User.countDocuments({ 
      role: UserRole.CLIENT, 
      $or: [
        { assignedDietitian: { $ne: null } },
        { assignedDietitians: { $exists: true, $not: { $size: 0 } } }
      ]
    });
    const unassignedCount = await User.countDocuments({ 
      role: UserRole.CLIENT, 
      assignedDietitian: null,
      $or: [
        { assignedDietitians: { $exists: false } },
        { assignedDietitians: { $size: 0 } }
      ]
    });

    adminSSEManager.broadcastClientUpdate('client_updated', {
      client: updatedClient.toObject(),
      action: assignAction,
      stats: {
        total,
        assigned: assignedCount,
        unassigned: unassignedCount
      },
      timestamp: Date.now()
    });

    // Clear cache to refresh client list
    clearCacheByTag('clients');
    clearCacheByTag('stats');

    return NextResponse.json({
      success: true,
      message: successMessage,
      client: updatedClient
    });

  } catch (error) {
    console.error('Error assigning dietitian:', error);
    return NextResponse.json(
      { error: 'Failed to assign dietitian' },
      { status: 500 }
    );
  }
}
