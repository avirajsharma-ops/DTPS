# Google Calendar Integration - Explanation & Guide

## 🎯 What is Google Calendar Integration?

Google Calendar Integration allows you to automatically sync tasks created in DTPS to your Google Calendar. This means:
- Tasks appear in your Google Calendar
- You get reminders for tasks
- Everything is synchronized in real-time
- You can manage tasks from both systems

---

## 📱 How It Works (Step by Step)

### Step 1: Connect Google Calendar (Prerequisites)
```
Settings → Google Calendar Connection
  ↓
Click "Connect Google Calendar"
  ↓
Authorize DTPS app (sign in with Google)
  ↓
OAuth tokens stored securely in database
  ↓
Ready to sync!
```

### Step 2: Create a Task
```
Navigate to Client → Tasks Tab
  ↓
Click "Create Task" Button
  ↓
Fill Task Details:
  - Task Type (dropdown)
  - Title
  - Start Date
  - End Date
  - Time
  - Message/Description
  ↓
Click "Save"
  ↓
Task appears in DTPS
```

### Step 3: Sync to Google Calendar
```
Task Card Displays
  ↓
Click "📅 Sync to Calendar" Button
  ↓
System Creates Event in Google Calendar with:
  ✓ Title: "Task: {Type} - {Title}"
  ✓ Description: Your message
  ✓ Date/Time: Your selected dates
  ✓ Reminders: Default notifications
  ↓
Event ID Stored in Database
  ↓
Button Changes to "Remove from Calendar"
  ↓
Task Now Visible in Google Calendar!
```

---

## 🔄 Synchronization Flow

```
DTPS (Our App)                          Google Calendar
─────────────────────────────────────────────────────

Task Created
    ↓
  [Data]
    ↓
  API Call ──────────────→ Create Event
                             ↓
                         Event Created
                             ↓
  ←──────── Return Event ID ────
    ↓
Store Event ID
    ↓
Mark as Synced
    ↓
Show Visual Indicator

When Task Updated:
    ↓
[Updated Data] ──→ Update Event
                      ↓
                   Event Updated
                      ↓
Show Confirmation

When Task Deleted:
    ↓
[Event ID] ──────→ Delete Event
                      ↓
                   Event Deleted
                      ↓
Remove ID from DB
```

---

## 🔐 Security & Privacy

### How OAuth Works:
```
1. User clicks "Connect Google Calendar"
   ↓
2. Redirects to Google login page
   ↓
3. User authorizes DTPS to access calendar
   ↓
4. Google sends back access & refresh tokens
   ↓
5. Tokens stored encrypted in database
   ↓
6. App uses tokens to create events
   ↓
7. User can revoke access anytime in Google Account
```

### What Permissions Are Needed:
- ✓ Create/Read/Update/Delete calendar events
- ✗ No access to personal files
- ✗ No access to email
- ✗ No access to other Google services

---

## 📋 What Gets Synced to Google Calendar

### Event Details:
```
Title: "Task: Form Allotment - Complete health assessment"
Description: "Please fill out the health assessment form"
Date: 2025-12-15 to 2025-12-20
Time: Based on "Allotted Time" field
Reminders: Default Google Calendar settings (usually 15 mins before)
Calendar: Primary calendar
```

### Example Google Calendar Entry:
```
╔═══════════════════════════════════════════╗
║ Task: Form Allotment - Health Assessment  ║
║ Tue, Dec 15 – Sun, Dec 20                 ║
║                                           ║
║ Description:                              ║
║ Please fill out the health assessment     ║
║ form                                      ║
║                                           ║
║ ✓ Synced from DTPS                        ║
╚═══════════════════════════════════════════╝
```

---

## 🎨 UI Components for Calendar Integration

### Before Sync:
```
┌─────────────────────────────────┐
│ Task: Form Allotment            │
│ Complete health assessment      │
│                                 │
│ 📅 Dec 15 - Dec 20              │
│ 🕐 10:00 AM                      │
│                                 │
│ [Mark Complete] [📅 Sync...] [🗑️]│
└─────────────────────────────────┘
```

### After Sync:
```
┌─────────────────────────────────┐
│ Task: Form Allotment            │
│ Complete health assessment      │
│                                 │
│ 📅 Dec 15 - Dec 20              │
│ 🕐 10:00 AM                      │
│ ✓ Synced to Calendar            │
│                                 │
│ [Mark Complete] [Remove] [🗑️]    │
└─────────────────────────────────┘
```

---

## 🚀 Benefits of Google Calendar Integration

### For Dietitians:
- 📅 Tasks appear in your personal calendar
- 🔔 Get notifications and reminders
- 📱 Access tasks from any device
- 🔄 No duplicate data entry
- ⏰ Better time management

