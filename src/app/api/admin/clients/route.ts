import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import { UserRole } from '@/types';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

// GET /api/admin/clients - Get all clients for admin (OPTIMIZED)
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Cap at 100
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);

    // Build query
    let query: any = { role: UserRole.CLIENT };

    // Filter by assignment status
    if (assigned === 'true') {
      query.$or = [
        { assignedDietitian: { $ne: null } },
        { assignedDietitians: { $exists: true, $not: { $size: 0 } } }
      ];
    } else if (assigned === 'false') {
      query.assignedDietitian = null;
      query.$or = [
        { assignedDietitians: { $exists: false } },
        { assignedDietitians: { $size: 0 } }
      ];
    }

    // Filter by status (uses clientStatus: lead/active/inactive)
    if (status) {
      query.clientStatus = status;
    }

    // Add search filter
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    // Create cache key based on all query params
    const cacheKey = `admin:clients:v2:${JSON.stringify(query)}:page=${page}:limit=${limit}`;

    // Fetch clients with pagination - use longer cache (5 minutes)
    const clientsData = await withCache(
      cacheKey,
      async () => {
        // Get total count and clients in parallel
        const [total, clients] = await Promise.all([
          User.countDocuments(query),
          User.find(query)
            .select('-password -__v')
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
            .skip((page - 1) * limit)
            .lean()
        ]);

        return { clients, total };
      },
      { ttl: 300000, tags: ['admin', 'clients'] } // 5 minutes cache
    );

    const { clients, total } = clientsData;

    // Get stats with caching (these rarely change)
    const stats = await withCache(
      'admin:clients:stats:v2',
      async () => {
        const [totalCount, assignedCount, unassignedCount] = await Promise.all([
          User.countDocuments({ role: UserRole.CLIENT }),
          User.countDocuments({
            role: UserRole.CLIENT,
            $or: [
              { assignedDietitian: { $ne: null } },
              { assignedDietitians: { $exists: true, $not: { $size: 0 } } }
            ]
          }),
          User.countDocuments({
            role: UserRole.CLIENT,
            assignedDietitian: null,
            $or: [
              { assignedDietitians: { $exists: false } },
              { assignedDietitians: { $size: 0 } }
            ]
          })
        ]);

        return {
          total: totalCount,
          assigned: assignedCount,
          unassigned: unassignedCount
        };
      },
      { ttl: 300000, tags: ['admin', 'clients', 'stats'] } // 5 minutes cache
    );

    return NextResponse.json({
      clients,
      stats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total
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
