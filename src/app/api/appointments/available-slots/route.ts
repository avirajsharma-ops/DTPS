import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import Appointment from '@/lib/db/models/Appointment';
import { UserRole } from '@/types';

// GET /api/appointments/available-slots - Get available time slots for a dietitian
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dietitianId = searchParams.get('dietitianId');
    const date = searchParams.get('date'); // YYYY-MM-DD format
    const duration = parseInt(searchParams.get('duration') || '60'); // minutes

    if (!dietitianId || !date) {
      return NextResponse.json(
        { error: 'dietitianId and date are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get dietitian's availability
    const dietitian = await User.findById(dietitianId).select('availability role');

    if (!dietitian || dietitian.role !== UserRole.DIETITIAN) {
      return NextResponse.json({ error: 'Dietitian not found' }, { status: 404 });
    }

    const availability = dietitian.availability;
    if (!availability || availability.length === 0) {
      return NextResponse.json({ availableSlots: [] });
    }

    // Parse the requested date
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay(); // 0 = Sunday, 6 = Saturday

    // Map day numbers to day names
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    // Find ALL schedules for this day of week (can have multiple slots like morning + afternoon)
    const daySchedules = availability.filter((avail: any) => avail.day === dayName);
    if (!daySchedules || daySchedules.length === 0) {
      return NextResponse.json({ availableSlots: [] });
    }

    // Get existing appointments for this date
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await Appointment.find({
      dietitian: dietitianId,
      scheduledAt: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['scheduled', 'confirmed'] }
    }).select('scheduledAt duration');

    // Generate available time slots from ALL day schedules
    const availableSlots: string[] = [];
    const consultationDuration = duration || 60;
    const bufferTime = 15; // 15 minutes buffer between appointments

    // Process each schedule for the day (e.g., morning 10-13, afternoon 14-18)
    for (const daySchedule of daySchedules) {
      // Parse start and end times from the day schedule
      const [startHour, startMinute] = daySchedule.startTime.split(':').map(Number);
      const [endHour, endMinute] = daySchedule.endTime.split(':').map(Number);

      const slotStart = new Date(requestedDate);
      slotStart.setHours(startHour, startMinute, 0, 0);

      const slotEnd = new Date(requestedDate);
      slotEnd.setHours(endHour, endMinute, 0, 0);

      // Generate time slots within this time range
      let currentTime = new Date(slotStart);

      while (currentTime.getTime() + (consultationDuration * 60 * 1000) <= slotEnd.getTime()) {
        const appointmentEnd = new Date(currentTime.getTime() + (consultationDuration * 60 * 1000));

        // Check if this slot conflicts with existing appointments
        const hasConflict = existingAppointments.some(appointment => {
          const appointmentStart = new Date(appointment.scheduledAt);
          const appointmentEndTime = new Date(appointmentStart.getTime() + (appointment.duration * 60 * 1000));

          // Check for overlap (including buffer time)
          const bufferStart = new Date(currentTime.getTime() - (bufferTime * 60 * 1000));
          const bufferEnd = new Date(appointmentEnd.getTime() + (bufferTime * 60 * 1000));

          return (bufferStart < appointmentEndTime && bufferEnd > appointmentStart);
        });

        if (!hasConflict) {
          // Check if slot is not in the past
          const now = new Date();
          if (currentTime > now) {
            const timeString = currentTime.toTimeString().slice(0, 5); // HH:MM format
            if (!availableSlots.includes(timeString)) {
              availableSlots.push(timeString);
            }
          }
        }

        // Move to next slot (every 15 minutes)
        currentTime = new Date(currentTime.getTime() + (15 * 60 * 1000));
      }
    }

    return NextResponse.json({
      date,
      dietitianId,
      duration: consultationDuration,
      availableSlots: availableSlots.sort(),
      timezone: 'UTC'
    });

  } catch (error) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available slots' },
      { status: 500 }
    );
  }
}
