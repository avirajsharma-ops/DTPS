# Zoom Meeting Integration Guide

This guide explains how to set up and use the Zoom meeting functionality in the Zoconut application.

## Overview

The Zoom integration automatically creates secure video meeting links when appointments are booked between dietitians and clients. This provides a seamless experience for conducting virtual nutrition consultations.

## Features

- **Automatic Meeting Creation**: Zoom meetings are automatically generated when appointments are booked
- **Secure Meeting Links**: Each meeting has a unique ID and optional password protection
- **Host and Participant Access**: Dietitians get host privileges, clients get participant access
- **Meeting Management**: View, join, and manage meetings directly from the appointment details
- **Real-time Status**: Shows meeting status (upcoming, live, ended) with countdown timers
- **Easy Access**: One-click join buttons and copy-to-clipboard functionality

## Setup Instructions

### 1. Create a Zoom App

1. Go to the [Zoom Marketplace](https://marketplace.zoom.us/)
2. Sign in with your Zoom account
3. Click "Develop" → "Build App"
4. Choose "Server-to-Server OAuth" app type
5. Fill in your app information:
   - App Name: "Zoconut Nutrition Platform"
   - Company Name: Your company name
   - Developer Contact: Your email
   - Description: "Video meeting integration for nutrition consultations"

### 2. Configure App Permissions

In your Zoom app settings, add the following scopes:
- `meeting:write` - Create and manage meetings
- `meeting:read` - Read meeting information
- `user:read` - Read user information

### 3. Get API Credentials

From your Zoom app dashboard, copy the following credentials:
- **Account ID**
- **Client ID** 
- **Client Secret**

For legacy JWT apps (deprecated but still supported):
- **API Key**
- **API Secret**

### 4. Configure Environment Variables

Add the following variables to your `.env.local` file:

```env
# Zoom Integration (Server-to-Server OAuth - Recommended)
ZOOM_ACCOUNT_ID=your-zoom-account-id
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret

# Zoom Integration (JWT - Legacy, still supported)
ZOOM_API_KEY=your-zoom-api-key
ZOOM_API_SECRET=your-zoom-api-secret

# Optional: Webhook secret for Zoom events
ZOOM_WEBHOOK_SECRET=your-zoom-webhook-secret
```

### 5. Test the Integration

1. Restart your application after adding the environment variables
2. Log in as an admin or dietitian
3. Navigate to `/admin/zoom-test`
4. Click "Run Zoom Integration Test"
5. Verify that the test passes

## How It Works

### Appointment Booking Flow

1. **Client books appointment**: Client selects dietitian, date, and time
2. **Zoom meeting created**: System automatically creates a Zoom meeting
3. **Meeting details stored**: Meeting ID, join URL, and password are saved
4. **Notifications sent**: Both parties receive appointment confirmation with meeting details

### Meeting Access

- **Dietitians** (Hosts):
  - Can start the meeting before the scheduled time
  - Have host controls (mute participants, manage waiting room, etc.)
  - Access via "Start Meeting" button

- **Clients** (Participants):
  - Can join the meeting when it starts
  - Access via "Join Meeting" button
  - May need to wait in waiting room if enabled

### Meeting Security

- Each meeting has a unique meeting ID
- Optional password protection
- Waiting room enabled by default
- End-to-end encryption provided by Zoom

## Usage

### For Dietitians

1. **Booking for Clients**:
   - Go to "Appointments" → "Book for Client"
   - Select client, date, time, and appointment type
   - Zoom meeting is automatically created

2. **Managing Meetings**:
   - View appointment details to see meeting information
   - Start meetings early if needed
   - Copy meeting details to share manually if required

### For Clients

1. **Booking Appointments**:
   - Go to "Appointments" → "Book Appointment"
   - Select dietitian, date, and time
   - Zoom meeting link will be provided after booking

2. **Joining Meetings**:
   - Go to appointment details page
   - Click "Join Meeting" when it's time
   - Download Zoom app if prompted

## API Endpoints

### Test Zoom Integration
```
GET /api/zoom/test
```
Tests the Zoom API connection and creates/deletes a test meeting.

### Create Test Meeting
```
POST /api/zoom/test
Body: {
  "topic": "Test Meeting",
  "startTime": "2024-01-01T10:00:00Z",
  "duration": 30,
  "agenda": "Test agenda"
}
```

## Components

### ZoomMeetingCard
A React component that displays Zoom meeting information with:
- Meeting status and countdown
- Join/Start meeting buttons
- Meeting ID and password display
- Copy-to-clipboard functionality
- Security notices and instructions

Usage:
```tsx
<ZoomMeetingCard
  zoomMeeting={appointment.zoomMeeting}
  scheduledAt={new Date(appointment.scheduledAt)}
  duration={appointment.duration}
  isHost={session?.user?.role === 'dietitian'}
/>
```

## Database Schema

The `Appointment` model includes:

```typescript
interface IZoomMeetingDetails {
  meetingId: string;
  meetingUuid?: string;
  joinUrl: string;
  startUrl: string;
  password?: string;
  hostEmail?: string;
}

interface IAppointment {
  // ... other fields
  zoomMeeting?: IZoomMeetingDetails;
  meetingLink?: string; // Legacy field for backward compatibility
}
```

## Troubleshooting

### Common Issues

1. **"Zoom integration test failed"**
   - Check that all environment variables are set correctly
   - Verify your Zoom app has the required scopes
   - Ensure your Zoom account is active

2. **"Meeting creation failed"**
   - Check that the host email exists in your Zoom account
   - Verify the meeting time is in the future
   - Check Zoom API rate limits

3. **"Cannot join meeting"**
   - Ensure the meeting time has arrived
   - Check that the meeting wasn't cancelled
   - Verify the join URL is correct

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

Check the server logs for detailed error messages.

## Security Considerations

- Store Zoom credentials securely in environment variables
- Never expose API keys in client-side code
- Use HTTPS for all meeting links
- Enable waiting rooms for additional security
- Regularly rotate API credentials

## Rate Limits

Zoom API has rate limits:
- 10 requests per second per app
- Daily limits based on your Zoom plan

The integration handles rate limiting gracefully and will retry failed requests.

## Support

For issues with the Zoom integration:
1. Check the test page at `/admin/zoom-test`
2. Review server logs for error messages
3. Verify Zoom app configuration
4. Contact Zoom support for API-related issues

## Future Enhancements

Planned features:
- Webhook integration for meeting events
- Recording management
- Meeting analytics
- Custom meeting settings per appointment type
- Integration with calendar systems
