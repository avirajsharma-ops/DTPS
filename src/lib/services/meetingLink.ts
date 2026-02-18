import zoomService from '@/lib/services/zoom';

export interface MeetingLinkResult {
  success: boolean;
  meetingLink?: string;
  meetingDetails?: {
    meetingId?: string;
    meetingUuid?: string;
    joinUrl?: string;
    startUrl?: string;
    password?: string;
    hostEmail?: string;
    provider: 'zoom' | 'google_meet';
  };
  error?: string;
}

/**
 * Generate a meeting link based on the appointment mode
 * Supports Zoom and Google Meet
 */
export async function generateMeetingLink(
  modeName: string,
  meetingConfig: {
    topic: string;
    scheduledAt: Date;
    duration: number;
    description?: string;
    hostEmail: string;
    attendees: { email: string; name: string }[];
  }
): Promise<MeetingLinkResult> {
  const lowerModeName = modeName.toLowerCase();

  // Check if it's a video meeting mode
  if (lowerModeName.includes('zoom')) {
    return generateZoomMeeting(meetingConfig);
  }

  if (lowerModeName.includes('google') || lowerModeName.includes('meet')) {
    return generateGoogleMeetLink(meetingConfig);
  }

  // Not a video mode, no meeting link needed
  return {
    success: true,
    meetingLink: undefined,
    meetingDetails: undefined,
  };
}

/**
 * Generate a Zoom meeting link
 */
async function generateZoomMeeting(config: {
  topic: string;
  scheduledAt: Date;
  duration: number;
  description?: string;
  hostEmail: string;
  attendees: { email: string; name: string }[];
}): Promise<MeetingLinkResult> {
  try {
    const meetingConfig = zoomService.generateMeetingConfig(
      config.topic,
      config.scheduledAt,
      config.duration,
      config.description || `Meeting: ${config.topic}`
    );

    const zoomMeeting = await zoomService.createMeeting(config.hostEmail, meetingConfig);

    return {
      success: true,
      meetingLink: zoomMeeting.join_url,
      meetingDetails: {
        meetingId: zoomMeeting.id.toString(),
        meetingUuid: zoomMeeting.uuid,
        joinUrl: zoomMeeting.join_url,
        startUrl: zoomMeeting.start_url,
        password: zoomMeeting.password,
        hostEmail: zoomMeeting.host_email,
        provider: 'zoom',
      },
    };
  } catch (error: any) {
    console.error('Failed to create Zoom meeting:', error);
    return {
      success: false,
      error: error.message || 'Failed to create Zoom meeting',
    };
  }
}

/**
 * Generate a Google Meet link
 * Note: This requires Google Calendar API with Meet conferencing enabled
 * For now, we generate a placeholder that can be replaced with actual Google Meet API
 */
async function generateGoogleMeetLink(config: {
  topic: string;
  scheduledAt: Date;
  duration: number;
  description?: string;
  hostEmail: string;
  attendees: { email: string; name: string }[];
}): Promise<MeetingLinkResult> {
  try {
    // Google Meet links can be generated through Google Calendar API
    // For now, we'll use a UUID-based approach for generating a meet code
    // In production, integrate with Google Calendar Events API to create
    // an event with conferenceData
    
    // Generate a unique meet code (similar to how Google generates meet IDs)
    const generateMeetCode = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyz';
      const segment = () => {
        let result = '';
        for (let i = 0; i < 3; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };
      return `${segment()}-${segment()}-${segment()}`;
    };

    const meetCode = generateMeetCode();
    const meetLink = `https://meet.google.com/${meetCode}`;

    // Note: This is a simplified implementation
    // For production, use Google Calendar API to create events with:
    // conferenceDataVersion: 1
    // conferenceData: { createRequest: { requestId: unique_id } }

    return {
      success: true,
      meetingLink: meetLink,
      meetingDetails: {
        meetingId: meetCode,
        joinUrl: meetLink,
        provider: 'google_meet',
      },
    };
  } catch (error: any) {
    console.error('Failed to create Google Meet link:', error);
    return {
      success: false,
      error: error.message || 'Failed to create Google Meet link',
    };
  }
}

/**
 * Check if a mode requires a meeting link
 */
export function requiresMeetingLink(modeName: string): boolean {
  const lowerModeName = modeName.toLowerCase();
  return (
    lowerModeName.includes('zoom') ||
    lowerModeName.includes('google') ||
    lowerModeName.includes('meet') ||
    lowerModeName.includes('video')
  );
}

/**
 * Delete a Zoom meeting
 */
export async function deleteMeetingLink(
  meetingId: string,
  provider: 'zoom' | 'google_meet'
): Promise<{ success: boolean; error?: string }> {
  try {
    if (provider === 'zoom') {
      await zoomService.deleteMeeting(meetingId);
    }
    // Google Meet links don't need to be explicitly deleted
    // They expire automatically
    
    return { success: true };
  } catch (error: any) {
    console.error(`Failed to delete ${provider} meeting:`, error);
    return {
      success: false,
      error: error.message || `Failed to delete ${provider} meeting`,
    };
  }
}

/**
 * Update a Zoom meeting
 */
export async function updateMeetingLink(
  meetingId: string,
  provider: 'zoom' | 'google_meet',
  config: {
    topic?: string;
    scheduledAt?: Date;
    duration?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (provider === 'zoom' && meetingId) {
      await zoomService.updateMeeting(meetingId, {
        topic: config.topic,
        start_time: config.scheduledAt?.toISOString(),
        duration: config.duration,
      } as any);
    }
    // Google Meet links don't need to be updated
    
    return { success: true };
  } catch (error: any) {
    console.error(`Failed to update ${provider} meeting:`, error);
    return {
      success: false,
      error: error.message || `Failed to update ${provider} meeting`,
    };
  }
}

export default {
  generateMeetingLink,
  requiresMeetingLink,
  deleteMeetingLink,
  updateMeetingLink,
};
