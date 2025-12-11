# Task Management System - Visual Quick Reference

## 🎨 UI Layout & Components

### Tasks Section Layout
```
┌────────────────────────────────────────────────────────────┐
│                    🎯 TASKS SECTION                        │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  [Back] Tasks              [+ Create Task]                  │
│                                                              │
│  Filter:                                                     │
│  [All (15)] [Pending (8)] [Completed (7)]                  │
│                                                              │
│  Task Card Example:                                         │
│  ┌─────────────────────────────────────────────┐           │
│  │ [pending] Form Allotment              [🗑️]  │           │
│  │ Complete health assessment                  │           │
│  │ Fill out the health assessment form         │           │
│  │                                             │           │
│  │ 📅 Dec 15 - Dec 20  │  🕐 10:00 AM         │           │
│  │ Repeat: No          │  ✓ Synced to Calendar│           │
│  │                                             │           │
│  │ [✓ Mark Complete] [Remove] [🗑️]            │           │
│  └─────────────────────────────────────────────┘           │
│                                                              │
│  More task cards...                                         │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### Create Task Dialog
```
┌────────────────────────────────────────┐
│         CREATE TASK DIALOG             │
├────────────────────────────────────────┤
│                                        │
│  Task Type *          │ Select Type  ▼│  (dropdown)
│  Select Contact       │ Search...    ▼│  (search)
│                                        │
│  Start Date *         │ 2025-12-15   │  (date picker)
│  End Date *           │ 2025-12-20   │  (date picker)
│                                        │
│  Task Allotment Time  │ 10:00 AM    ▼│  (time selector)
│  Repeat Frequency     │ 0            │  (number)
│                                        │
│  ☑ Notify Customer on chat            │  (checkbox)
│                                        │
│  Notify practitioner on completion    │
│  │ practitioner@email.com             │  (text field)
│                                        │
│  Message                              │
│  ┌──────────────────────────────────┐ │
│  │ Write your message here          │ │  (textarea)
│  │                                  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  [Cancel]  [Save] ━━━━━━━━━            │  (buttons)
│                                        │
└────────────────────────────────────────┘
```

---

## 🔄 Data Flow Visualization

### Task Creation Flow
```
START
  │
  ├─ User clicks [+ Create Task]
  │   │
  │   └─ CreateTaskDialog opens
  │
  ├─ User fills form:
  │   ├─ Task Type (dropdown)
  │   ├─ Dates (date pickers)
  │   ├─ Time (time selector)
  │   └─ Description (textarea)
  │
  ├─ User clicks [Save]
  │   │
  │   ├─ Frontend Validation
  │   │   ├─ Required fields?
  │   │   └─ Valid date range?
  │   │
  │   └─ If valid → POST /api/clients/{id}/tasks
  │       │
  │       ├─ Server Validation
  │       │   ├─ Auth check
  │       │   ├─ Field validation
  │       │   └─ Date validation
  │       │
  │       └─ Save to MongoDB
  │           │
  │           └─ Return Task Object
  │
  ├─ Close dialog
  ├─ Show success toast
  └─ Refresh task list

END
```

### Google Calendar Sync Flow
```
START
  │
  ├─ User clicks [📅 Sync to Calendar]
  │   │
  │   └─ Set syncing state = taskId
  │
  ├─ POST /api/clients/{id}/tasks/{taskId}/google-calendar
  │   │
  │   ├─ Check auth
  │   │
  │   ├─ Fetch task details from DB
  │   │
  │   ├─ Get user's Google tokens
  │   │   ├─ accessToken
  │   │   └─ refreshToken
  │   │
  │   ├─ Create Google Calendar event:
  │   │   ├─ Title: "Task: {Type} - {Title}"
  │   │   ├─ Description: task description
  │   │   ├─ Start: task startDate
  │   │   ├─ End: task endDate
  │   │   └─ Reminders: default
  │   │
  │   ├─ Get event ID from Google
  │   │
  │   └─ Save event ID to Task DB
  │
  ├─ Return success response
  │
  ├─ Clear syncing state
  ├─ Show success toast
  ├─ Update task card
  └─ Button changes to [Remove]

END
```

---

## 📱 Task Card Components

### Task Status Badges
```
[pending]       [in-progress]    [completed]    [cancelled]
yellow bg       blue bg          green bg       red bg
white text      white text       white text     white text
```

### Task Card Sections
```
┌─────────────────────────────────────┐
│ HEADER SECTION                      │
├─────────────────────────────────────┤
│ [Status Badge] Task Type      [🗑️]  │
│ Title / Summary                     │
│ Description (optional)              │
├─────────────────────────────────────┤
│ DETAILS SECTION                     │
├─────────────────────────────────────┤
│ 📅 Start - End Date                │
│ 🕐 Allotted Time                   │
│ 🔄 Repeat: info                    │
│ ✓ Google Calendar Status           │
├─────────────────────────────────────┤
│ ACTIONS SECTION                     │
├─────────────────────────────────────┤
│ [✓ Mark Complete] [Sync] [Remove]  │
└─────────────────────────────────────┘
```

---

## ⏰ Time Selection Format

### Available Times (30-minute increments)
```
Morning (AM):
12:00 AM, 12:30 AM, 01:00 AM, 01:30 AM, 02:00 AM ... 11:30 AM

