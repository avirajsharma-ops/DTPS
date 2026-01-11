import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import ClientMealPlan from '@/lib/db/models/ClientMealPlan';
import Appointment from '@/lib/db/models/Appointment';
import { AppointmentStatus, UserRole } from '@/types';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

// GET /api/admin/dietitians/[dietitianId] - Get full dietitian details with client progress
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dietitianId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role?.toLowerCase();
    if (!userRole || !userRole.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    await connectDB();
    const { dietitianId } = await params;

    const dietitian = await withCache(
      `admin:dietitians:dietitianId:${JSON.stringify(dietitianId)
      .select('-password')}`,
      async () => await User.findById(dietitianId)
      .select('-password').lean(),
      { ttl: 120000, tags: ['admin'] }
    );

    if (!dietitian) {
      return NextResponse.json({ error: 'Dietitian not found' }, { status: 404 });
    }

    if (dietitian.role !== UserRole.DIETITIAN) {
      return NextResponse.json({ error: 'User is not a dietitian' }, { status: 400 });
    }

    // Get assigned clients with their progress
    const assignedClients = await withCache(
      `admin:dietitians:dietitianId:${JSON.stringify({
      role: UserRole.CLIENT,
      $or: [
        { assignedDietitian: dietitianId },
        { assignedDietitians: dietitianId }
      ]
    })
      .select('firstName lastName email avatar phone status createdAt weight height healthGoals generalGoal onboardingCompleted')
      .sort({ createdAt: -1 })}`,
      async () => await User.find({
      role: UserRole.CLIENT,
      $or: [
        { assignedDietitian: dietitianId },
        { assignedDietitians: dietitianId }
      ]
    })
      .select('firstName lastName email avatar phone status createdAt weight height healthGoals generalGoal onboardingCompleted')
      .sort({ createdAt: -1 }).lean(),
      { ttl: 120000, tags: ['admin'] }
    );

    // Get client progress stats
    const clientsWithProgress = await Promise.all(
      assignedClients.map(async (client) => {
        // Get meal plan count
        const mealPlanCount = await ClientMealPlan.countDocuments({
          clientId: client._id,
          assignedBy: dietitianId
        });

        // Get latest meal plan
        const latestMealPlan = await withCache(
      `admin:dietitians:dietitianId:${JSON.stringify({
          clientId: client._id
        })
          .populate('templateId', 'name')
          .sort({ createdAt: -1 })}`,
      async () => await ClientMealPlan.findOne({
          clientId: client._id
        })
          .populate('templateId', 'name')
          .sort({ createdAt: -1 }).lean(),
      { ttl: 120000, tags: ['admin'] }
    );

        // Get appointment count
        const appointmentCount = await Appointment.countDocuments({
          client: client._id,
          dietitian: dietitianId
        });

        // Get upcoming appointment
        const upcomingAppointment = await withCache(
      `admin:dietitians:dietitianId:${JSON.stringify({
          client: client._id,
          dietitian: dietitianId,
          scheduledAt: { $gte: new Date() },
          status: AppointmentStatus.SCHEDULED
        }).sort({ scheduledAt: 1 })}`,
      async () => await Appointment.findOne({
          client: client._id,
          dietitian: dietitianId,
          scheduledAt: { $gte: new Date() },
          status: AppointmentStatus.SCHEDULED
        }).sort({ scheduledAt: 1 }).lean(),
      { ttl: 120000, tags: ['admin'] }
    );

        return {
          ...client.toObject(),
          progress: {
            mealPlanCount,
            latestMealPlan: latestMealPlan ? {
              name: latestMealPlan.templateId?.name || 'Custom Plan',
              startDate: latestMealPlan.startDate,
              status: latestMealPlan.status
            } : null,
            appointmentCount,
            upcomingAppointment: upcomingAppointment ? {
              dateTime: upcomingAppointment.scheduledAt,
              type: upcomingAppointment.type
            } : null
          }
        };
      })
    );

    // Get statistics
    const totalClients = assignedClients.length;
    const activeClients = assignedClients.filter(c => c.status === 'active').length;
    const totalAppointments = await Appointment.countDocuments({
      dietitian: dietitianId
    });
    const completedAppointments = await Appointment.countDocuments({
      dietitian: dietitianId,
      status: AppointmentStatus.COMPLETED
    });
    const totalMealPlans = await ClientMealPlan.countDocuments({
      assignedBy: dietitianId
    });

    return NextResponse.json({
      dietitian,
      clients: clientsWithProgress,
      stats: {
        totalClients,
        activeClients,
        totalAppointments,
        completedAppointments,
        totalMealPlans
      }
    });

  } catch (error) {
    console.error('Error fetching dietitian details:', error);
    return NextResponse.json({ error: 'Failed to fetch dietitian details' }, { status: 500 });
  }
}

// PUT /api/admin/dietitians/[dietitianId] - Update dietitian details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ dietitianId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role?.toLowerCase();
    if (!userRole || !userRole.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    await connectDB();
    const { dietitianId } = await params;
    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    const { password, _id, role, ...updateData } = body;

    const dietitian = await User.findByIdAndUpdate(
      dietitianId,
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!dietitian) {
      return NextResponse.json({ error: 'Dietitian not found' }, { status: 404 });
    }

    return NextResponse.json({ dietitian, message: 'Dietitian updated successfully' });

  } catch (error) {
    console.error('Error updating dietitian:', error);
    return NextResponse.json({ error: 'Failed to update dietitian' }, { status: 500 });
  }
}

// DELETE /api/admin/dietitians/[dietitianId] - Delete or deactivate dietitian
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ dietitianId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role?.toLowerCase();
    if (!userRole || !userRole.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    await connectDB();
    const { dietitianId } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'deactivate';

    // Check if dietitian has assigned clients
    const assignedClientsCount = await User.countDocuments({
      role: UserRole.CLIENT,
      $or: [
        { assignedDietitian: dietitianId },
        { assignedDietitians: dietitianId }
      ]
    });

    if (action === 'delete') {
      if (assignedClientsCount > 0) {
        return NextResponse.json({ 
          error: 'Cannot delete dietitian with assigned clients. Please reassign clients first.',
          assignedClientsCount
        }, { status: 400 });
      }
      await User.findByIdAndDelete(dietitianId);
      return NextResponse.json({ message: 'Dietitian deleted permanently' });
    } else {
      const dietitian = await User.findByIdAndUpdate(
        dietitianId,
        { status: 'inactive' },
        { new: true }
      ).select('-password');

      if (!dietitian) {
        return NextResponse.json({ error: 'Dietitian not found' }, { status: 404 });
      }

      return NextResponse.json({ 
        dietitian, 
        message: 'Dietitian deactivated successfully',
        warning: assignedClientsCount > 0 ? `This dietitian has ${assignedClientsCount} assigned clients` : null
      });
    }

  } catch (error) {
    console.error('Error deleting/deactivating dietitian:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
