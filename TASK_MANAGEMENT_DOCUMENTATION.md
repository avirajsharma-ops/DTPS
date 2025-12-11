# Task Management System - Complete Documentation

## Overview
A comprehensive task management system integrated into the DTPS application with full database persistence, REST API, and Google Calendar synchronization capabilities.

---

## 1. Database Schema

### Task Model (`/src/lib/db/models/Task.ts`)

```typescript
interface ITask extends Document {
  _id: string;
  client: mongoose.Schema.Types.ObjectId;        // Reference to client
  dietitian: mongoose.Schema.Types.ObjectId;      // Reference to dietitian
  taskType: string;                                // Type of task (see enum below)
  title: string;                                   // Task title
  description?: string;                            // Optional detailed description
  startDate: Date;                                 // Task start date
  endDate: Date;                                   // Task end date
  allottedTime: string;                           // Time allotment (e.g., "12:00 AM")
  repeatFrequency: number;                        // 0 = no repeat, 1 = daily, 7 = weekly, etc.
  notifyClientOnChat: boolean;                    // Send chat notification to client
  notifyDieticianOnCompletion: string;           // Notify dietitian on completion
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  googleCalendarEventId?: string;                 // Sync with Google Calendar
  createdAt: Date;                                 // Auto-generated
  updatedAt: Date;                                 // Auto-generated
}
```

### Task Types Available:
- General Followup
- Habit Update
- Session Booking
- Sign Document
- Form Allotment
- Report Upload
- Diary Update
- Measurement Update
- BCA Update
- Progress Update

### Database Indexes:
- `{ client: 1, startDate: 1 }` - Efficient task retrieval for a client
- `{ dietitian: 1, startDate: 1 }` - Efficient task retrieval by dietitian
- `{ status: 1 }` - Efficient filtering by status

---

## 2. API Endpoints

### GET `/api/clients/[clientId]/tasks`
**Fetch all tasks for a client**

**Query Parameters:**
```
status?: 'pending' | 'in-progress' | 'completed' | 'cancelled'
startDate?: ISO date string
endDate?: ISO date string
```

**Response:**
```json
{
  "success": true,
  "tasks": [
    {
      "_id": "task123",
      "taskType": "Form Allotment",
      "title": "Fill daily habit tracker",
      "startDate": "2025-12-15T00:00:00Z",
      "endDate": "2025-12-20T00:00:00Z",
      "allottedTime": "12:00 AM",
      "status": "pending",
      "googleCalendarEventId": "google123abc"
    }
  ]
}
```

### POST `/api/clients/[clientId]/tasks`
**Create a new task**

**Request Body:**
```json
{
  "taskType": "Form Allotment",
  "title": "Fill daily habit tracker",
  "description": "Please fill the daily habit tracker form",
  "startDate": "2025-12-15",
  "endDate": "2025-12-20",
  "allottedTime": "12:00 AM",
  "repeatFrequency": 0,
  "notifyClientOnChat": true,
  "notifyDieticianOnCompletion": "dietitian@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task created successfully",
  "task": { /* full task object */ }
}
```

### PUT `/api/clients/[clientId]/tasks/[taskId]`
**Update an existing task**

**Request Body:** (Any fields to update)
```json
{
  "status": "in-progress",
  "endDate": "2025-12-25"
}
```

### DELETE `/api/clients/[clientId]/tasks/[taskId]`
**Delete a task**

**Response:**
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

### POST `/api/clients/[clientId]/tasks/[taskId]/google-calendar`
**Sync task to Google Calendar**

**Response:**
```json
{
  "success": true,
  "message": "Task synced to Google Calendar",
  "eventId": "google_event_id_123"
}
```

### DELETE `/api/clients/[clientId]/tasks/[taskId]/google-calendar`
**Remove task from Google Calendar**

**Response:**
```json
{
  "success": true,
  "message": "Task removed from Google Calendar"
}
```

---

## 3. Frontend Components

### TasksSection Component (`/src/components/clientDashboard/TasksSection.tsx`)

Main component for displaying and managing tasks. Features:
- **Create Task Button** - Opens dialog to create new tasks
- **Filter by Status** - View all, pending, or completed tasks
- **Task List Display** - Shows all task details with visual badges
- **Task Actions**:
  - Mark as Complete
  - Sync to Google Calendar
  - Remove from Google Calendar
  - Delete Task
- **Status Indicators** - Visual badges for pending, in-progress, completed, cancelled

### CreateTaskDialog Component (`/src/components/tasks/CreateTaskDialog.tsx`)

Modal dialog for creating tasks with:
- **Task Type Selection** - Dropdown with all 10 task types
- **Date Pickers** - Start and end dates
- **Time Selection** - 30-minute increments throughout the day (12:00 AM to 11:30 PM)
- **Repeat Frequency** - Configure recurring tasks
- **Notifications** - Toggle client chat notification and dietitian completion notification
- **Description/Message** - Rich text area for task details
- **Form Validation** - Ensures all required fields are filled and dates are valid