### For Clients:
- 📤 Tasks can be shared via Google Calendar
- 🔔 Get reminder notifications
- 📱 View on any device (phone, tablet, desktop)
- 🌐 Integrates with other calendar apps
- 📊 Calendar-based planning

---

## ⚠️ Error Handling

### "Google Calendar not connected"
**Problem:** User hasn't authorized calendar access
**Solution:** 
1. Go to Settings
2. Click "Connect Google Calendar"
3. Authorize the app
4. Try syncing again

### "Failed to sync with Google Calendar"
**Problem:** Technical issue with Google API
**Solution:**
1. Check your internet connection
2. Verify Google Calendar is accessible
3. Try again in a few moments
4. Contact support if issue persists

### Token Expired
**Problem:** OAuth token has expired
**Solution:**
- System automatically refreshes tokens
- If manual refresh needed: reconnect in Settings
- No data loss, just need to reauthorize

---

## 📊 API Details (For Developers)

### Tech Stack Used:
```typescript
Google Calendar API v3
├── googleapis npm package
├── OAuth 2.0 authentication
├── Automatic token refresh
├── Error handling & retry logic
└── Event creation with full details
```

### Environment Variables:
```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret_key
NEXTAUTH_URL=https://yourapp.com
```

### Token Storage in Database:
```typescript
User Model:
├── googleCalendarAccessToken: string (encrypted)
├── googleCalendarRefreshToken: string (encrypted)
└── googleCalendarConnectedAt: Date
```

---

## 🔄 Workflow Examples

### Example 1: Create and Sync Task
```
1. Click "Create Task" in Tasks section
2. Fill form:
   - Type: "Form Allotment"
   - Title: "Complete health form"
   - Dates: Dec 15 - Dec 20
   - Time: 10:00 AM
3. Click "Save"
4. Task appears in list
5. Click "📅 Sync to Calendar"
6. See success message: "Task synced to Google Calendar"
7. Open Google Calendar in new tab
8. See event under Dec 15-20
9. Click event to view details
10. Get reminder notifications
```

### Example 2: Update and Resync Task
```
1. Click task to update details
2. Change end date from Dec 20 to Dec 25
3. Save changes in DTPS
4. Task is already in Google Calendar with old date
5. Click "Remove from Calendar"
6. Click "Sync to Calendar" again
7. Google Calendar event is updated
8. Reminders reflect new dates
```

### Example 3: Remove Task from Calendar
```
1. Find synced task (has "✓ Synced to Calendar" badge)
2. Click "Remove from Calendar" button
3. System deletes event from Google Calendar
4. Button changes back to "📅 Sync to Calendar"
5. Task remains in DTPS but not in Google Calendar
6. Can resync anytime
```

---

## 📱 Mobile & Cross-Device Access

### Google Calendar Sync Benefits:
```
DTPS (Desktop)          Google Calendar
    ↓                           ↓
Create Task  ←──Sync──→  Desktop Calendar
    ↓                           ↓
            Mobile Phone
            (Google Calendar App)
                  ↓
           See synced task
           Get notifications
           Share with others
```

### Works On:
- ✅ Google Calendar Website
- ✅ Google Calendar Mobile App (iOS/Android)
- ✅ Apple Calendar (Mac/iPhone)
- ✅ Outlook Calendar
- ✅ Any calendar app that supports Google Calendar
- ✅ Calendar widget on phone home screen

---

## 🎯 Best Practices

### For Dietitians:
1. **Sync Important Tasks** - Sync tasks you need reminders for
2. **Keep Naming Consistent** - Use clear task names
3. **Set Appropriate Dates** - Accurate dates = effective reminders
4. **Use Task Types** - Helps identify task type in calendar
5. **Leave Notes** - Description field helps in calendar

### For Clients (if shared):
1. **Check Regular** - Review synced tasks daily
2. **Respond Promptly** - Don't delay task completion
3. **Enable Notifications** - Get reminder notifications
4. **Keep Calendar Updated** - Maintain accurate schedule

---

## 📞 Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| Tasks not syncing | Reconnect Google Calendar in settings |
| Button shows "Syncing..." forever | Refresh page, try again |
| Event not appearing in calendar | Check calendar is public/readable |
| Can't remove from calendar | Reconnect and try again |
| Wrong date/time in calendar | Check task date/time settings |
| No reminders | Check Google Calendar notification settings |

---

## 🔮 Future Enhancements

- [ ] Two-way sync (edit in Google Calendar, update in DTPS)
- [ ] Multiple calendar selection
- [ ] Custom reminders per task
- [ ] Shared calendars for client/dietitian collaboration
- [ ] Calendar color coding by task type
- [ ] iCal export for other calendar systems
- [ ] Calendar view in DTPS (embedded Google Calendar)

---

**Google Calendar Integration is LIVE and ready to use! 🎉**

Start syncing your tasks and never miss a deadline! 📅✅
