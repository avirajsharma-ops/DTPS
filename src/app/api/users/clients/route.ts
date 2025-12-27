import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import { UserRole } from '@/types';

// GET /api/users/clients - Get clients for dietitians to book appointments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only dietitians, health counselors, and admins can access client list
    const userRole = session.user.role?.toLowerCase();
    if (userRole !== 'dietitian' && userRole !== 'health_counselor' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
 
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    // Build query
    let query: any = { role: UserRole.CLIENT };

    // If dietitian or health counselor, only show their assigned clients (including from assignedDietitians array)
    if (userRole === 'dietitian' || userRole === 'health_counselor') {
      query.$or = [
        { assignedDietitian: session.user.id },
        { assignedDietitians: session.user.id }
      ];
    }
    // Admin can see all clients (no additional filter needed)

    // Add search filter
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const clients = await User.find(query)
      .select('firstName lastName email avatar phone dateOfBirth gender height weight activityLevel healthGoals medicalConditions allergies dietaryRestrictions assignedDietitian status clientStatus createdAt')
      .populate('assignedDietitian', 'firstName lastName email')
      .sort({ firstName: 1, lastName: 1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}
 