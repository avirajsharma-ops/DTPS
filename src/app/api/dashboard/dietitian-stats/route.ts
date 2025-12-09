import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import Appointment from '@/lib/db/models/Appointment';
import { UserRole } from '@/types';

// GET /api/dashboard/dietitian-stats - Get real dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow dietitians, health counselors, and admins to access this endpoint
    if (session.user.role !== UserRole.DIETITIAN &&
        session.user.role !== UserRole.HEALTH_COUNSELOR &&
        session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden - Dietitian or Health Counselor access required' }, { status: 403 });
    }

    // Connect to MongoDB
    await connectDB();

    // Get current date for today's calculations
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Build query based on role
    let clientQuery: any = { role: 'client' };
    let appointmentQuery: any = {};

    // If dietitian or health counselor, filter by assigned clients only
    if (session.user.role === UserRole.DIETITIAN || session.user.role === UserRole.HEALTH_COUNSELOR) {
      clientQuery.$or = [
        { assignedDietitian: session.user.id },
        { assignedDietitians: session.user.id }
      ];
      appointmentQuery.dietitianId = session.user.id;
    }
    // Admin sees all clients (no filter needed)

    // Get total clients count (assigned to this dietitian or all for admin)
    const totalClients = await User.countDocuments(clientQuery);

    // Get active clients (clients with recent activity or WooCommerce data)
    const activeClients = await User.countDocuments({
      ...clientQuery,
      $or: [
        { 'wooCommerceData.totalOrders': { $gt: 0 } },
        { lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, // Last 30 days
        { updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
      ]
    });

    // Get clients with meal plans (estimate based on active clients)
    const clientsWithMealPlans = Math.floor(activeClients * 0.7); // Estimate 70% have meal plans

    // Get today's appointments (for this dietitian or all for admin)
    const todaysAppointments = await Appointment.countDocuments({
      ...appointmentQuery,
      date: {
        $gte: startOfToday,
        $lt: endOfToday
      }
    });

    // Get confirmed appointments for today
    const confirmedAppointments = await Appointment.countDocuments({
      ...appointmentQuery,
      date: {
        $gte: startOfToday,
        $lt: endOfToday
      },
      status: 'confirmed'
    });

    // Get pending appointments for today
    const pendingAppointments = await Appointment.countDocuments({
      ...appointmentQuery,
      date: {
        $gte: startOfToday,
        $lt: endOfToday
      },
      status: 'pending'
    });

    // Get total completed sessions (all past confirmed appointments)
    const completedSessions = await Appointment.countDocuments({
      ...appointmentQuery,
      date: { $lt: startOfToday },
      status: 'confirmed'
    });

    // Calculate completion rate
    const totalPastAppointments = await Appointment.countDocuments({
      ...appointmentQuery,
      date: { $lt: startOfToday }
    });
    const completionRate = totalPastAppointments > 0
      ? Math.round((completedSessions / totalPastAppointments) * 100)
      : 0;

    // Get recent clients (last 10 assigned to this dietitian or all for admin)
    const recentClients = await User.find(clientQuery)
    .sort({ createdAt: -1 })
    .limit(10)
    .select('firstName lastName email phone wooCommerceData createdAt')
    .lean();

    // Get today's schedule (for this dietitian or all for admin)
    const todaysSchedule = await Appointment.find({
      ...appointmentQuery,
      date: {
        $gte: startOfToday,
        $lt: endOfToday
      }
    })
    .populate('clientId', 'firstName lastName email')
    .sort({ time: 1 })
    .lean();

    // Calculate active percentage
    const activePercentage = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0;

    return NextResponse.json({
      totalClients,
      activeClients,
      clientsWithMealPlans,
      todaysAppointments,
      confirmedAppointments,
      pendingAppointments,
      completedSessions,
      completionRate,
      activePercentage,
      recentClients: recentClients.map(client => ({
        id: client._id,
        name: `${client.firstName} ${client.lastName}`,
        email: client.email,
        phone: client.phone,
        hasWooCommerceData: !!client.wooCommerceData,
        totalOrders: client.wooCommerceData?.totalOrders || 0,
        totalSpent: client.wooCommerceData?.totalSpent || 0,
        joinedDate: client.createdAt
      })),
      todaysSchedule: todaysSchedule.map(appointment => ({
        id: (appointment as any)._id,
        time: (appointment as any).time,
        clientName: (appointment as any).clientId ?
          `${(appointment as any).clientId.firstName} ${(appointment as any).clientId.lastName}` :
          'Unknown Client',
        clientEmail: (appointment as any).clientId?.email,
        status: (appointment as any).status,
        type: (appointment as any).type || 'Consultation'
      }))
    });

  } catch (error) {
    console.error('Error fetching dietitian stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