Afternoon/Evening (PM):
12:00 PM, 12:30 PM, 01:00 PM, 01:30 PM, 02:00 PM ... 11:30 PM

Total: 48 time options available
```

---

## 🎯 Task Type Icons/Labels

```
✅ General Followup         → Follow up with client
📝 Habit Update            → Update client habits
📅 Session Booking         → Schedule a session
✍️  Sign Document          → Sign required document
📋 Form Allotment         → Complete a form
📤 Report Upload          → Upload report
📔 Diary Update           → Update diary/log
📏 Measurement Update     → Record measurements
🏃 BCA Update            → Body composition analysis
📊 Progress Update        → Log progress
```

---

## 🔐 Authentication & Authorization

### Required for All Operations
```
┌─────────────────────┐
│ NextAuth Session    │
│ - User logged in    │
│ - Valid JWT token   │
│ - User ID present   │
└─────────────────────┘
         ↓
┌─────────────────────┐
│ Check Ownership     │
│ - User owns task    │
│ - User is dietitian │
└─────────────────────┘
         ↓
┌─────────────────────┐
│ Allow Operation     │
└─────────────────────┘
```

---

## 📊 Status Lifecycle

```
                    ┌─────────────┐
                    │   PENDING   │ (Initial State)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ IN-PROGRESS │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
         ┌────▼─────┐          ┌────────▼─────┐
         │ COMPLETED│          │  CANCELLED   │
         └──────────┘          └──────────────┘
         
Note: Can cancel from any state
```

---

## 🗄️ Database Relationships

```
User Model                  Task Model
┌──────────────┐           ┌──────────────┐
│ _id: ObjectId├──┐        │ _id: ObjectId│
│ email        │  │        │ client ──────┼──→ User
│ firstName    │  │        │ dietitian ───┼──→ User
│ ...          │  │        │ taskType     │
└──────────────┘  │        │ startDate    │
                  │        │ endDate      │
              ┌───┴────────┤ status       │
              │            │ googleCalend│
              │            │ EventId     │
              │            │ ...         │
              │            └──────────────┘
              └─ References (1 to many)
```

---

## 🌐 API Endpoints Diagram

```
/api/clients/{clientId}/tasks
    │
    ├─ GET     ← Fetch all tasks
    ├─ POST    ← Create task
    │
    └─ /{taskId}
        │
        ├─ GET    ← Get single task
        ├─ PUT    ← Update task
        ├─ DELETE ← Delete task
        │
        └─ /google-calendar
            │
            ├─ POST   ← Sync to Google Calendar
            └─ DELETE ← Remove from Google Calendar
```

---

## 🎨 Color & Status Scheme

```
Status → Color → Text
pending → Yellow (bg-yellow-100) → Yellow-800 text
in-progress → Blue (bg-blue-100) → Blue-800 text
completed → Green (bg-green-100) → Green-800 text
cancelled → Red (bg-red-100) → Red-800 text
```

---

## 📋 Form Field Reference

| Field | Type | Required | Format |
|-------|------|----------|--------|
| taskType | Dropdown | Yes | Enum (10 types) |
| title | Text | No | Any string |
| description | Textarea | No | Max 2000 chars |
| startDate | Date | Yes | YYYY-MM-DD |
| endDate | Date | Yes | YYYY-MM-DD |
| allottedTime | Time | Yes | HH:MM AM/PM |
| repeatFrequency | Number | No | 0 or 1-365 |
| notifyClientOnChat | Boolean | No | true/false |
| notifyDieticianOnCompletion | Text | No | Email/ID |

---

## ✨ Error Messages & Solutions

```
"Start date cannot be after end date"
  → Solution: Select valid date range

"Please fill in all required fields"
  → Solution: Task Type, Start Date, End Date required

"Can only extend plans that have already started"
  → Solution: Task must have started to extend

"Google Calendar not connected"
  → Solution: Connect Google Calendar in settings

"Failed to sync with Google Calendar"
  → Solution: Check internet, refresh OAuth tokens

"Task not found"
  → Solution: Task may have been deleted
```

---

## 🚀 Performance Optimizations

```
Database Indexes:
├─ client + startDate  → Fast task lookup by client
├─ dietitian + startDate → Fast task lookup by dietitian
└─ status → Fast filtering by status

Frontend Optimizations:
├─ Lazy loading of tasks
├─ Pagination (if needed)
├─ Cached API responses
└─ Optimistic UI updates

API Optimizations:
├─ Select only needed fields
├─ Lean queries for lists
├─ Population only when needed
└─ Efficient filtering
```

---

## 📞 Support & Resources

```
Documentation Files:
├─ TASK_MANAGEMENT_DOCUMENTATION.md ← Full API reference
├─ GOOGLE_CALENDAR_INTEGRATION_GUIDE.md ← Calendar guide
├─ TASK_SYSTEM_IMPLEMENTATION.md ← Implementation details
└─ TASK_SYSTEM_FINAL_CHECKLIST.md ← Verification checklist

Code Files:
├─ /src/lib/db/models/Task.ts ← Database schema
├─ /src/app/api/clients/.../tasks/route.ts ← APIs
├─ /src/components/clientDashboard/TasksSection.tsx ← UI
└─ /src/components/tasks/CreateTaskDialog.tsx ← Form
```

---

This visual guide covers all aspects of the task management system!
