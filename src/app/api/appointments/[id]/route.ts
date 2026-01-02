import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Appointment from '@/lib/db/models/Appointment';
import User from '@/lib/db/models/User';
import { removeAppointmentFromCalendars, updateCalendarEvent } from '@/lib/services/googleCalendar';
import { UserRole, AppointmentStatus } from '@/types';
import { logHistoryServer } from '@/lib/server/history';

// GET /api/appointments/[id] - Get specific appointment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const appointment = await Appointment.findById(id)
      .populate('dietitian', 'firstName lastName email avatar')
      .populate('client', 'firstName lastName email avatar');

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this appointment
    const dietitianId = (appointment.dietitian as any)._id?.toString() || (appointment.dietitian as any).toString();
    const clientId = (appointment.client as any)._id?.toString() || (appointment.client as any).toString();
    const userId = session.user.id;
    
    let hasAccess = false;
    
    if (session.user.role === UserRole.ADMIN) {
      hasAccess = true;
    } else if (dietitianId === userId || clientId === userId) {
      hasAccess = true;
    } else if ((session.user.role as string) === UserRole.HEALTH_COUNSELOR || (session.user.role as string) === 'health_counselor') {
      // HC can access appointments for their assigned clients
      const client = await User.findById(clientId);
      if (client?.assignedHealthCounselor?.toString() === userId) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(appointment);

  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointment' },
      { status: 500 }
    );
  }
}

// PUT /api/appointments/[id] - Update appointment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    await connectDB();
    const { id } = await params;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }


    
    // Check if user can update this appointment
    // Admin can update any, dietitian and HC can only update appointments they created
    let canUpdate = false;
    
    if (session.user.role === UserRole.ADMIN) {
      canUpdate = true;
    } else if (session.user.role === UserRole.DIETITIAN) {
      // Dietitian can only update appointments they created
      if ((appointment as any).createdBy?.toString() === session.user.id) {
        canUpdate = true;
      }
    } else if ((session.user.role as string) === UserRole.HEALTH_COUNSELOR || (session.user.role as string) === 'health_counselor') {
      // Health counselor can only update appointments they created
      if ((appointment as any).createdBy?.toString() === session.user.id) {
        canUpdate = true;
      }
    }    if (!canUpdate) {
      return NextResponse.json({ error: 'You can only edit appointments you created' }, { status: 403 });
    }

    // If updating schedule, check for conflicts
    if (body.scheduledAt || body.duration) {
      const newScheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : appointment.scheduledAt;
      const newDuration = body.duration || appointment.duration;

      const conflicts = await Appointment.findConflicts(
        appointment.dietitian.toString(),
        newScheduledAt,
        newDuration,
        id
      );

      if (conflicts.length > 0) {
        return NextResponse.json(
          { error: 'Time slot conflicts with existing appointment' },
          { status: 409 }
        );
      }
    }

    // Update appointment
    Object.assign(appointment, body);
    await appointment.save();

    // Populate and return updated appointment
    await appointment.populate('dietitian', 'firstName lastName email avatar');
    await appointment.populate('client', 'firstName lastName email avatar');

    // Update Google Calendar if schedule changed
    if (body.scheduledAt || body.duration) {
      try {
        const googleCalendarEventId = (appointment as any).googleCalendarEventId;
        const updateData = {
          scheduledAt: appointment.scheduledAt,
          duration: appointment.duration
        };

        // Update dietitian's calendar
        if (googleCalendarEventId?.dietitian) {
          await updateCalendarEvent(
            appointment.dietitian.toString(),
            googleCalendarEventId.dietitian,
            updateData
          );
        }

        // Update client's calendar
        if (googleCalendarEventId?.client) {
          await updateCalendarEvent(
            appointment.client.toString(),
            googleCalendarEventId.client,
            updateData
          );
        }
      } catch (calendarError) {
        console.error('Failed to update Google Calendar events:', calendarError);
        // Don't fail the update if calendar sync fails
      }
    }

    // Log history for appointment update
    await logHistoryServer({
      userId: (appointment.client as any).toString(),
      action: 'update',
      category: 'appointment',
      description: `Appointment updated${body.status ? ': status changed to ' + body.status : ''}`,
      performedById: session.user.id,
      metadata: {
        appointmentId: appointment._id,
        changes: Object.keys(body),
        status: appointment.status
      }
    });

    return NextResponse.json(appointment);

  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}

// DELETE /api/appointments/[id] - Cancel appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check if user can cancel this appointment
    // Admin can cancel any, dietitian and HC can only cancel appointments they created
    let canCancel = false;
    
    if (session.user.role === UserRole.ADMIN) {
      canCancel = true;
    } else if (session.user.role === UserRole.DIETITIAN) {
      // Dietitian can only cancel appointments they created
      if ((appointment as any).createdBy?.toString() === session.user.id) {
        canCancel = true;
      }
    } else if ((session.user.role as string) === UserRole.HEALTH_COUNSELOR || (session.user.role as string) === 'health_counselor') {
      // Health counselor can only cancel appointments they created
      if ((appointment as any).createdBy?.toString() === session.user.id) {
        canCancel = true;
      }
    }

    if (!canCancel) {
      return NextResponse.json({ error: 'You can only cancel appointments you created' }, { status: 403 });
    }

    // Remove from Google Calendar before cancelling
    try {
      const googleCalendarEventId = (appointment as any).googleCalendarEventId;
      if (googleCalendarEventId?.dietitian || googleCalendarEventId?.client) {
        const calendarResult = await removeAppointmentFromCalendars(
          appointment.dietitian.toString(),
          appointment.client.toString(),
          googleCalendarEventId?.dietitian,
          googleCalendarEventId?.client
        );

        if (calendarResult.errors.length > 0) {
          console.warn('Google Calendar removal warnings:', calendarResult.errors);
        }

        // Clear the calendar event IDs
        (appointment as any).googleCalendarEventId = {
          dietitian: undefined,
          client: undefined
        };
      }
    } catch (calendarError) {
      console.error('Failed to remove appointment from Google Calendar:', calendarError);
      // Don't fail the cancellation if calendar removal fails
    }

    // Update status to cancelled instead of deleting
    appointment.status = AppointmentStatus.CANCELLED;
    await appointment.save();

    // Log history for appointment cancellation
    await logHistoryServer({
      userId: appointment.client.toString(),
      action: 'delete',
      category: 'appointment',
      description: `Appointment cancelled`,
      performedById: session.user.id,
      metadata: {
        appointmentId: appointment._id,
        scheduledAt: appointment.scheduledAt,
        type: appointment.type
      }
    });

    return NextResponse.json({ message: 'Appointment cancelled successfully' });

  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return NextResponse.json(
      { error: 'Failed to cancel appointment' },
      { status: 500 }
    );
  }
}
