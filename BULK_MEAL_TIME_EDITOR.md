# Bulk Meal Time Editor Feature

## Overview
Added a new feature to set and manage meal times efficiently. Users can now:
1. Use default meal times with a single click
2. Bulk update meal times across all days and meal types at once
3. Apply standard meal times instantly without manual edits

## Default Meal Times (24-hour format)
- **Breakfast** - 07:00 (7:00 AM)
- **Mid Morning** - 09:00 (9:00 AM)
- **Lunch** - 13:00 (1:00 PM)
- **Evening Snack** - 17:00 (5:00 PM)
- **Dinner** - 21:00 (9:00 PM)
- **Bedtime** - 23:00 (11:00 PM)

## How to Use

### 1. Open Bulk Time Editor
- Click the **⏰ Edit Meal Times** button in the meal plan dashboard
- Located next to "Add Meal Type" and "Find & Replace" buttons
- Available only in edit mode (not in read-only mode)

### 2. Edit Individual Meal Times
- For each meal type, you'll see a time picker input
- Adjust the time as needed for each meal
- Changes are NOT saved until you click "Update All Times"

### 3. Apply Default Times (Quick Action)
- Click the **📋 Apply Default Times** button to instantly set all times to:
  - Breakfast: 7:00 AM
  - Mid Morning: 9:00 AM
  - Lunch: 1:00 PM
  - Evening Snack: 5:00 PM
  - Dinner: 9:00 PM
  - Bedtime: 11:00 PM

### 4. Update All Days
- Click **Update All Times** button to apply changes to ALL days in the meal plan
- This updates every day simultaneously - no need to edit each day individually

## Files Modified

### 1. DietPlanDashboard.tsx
- Updated default meal times from:
  - Mid Morning: 10:00 → 09:00
  - Evening Snack: 16:00 → 17:00
  - Dinner: 19:00 → 21:00
  - Bedtime: 21:00 → 23:00

### 2. MealGridTable.tsx
- **Added State Variables:**
  - `bulkTimeEditorOpen`: Controls dialog visibility
  - `mealTimesForBulkEdit`: Stores edited meal times
  
- **Added Functions:**
  - `openBulkTimeEditor()`: Initializes bulk editor with current times
  - `handleBulkTimeUpdate()`: Applies new times to all days
  - `applyDefaultMealTimes()`: Sets all times to defaults
  
- **Added UI:**
  - **⏰ Edit Meal Times** button in toolbar
  - Dialog with time picker for each meal type
  - "Apply Default Times" quick action button
  - "Update All Times" confirmation button

- **Updated:** `mealTimeSuggestions` with new default times

## Technical Details

### Data Flow
1. User clicks "⏰ Edit Meal Times"
2. Current meal times are loaded into `mealTimesForBulkEdit` state
3. User adjusts times in the modal
4. On confirmation, `handleBulkTimeUpdate()` is triggered:
   - Iterates through all days in `weekPlan`
   - Updates each meal's time property
   - Calls `onUpdate()` to notify parent component
   - Closes the dialog

### Database Persistence
- Meal times are part of the `mealTypeConfigs` array
- Auto-saved to localStorage draft every 2 seconds
- Persisted to database when user clicks "Save" or "Publish"

### Backward Compatibility
- Existing meal plans maintain their times
- Only new/default meal plans use the new times
- No breaking changes to data structure

## User Experience

### Before
- Had to manually edit each meal's time individually
- For a 7-day plan with 6 meals, that's 42 individual edits
- No quick way to reset to defaults

### After
- One-click "Apply Defaults" button sets all times at once
- "Update All Times" applies to all days simultaneously
- Significantly reduces manual work
- Cleaner, more intuitive interface

## Example Scenario

**Scenario:** User wants to change from default times to late schedule
- Times: 8:30 AM → 10:30 AM → 2:00 PM → 6:00 PM → 10:00 PM → 12:00 AM

**Steps:**
1. Click "⏰ Edit Meal Times"
2. Adjust each time in the modal
3. Click "Update All Times"
4. All days are updated instantly ✓

**vs Old Way:**
- Would need to edit each day individually (7 days × 6 meals = 42 clicks)

## Future Enhancements
- [ ] Save custom meal time presets (e.g., "Early Schedule", "Late Schedule")
- [ ] Copy meal times from existing templates
- [ ] Time conflict detection (warn if meals overlap)
- [ ] Meal time analytics (show typical meal times across all clients)

---

**Last Updated:** January 21, 2026
**Feature Status:** ✅ Complete and Live
