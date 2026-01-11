import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import Appointment from '@/lib/db/models/Appointment';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

// GET /api/dashboard/admin-stats - Get real admin dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins to access this endpoint
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Connect to MongoDB
    await connectDB();

    // Get current date for calculations
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    // Get total clients count
    const totalClients = await User.countDocuments({ role: 'client' });

    // Get active clients (clients with recent activity or WooCommerce data)
    const activeClients = await User.countDocuments({
      role: 'client',
      $or: [
        { 'wooCommerceData.totalOrders': { $gt: 0 } },
        { lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        { updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
      ]
    });

    // Get total appointments
    const totalAppointments = await Appointment.countDocuments({});

    // Get completed appointments
    const completedAppointments = await Appointment.countDocuments({
      status: 'confirmed',
      date: { $lt: startOfToday }
    });

    // Calculate total revenue from WooCommerce data
    const revenueAggregation = await withCache(
      `dashboard:admin-stats:${JSON.stringify([
      { $match: { role: 'client', 'wooCommerceData.totalSpent': { $exists: true } } },
      { $group: { _id: null, totalRevenue: { $sum: '$wooCommerceData.totalSpent' } } }
    ])}`,
      async () => await User.aggregate([
      { $match: { role: 'client', 'wooCommerceData.totalSpent': { $exists: true } } },
      { $group: { _id: null, totalRevenue: { $sum: '$wooCommerceData.totalSpent' } } }
    ]),
      { ttl: 120000, tags: ['dashboard'] }
    );
    const totalRevenue = revenueAggregation[0]?.totalRevenue || 0;

    // Calculate monthly revenue (current month)
    const monthlyRevenueAggregation = await withCache(
      `dashboard:admin-stats:${JSON.stringify([
      { 
        $match: { 
          role: 'client', 
          'wooCommerceData.lastOrderDate': { 
            $gte: startOfMonth,
            $lt: endOfToday
          }
        } 
      },
      { $group: { _id: null, monthlyRevenue: { $sum: '$wooCommerceData.totalSpent' } } }
    ])}`,
      async () => await User.aggregate([
      { 
        $match: { 
          role: 'client', 
          'wooCommerceData.lastOrderDate': { 
            $gte: startOfMonth,
            $lt: endOfToday
          }
        } 
      },
      { $group: { _id: null, monthlyRevenue: { $sum: '$wooCommerceData.totalSpent' } } }
    ]),
      { ttl: 120000, tags: ['dashboard'] }
    );
    const monthlyRevenue = monthlyRevenueAggregation[0]?.monthlyRevenue || 0;

    // Get average order value
    const avgOrderAggregation = await withCache(
      `dashboard:admin-stats:${JSON.stringify([
      { $match: { role: 'client', 'wooCommerceData.totalOrders': { $gt: 0 } } },
      { 
        $group: { 
          _id: null, 
          totalOrders: { $sum: '$wooCommerceData.totalOrders' },
          totalRevenue: { $sum: '$wooCommerceData.totalSpent' }
        } 
      }
    ])}`,
      async () => await User.aggregate([
      { $match: { role: 'client', 'wooCommerceData.totalOrders': { $gt: 0 } } },
      { 
        $group: { 
          _id: null, 
          totalOrders: { $sum: '$wooCommerceData.totalOrders' },
          totalRevenue: { $sum: '$wooCommerceData.totalSpent' }
        } 
      }
    ]),
      { ttl: 120000, tags: ['dashboard'] }
    );
    const avgOrderValue = avgOrderAggregation[0] 
      ? avgOrderAggregation[0].totalRevenue / avgOrderAggregation[0].totalOrders 
      : 0;

    // Get client retention rate (estimate based on repeat orders)
    const repeatCustomers = await User.countDocuments({
      role: 'client',
      'wooCommerceData.totalOrders': { $gt: 1 }
    });
    const clientRetentionRate = totalClients > 0 ? Math.round((repeatCustomers / totalClients) * 100) : 0;

    // Get appointments by month (last 6 months)
    const appointmentsByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      
      const monthAppointments = await Appointment.countDocuments({
        date: { $gte: monthStart, $lte: monthEnd }
      });

      // Calculate revenue for this month (estimate from WooCommerce data)
      const monthRevenue = await withCache(
      `dashboard:admin-stats:${JSON.stringify([
        { 
          $match: { 
            role: 'client', 
            'wooCommerceData.lastOrderDate': { 
              $gte: monthStart,
              $lte: monthEnd
            }
          } 
        },
        { $group: { _id: null, revenue: { $sum: '$wooCommerceData.totalSpent' } } }
      ])}`,
      async () => await User.aggregate([
        { 
          $match: { 
            role: 'client', 
            'wooCommerceData.lastOrderDate': { 
              $gte: monthStart,
              $lte: monthEnd
            }
          } 
        },
        { $group: { _id: null, revenue: { $sum: '$wooCommerceData.totalSpent' } } }
      ]),
      { ttl: 120000, tags: ['dashboard'] }
    );

      appointmentsByMonth.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        appointments: monthAppointments,
        revenue: monthRevenue[0]?.revenue || 0
      });
    }

    // Get top clients by spending
    const topClients = await withCache(
      `dashboard:admin-stats:${JSON.stringify({
      role: 'client',
      'wooCommerceData.totalSpent': { $gt: 0 }
    })}`,
      async () => await User.find({
      role: 'client',
      'wooCommerceData.totalSpent': { $gt: 0 }
    })
    .sort({ 'wooCommerceData.totalSpent': -1 })
    .limit(10)
    .select('firstName lastName email wooCommerceData.totalSpent wooCommerceData.totalOrders')
    ,
      { ttl: 120000, tags: ['dashboard'] }
    );

    // Get appointment types distribution
    const appointmentTypes = await withCache(
      `dashboard:admin-stats:${JSON.stringify([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])}`,
      async () => await Appointment.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
      { ttl: 120000, tags: ['dashboard'] }
    );

    return NextResponse.json({
      totalClients,
      activeClients,
      totalAppointments,
      completedAppointments,
      totalRevenue,
      monthlyRevenue,
      avgOrderValue,
      clientRetentionRate,
      appointmentsByMonth,
      topClients: topClients.map(client => ({
        clientName: `${client.firstName} ${client.lastName}`,
        email: client.email,
        totalSpent: client.wooCommerceData?.totalSpent || 0,
        totalOrders: client.wooCommerceData?.totalOrders || 0
      })),
      appointmentTypes: appointmentTypes.map(type => ({
        type: type._id || 'Consultation',
        count: type.count,
        revenue: type.count * 100 // Estimate ₹100 per appointment
      })),
      revenueByMonth: appointmentsByMonth.map(month => ({
        month: month.month,
        revenue: month.revenue
      }))
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin dashboard statistics' },
      { status: 500 }
    );
  }
}
