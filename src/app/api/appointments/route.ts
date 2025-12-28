import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Appointment from '@/lib/db/models/Appointment';
import User from '@/lib/db/models/User';
import zoomService from '@/lib/services/zoom';
import { syncAppointmentToCalendars } from '@/lib/services/googleCalendar';
import { UserRole, AppointmentStatus } from '@/types';
import { logHistoryServer } from '@/lib/server/history';
import { logActivity, logApiError } from '@/lib/utils/activityLogger';
import { SSEManager } from '@/lib/realtime/sse-manager';
import { sendNotificationToUser } from '@/lib/firebase/firebaseNotification';

// GET /api/appointments - Get appointments for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const search = searchParams.get('search');
    const dietitianId = searchParams.get('dietitianId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');

    // Build query based on user role
    let query: any = {};
    
    // If specific dietitianId is requested (for slots view)
    if (dietitianId) {
      query.dietitian = dietitianId;
    } else if (session.user.role === UserRole.DIETITIAN) {
      // Get all clients assigned to this dietitian
      const assignedClients = await User.find({
        role: UserRole.CLIENT,
        $or: [
          { assignedDietitian: session.user.id },
          { assignedDietitians: session.user.id }
        ]
      }).select('_id');
      const assignedClientIds = assignedClients.map(c => c._id);
      
      // Dietitian can see appointments they created OR for their assigned clients
      query.$or = [
        { dietitian: session.user.id },
        { client: { $in: assignedClientIds } }
      ];
    } else if (session.user.role === UserRole.CLIENT) {
      query.client = session.user.id;
    } else {
      // Admin can see all appointments
    }

    // Add filters
    if (status) {
      query.status = status;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.scheduledAt = {
        $gte: startDate,
        $lt: endDate
      };
    }

    // Add search functionality
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { type: searchRegex },
        { notes: searchRegex }
      ];
    }

    // By default, only show current and future appointments
    // If includeAll=true is passed (for specific client panel), show all including past
    const includeAll = searchParams.get('includeAll') === 'true';
    if (!includeAll && !date) {
      // Only show appointments from start of today onwards
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      query.scheduledAt = { ...query.scheduledAt, $gte: todayStart };
    }

    const appointments = await Appointment.find(query)
      .populate('dietitian', 'firstName lastName email avatar')
      .populate('client', 'firstName lastName email avatar')
      .sort({ scheduledAt: 1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(query);
    return NextResponse.json({
      appointments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

// POST /api/appointments - Create new appointment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    let { dietitianId, clientId, scheduledAt, duration, type, notes } = body;

    await connectDB();

    // Validate required fields
    if (!dietitianId || !clientId || !scheduledAt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Map common type values to valid enum values
    const typeMapping: { [key: string]: string } = {
      'video': 'video_consultation',
      'phone': 'consultation',
      'in-person': 'consultation',
      'follow-up': 'follow_up',
      'followup': 'follow_up',
    };

    // If type is provided and needs mapping, map it
    if (type && typeMapping[type.toLowerCase()]) {
      type = typeMapping[type.toLowerCase()];
    }

    // Default to consultation if no type provided
    if (!type) {
      type = 'consultation';
    }

    // Check for scheduling conflicts
    const conflicts = await Appointment.findConflicts(
      dietitianId,
      new Date(scheduledAt),
      duration || 60
    );

    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Time slot conflicts with existing appointment' },
        { status: 409 }
      );
    }

    // Get dietitian and client details for Zoom meeting
    const dietitian = await User.findById(dietitianId);
    const client = await User.findById(clientId);

    if (!dietitian || !client) {
      return NextResponse.json(
        { error: 'Dietitian or client not found' },
        { status: 404 }
      );
    }

    // Create appointment
    const appointment = new Appointment({
      dietitian: dietitianId,
      client: clientId,
      scheduledAt: new Date(scheduledAt),
      duration: duration || 60,
      type,
      notes,
      status: AppointmentStatus.SCHEDULED
    }) as any;

    // Try to create Zoom meeting
    try {
      const meetingTopic = `${type === 'consultation' ? 'Consultation' : 'Follow-up'} with ${client.firstName} ${client.lastName}`;
      const meetingConfig = zoomService.generateMeetingConfig(
        meetingTopic,
        new Date(scheduledAt),
        duration || 60,
        notes || `Nutrition ${type} session between ${dietitian.firstName} ${dietitian.lastName} and ${client.firstName} ${client.lastName}`
      );

      // Use dietitian's email as the host
      const zoomMeeting = await zoomService.createMeeting(dietitian.email, meetingConfig);

      // Store Zoom meeting details
      appointment.zoomMeeting = {
        meetingId: zoomMeeting.id.toString(),
        meetingUuid: zoomMeeting.uuid,
        joinUrl: zoomMeeting.join_url,
        startUrl: zoomMeeting.start_url,
        password: zoomMeeting.password,
        hostEmail: zoomMeeting.host_email
      };

      // Also set the legacy meetingLink field for backward compatibility
      appointment.meetingLink = zoomMeeting.join_url;
    } catch (zoomError) {
      console.error('Failed to create Zoom meeting:', zoomError);
      // Continue without Zoom meeting - don't fail the appointment creation
      // You might want to send a notification to admin about this failure
    }

    await appointment.save();

    // Populate the created appointment
    await appointment.populate('dietitian', 'firstName lastName email avatar');
    await appointment.populate('client', 'firstName lastName email avatar');

    // Sync appointment to Google Calendar for both dietitian and client
    try {
      const appointmentCalendarData = {
        title: `${type === 'consultation' ? 'Consultation' : 'Follow-up'}: ${client.firstName} ${client.lastName} & ${dietitian.firstName} ${dietitian.lastName}`,
        description: notes || `Nutrition ${type} session`,
        scheduledAt: new Date(scheduledAt),
        duration: duration || 60,
        meetingLink: appointment.zoomMeeting?.joinUrl || appointment.meetingLink
      };

      const calendarResult = await syncAppointmentToCalendars(
        dietitianId,
        clientId,
        appointmentCalendarData,
        dietitian.email,
        client.email
      );

      // Store Google Calendar event IDs
      if (calendarResult.dietitianEventId || calendarResult.clientEventId) {
        appointment.googleCalendarEventId = {
          dietitian: calendarResult.dietitianEventId,
          client: calendarResult.clientEventId
        };
        await appointment.save();
      }

      if (calendarResult.errors.length > 0) {
        console.warn('Google Calendar sync warnings:', calendarResult.errors);
      }
    } catch (calendarError) {
      console.error('Failed to sync appointment to Google Calendar:', calendarError);
      // Don't fail the appointment creation if calendar sync fails
    }

    // Record history for the client
    await logHistoryServer({
      userId: clientId,
      action: 'create',
      category: 'appointment',
      description: `Appointment scheduled with ${dietitian.firstName} ${dietitian.lastName} on ${new Date(scheduledAt).toLocaleString()}`,
      performedById: session.user.id,
      metadata: {
        appointmentId: appointment._id,
        dietitianId,
        clientId,
        scheduledAt,
        duration: duration || 60,
        type,
        status: appointment.status,
      },
    });

    // Log activity
    await logActivity({
      userId: session.user.id,
      userRole: session.user.role as any,
      userName: session.user.name || 'Unknown',
      userEmail: session.user.email || '',
      action: 'Booked Appointment',
      actionType: 'create',
      category: 'appointment',
      description: `Booked appointment with ${dietitian.firstName} ${dietitian.lastName} for ${client.firstName} ${client.lastName} on ${new Date(scheduledAt).toLocaleDateString()}`,
      targetUserId: clientId,
      targetUserName: `${client.firstName} ${client.lastName}`,
      resourceId: appointment._id.toString(),
      resourceType: 'Appointment',
      details: { scheduledAt, duration: duration || 60, type }
    });

    // Send real-time notification to dietitian about new booking
    try {
      const sseManager = SSEManager.getInstance();
      sseManager.sendToUser(dietitianId, 'appointment_booked', {
        appointmentId: appointment._id,
        client: {
          _id: client._id,
          firstName: client.firstName,
          lastName: client.lastName,
          avatar: client.avatar
        },
        scheduledAt: appointment.scheduledAt,
        duration: appointment.duration,
        type: appointment.type,
        timestamp: Date.now()
      });
      
      // Also notify the client if someone else booked for them
      if (session.user.id !== clientId) {
        sseManager.sendToUser(clientId, 'appointment_booked', {
          appointmentId: appointment._id,
          dietitian: {
            _id: dietitian._id,
            firstName: dietitian.firstName,
            lastName: dietitian.lastName,
            avatar: dietitian.avatar
          },
          scheduledAt: appointment.scheduledAt,
          duration: appointment.duration,
          type: appointment.type,
          timestamp: Date.now()
        });
      }
    } catch (sseError) {
      console.error('Failed to send SSE notification:', sseError);
      // Don't fail the request if SSE notification fails
    }

    // Send push notifications for the appointment
    try {
      const formattedDate = new Date(scheduledAt).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });

      // Send push notification to dietitian
      await sendNotificationToUser(dietitianId, {
        title: '📅 New Appointment Booked',
        body: `${client.firstName} ${client.lastName} booked a ${type || 'consultation'} on ${formattedDate}`,
        icon: client.avatar || '/icons/icon-192x192.png',
        data: {
          type: 'appointment',
          appointmentId: appointment._id.toString(),
          clientId,
        },
        clickAction: `/appointments`,
      });

      // Send push notification to client
      await sendNotificationToUser(clientId, {
        title: '📅 Appointment Confirmed',
        body: `Your ${type || 'consultation'} with ${dietitian.firstName} ${dietitian.lastName} is scheduled for ${formattedDate}`,
        icon: dietitian.avatar || '/icons/icon-192x192.png',
        data: {
          type: 'appointment',
          appointmentId: appointment._id.toString(),
          dietitianId,
        },
        clickAction: `/appointments`,
      });
    } catch (pushError) {
      console.error('Failed to send appointment push notification:', pushError);
      // Don't fail the request if push notification fails
    }

    return NextResponse.json({ appointment }, { status: 201 });

  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    );
  }
}
