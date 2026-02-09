# Recipe Ingredients - Quick Reference Guide

## 🎯 Current Status

✅ **Ingredients are now stored as objects** (not strings)

```typescript
// ✅ NEW FORMAT (Currently Used)
ingredients: [
  { name: "rice", quantity: 2, unit: "cups", remarks: "basmati" },
  { name: "water", quantity: 4, unit: "cups" },
  { name: "salt", quantity: 1, unit: "tsp", remarks: "to taste" }
]

// ❌ OLD FORMAT (Deprecated)
ingredients: ["rice", "water", "salt"]
```

## 📋 All Endpoints Support Ingredient Objects

| Endpoint | Method | Ingredient Format | Status |
|----------|--------|-------------------|--------|
| Create Recipe | `POST /api/recipes` | ✅ Object array | Fully working |
| Update Recipe | `PUT /api/recipes/[id]` | ✅ Object array | **JUST FIXED** |
| Get Recipe | `GET /api/recipes/[id]` | ✅ Object array | Fully working |
| Bulk Import | `POST /api/recipes/import` | ✅ Object array | **NEW ENDPOINT** |
| List Recipes | `GET /api/recipes` | ✅ Object array | Fully working |

## 🚀 Quick Start Examples

### Create Recipe with Ingredients

```bash
curl -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pasta Carbonara",
    "description": "Classic Italian pasta",
    "ingredients": [
      { "name": "spaghetti", "quantity": 400, "unit": "grams", "remarks": "" },
      { "name": "eggs", "quantity": 4, "unit": "piece" },
      { "name": "bacon", "quantity": 200, "unit": "grams", "remarks": "pancetta preferred" },
      { "name": "parmesan cheese", "quantity": 100, "unit": "grams", "remarks": "grated" }
    ],
    "instructions": ["Cook pasta", "Fry bacon", "Mix ingredients"],
    "prepTime": 10,
    "cookTime": 15,
    "servings": 4,
    "nutrition": { "calories": 450, "protein": 20, "carbs": 50, "fat": 15 }
  }'
```

### Update Recipe Ingredients

```bash
curl -X PUT http://localhost:3000/api/recipes/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": [
      { "name": "basmati rice", "quantity": 3, "unit": "cups", "remarks": "premium" },
      { "name": "water", "quantity": 6, "unit": "cups" },
      { "name": "butter", "quantity": 2, "unit": "tbsp" }
    ]
  }'
```

### Bulk Import Multiple Recipes

```bash
curl -X POST http://localhost:3000/api/recipes/import \
  -H "Content-Type: application/json" \
  -d '{
    "recipes": [
      {
        "name": "Rice Bowl",
        "description": "Simple rice",
        "ingredients": [
          { "name": "rice", "quantity": 2, "unit": "cups" },
          { "name": "water", "quantity": 4, "unit": "cups" }
        ],
        "instructions": ["Boil water", "Add rice", "Cook"],
        "prepTime": 5,
        "cookTime": 20,
        "servings": 4,
        "calories": 250,
        "protein": 5,
        "carbs": 52,
        "fat": 0.5
      },
      {
        "name": "Pasta Salad",
        "description": "Fresh pasta salad",
        "ingredients": [
          { "name": "pasta", "quantity": 500, "unit": "grams" },
          { "name": "tomatoes", "quantity": 3, "unit": "piece" },
          { "name": "olive oil", "quantity": 3, "unit": "tbsp" }
        ],
        "instructions": ["Cook pasta", "Mix ingredients"],
        "prepTime": 10,
        "cookTime": 10,
        "servings": 6,
        "calories": 300,
        "protein": 10,
        "carbs": 45,
        "fat": 10
      }
    ]
  }'
```

## ✅ Validation Rules

| Field | Rule | Example |
|-------|------|---------|
| **name** | Required, non-empty string | `"rice"`, `"olive oil"` |
| **quantity** | Required, non-negative number | `2`, `0.5`, `1.5`, `100` |
| **unit** | Required, non-empty string | `"cups"`, `"tbsp"`, `"grams"`, `"ml"` |
| **remarks** | Optional, any string | `"to taste"`, `"finely chopped"` |
| **Array length** | At least 1 ingredient | `ingredients.length > 0` |

## 🔄 Common Transformations

### Ingredient Filtering
Empty or invalid ingredients are automatically filtered:

```typescript
// Before
ingredients: [
  { name: "rice", quantity: 2, unit: "cups" },
  { name: "", quantity: 1, unit: "cup" },        // ❌ Filtered out (empty name)
  { name: "  water  ", quantity: 0, unit: "" }   // ❌ Filtered out (empty unit)
]

// After
ingredients: [
  { name: "rice", quantity: 2, unit: "cups" }
]
```

### Name Trimming
Whitespace is automatically trimmed:

