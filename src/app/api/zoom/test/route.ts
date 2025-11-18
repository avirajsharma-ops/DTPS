import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import zoomService from '@/lib/services/zoom';
import { UserRole } from '@/types';

// GET /api/zoom/test - Test Zoom API connection
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins and dietitians to test Zoom integration
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.DIETITIAN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Test creating a meeting
    const testMeetingConfig = zoomService.generateMeetingConfig(
      'Test Meeting - DTPS Integration',
      new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      30, // 30 minutes
      'This is a test meeting to verify Zoom integration is working correctly.'
    );

    try {
      // Use the current user's email as the host
      const meeting = await zoomService.createMeeting(session.user.email!, testMeetingConfig);

      // Clean up - delete the test meeting immediately
      try {
        await zoomService.deleteMeeting(meeting.id.toString());
      } catch (deleteError) {
        console.warn('Failed to delete test meeting:', deleteError);
      }

      return NextResponse.json({
        success: true,
        message: 'Zoom integration is working correctly',
        testResults: {
          meetingCreated: true,
          meetingId: meeting.id,
          joinUrl: meeting.join_url,
          startUrl: meeting.start_url,
          hostEmail: meeting.host_email,
          meetingDeleted: true
        }
      });

    } catch (zoomError: any) {
      console.error('Zoom API test failed:', zoomError);
      
      return NextResponse.json({
        success: false,
        message: 'Zoom integration test failed',
        error: zoomError.message,
        details: {
          hasApiKey: !!process.env.ZOOM_API_KEY,
          hasApiSecret: !!process.env.ZOOM_API_SECRET,
          hasClientId: !!process.env.ZOOM_CLIENT_ID,
          hasClientSecret: !!process.env.ZOOM_CLIENT_SECRET,
          hasAccountId: !!process.env.ZOOM_ACCOUNT_ID
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error testing Zoom integration:', error);
    return NextResponse.json(
      { error: 'Failed to test Zoom integration' },
      { status: 500 }
    );
  }
}

// POST /api/zoom/test - Test creating a meeting with custom parameters
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins and dietitians to test Zoom integration
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.DIETITIAN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { topic, startTime, duration, agenda } = body;

    if (!topic || !startTime || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields: topic, startTime, duration' },
        { status: 400 }
      );
    }

    const meetingConfig = zoomService.generateMeetingConfig(
      topic,
      new Date(startTime),
      duration,
      agenda
    );

    try {
      const meeting = await zoomService.createMeeting(session.user.email!, meetingConfig);

      return NextResponse.json({
        success: true,
        message: 'Test meeting created successfully',
        meeting: {
          id: meeting.id,
          uuid: meeting.uuid,
          topic: meeting.topic,
          startTime: meeting.start_time,
          duration: meeting.duration,
          joinUrl: meeting.join_url,
          startUrl: meeting.start_url,
          password: meeting.password,
          hostEmail: meeting.host_email
        }
      });

    } catch (zoomError: any) {
      console.error('Failed to create test meeting:', zoomError);
      
      return NextResponse.json({
        success: false,
        message: 'Failed to create test meeting',
        error: zoomError.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error creating test meeting:', error);
    return NextResponse.json(
      { error: 'Failed to create test meeting' },
      { status: 500 }
    );
  }
}
