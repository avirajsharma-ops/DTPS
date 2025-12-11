import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Appointment from '@/lib/db/models/Appointment';
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

    console.log('Access check:', {
      userId,
      userRole: session.user.role,
      dietitianId,
      clientId,
      appointmentId: id
    });

    const hasAccess =
      session.user.role === UserRole.ADMIN ||
      dietitianId === userId ||
      clientId === userId;

    if (!hasAccess) {
      console.log('Access denied for appointment:', {
        userId,
        userRole: session.user.role,
        dietitianId,
        clientId
      });
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
    const canUpdate = 
      session.user.role === UserRole.ADMIN ||
      appointment.dietitian.toString() === session.user.id ||
      (appointment.client.toString() === session.user.id && 
       ['notes'].some(field => field in body)); // Clients can only update notes

    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    const canCancel = 
      session.user.role === UserRole.ADMIN ||
      appointment.dietitian.toString() === session.user.id ||
      appointment.client.toString() === session.user.id;

    if (!canCancel) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
