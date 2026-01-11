import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Appointment from '@/lib/db/models/Appointment';
import User from '@/lib/db/models/User';
import { removeAppointmentFromCalendars, updateCalendarEvent } from '@/lib/services/googleCalendar';
import { UserRole, AppointmentStatus } from '@/types';
import { logHistoryServer } from '@/lib/server/history';
import { sendNotificationToUser } from '@/lib/firebase/firebaseNotification';
import { SSEManager } from '@/lib/realtime/sse-manager';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

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

    const appointment = await withCache(
      `appointments:id:${JSON.stringify(id)}`,
      async () => await Appointment.findById(id)
      .populate('dietitian', 'firstName lastName email avatar')
      .populate('client', 'firstName lastName email avatar'),
      { ttl: 60000, tags: ['appointments'] }
    );

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
      const client = await withCache(
      `appointments:id:${JSON.stringify(clientId)}`,
      async () => await User.findById(clientId),
      { ttl: 60000, tags: ['appointments'] }
    );
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

    const appointment = await withCache(
      `appointments:id:${JSON.stringify(id)}`,
      async () => await Appointment.findById(id),
      { ttl: 60000, tags: ['appointments'] }
    );
    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }


    
    // Check if user can update this appointment
    // Admin can update any, dietitian and HC can update appointments they created
    // Clients can only cancel their own appointments (change status to cancelled)
    let canUpdate = false;
    let isClientCancelling = false;
    
    const clientId = appointment.client?.toString();
    const dietitianId = appointment.dietitian?.toString();
    const userRole = session.user.role as string;
    
    if (userRole === UserRole.ADMIN || userRole === 'admin') {
      canUpdate = true;
    } else if (userRole === UserRole.DIETITIAN || userRole === 'dietitian') {
      // Dietitian can only update appointments they created
      if ((appointment as any).createdBy?.toString() === session.user.id) {
        canUpdate = true;
      }
    } else if (userRole === UserRole.HEALTH_COUNSELOR || userRole === 'health_counselor') {
      // Health counselor can only update appointments they created
      if ((appointment as any).createdBy?.toString() === session.user.id) {
        canUpdate = true;
      }
    } else if (userRole === UserRole.CLIENT || userRole === 'client') {
      // Client can only cancel their own appointments
      if (clientId === session.user.id && body.status === 'cancelled') {
        canUpdate = true;
        isClientCancelling = true;
      }
    }
    
    if (!canUpdate) {
      return NextResponse.json({ error: 'You can only edit appointments you created' }, { status: 403 });
    }

    // Track if status is changing to cancelled
    const isBeingCancelled = body.status === 'cancelled' && appointment.status !== 'cancelled';

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
      userId: (appointment.client as any)._id?.toString() || (appointment.client as any).toString(),
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

    // Send notifications if appointment was cancelled
    if (isBeingCancelled) {
      try {
        const dietitianData = appointment.dietitian as any;
        const clientData = appointment.client as any;
        
        // Get IDs from populated objects or original IDs
        const dietitianIdStr = dietitianData?._id?.toString() || dietitianId;
        const clientIdStr = clientData?._id?.toString() || clientId;
        
        const formattedDate = new Date(appointment.scheduledAt).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });

        const sseManager = SSEManager.getInstance();

        if (isClientCancelling) {
          // Client cancelled - notify dietitian/health counselor
          const clientName = `${clientData?.firstName || ''} ${clientData?.lastName || ''}`.trim() || 'Client';
          
          // Send push notification to dietitian
          if (dietitianIdStr) {
            await sendNotificationToUser(dietitianIdStr, {
              title: '❌ Appointment Cancelled',
              body: `${clientName} has cancelled the ${appointment.type || 'consultation'} scheduled for ${formattedDate}`,
              icon: clientData?.avatar || '/icons/icon-192x192.png',
              data: {
                type: 'appointment_cancelled',
                appointmentId: appointment._id.toString(),
                clientId: clientIdStr || '',
              },
              clickAction: `/appointments`,
            });

            // Send SSE notification
            sseManager.sendToUser(dietitianIdStr, 'appointment_cancelled', {
              appointmentId: appointment._id,
              cancelledBy: 'client',
              client: {
                _id: clientIdStr,
                firstName: clientData?.firstName,
                lastName: clientData?.lastName,
              },
              scheduledAt: appointment.scheduledAt,
              timestamp: Date.now()
            });
          }
        } else {
          // Staff cancelled - notify client
          const staffName = `${dietitianData?.firstName || ''} ${dietitianData?.lastName || ''}`.trim() || 'Your dietitian';
          
          // Send push notification to client
          if (clientIdStr) {
            await sendNotificationToUser(clientIdStr, {
              title: '❌ Appointment Cancelled',
              body: `Your ${appointment.type || 'consultation'} with ${staffName} on ${formattedDate} has been cancelled`,
              icon: dietitianData?.avatar || '/icons/icon-192x192.png',
              data: {
                type: 'appointment_cancelled',
                appointmentId: appointment._id.toString(),
                dietitianId: dietitianIdStr || '',
              },
              clickAction: `/user/appointments`,
            });

            // Send SSE notification
            sseManager.sendToUser(clientIdStr, 'appointment_cancelled', {
              appointmentId: appointment._id,
              cancelledBy: 'staff',
              dietitian: {
                _id: dietitianIdStr,
                firstName: dietitianData?.firstName,
                lastName: dietitianData?.lastName,
              },
              scheduledAt: appointment.scheduledAt,
              timestamp: Date.now()
            });
          }
        }
      } catch (notificationError) {
        console.error('Failed to send cancellation notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }

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

    const appointment = await withCache(
      `appointments:id:${JSON.stringify(id)}`,
      async () => await Appointment.findById(id),
      { ttl: 60000, tags: ['appointments'] }
    );
    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check if user can cancel this appointment
    // Admin can cancel any, dietitian and HC can cancel appointments they created
    // Clients can cancel their own appointments
    let canCancel = false;
    let isClientCancellingDelete = false;
    
    const clientIdDelete = appointment.client?.toString();
    const userRoleDelete = session.user.role as string;
    
    if (userRoleDelete === UserRole.ADMIN || userRoleDelete === 'admin') {
      canCancel = true;
    } else if (userRoleDelete === UserRole.DIETITIAN || userRoleDelete === 'dietitian') {
      // Dietitian can only cancel appointments they created
      if ((appointment as any).createdBy?.toString() === session.user.id) {
        canCancel = true;
      }
    } else if (userRoleDelete === UserRole.HEALTH_COUNSELOR || userRoleDelete === 'health_counselor') {
      // Health counselor can only cancel appointments they created
      if ((appointment as any).createdBy?.toString() === session.user.id) {
        canCancel = true;
      }
    } else if (userRoleDelete === UserRole.CLIENT || userRoleDelete === 'client') {
      // Client can cancel their own appointments
      if (clientIdDelete === session.user.id) {
        canCancel = true;
        isClientCancellingDelete = true;
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

    // Get user details for notifications
    const dietitian = await withCache(
      `appointments:id:${JSON.stringify(appointment.dietitian)}`,
      async () => await User.findById(appointment.dietitian).select('firstName lastName avatar'),
      { ttl: 60000, tags: ['appointments'] }
    );
    const client = await withCache(
      `appointments:id:${JSON.stringify(appointment.client)}`,
      async () => await User.findById(appointment.client).select('firstName lastName avatar'),
      { ttl: 60000, tags: ['appointments'] }
    );

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

    // Send cancellation notifications
    try {
      const formattedDate = new Date(appointment.scheduledAt).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });

      const sseManager = SSEManager.getInstance();
      const dietitianName = dietitian ? `${dietitian.firstName || ''} ${dietitian.lastName || ''}`.trim() : 'Your dietitian';
      const clientName = client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() : 'Client';

      if (isClientCancellingDelete) {
        // Client cancelled - notify dietitian
        if (dietitian) {
          await sendNotificationToUser(appointment.dietitian.toString(), {
            title: '❌ Appointment Cancelled',
            body: `${clientName} has cancelled the ${appointment.type || 'consultation'} scheduled for ${formattedDate}`,
            icon: client?.avatar || '/icons/icon-192x192.png',
            data: {
              type: 'appointment_cancelled',
              appointmentId: appointment._id.toString(),
              clientId: appointment.client.toString(),
            },
            clickAction: `/appointments`,
          });

          sseManager.sendToUser(appointment.dietitian.toString(), 'appointment_cancelled', {
            appointmentId: appointment._id,
            cancelledBy: 'client',
            client: client ? {
              _id: client._id,
              firstName: client.firstName,
              lastName: client.lastName,
            } : null,
            scheduledAt: appointment.scheduledAt,
            timestamp: Date.now()
          });
        }
      } else {
        // Staff cancelled - notify client
        if (client) {
          await sendNotificationToUser(appointment.client.toString(), {
            title: '❌ Appointment Cancelled',
            body: `Your ${appointment.type || 'consultation'} with ${dietitianName} on ${formattedDate} has been cancelled`,
            icon: dietitian?.avatar || '/icons/icon-192x192.png',
            data: {
              type: 'appointment_cancelled',
              appointmentId: appointment._id.toString(),
              dietitianId: appointment.dietitian.toString(),
            },
            clickAction: `/user/appointments`,
          });

          sseManager.sendToUser(appointment.client.toString(), 'appointment_cancelled', {
            appointmentId: appointment._id,
            cancelledBy: 'staff',
            dietitian: dietitian ? {
              _id: dietitian._id,
              firstName: dietitian.firstName,
              lastName: dietitian.lastName,
            } : null,
            scheduledAt: appointment.scheduledAt,
            timestamp: Date.now()
          });
        }

        // Also notify dietitian if someone else cancelled
        if (session.user.id !== appointment.dietitian.toString() && dietitian) {
          await sendNotificationToUser(appointment.dietitian.toString(), {
            title: '❌ Appointment Cancelled',
            body: `Appointment with ${clientName} on ${formattedDate} has been cancelled`,
            icon: client?.avatar || '/icons/icon-192x192.png',
            data: {
              type: 'appointment_cancelled',
              appointmentId: appointment._id.toString(),
              clientId: appointment.client.toString(),
            },
            clickAction: `/appointments`,
          });

          sseManager.sendToUser(appointment.dietitian.toString(), 'appointment_cancelled', {
            appointmentId: appointment._id,
            cancelledBy: 'admin',
            client: client ? {
              _id: client._id,
              firstName: client.firstName,
              lastName: client.lastName,
            } : null,
            scheduledAt: appointment.scheduledAt,
            timestamp: Date.now()
          });
        }
      }
    } catch (notificationError) {
      console.error('Failed to send cancellation notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ message: 'Appointment cancelled successfully' });

  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return NextResponse.json(
      { error: 'Failed to cancel appointment' },
      { status: 500 }
    );
  }
}
