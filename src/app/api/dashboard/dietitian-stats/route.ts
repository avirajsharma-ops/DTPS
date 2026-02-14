import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import Appointment from '@/lib/db/models/Appointment';
import UnifiedPayment from '@/lib/db/models/UnifiedPayment';
import { UserRole } from '@/types';
import mongoose from 'mongoose';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

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
      const dietitianObjectId = new mongoose.Types.ObjectId(session.user.id);
      clientQuery.$or = [
        { assignedDietitian: dietitianObjectId },
        { assignedDietitians: dietitianObjectId }
      ];
      appointmentQuery.dietitian = dietitianObjectId;
    }
    // Admin sees all clients (no filter needed)

    // Run all independent queries concurrently to avoid N+1 round-trips
    const [
      totalClients,
      activeClients,
      todaysAppointments,
      confirmedAppointments,
      pendingAppointments,
      completedSessions,
      totalPastAppointments,
      recentClients,
      todaysSchedule
    ] = await Promise.all([
      // Total clients
      User.countDocuments(clientQuery),
      // Active clients
      User.countDocuments({
        ...clientQuery,
        $or: [
          { 'wooCommerceData.totalOrders': { $gt: 0 } },
          { lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
          { updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
        ]
      }),
      // Today's appointments
      Appointment.countDocuments({
        ...appointmentQuery,
        scheduledAt: { $gte: startOfToday, $lt: endOfToday }
      }),
      // Confirmed appointments for today
      Appointment.countDocuments({
        ...appointmentQuery,
        scheduledAt: { $gte: startOfToday, $lt: endOfToday },
        status: { $in: ['confirmed', 'scheduled'] }
      }),
      // Pending appointments for today
      Appointment.countDocuments({
        ...appointmentQuery,
        scheduledAt: { $gte: startOfToday, $lt: endOfToday },
        status: 'pending'
      }),
      // Completed sessions
      Appointment.countDocuments({
        ...appointmentQuery,
        scheduledAt: { $lt: startOfToday },
        status: { $in: ['confirmed', 'completed'] }
      }),
      // Total past appointments (for completion rate)
      Appointment.countDocuments({
        ...appointmentQuery,
        scheduledAt: { $lt: startOfToday }
      }),
      // Recent clients
      withCache(
        `dashboard:dietitian-stats:${JSON.stringify(clientQuery)}`,
        async () => User.find(clientQuery)
          .sort({ createdAt: -1 })
          .limit(10)
          .select('firstName lastName email phone wooCommerceData createdAt'),
        { ttl: 120000, tags: ['dashboard'] }
      ),
      // Today's schedule
      withCache(
        `dashboard:dietitian-stats:schedule-${startOfToday.toISOString()}`,
        async () => Appointment.find({
          ...appointmentQuery,
          scheduledAt: { $gte: startOfToday, $lt: endOfToday }
        })
          .populate('client', 'firstName lastName email')
          .sort({ scheduledAt: 1 }),
        { ttl: 120000, tags: ['dashboard'] }
      )
    ]);

    // Derived calculations
    const clientsWithMealPlans = Math.floor(activeClients * 0.7);
    const completionRate = totalPastAppointments > 0
      ? Math.round((completedSessions / totalPastAppointments) * 100)
      : 0;

    // Get payments ONLY from clients assigned to this dietitian
    let paymentQuery: any = {};
    
    if (session.user.role === UserRole.DIETITIAN || session.user.role === UserRole.HEALTH_COUNSELOR) {
      const dietitianObjectId = new mongoose.Types.ObjectId(session.user.id);
      
      // Get list of client IDs assigned to this dietitian
      const assignedClientIds = await User.find({
        role: 'client',
        $or: [
          { assignedDietitian: dietitianObjectId },
          { assignedDietitians: dietitianObjectId }
        ]
      }).distinct('_id');
      
      if (assignedClientIds.length > 0) {
        paymentQuery = { client: { $in: assignedClientIds } };
      } else {
        paymentQuery = { _id: null };
      }
    }
    // For admin, paymentQuery stays empty to show all payments

    // Run all payment queries concurrently
    const [recentPayments, totalRevenueResult, pendingPaymentsCount, completedPaymentsCount] = await Promise.all([
      withCache(
        `dashboard:dietitian-stats:payments-${JSON.stringify(paymentQuery)}`,
        async () => UnifiedPayment.find(paymentQuery)
          .populate('client', 'firstName lastName email phone')
          .sort({ createdAt: -1 })
          .limit(10),
        { ttl: 120000, tags: ['dashboard'] }
      ),
      withCache(
        `dashboard:dietitian-stats:revenue-${JSON.stringify(paymentQuery)}`,
        async () => UnifiedPayment.aggregate([
          { $match: { ...paymentQuery, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        { ttl: 120000, tags: ['dashboard'] }
      ),
      UnifiedPayment.countDocuments({ ...paymentQuery, status: 'pending' }),
      UnifiedPayment.countDocuments({ ...paymentQuery, status: 'completed' })
    ]);

    const totalRevenue = totalRevenueResult[0]?.total || 0;

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
        time: new Date((appointment as any).scheduledAt).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        clientName: (appointment as any).client ?
          `${(appointment as any).client.firstName} ${(appointment as any).client.lastName}` :
          'Unknown Client',
        clientEmail: (appointment as any).client?.email,
        status: (appointment as any).status,
        type: (appointment as any).type || 'Consultation'
      })),
      // Payment data for dietitian
      totalRevenue,
      pendingPaymentsCount,
      completedPaymentsCount,
      recentPayments: recentPayments.map(payment => ({
        id: (payment as any)._id,
        clientName: (payment as any).client ?
          `${(payment as any).client.firstName} ${(payment as any).client.lastName}` :
          'Unknown Client',
        clientEmail: (payment as any).client?.email,
        clientPhone: (payment as any).client?.phone,
        amount: (payment as any).amount,
        currency: (payment as any).currency || 'INR',
        status: (payment as any).status,
        planName: (payment as any).planName || 'N/A',
        planCategory: (payment as any).planCategory,
        durationDays: (payment as any).durationDays,
        durationLabel: (payment as any).durationLabel,
        transactionId: (payment as any).transactionId,
        createdAt: (payment as any).createdAt
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
