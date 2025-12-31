import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import User from '@/lib/db/models/User';
import dbConnect from '@/lib/db/connection';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Fetch all health counselors with client count
    const healthCounselors = await User.find({ role: 'health_counselor' })
      .select('firstName lastName email avatar phone status createdAt')
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

    return NextResponse.json({
      success: true,
      healthCounselors: healthCounselorsWithCount
    });
  } catch (error: any) {
    console.error('Error fetching health counselors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health counselors' },
      { status: 500 }
    );
  }
}