```typescript
// Before
{ name: "  rice  ", quantity: 2, unit: "  cups  " }

// After
{ name: "rice", quantity: 2, unit: "cups" }
```

### Default Values
Missing optional fields get defaults:

```typescript
// Before
{ name: "rice", quantity: 2, unit: "cups" }

// After
{ name: "rice", quantity: 2, unit: "cups", remarks: "" }
```

## 🛡️ Error Messages & Solutions

### ❌ "At least one ingredient is required"
```json
// Problem: Empty ingredients array
{ "ingredients": [] }

// Solution: Add at least one ingredient
{ "ingredients": [{ "name": "rice", "quantity": 2, "unit": "cups" }] }
```

### ❌ "Ingredient name is required"
```json
// Problem: Empty name
{ "name": "", "quantity": 2, "unit": "cups" }

// Solution: Provide ingredient name
{ "name": "rice", "quantity": 2, "unit": "cups" }
```

### ❌ "Quantity must be positive"
```json
// Problem: Invalid quantity
{ "name": "rice", "quantity": -1, "unit": "cups" }

// Solution: Use non-negative number
{ "name": "rice", "quantity": 2, "unit": "cups" }
```

### ❌ "Duplicate entry"
```json
// Problem: Recipe with same name from same creator
// Solution: Use unique recipe name or delete old recipe
```

## 📊 Schema Definition

```typescript
// MongoDB Schema
ingredients: {
  type: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    remarks: { type: String, default: '' }
  }],
  default: [],
  validate: {
    validator: (arr: any[]) => arr.length > 0,
    message: 'At least one ingredient is required'
  }
}

// TypeScript Interface
ingredients: Array<{
  name: string;
  quantity: number;
  unit: string;
  remarks?: string;
}>;
```

## 🔍 Ingredient Units Reference

**Common volume units:**
- `"ml"`, `"liters"`, `"cups"`, `"tbsp"` (tablespoon), `"tsp"` (teaspoon)

**Common weight units:**
- `"grams"`, `"kg"`, `"oz"` (ounces), `"lbs"` (pounds)

**Other units:**
- `"piece"`, `"pinch"`, `"handful"`, `"whole"`, `"clove"`, `"slice"`, `"packet"`

## 📝 TypeScript Usage

```typescript
// Interface
interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  remarks?: string;
}

// Creating ingredient
const ingredient: Ingredient = {
  name: "rice",
  quantity: 2,
  unit: "cups",
  remarks: "basmati"
};

// Recipe with ingredients
interface Recipe {
  name: string;
  ingredients: Ingredient[];
  // ... other fields
}

// Function to add ingredient
function addIngredient(recipe: Recipe, ingredient: Ingredient) {
  recipe.ingredients.push(ingredient);
}

// Function to validate ingredient
function validateIngredient(ing: any): ing is Ingredient {
  return (
    typeof ing.name === 'string' && ing.name.trim() !== '' &&
    typeof ing.quantity === 'number' && ing.quantity >= 0 &&
    typeof ing.unit === 'string' && ing.unit.trim() !== ''
  );
}
```

## 🔗 Related Endpoints

- **Recipe Model:** `/src/lib/db/models/Recipe.ts`
- **Create API:** `/src/app/api/recipes/route.ts` (POST)
- **Update API:** `/src/app/api/recipes/[id]/route.ts` (PUT)
- **Import API:** `/src/app/api/recipes/import/route.ts` (POST - NEW)
- **Get Single:** `/src/app/api/recipes/[id]/route.ts` (GET)
- **List Recipes:** `/src/app/api/recipes/route.ts` (GET)

## ✨ Production Ready Features

✅ **Ingredient validation** at schema and API level  
✅ **Automatic filtering** of invalid ingredients  
✅ **Whitespace trimming** on names and units  
✅ **Default values** for optional fields  
✅ **Unique index** on recipe name + creator to prevent duplicates  
✅ **Comprehensive error messages** for debugging  
✅ **TypeScript support** for type safety  
✅ **CSV import/export** with pipe-delimited format  
✅ **Bulk import** endpoint for multiple recipes  

## 📌 Summary

| Aspect | Status | Details |
|--------|--------|---------|
| **Format** | ✅ Complete | Objects with name, quantity, unit, remarks |
| **Create** | ✅ Complete | POST endpoint working |
| **Update** | ✅ Complete | PUT endpoint just fixed |
| **Import** | ✅ Complete | New bulk import endpoint |
| **Export** | ✅ Complete | CSV with pipe-delimited format |
| **Validation** | ✅ Complete | Comprehensive validation at DB level |
| **Type Safety** | ✅ Complete | Full TypeScript support |
| **Error Handling** | ✅ Complete | Clear error messages |

All features are **tested** and **production-ready**! 🚀
