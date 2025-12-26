import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import { UserRole } from '@/types';

// GET /api/admin/dietitians - Get all dietitians for admin
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

    // Build query
    let query: any = { role: UserRole.DIETITIAN };

    // Add search filter
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const dietitians = await User.find(query)
      .select('firstName lastName email avatar phone specialization status')
      .sort({ firstName: 1, lastName: 1 });

    // Get client count for each dietitian
    const dietitiansWithCounts = await Promise.all(
      dietitians.map(async (dietitian) => {
        const clientCount = await User.countDocuments({
          role: UserRole.CLIENT,
          assignedDietitian: dietitian._id
        });
        return {
          ...dietitian.toObject(),
          clientCount
        };
      })
    );

    return NextResponse.json({
      dietitians: dietitiansWithCounts
    });

  } catch (error) {
    console.error('Error fetching dietitians:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dietitians' },
      { status: 500 }
    );
  }
}