---

## 4. Google Calendar Integration

### How It Works:

1. **Prerequisites:**
   - User must have Google Calendar connected in their settings
   - OAuth2 credentials stored in User model:
     - `googleCalendarAccessToken`
     - `googleCalendarRefreshToken`

2. **Sync Process:**
   ```
   Click "Sync to Calendar" button
       ↓
   Fetch user's Google Calendar credentials
       ↓
   Create Google Calendar event with task details
       ↓
   Store Google Calendar event ID in Task model
       ↓
   Display success message
   ```

3. **Event Details Synced:**
   - **Title:** `Task: {taskType} - {title}`
   - **Description:** Task description
   - **Start Time:** Task start date and time
   - **End Time:** Task end date
   - **Reminders:** Default Google Calendar reminders

4. **Error Handling:**
   - If Google Calendar not connected: `"Google Calendar not connected. Please connect in settings."`
   - If sync fails: Display error message with reason

### Environment Variables Needed:
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
NEXTAUTH_URL=your_app_url
```

---

## 5. Usage Examples

### Creating a Task Programmatically:

```typescript
const response = await fetch('/api/clients/clientId123/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taskType: 'Form Allotment',
    title: 'Complete Health Assessment',
    description: 'Please fill out the health assessment form',
    startDate: '2025-12-15',
    endDate: '2025-12-20',
    allottedTime: '10:00 AM',
    repeatFrequency: 0,
    notifyClientOnChat: true
  })
});
```

### Filtering Tasks:

```typescript
// Get all pending tasks
const response = await fetch(
  '/api/clients/clientId123/tasks?status=pending'
);

// Get tasks within date range
const response = await fetch(
  '/api/clients/clientId123/tasks?startDate=2025-12-01&endDate=2025-12-31'
);
```

### Syncing to Google Calendar:

```typescript
const response = await fetch(
  '/api/clients/clientId123/tasks/taskId123/google-calendar',
  { method: 'POST' }
);

if (response.ok) {
  console.log('Task synced to Google Calendar!');
}
```

---

## 6. Status Flow

Tasks follow this status lifecycle:

```
pending (initial state)
  ↓
in-progress (when work starts)
  ↓
completed (when finished)

OR

pending/in-progress → cancelled (if task is cancelled)
```

---

## 7. Data Validation

### Frontend Validation:
- Required fields: taskType, startDate, endDate
- Start date cannot be after end date
- Repeat frequency must be non-negative number

### Backend Validation:
- All frontend validations repeated on server
- Pre-save middleware validates date range
- Pre-update middleware validates date range
- Database schema enforces data types

---

## 8. Key Features

✅ **Full CRUD Operations** - Create, read, update, delete tasks
✅ **Date Management** - Start/end date with validation
✅ **Recurring Tasks** - Configure repeat frequency
✅ **Status Tracking** - Track task progress with 4 status states
✅ **Google Calendar Sync** - One-click sync with Google Calendar
✅ **Notifications** - Option to notify client and dietitian
✅ **Filtering** - Filter by status and date range
✅ **Client Association** - Each task linked to specific client
✅ **Dietitian Tracking** - Tasks associated with creating dietitian
✅ **Database Indexes** - Optimized queries for performance

---

## 9. File Structure

```
/src
├── lib/db/models/
│   └── Task.ts                          # Task schema and model
├── app/api/clients/[clientId]/
│   └── tasks/
│       ├── route.ts                     # GET & POST endpoints
│       └── [taskId]/
│           ├── route.ts                 # GET, PUT, DELETE endpoints
│           └── google-calendar/
│               └── route.ts             # Google Calendar sync endpoints
└── components/
    ├── clientDashboard/
    │   └── TasksSection.tsx             # Main tasks display component
    └── tasks/
        └── CreateTaskDialog.tsx         # Task creation modal
```

---

## 10. Future Enhancements

- [ ] Recurring task instances (create multiple tasks from one recurrence rule)
- [ ] Task templates for common task types
- [ ] Task assignment to multiple dietitians
- [ ] Task attachments/documents
- [ ] Task time tracking/work logs
- [ ] Webhook notifications on task status changes
- [ ] Integration with WhatsApp notifications
- [ ] Bulk task creation
- [ ] Task analytics and reporting
- [ ] Task history and audit trail

---

## 11. Troubleshooting

### Tasks not appearing:
- Verify client ID is correct
- Check MongoDB connection
- Ensure user has read permissions

### Google Calendar sync failing:
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set
- Check that user has Google Calendar connected
- Verify OAuth tokens are not expired
- Check browser console for detailed error messages

### Date validation errors:
- Ensure start date is before or equal to end date
- Use YYYY-MM-DD format for date strings

---

This task management system provides a complete solution for dietitian-client task management with professional-grade Google Calendar integration!
