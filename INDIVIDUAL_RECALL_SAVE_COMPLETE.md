# Individual Dietary Recall Entry Save & Delete Feature

## Summary
Successfully implemented the ability to save and delete dietary recall entries **one by one** directly to the database. Each entry can now be individually saved, updated, or deleted without affecting other entries.

## Changes Made

### 1. Updated RecallEntry Interface ✅
**File:** `/src/components/clients/RecallForm.tsx`

Added `_id` field to track saved entries:
```typescript
export interface RecallEntry {
  id: string;
  _id?: string; // MongoDB ID for saved entries
  mealType: string;
  hour: string;
  minute: string;
  meridian: 'AM' | 'PM';
  food: string;
  amount: string;
  notes: string;
}
```

### 2. Enhanced RecallForm Component ✅
**File:** `/src/components/clients/RecallForm.tsx`

**New Props:**
- `onSaveEntry?: (entry: RecallEntry) => Promise<void>` - Save individual entry
- `onDeleteEntry?: (entryId: string) => Promise<void>` - Delete individual entry

**Updated UI:**
Each dietary recall entry now has:
- **Save Entry Button** (Green) - Saves/updates the specific entry to database
- **Delete Button** (Red) - Deletes saved entry from database (only shows if entry has `_id`)
- **Remove Button** (Gray) - Removes unsaved entry from form (only shows if no `_id`)

### 3. Added Individual Entry Handlers ✅
**File:** `/src/app/dietician/clients/[clientId]/page.tsx`

**handleSaveRecallEntry:**
- Checks if entry has `_id` (existing entry)
  - **If yes:** Makes PUT request to `/api/users/[id]/recall/[recallId]` to update
  - **If no:** Makes POST request to `/api/users/[id]/recall` to create new entry
- Shows success/error toast notification
- Refreshes client details to load updated data

**handleDeleteRecallEntry:**
- Makes DELETE request to `/api/users/[id]/recall/[entryId]`
- Updates local state to immediately remove entry from UI
- Shows success/error toast notification

### 4. Updated FormsSection Component ✅
**File:** `/src/components/clientDashboard/FormsSection.tsx`

**New Props:**
- `handleSaveRecallEntry?: (entry: RecallEntry) => Promise<void>`
- `handleDeleteRecallEntry?: (entryId: string) => Promise<void>`

Passes these handlers to RecallForm component.

### 5. Enhanced Data Loading ✅
**File:** `/src/app/dietician/clients/[clientId]/page.tsx`

Updated recall data loading to properly map database entries:
- Fetches from `/api/users/[id]/recall` API
- Maps entries to include both `id` and `_id` fields
- `_id` tracks saved database entries
- `id` is used for React key and local state management
- Fallback to embedded data for backward compatibility

## User Flow

### Saving a Single Entry:
1. User fills in dietary recall entry details (meal type, time, food, amount, notes)
2. User clicks **"Save Entry"** button on that specific entry
3. System:
   - Sends POST request (new entry) or PUT request (existing entry)
   - Saves to DietaryRecall collection in database
   - Shows success toast
   - Refreshes data to load the saved entry with `_id`
4. Entry now shows **"Delete"** button instead of "Remove"

### Updating a Saved Entry:
1. User modifies any field in a saved entry (has `_id`)
2. User clicks **"Save Entry"** button
3. System:
   - Sends PUT request to `/api/users/[id]/recall/[recallId]`
   - Updates the entry in database
   - Shows success toast
   - Refreshes data

### Deleting a Saved Entry:
1. User clicks **"Delete"** button on saved entry
2. System:
   - Sends DELETE request to `/api/users/[id]/recall/[recallId]`
   - Removes entry from database
   - Immediately removes from UI
   - Shows success toast

### Removing Unsaved Entry:
1. User clicks **"Remove"** button on unsaved entry (no `_id`)
2. Entry is removed from local state only (not in database yet)

## API Endpoints Used

### POST /api/users/[id]/recall
- **Purpose:** Create new dietary recall entry
- **Body:** Single entry object (mealType, hour, minute, meridian, food, amount, notes)
- **Response:** `{ success: true, entries: [savedEntry] }`

### PUT /api/users/[id]/recall/[recallId]
- **Purpose:** Update existing dietary recall entry
- **Body:** Updated entry fields
- **Response:** `{ success: true, entry: updatedEntry }`

### DELETE /api/users/[id]/recall/[recallId]
- **Purpose:** Delete dietary recall entry
- **Response:** `{ success: true, message: 'Dietary recall entry deleted' }`

### GET /api/users/[id]/recall
- **Purpose:** Fetch all dietary recall entries for user
- **Response:** `{ success: true, entries: [...] }`

## Benefits

### 1. **Granular Control**
- Save only the entries you've completed
- No need to save all entries at once
- Edit specific entries without affecting others

### 2. **Better UX**
- Immediate feedback on save/delete actions
- Clear visual distinction between saved and unsaved entries
- Individual entry validation and error handling

### 3. **Data Integrity**
- Each entry saved immediately to database
- No data loss if user navigates away after saving some entries
- Atomic operations for create/update/delete

### 4. **Flexibility**
- Can work on entries across multiple sessions
- Can delete entries that are no longer relevant
- Can update entries as information changes

## Visual Indicators

### Unsaved Entry (no _id):
```
┌─────────────────────────────────────────┐
│ Early Morning                  8:00 AM  │
│ Food Details: [empty]                   │
│ Amount: [empty]  Notes: [empty]         │
│                        [Remove] ←gray    │
└─────────────────────────────────────────┘
```

### Saved Entry (has _id):
```
┌─────────────────────────────────────────┐
│ BreakFast                     10:00 AM  │
│ Food Details: Oats with milk            │
│ Amount: 1 bowl  Notes: With honey       │
│              [Save Entry] [Delete] ←red │
│                   ↑green                │
└─────────────────────────────────────────┘
```

## Testing Checklist

- [x] Create new dietary recall entry and save individually
- [x] Update existing entry and verify changes persist
- [x] Delete saved entry and verify removal from database
- [x] Remove unsaved entry and verify only local state changes
- [x] Save multiple entries individually
- [x] Verify each entry shows correct buttons (Save/Delete vs Remove)
- [x] Test error handling for failed save/delete operations
- [x] Verify toast notifications appear correctly
- [x] Confirm data refreshes after save/delete
- [x] Check that _id field is properly set after save

## Files Modified

1. `/src/components/clients/RecallForm.tsx` - Added _id field, individual save/delete buttons
2. `/src/components/clientDashboard/FormsSection.tsx` - Added handler props
3. `/src/app/dietician/clients/[clientId]/page.tsx` - Added handleSaveRecallEntry & handleDeleteRecallEntry

## Database Schema

Each dietary recall entry is stored in the `DietaryRecall` collection:

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref to User),
  mealType: String,
  hour: String,
  minute: String,
  meridian: 'AM' | 'PM',
  food: String,
  amount: String,
  notes: String,
  date: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Status: ✅ COMPLETE

You can now edit and save dietary recall entries one by one to the database!
