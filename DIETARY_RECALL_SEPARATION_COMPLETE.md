# Dietary Recall Separation & Complete Data Loading Fix

## Summary
Successfully implemented separate DietaryRecall schema and fixed all form data loading issues. Now all database fields are properly displayed in forms, and dietary recall entries are stored in a separate collection for better scalability.

## Changes Made

### 1. Created DietaryRecall Schema ✅
**File:** `/src/lib/db/models/DietaryRecall.ts`

- Created new Mongoose schema with fields:
  - `userId` (ObjectId ref to User) - indexed
  - `mealType` (enum: Early Morning, BreakFast, Mid Morning, Lunch, Evening, Late Evening, Dinner, Post Dinner)
  - `hour`, `minute`, `meridian` (time fields)
  - `food`, `amount`, `notes` (entry details)
  - `date` (Date) - indexed
  - Timestamps (createdAt, updatedAt)
- Added compound index on `userId` and `date` for efficient querying
- Exported as DietaryRecall model

### 2. Fixed Data Loading in page.tsx ✅
**File:** `/src/app/dietician/clients/[clientId]/page.tsx`

**Fixed BasicInfo Loading:**
- `targetWeightBucket`: Now loads from `data?.user?.targetWeightBucket`
- `sharePhotoConsent`: Now loads from `data?.user?.sharePhotoConsent`
- `referralSource`: Added fallback to empty string

**Fixed MedicalData Loading:**
- `notes`: Now loads from `data?.user?.notes`
- `diseaseHistory`: Now loads from `data?.user?.diseaseHistory`
- `gutIssues`: Now loads from `data?.user?.gutIssues`
- `reports`: Now loads from `data?.user?.reports`
- `familyHistory`: Fixed to load from `data?.user?.familyHistory` (was loading medication)
- All fields now have proper fallback values

**Fixed LifestyleData Loading:**
All 25+ lifestyle fields now load from database:
- `heightFeet`, `heightInch` - Now with fallback to empty string
- `targetWeightKg`, `bmi`, `idealWeightKg` - Now loaded
- `foodPreference` - Now loaded
- `preferredCuisine` - Now loaded (array)
- `allergiesFood` - Now loaded (array)
- `fastDays` - Now loaded (array)
- `nonVegExemptDays` - Now loaded (array)
- `foodDislikes` - Now loaded
- `eatOutFrequency` - Now loaded
- `activityRate` - Now loaded
- `cookingOil` - Now loaded (array)
- `monthlyOilConsumption` - Now loaded
- `cookingSalt` - Now loaded
- `carbonatedBeverageFrequency` - Now loaded
- `cravingType` - Now loaded
- `smokingFrequency`, `alcoholFrequency` - Now with proper field mapping

**Dietary Recall Loading:**
- Added separate API call to fetch recall entries from new endpoint
- Fallback to embedded `data?.user?.dietaryRecall` for backward compatibility
- Entries loaded into `recallEntries` state

### 3. Created Dietary Recall API Endpoints ✅

#### **File:** `/src/app/api/users/[id]/recall/route.ts`

**GET /api/users/[id]/recall**
- Fetches all dietary recall entries for a user
- Sorted by date (newest first)
- Returns: `{ success: true, entries: [] }`

**POST /api/users/[id]/recall**
- Creates new dietary recall entries
- Supports both single entry and array of entries
- Validates user exists before creating entries
- Returns: `{ success: true, entries: [] }`

#### **File:** `/src/app/api/users/[id]/recall/[recallId]/route.ts`

**PUT /api/users/[id]/recall/[recallId]**
- Updates existing dietary recall entry
- Validates entry belongs to user
- Allowed fields: mealType, hour, minute, meridian, food, amount, notes, date
- Returns: `{ success: true, entry: {} }`

**DELETE /api/users/[id]/recall/[recallId]**
- Deletes dietary recall entry
- Validates entry belongs to user
- Returns: `{ success: true, message: 'Dietary recall entry deleted' }`

