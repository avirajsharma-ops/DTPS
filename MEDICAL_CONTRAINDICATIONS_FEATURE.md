# Medical Contraindications Feature for Recipes

## Overview
Added a medical contraindications field to recipes that allows dietitians to specify which medical conditions should NOT be recommended this recipe. This helps ensure client safety by preventing recipes from being shown to users with specific health conditions.

## Features Added

### 1. Database Schema Updates
- **File**: `src/lib/db/models/Recipe.ts`
- **Changes**: Added `medicalContraindications` field with predefined enum values
- **Supported Conditions**:
  - Diabetes
  - Hypertension (High Blood Pressure)
  - Heart Disease
  - Kidney Disease
  - Liver Disease
  - High Cholesterol
  - Thyroid Disorders
  - Gout
  - Acid Reflux/GERD
  - IBS (Irritable Bowel Syndrome)
  - Celiac Disease
  - Lactose Intolerance
  - Gallbladder Disease
  - Osteoporosis
  - Anemia
  - Food Allergies
  - Pregnancy
  - Breastfeeding

### 2. API Validation
- **File**: `src/app/api/recipes/route.ts`
- **Changes**: Added validation schema for medical contraindications
- **Features**: Supports both creation and updates of recipes with medical contraindications

### 3. Recipe Creation Form
- **File**: `src/app/recipes/create/page.tsx`
- **Features**:
  - Checkbox-style selection for medical contraindications
  - Visual feedback with red styling for selected conditions
  - Clear labeling and description
  - Form validation includes medical contraindications

### 4. Recipe Edit Form
- **File**: `src/app/recipes/[id]/edit/page.tsx`
- **Features**:
  - Same checkbox interface as creation form
  - Loads existing medical contraindications
  - Updates existing recipes with new contraindications

### 5. Recipe Display
- **File**: `src/app/recipes/[id]/page.tsx`
- **Features**:
  - Shows medical contraindications with warning styling
  - Clear visual indicators (red badges with warning icon)
  - Warning message for users

### 6. Type Definitions
- **File**: `src/types/index.ts`
- **Changes**: Updated IRecipe interface to include medicalContraindications

## User Interface

### Recipe Creation/Edit Form
```
Medical Contraindications
Select medical conditions for which this recipe should NOT be recommended

[✓] Diabetes          [ ] Hypertension      [ ] Heart Disease
[ ] Kidney Disease    [✓] High Cholesterol  [ ] Thyroid Disorders
[ ] Gout              [ ] Acid Reflux       [ ] IBS
...
```

### Recipe Display
```
⚠️ Medical Contraindications
[Diabetes] [High Cholesterol]
⚠️ Not recommended for individuals with these conditions
```

## Testing Instructions

### 1. Test Recipe Creation
1. Navigate to `/recipes/create`
2. Fill in basic recipe information
3. Scroll to "Medical Contraindications" section
4. Select one or more conditions (e.g., Diabetes, High Cholesterol)
5. Complete and submit the form
6. Verify recipe is created successfully

### 2. Test Recipe Display
1. Navigate to the created recipe's detail page
2. Verify medical contraindications are displayed with warning styling
3. Check that the warning message appears

### 3. Test Recipe Editing
1. Navigate to recipe edit page
2. Verify existing contraindications are pre-selected
3. Add/remove contraindications
4. Save changes
5. Verify updates are reflected in the recipe display

### 4. Test API Endpoints
```bash
# Create recipe with medical contraindications
curl -X POST http://localhost:3001/api/recipes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Recipe",
    "description": "Test description",
    "category": "breakfast",
    "ingredients": [{"name": "Test", "quantity": 1, "unit": "cup"}],
    "instructions": ["Test instruction"],
    "prepTime": 10,
    "cookTime": 15,
    "servings": "2",
    "calories": 200,
    "macros": {"protein": 10, "carbs": 20, "fat": 5},
    "medicalContraindications": ["diabetes", "hypertension"]
  }'
```

## Future Enhancements

### 1. Client Dashboard Integration
- Filter recipes based on client's medical conditions
- Hide contraindicated recipes from client's meal plans
- Show warnings when dietitians try to assign contraindicated recipes

### 2. Meal Plan Validation
- Validate meal plans against client medical conditions
- Automatic warnings for contraindicated recipes
- Suggest alternative recipes

### 3. Reporting
- Track which recipes are most commonly contraindicated
- Generate reports on recipe safety compliance
- Analytics on medical condition coverage

## Database Migration
No migration is required as the field is optional and will default to an empty array for existing recipes.

## Security Considerations
- Only dietitians, health counselors, and admins can create/edit recipes
- Medical contraindications are validated against predefined enum values
- Client medical conditions are stored securely and used only for filtering

## Implementation Notes
- Medical contraindications are stored as an array of strings
- The UI uses a grid layout for better organization
- Visual styling emphasizes the warning nature of contraindications
- The feature is fully integrated with existing recipe workflows
