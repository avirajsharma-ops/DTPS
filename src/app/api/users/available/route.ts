import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';

// GET /api/users/available - Get available users for messaging/appointments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    let users = [];

    if (session.user.role === 'client') {
      // Clients can see their assigned dietitian and all dietitians
      const currentUser = await User.findById(session.user.id);
      
      if (currentUser?.assignedDietitian) {
        // Get assigned dietitian first
        const assignedDietitian = await User.findById(currentUser.assignedDietitian)
          .select('firstName lastName avatar role consultationFee specializations');
        
        if (assignedDietitian) {
          users.push({
            ...assignedDietitian.toObject(),
            isAssigned: true
          });
        }
      }
      
      // Get other available dietitians
      const otherDietitians = await User.find({
        role: 'dietitian',
        _id: { $ne: currentUser?.assignedDietitian },
        status: 'active'
      })
      .select('firstName lastName avatar role consultationFee specializations')
      .limit(10);
      
      users.push(...otherDietitians.map(d => ({
        ...d.toObject(),
        isAssigned: false
      })));
      
    } else if (session.user.role === 'dietitian') {
      // Dietitians can see their assigned clients
      users = await User.find({
        role: 'client',
        assignedDietitian: session.user.id,
        status: 'active'
      })
      .select('firstName lastName avatar role dateOfBirth healthGoals')
      .sort({ firstName: 1 });
      
    } else if (session.user.role === 'admin') {
      // Admins can see all users
      users = await User.find({
        _id: { $ne: session.user.id },
        status: 'active'
      })
      .select('firstName lastName avatar role')
      .sort({ role: 1, firstName: 1 })
      .limit(50);
    }

    return NextResponse.json({ users });

  } catch (error) {
    console.error('Error fetching available users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available users' },
      { status: 500 }
    );
  }
}
