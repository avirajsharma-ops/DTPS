import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import ClientMealPlan from '@/lib/db/models/ClientMealPlan';
import UnifiedPayment from '@/lib/db/models/UnifiedPayment';
import { UserRole } from '@/types';
import { withCache, clearCacheByTag } from '@/lib/api/utils';
import { computeClientStatusFromDocs } from '@/lib/status/computeClientStatus';

// GET /api/admin/clients - Get all clients for admin
export async function GET(request: NextRequest) {
  try {
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

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const assigned = searchParams.get('assigned') || ''; // 'true', 'false', or ''
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    // Build query
    let query: any = { role: UserRole.CLIENT };

    // Filter by assignment status
    if (assigned === 'true') {
      query.assignedDietitian = { $ne: null };
    } else if (assigned === 'false') {
      query.assignedDietitian = null;
    }

    // Filter by status (now uses clientStatus: lead/active/inactive)
    if (status) {
      query.clientStatus = status;
    }

    // Add search filter
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('Query:', JSON.stringify(query));

    const clients = await withCache(
      `admin:clients:${JSON.stringify(query)}:page=${page}:limit=${limit}`,
      async () => await User.find(query)
      .select('-password')
      .populate('assignedDietitian', 'firstName lastName email avatar')
      .populate('assignedDietitians', 'firstName lastName email avatar')
      .populate('assignedHealthCounselor', 'firstName lastName email avatar')
      .populate('assignedHealthCounselors', 'firstName lastName email avatar')
      .populate({
        path: 'createdBy.userId',
        select: 'firstName lastName role',
        strictPopulate: false
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit),
      { ttl: 120000, tags: ['admin'] }
    );

    // Dynamically compute client status for each client
    const clientIds = clients.map((c: any) => c._id);

    // Fetch payment data (UnifiedPayment uses 'client' field)
    const paymentData = await UnifiedPayment.aggregate([
      { $match: { client: { $in: clientIds }, $or: [{ status: { $in: ['paid', 'completed', 'active'] } }, { paymentStatus: 'paid' }] } },
      { $group: { _id: '$client', count: { $sum: 1 } } }
    ]);
    const paidClientIds = new Set(paymentData.map((p: any) => p._id.toString()));

    // Fetch all meal plans for these clients
    const allMealPlans = await ClientMealPlan.find(
      { clientId: { $in: clientIds } },
      { clientId: 1, startDate: 1, endDate: 1, status: 1 }
    ).lean();

    // Group meal plans by clientId
    const mealPlansByClient = new Map<string, Array<{ startDate: Date | string; endDate: Date | string; status: string }>>();
    allMealPlans.forEach((mp: any) => {
      const cid = mp.clientId.toString();
      if (!mealPlansByClient.has(cid)) mealPlansByClient.set(cid, []);
      mealPlansByClient.get(cid)!.push({ startDate: mp.startDate, endDate: mp.endDate, status: mp.status });
    });

    // Compute status for each client and build bulk ops
    const bulkOps: any[] = [];
    const clientsWithStatus = JSON.parse(JSON.stringify(clients)).map((client: any) => {
      const cid = client._id.toString();
      const hasPaid = paidClientIds.has(cid);
      const plans = mealPlansByClient.get(cid) || [];
      const payments = hasPaid ? [{ status: 'paid' }] : [];
      const computedStatus = computeClientStatusFromDocs(payments, plans);

      if (client.clientStatus !== computedStatus) {
        bulkOps.push({
          updateOne: {
            filter: { _id: client._id },
            update: { $set: { clientStatus: computedStatus } }
          }
        });
      }

      return { ...client, clientStatus: computedStatus };
    });

    // Persist updated statuses in the background
    if (bulkOps.length > 0) {
      User.bulkWrite(bulkOps).catch(err => console.error('Admin bulk status update error:', err));
    }

    const total = await User.countDocuments(query);
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

    return NextResponse.json({
      clients: clientsWithStatus,
      stats: {
        total,
        assigned: assignedCount,
        unassigned: unassignedCount
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching clients:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch clients', details: errorMessage },
      { status: 500 }
    );
  }
}
