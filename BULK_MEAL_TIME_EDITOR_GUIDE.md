# Bulk Meal Time Editor - User Guide with Screenshots

## Feature Highlights

### Default Meal Schedule
```
┌─────────────────────────────────────────────┐
│ MEAL TIMING (Default Schedule)              │
├─────────────────────────────────────────────┤
│ Breakfast      → 07:00 (7:00 AM)            │
│ Mid Morning    → 09:00 (9:00 AM)            │
│ Lunch          → 13:00 (1:00 PM)            │
│ Evening Snack  → 17:00 (5:00 PM)            │
│ Dinner         → 21:00 (9:00 PM)            │
│ Bedtime        → 23:00 (11:00 PM)           │
└─────────────────────────────────────────────┘
```

## How to Access the Feature

### Step 1: Locate the Button
```
Diet Plan Dashboard Toolbar
┌────────────────────────────────────────────┐
│ [+ Add Meal Type] [⏰ Edit Meal Times] [Find & Replace] │
│                    ↑                       │
│           Click this button                │
└────────────────────────────────────────────┘
```

### Step 2: Dialog Opens
```
╔════════════════════════════════════════╗
║        Edit Meal Times                 ║
║                                        ║
║ Update times for all meal types        ║
║ across all days at once.               ║
╟────────────────────────────────────────╢
║                                        ║
║ Breakfast    [07:00 ▼]                 ║
║ Mid Morning  [09:00 ▼]                 ║
║ Lunch        [13:00 ▼]                 ║
║ Evening Snack[17:00 ▼]                 ║
║ Dinner       [21:00 ▼]                 ║
║ Bedtime      [23:00 ▼]                 ║
║                                        ║
║ ┌──────────────────────────────────┐  ║
║ │ 📋 Apply Default Times            │  ║
║ ├──────────────────────────────────┤  ║
║ │ Breakfast: 7 AM, Mid Morning: 9  │  ║
║ │ AM, Lunch: 1 PM, Snack: 5 PM,    │  ║
║ │ Dinner: 9 PM, Bedtime: 11 PM     │  ║
║ └──────────────────────────────────┘  ║
║                                        ║
║ [Cancel] [Update All Times]            ║
╚════════════════════════════════════════╝
```

## Usage Scenarios

### Scenario 1: Use Default Times (Fastest Way)
```
Goal: Set all meals to standard times for 7-day plan

Action:
1. Click "⏰ Edit Meal Times" button
2. Click "📋 Apply Default Times" button
3. Click "Update All Times"

Result: ✅ All 7 days × 6 meals updated in < 5 seconds
```

### Scenario 2: Custom Times
```
Goal: Create a late morning schedule

Timeline:
- Breakfast: 08:30
- Mid Morning: 10:30
- Lunch: 14:00
- Evening Snack: 17:30
- Dinner: 20:30
- Bedtime: 22:30

Action:
1. Click "⏰ Edit Meal Times"
2. Manually adjust each time in the pickers
3. Click "Update All Times"

Result: ✅ All custom times applied across all days
```

### Scenario 3: Quick Adjustment
```
Goal: Shift all meals 30 minutes earlier

Current: 7:00 → 9:00 → 13:00 → 17:00 → 21:00 → 23:00
Desired: 6:30 → 8:30 → 12:30 → 16:30 → 20:30 → 22:30

Action:
1. Click "⏰ Edit Meal Times"
2. Adjust each time (subtract 30 minutes)
3. Click "Update All Times"

Result: ✅ New schedule applied to all days at once
```

## Before & After Comparison

### Before Feature (Manual Editing)
```
Old Way: Edit each day individually
┌─────────────────────┐
│ Monday              │ ← Edit Breakfast time
│ [Edit button]       │ ← Edit Mid Morning time
│ [Edit button]       │ ← Edit Lunch time
│ ... 6 meals × 7 days = 42 clicks
└─────────────────────┘

Time Required: ~5-10 minutes
Effort: Very high (repetitive)
Error Risk: High (manual mistakes)
```

### After Feature (Bulk Editing)
```
New Way: Update all at once
┌──────────────────────────────────────┐
│ Edit Meal Times Dialog               │
│ [Breakfast:  07:00]                  │
│ [Mid Morning: 09:00]                 │
│ [Lunch:      13:00]                  │
│ [Snack:      17:00]                  │
│ [Dinner:     21:00]                  │
│ [Bedtime:    23:00]                  │
│                                      │
│ [Apply Defaults] [Update All Times] │
└──────────────────────────────────────┘

Time Required: < 1 minute
Effort: Minimal (one action)
Error Risk: Low (instant verification)
```

## Tips & Tricks

### ✅ Pro Tips
1. **Use Apply Defaults First** - Start with defaults, then fine-tune
2. **Check Before Confirming** - Review all times before clicking "Update"
3. **Draft Auto-Saves** - Changes auto-save every 2 seconds
4. **Undo Available** - Use draft restore if you make a mistake

### ⚠️ Important Notes
- Times must be in 24-hour format (00:00 - 23:59)
- Times are updated across ALL days instantly
- No need to save each day individually
- Changes persist in draft until officially saved

## Common Questions

**Q: What if I change times but don't click "Update All Times"?**
A: Changes are discarded when you close the dialog. Click "Update All Times" to save.

**Q: Can I change times for specific days only?**
A: Not with bulk editor. Use individual day editing for single-day changes.

**Q: Does this affect existing meals?**
A: Yes, it updates all meal types in the plan. Draft saves occur automatically.

**Q: How do I reset to defaults after custom changes?**
A: Open the editor again and click "Apply Default Times".

**Q: Will changes save automatically?**
A: Changes save to draft immediately, but you must click "Save"/"Publish" for final save.

## Visual Workflow

```
                    Start
                     ↓
              Click ⏰ Button
                     ↓
        ╔════════════════════════╗
        ║  Meal Time Editor      ║
        ╠════════════════════════╣
        ║                        ║
        ║  Option A: Quick       ║
        ║  ┌──────────────────┐  ║
        ║  │Apply Defaults ▼  │  ║
        ║  └──────────────────┘  ║
        ║           ↓             ║
        ║  Option B: Manual      ║
        ║  ┌──────────────────┐  ║
        ║  │Edit each time    │  ║
        ║  │picker manually   │  ║
        ║  └──────────────────┘  ║
        ║                        ║
        ║  [Cancel]  [Update]    ║
        └────┬──────────┬────────┘
             │          │
          Cancel    Update All
             ↓          ↓
         Discard    Apply to
         Changes    All Days
             ↓          ↓
          Close      ✅ Done
                 Auto-save draft
```

---

**Last Updated:** January 21, 2026
**Status:** ✅ Feature Live
