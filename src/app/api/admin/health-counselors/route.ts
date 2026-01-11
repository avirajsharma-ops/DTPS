import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import User from '@/lib/db/models/User';
import dbConnect from '@/lib/db/connection';
import { withConditionalCache, errorResponse } from '@/lib/api/utils';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.role?.toLowerCase().includes('admin')) {
      return errorResponse('Unauthorized', 401, 'AUTH_REQUIRED');
    }

    await dbConnect();

    // Fetch all health counselors with client count
    const healthCounselors = await User.find({ role: 'health_counselor' })
      .select('firstName lastName email avatar phone status createdAt updatedAt')
      .lean();

    // Get client count for each health counselor
    const healthCounselorsWithCount = await Promise.all(
      healthCounselors.map(async (hc: any) => {
        const clientCount = await User.countDocuments({
          assignedHealthCounselor: hc._id
        });
        return {
          ...hc,
          clientCount
        };
      })
    );

    const responseData = {
      success: true,
      healthCounselors: healthCounselorsWithCount
    };

    // Use conditional caching for admin API
    return withConditionalCache(responseData, req, {
      maxAge: 30,
      private: true,
    });
  } catch (error: any) {
    console.error('Error fetching health counselors:', error);
    return errorResponse(
      error.message || 'Failed to fetch health counselors',
      500,
      'FETCH_ERROR'
    );
  }
}
