# Google Calendar Sync - Quick Start Guide

## For Users

### Connecting Google Calendar

1. **Go to Settings**
   - Click on your profile menu
   - Select "Settings"

2. **Open Integrations Tab**
   - Click the "Integrations" tab
   - Look for "Google Calendar" section

3. **Connect Calendar**
   - Click "Connect Calendar" button
   - You'll be redirected to Google login
   - Sign in with your Google account
   - Click "Allow" to grant calendar permissions
   - You'll be automatically redirected back to settings

4. **Verify Connection**
   - Status should show "Connected" with a checkmark
   - You're ready to sync tasks!

### Syncing Tasks to Calendar

1. **Create or View Task**
   - Go to Tasks section
   - Create a new task or open an existing one

2. **Sync to Calendar**
   - Click the "Sync to Google Calendar" button
   - The task will appear in your Google Calendar

3. **Manage Calendar Events**
   - View the event in your Google Calendar
   - The event includes:
     - Task title
     - Task description
     - Due date and time
     - Automatic reminders (24h email + 30min popup)

4. **Remove from Calendar**
   - Click "Remove from Google Calendar" button
   - Event will be deleted from your calendar

## For Developers

### Environment Setup

Ensure these environment variables are set in `.env`:
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
NEXTAUTH_URL=http://localhost:3000
```

### API Endpoints

**1. Initiate Google Calendar Connection**
```
POST /api/auth/google-calendar
Response: { authUrl: "https://accounts.google.com/..." }
```

**2. Handle OAuth Callback**
```
GET /api/auth/google-calendar/callback?code=auth_code
Redirects to: /settings?calendar=connected
```

**3. Sync Task to Calendar**
```
POST /api/clients/{clientId}/tasks/{taskId}/google-calendar
Response: { success: true, eventId: "event_123", eventLink: "..." }
```

**4. Remove Task from Calendar**
```
DELETE /api/clients/{clientId}/tasks/{taskId}/google-calendar
Response: { success: true, message: "..." }
```

### How Tokens Work

1. **Token Storage**
   - Access token stored in `User.googleCalendarAccessToken`
   - Refresh token stored in `User.googleCalendarRefreshToken`
   - Expiry date stored in `User.googleCalendarTokenExpiry`

2. **Automatic Refresh**
   - Before each API call, tokens are checked
   - Expired tokens are automatically refreshed
   - New tokens are saved to database

3. **Error Handling**
   - If refresh fails, user is prompted to reconnect
   - All errors are caught and logged
   - Graceful fallback for missing tokens

### Database Schema

**User Model Extensions**
```typescript
googleCalendarAccessToken?: string;      // OAuth access token
googleCalendarRefreshToken?: string;     // For token refresh
googleCalendarTokenExpiry?: Date;        // Token expiration time
```

**Task Model**
```typescript
googleCalendarEventId?: string;          // ID of calendar event
```

## Troubleshooting

### "Google Calendar not configured"
**Problem**: Sync button shows error
**Solution**: 
- Go to Settings → Integrations
- Click "Connect Calendar"
- Grant permissions to Google Calendar

### "Token has been revoked"
**Problem**: Calendar sync fails with token error
**Solution**:
- Go to Settings → Integrations
- Your Google account may have revoked access
- Click "Connect Calendar" again
- Grant permissions

### Event not appearing in calendar
**Problem**: Task synced but not in Google Calendar
**Solution**:
- Refresh your Google Calendar
- Check calendar settings (calendar might be hidden)
- Ensure task end date is in the future
- Check Google Calendar quota (if exceeded, try again later)

### "Unauthorized" error
**Problem**: Can't connect calendar or sync tasks
**Solution**:
- Log out and log back in
- Check if you're logged into correct Google account
- Ensure session hasn't expired
- Try clearing browser cookies

## Features

✅ **Automatic Token Refresh**
- Tokens automatically refreshed when expired
- No manual reconnection needed

✅ **Multiple Calendar Events**
- Each task syncs as separate calendar event
- Can have multiple tasks as events

✅ **Automatic Reminders**
- 24-hour email reminder before due date
- 30-minute popup reminder
- Customizable in Google Calendar

✅ **Event Management**
- Update event by re-syncing task
- Delete event by removing from calendar
- View event link directly in app

## Limitations

⚠️ **Current Limitations**
- One-way sync (Google Calendar → App not yet supported)
- Recurring tasks create single events (no recurrence)
- Time zone based on user profile
- Requires calendar scopes (cannot sync to other users' calendars)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review environment variables are set correctly
3. Check browser console for error messages
4. Check server logs for API errors
5. Verify Google Cloud Console OAuth configuration

