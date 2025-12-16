# Hold/Freeze Feature - Quick Reference Guide

## What Changed

### 1. Hold Button - Now Toggles
| State | Button Shows | Color | Action |
|-------|--------------|-------|--------|
| Plan Active | ❄️ Freeze Days | Cyan | Hold the plan |
| Plan Paused | ▶️ Resume Plan | Green | Resume the plan |

### 2. Dialog - Shows Different Content
**When Holding**:
- Date picker to select hold start date
- Duration selector (1-7 days or custom)
- Reason input (optional)
- Preview of new end date
- Button: "❄️ Freeze X Day(s)"

**When Resuming**:
- Current hold status display
- Total frozen days count
- Last hold date shown
- Button: "▶️ Resume Plan"

### 3. Meal Table - Held Days Are Blurred
| Feature | Held Days | Copied Days |
|---------|-----------|-------------|
| Background | Cyan (#B2EBF2) | Light Green (#C8E6C9) |
| Effect | Blur + 50% opacity | Normal |
| Badge | ❄️ HELD (cyan) | ↻ Rescheduled (green) |
| Overlay | "FROZEN" message | None |
| Editable | ❌ No (disabled) | ✅ Yes (editable) |

### 4. Date Sync - Automatic
When a plan is extended by hold:
- Next plan starts after this plan ends
- Each plan keeps original duration
- No overlaps occur
- Happens automatically

---

## How It Works

### Freezing a Plan
```
1. Click "❄️ Freeze Days" button
   ↓
2. Select date and duration
   ↓
3. Click "❄️ Freeze X Day(s)"
   ↓
4. Plan extends by that many days
   ↓
5. Held days marked as blurred
   ↓
6. Meals copied to end of plan
   ↓
7. Subsequent plans adjust dates
   ↓
8. Button changes to "▶️ Resume Plan"
   ↓
9. Plan status: paused
```

### Resuming a Plan
```
1. Click "▶️ Resume Plan" button
   ↓
2. Confirm resume action
   ↓
3. Plan becomes active again
   ↓
4. Held days no longer blurred
   ↓
5. Button changes to "❄️ Freeze Days"
   ↓
6. Plan status: active
```

---

## Conditions & Rules

### To Hold a Plan:
- ✅ Completion must be **< 50%**
- ✅ Plan must be **active**
- ✅ Select **1-30 days** to hold
- ✅ Optional reason for hold

### Automatic Actions:
- ✅ Plan status → 'paused'
- ✅ End date extended by hold days
- ✅ Subsequent plans dates adjusted
- ✅ Hold record saved to database

### Cannot Hold If:
- ❌ Completion is 50% or more
- ❌ Plan is already paused (can resume instead)

---

## Visual Indicators

### Plan Card
- Shows: "❄️ X day(s) frozen" if any holds exist
- Shows: Last hold date
- Button changes color/text based on status

### Meal Table - Held Days
```
┌─────────────────────────────────────────┐
│         ❄️ FROZEN - Diet on Hold        │
├─────────────────────────────────────────┤
│ Day X - Mon [❄️ HELD]                   │
├─────────────────────────────────────────┤
│ (Content blurred + cyan background)     │
└─────────────────────────────────────────┘
```

### Meal Table - Rescheduled Days
```
┌─────────────────────────────────────────┐
│ Day Y - Tue [↻ Rescheduled]             │
├─────────────────────────────────────────┤
│ (Normal green background, editable)     │
│ (Same meals as held days above)         │
└─────────────────────────────────────────┘
```

---

## Database Changes

### New Fields in Meals
```typescript
{
  // Existing fields...
  meals: { /* ... */ },
  
  // NEW - Hold-related
  isHeld?: boolean,              // true = original held day
  isCopiedFromHold?: boolean,    // true = rescheduled at end
  holdReason?: string,           // why it was held
  holdDate?: string,             // when it was held
  originalDayIndex?: number,     // reference to original
}
```

### Hold Record in Array
```typescript
{
  originalDate: Date,           // date to start holding from
  holdStartDate: Date,          // when hold was created
  holdDays: number,             // how many days frozen
  reason: string,               // optional reason
  completionAtHold: number      // completion % at time
}
```

---

## API Endpoints

### POST - Hold Days
```
POST /api/client-meal-plans/[id]/hold
{
  holdDays: 3,
  holdDate: "2025-12-15",
  reason: "Traveling"
}
```
**Response**: Updated meal plan with held days marked and copied

### GET - Check Eligibility
```
GET /api/client-meal-plans/[id]/hold
```
**Response**: 
```json
{
  success: true,
  canHold: true/false,
  completionPercentage: 45,
  totalHeldDays: 0,
  status: "active"
}
```

### PUT - Resume Plan
```
PUT /api/client-meal-plans/[id]/hold
{
  action: "resume"
}
```
**Response**: Updated meal plan with status "active"

---

## Common Scenarios

### Scenario 1: Client Traveling (3 Days)
1. Plan is at 30% completion
2. Client will be traveling Dec 15-17
3. Click "Freeze Days"
4. Select Dec 15, choose 3 days
5. Reason: "Traveling"
6. ✅ Days 15-17 frozen (blurred)
7. ✅ Dec 15-17 meals copied to end
8. ✅ Plan extended by 3 days
9. ✅ Next plan (if exists) starts Dec 19

### Scenario 2: Resume After Hold
1. Client is back and ready
2. Plan is still paused
3. Click "Resume Plan"
4. Confirm
5. ✅ Plan is now active again
6. ✅ Can be frozen again (if < 50%)

### Scenario 3: Multiple Holds
1. Hold on Dec 15-17 (3 days)
2. Later, hold on Jan 5-7 (3 days)
3. ✅ Both holds tracked in holdDays array
4. ✅ Total held days: 6
5. ✅ End date extended by 6 days total

---

## Troubleshooting

### Cannot Hold Plan?
- Check if completion ≥ 50% → Not eligible
- Check if plan is active → Can't hold paused plan
- Resume first if paused, then hold again

### Dates Not Syncing?
- Server was restarted → Check browser console
- Try refreshing page
- Check if subsequent plans exist

### Blurred Days Not Showing?
- Clear browser cache
- Refresh page (F5)
- Verify isHeld field in database
- Check browser DevTools console

### Meals Not Copied?
- Check meal data is not null/undefined
- Verify meals array has content
- Check holdDate is within plan dates
- Look at API response for errors

---

## Performance Tips

- ⚡ Holds are applied asynchronously
- ⚡ Date sync happens after hold
- ⚡ Database uses $set for efficiency
- ⚡ Only refreshes plan list on success

---

## Files Modified

1. **PlanningSection.tsx** - Hold button & dialog logic
2. **DietPlanDashboard.tsx** - Preserve hold fields in meals
3. **MealGridTable.tsx** - Visual styling for blur effect
4. **ClientMealPlan.ts** - Database schema (unchanged)
5. **hold/route.ts** - API endpoints (unchanged)

---

## Feature Complete ✅

All requirements implemented:
- ✅ Toggle Hold/Unhold button
- ✅ Date sync (no overlaps)
- ✅ Blur held days in meal table
- ✅ Copy held meals to end

Status: **Ready for Production** 🚀
