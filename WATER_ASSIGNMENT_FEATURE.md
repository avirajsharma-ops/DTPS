# Water Assignment Feature - Complete

## Overview
This feature allows dietitians to assign daily water intake goals to their clients. Clients can view their assigned water goal, track their intake, and mark the task as complete.

## Features Implemented

### 1. User Hydration Page (`/user/hydration`)
- **Water Glass Animation**: Visual representation of water intake with fill animation
- **Quick Add Buttons**: 250ml, 500ml, 750ml quick add options
- **Custom Amount Modal**: Add custom water amounts with +100, +250, +500 increments
- **Assigned Water Section**: Shows dietitian-assigned water goal with "Done" button
- **Date Selector**: View hydration history for different dates
- **Today's History**: List of all water entries with delete option
- **Custom Bottom Navigation**: Water droplet icon in center

### 2. Dietitian Water Assignment (in Journal → Water tab)
- **Assign Water Goal**: Set daily water intake goal for clients (ml)
- **Quick Preset Buttons**: 2L, 2.5L, 3L, 3.5L presets
- **Status Display**: Shows if assigned water is pending or completed
- **Update/Remove Options**: Update existing assignment or remove it
- **Completion Tracking**: Green badge shows when client marks as complete

### 3. Database Schema Updates
Added `assignedWater` field to `JournalTracking` model:
```typescript
assignedWater: {
  amount: number;        // Water amount in ml
  assignedBy: ObjectId;  // Dietitian who assigned
  assignedAt: Date;      // When assigned
  isCompleted: boolean;  // Client completion status
  completedAt: Date;     // When completed
}
```

### 4. API Endpoints

#### Client APIs:
- `GET /api/client/hydration?date=YYYY-MM-DD` - Get hydration data with assigned water
- `POST /api/client/hydration` - Add water entry
- `DELETE /api/client/hydration?id=entryId` - Delete water entry
- `PATCH /api/client/hydration` - Mark assigned water as complete

#### Admin/Dietitian APIs:
- `GET /api/admin/clients/[clientId]/assign-water` - Get assigned water status
- `POST /api/admin/clients/[clientId]/assign-water` - Assign water goal
- `DELETE /api/admin/clients/[clientId]/assign-water` - Remove assigned water

## User Flow

### Dietitian Flow:
1. Go to client detail page → Journal section → Water tab
2. See "Assign Water Intake Goal" card at top
3. Enter amount (ml) or use preset buttons (2L, 2.5L, 3L, 3.5L)
4. Click "Assign" button
5. See status badge: "Pending" (orange) or "Completed" (green)
6. Update or remove assignment as needed

### Client Flow:
1. Click water card on dashboard (or Quick Log water item)
2. Opens `/user/hydration` page
3. See assigned water section if dietitian has set a goal
4. Track water intake using quick add buttons or custom amount
5. Click "Done" button when assigned water goal is achieved
6. Completion is reflected in dietitian's dashboard

## Files Modified/Created

### New Files:
- `/src/app/user/hydration/page.tsx` - Complete hydration tracking page
- `/src/app/api/admin/clients/[clientId]/assign-water/route.ts` - Dietitian API

### Modified Files:
- `/src/lib/db/models/JournalTracking.ts` - Added assignedWater schema
- `/src/app/api/client/hydration/route.ts` - Added date param, PATCH method
- `/src/components/journal/WaterSection.tsx` - Added assign water UI
- `/src/app/user/page.tsx` - Made water card clickable
- `/src/app/user/dashboard/page.tsx` - Made water card clickable

## Testing

### Test Dietitian Assignment:
1. Login as dietitian
2. Go to any client → Journal → Water tab
3. Assign 2500ml water goal
4. Verify badge shows "Pending"

### Test Client Side:
1. Login as client
2. Click water card on dashboard
3. See assigned water goal displayed
4. Add water entries
5. Click "Done" when finished
6. Verify toast shows success

### Test Completion Reflection:
1. As client, mark assigned water as complete
2. As dietitian, check client's Water tab
3. Badge should show green "Completed"
4. Completion timestamp should be displayed

## UI/UX Notes

- Blue gradient theme for hydration pages
- Water glass SVG with animated fill level
- Green checkmark for completed status
- Orange badge for pending status
- Responsive design for mobile and desktop
- Custom bottom navigation with water droplet icon
