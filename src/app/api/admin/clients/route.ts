import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import { UserRole } from '@/types';

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

    // Filter by status
    if (status) {
      query.status = status;
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

    const clients = await User.find(query)
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
      .skip((page - 1) * limit);

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
      clients,
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