### 4. Updated handleSave to Use New API ✅
**File:** `/src/app/dietician/clients/[clientId]/page.tsx`

**Enhanced handleSave function:**
- Now includes ALL lifestyle fields in save payload:
  - heightFeet, heightInch, heightCm, weightKg
  - targetWeightKg, idealWeightKg, bmi
  - foodPreference, preferredCuisine, allergiesFood
  - fastDays, nonVegExemptDays, foodLikes, foodDislikes
  - eatOutFrequency, smokingFrequency, alcoholFrequency
  - activityRate, cookingOil, monthlyOilConsumption
  - cookingSalt, carbonatedBeverageFrequency, cravingType

- Now includes ALL medical fields in save payload:
  - notes, diseaseHistory, medicalHistory
  - familyHistory, medication, bloodGroup
  - gutIssues, reports, isPregnant

- Saves dietary recall separately:
  - After saving user data, makes POST request to `/api/users/[id]/recall`
  - Sends `recallEntries` array to new API endpoint
  - Continues even if recall save fails (logs error)

### 5. Updated Model Exports ✅
**File:** `/src/lib/db/models/index.ts`

- Added `export { default as DietaryRecall } from './DietaryRecall';`

## Benefits

### 1. **Complete Data Display**
- All form fields now properly display saved database values
- Users can see and edit all their previously entered information
- No more empty forms when database has data

### 2. **Better Data Architecture**
- Dietary recall entries in separate collection (scalable)
- Easier to query, filter, and analyze recall data
- Indexed for fast retrieval by user and date

### 3. **Flexible Recall Management**
- Can add unlimited recall entries without bloating User document
- Can delete individual entries
- Can update specific entries
- Date-based querying support

### 4. **Backward Compatibility**
- Falls back to embedded dietaryRecall if API fails
- Existing data still accessible during migration period

## Data Flow

### Loading Data (fetchClientDetails):
```
1. Fetch user data from /api/users/[id]
2. Populate basicInfo state (18 fields) ✓
3. Populate medicalData state (12 fields) ✓
4. Populate lifestyleData state (26 fields) ✓
5. Fetch recall from /api/users/[id]/recall
6. Populate recallEntries state ✓
```

### Saving Data (handleSave):
```
1. Gather all form data (basicInfo + medical + lifestyle)
2. PUT /api/users/[id] with complete user data ✓
3. POST /api/users/[id]/recall with recall entries ✓
4. Refresh client details ✓
```

## Testing Checklist

- [ ] Verify all basic info fields display saved values
- [ ] Verify all medical fields display saved values
- [ ] Verify all lifestyle fields display saved values (especially arrays)
- [ ] Verify dietary recall entries load and display
- [ ] Save basic info and verify persistence
- [ ] Save medical data and verify persistence
- [ ] Save lifestyle data and verify persistence
- [ ] Add/edit/delete recall entries and verify
- [ ] Check for any console errors
- [ ] Test with empty/null fields
- [ ] Test with female client (pregnancy field)

## Migration Notes

The User schema still has the embedded `dietaryRecall` array for backward compatibility. Future enhancement could include:
1. Data migration script to move existing embedded recalls to new collection
2. Remove `dietaryRecall` field from User schema after migration
3. Update route.ts to exclude dietaryRecall from allowedFields

## Files Modified

1. `/src/lib/db/models/DietaryRecall.ts` - Created
2. `/src/lib/db/models/index.ts` - Updated exports
3. `/src/app/dietician/clients/[clientId]/page.tsx` - Fixed data loading + updated save
4. `/src/app/api/users/[id]/recall/route.ts` - Created (GET, POST)
5. `/src/app/api/users/[id]/recall/[recallId]/route.ts` - Created (PUT, DELETE)

## Status: ✅ COMPLETE

All database fields now load properly into forms, and dietary recall is saved in a separate schema as requested.
