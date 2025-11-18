import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import { UserRole } from '@/types';

// POST /api/users/dietitian/availability/setup - Quick setup with default availability
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.DIETITIAN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    // Default business hours availability (Monday to Friday, 9 AM to 5 PM)
    const defaultAvailability = {
      schedule: [
        {
          dayOfWeek: 1, // Monday
          timeSlots: [
            { startTime: '09:00', endTime: '12:00', isAvailable: true },
            { startTime: '13:00', endTime: '17:00', isAvailable: true }
          ]
        },
        {
          dayOfWeek: 2, // Tuesday
          timeSlots: [
            { startTime: '09:00', endTime: '12:00', isAvailable: true },
            { startTime: '13:00', endTime: '17:00', isAvailable: true }
          ]
        },
        {
          dayOfWeek: 3, // Wednesday
          timeSlots: [
            { startTime: '09:00', endTime: '12:00', isAvailable: true },
            { startTime: '13:00', endTime: '17:00', isAvailable: true }
          ]
        },
        {
          dayOfWeek: 4, // Thursday
          timeSlots: [
            { startTime: '09:00', endTime: '12:00', isAvailable: true },
            { startTime: '13:00', endTime: '17:00', isAvailable: true }
          ]
        },
        {
          dayOfWeek: 5, // Friday
          timeSlots: [
            { startTime: '09:00', endTime: '12:00', isAvailable: true },
            { startTime: '13:00', endTime: '17:00', isAvailable: true }
          ]
        }
      ],
      timezone: 'UTC',
      consultationDuration: 60,
      bufferTime: 15,
      maxAdvanceBooking: 30,
      minAdvanceBooking: 1
    };

    // Update dietitian's availability
    const dietitian = await User.findByIdAndUpdate(
      session.user.id,
      { 
        $set: { 
          availability: defaultAvailability,
          updatedAt: new Date()
        }
      },
      { new: true }
    ).select('availability firstName lastName');

    return NextResponse.json({
      message: 'Default availability setup completed successfully',
      availability: dietitian?.availability,
      summary: {
        days: 'Monday to Friday',
        hours: '9:00 AM - 12:00 PM, 1:00 PM - 5:00 PM',
        duration: '60 minutes per consultation',
        bufferTime: '15 minutes between appointments'
      }
    });

  } catch (error) {
    console.error('Error setting up default availability:', error);
    return NextResponse.json(
      { error: 'Failed to setup default availability' },
      { status: 500 }
    );
  }
}

// GET /api/users/dietitian/availability/setup - Check if setup is needed
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.DIETITIAN && session.user.role !== UserRole.HEALTH_COUNSELOR) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const dietitian = await User.findById(session.user.id).select('availability');
    
    const hasAvailability = dietitian?.availability?.schedule && 
                           dietitian.availability.schedule.length > 0;

    return NextResponse.json({
      needsSetup: !hasAvailability,
      hasAvailability,
      currentScheduleCount: dietitian?.availability?.schedule?.length || 0
    });

  } catch (error) {
    console.error('Error checking availability setup:', error);
    return NextResponse.json(
      { error: 'Failed to check availability setup' },
      { status: 500 }
    );
  }
}
