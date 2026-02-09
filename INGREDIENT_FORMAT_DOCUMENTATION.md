# Recipe Ingredient Format Documentation

## Overview

Ingredients in the recipe system are now stored as **structured objects** with the following format:

```typescript
{
  name: string;
  quantity: number;
  unit: string;
  remarks?: string;
}
```

## Ingredient Object Structure

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `name` | string | ✅ | Ingredient name | `"rice"`, `"olive oil"` |
| `quantity` | number | ✅ | Amount/quantity value | `2`, `0.5`, `1.5` |
| `unit` | string | ✅ | Unit of measurement | `"cups"`, `"tbsp"`, `"ml"`, `"grams"` |
| `remarks` | string | ❌ | Optional notes | `"finely chopped"`, `"optional"` |

## API Endpoints

### 1. CREATE Recipe - POST `/api/recipes`

**Request Format:**
```json
{
  "name": "Simple Rice Bowl",
  "description": "A simple and nutritious rice bowl",
  "ingredients": [
    {
      "name": "rice",
      "quantity": 2,
      "unit": "cups",
      "remarks": "basmati rice"
    },
    {
      "name": "water",
      "quantity": 4,
      "unit": "cups",
      "remarks": ""
    },
    {
      "name": "salt",
      "quantity": 1,
      "unit": "tsp",
      "remarks": "or to taste"
    }
  ],
  "instructions": [
    "Wash the rice thoroughly",
    "Add water and salt",
    "Cook on medium heat for 15-20 minutes"
  ],
  "prepTime": 10,
  "cookTime": 20,
  "servings": 4,
  "nutrition": {
    "calories": 250,
    "protein": 5,
    "carbs": 52,
    "fat": 0.5
  }
}
```

**Response Format:**
```json
{
  "success": true,
  "recipe": {
    "_id": "507f1f77bcf86cd799439011",
    "uuid": "recipe_123456",
    "name": "Simple Rice Bowl",
    "ingredients": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "rice",
        "quantity": 2,
        "unit": "cups",
        "remarks": "basmati rice"
      }
    ],
    "calories": 250,
    "protein": 5,
    "carbs": 52,
    "fat": 0.5,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. UPDATE Recipe - PUT `/api/recipes/[id]`

**Request Format:**
```json
{
  "ingredients": [
    {
      "name": "basmati rice",
      "quantity": 3,
      "unit": "cups",
      "remarks": "premium quality"
    },
    {
      "name": "water",
      "quantity": 6,
      "unit": "cups"
    }
  ],
  "nutrition": {
    "calories": 300,
    "protein": 6,
    "carbs": 60,
    "fat": 1
  },
  "prepTime": 15,
  "cookTime": 25
}
```

**Response Format:**
```json
{
  "success": true,
  "recipe": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Simple Rice Bowl",
    "ingredients": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "name": "basmati rice",
        "quantity": 3,
        "unit": "cups",
        "remarks": "premium quality"
      }
    ],
    "calories": 300,
    "protein": 6,
    "totalTime": 40
  }
}
```

### 3. BULK IMPORT - POST `/api/recipes/import`

**Request Format:**
```json
{
  "recipes": [
    {
      "name": "Recipe 1",
      "description": "Description",
      "ingredients": [
        {
          "name": "ingredient1",
          "quantity": 1,
          "unit": "cup",
          "remarks": "optional note"
        },
        {
          "name": "ingredient2",
          "quantity": 2,
          "unit": "tbsp"
        }
      ],
      "instructions": [
        "Step 1",
        "Step 2"
      ],
      "prepTime": 10,
      "cookTime": 20,
      "servings": 4,
      "calories": 250,
      "protein": 10,
      "carbs": 40,
      "fat": 8
    },
    {
      "name": "Recipe 2",
      "description": "Another recipe",
      "ingredients": [
        {
          "name": "flour",
          "quantity": 3,
          "unit": "cups"
        }
      ],
      "instructions": ["Mix and bake"],
      "prepTime": 15,
      "cookTime": 30,
      "servings": 8,
      "calories": 300,
      "protein": 8,
      "carbs": 50,
      "fat": 10
    }
  ]
}
```

**Response Format:**
```json
{
  "success": true,
  "message": "Successfully imported 2 recipes",
  "imported": 2,
  "recipes": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Recipe 1",
      "uuid": "recipe_123456"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Recipe 2",
      "uuid": "recipe_123457"
    }
  ]
}
```

### 4. GET Recipe - GET `/api/recipes/[id]`

**Response Format:**
```json
{
  "success": true,
  "recipe": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Simple Rice Bowl",
    "description": "A simple and nutritious rice bowl",
    "ingredients": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "rice",
        "quantity": 2,
        "unit": "cups",
        "remarks": "basmati rice"
      },
      {
        "_id": "507f1f77bcf86cd799439013",
        "name": "water",
        "quantity": 4,
        "unit": "cups",
        "remarks": ""
      }
    ],
    "instructions": ["Wash rice", "Add water", "Cook"],
    "calories": 250,
    "protein": 5,
    "carbs": 52,
    "fat": 0.5,
    "flatNutrition": {
      "calories": 250,
      "protein": 5,
      "carbs": 52,
      "fat": 0.5
    },
    "createdBy": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## Validation Rules

### Ingredient Validation

1. **Name**: Required, cannot be empty or whitespace-only
   - ✅ Valid: `"rice"`, `"olive oil"`, `"salt"`
   - ❌ Invalid: `""`, `"   "`, `null`

2. **Quantity**: Required, must be a non-negative number
   - ✅ Valid: `0`, `1`, `2.5`, `0.5`, `100`
   - ❌ Invalid: `-1`, `"2"`, `null`, `"two"`

3. **Unit**: Required, cannot be empty
   - ✅ Valid: `"cups"`, `"tbsp"`, `"tsp"`, `"ml"`, `"grams"`, `"piece"`, `"pinch"`
   - ❌ Invalid: `""`, `null`, `"   "`

4. **Remarks**: Optional, can be empty or contain any text
   - ✅ Valid: `"optional"`, `"finely chopped"`, `""`, `"or to taste"`

### At Least One Ingredient Required
Every recipe must have at least one ingredient with a valid name.

```json
{
  "name": "Recipe",
  "ingredients": []  // ❌ ERROR: At least one ingredient is required
}
```

## CSV Export Format

When exporting recipes to CSV, ingredients are converted to a pipe-delimited format:

```
quantity|unit|name|remarks
```

**Example CSV Row:**
```
Recipe Name,Description,...,Ingredients,...
Simple Rice Bowl,"A simple bowl",...,"2|cups|rice|basmati rice
4|cups|water|
1|tsp|salt|or to taste",...
```

Each ingredient on a new line with pipe delimiters:
- `2|cups|rice|basmati rice` (quantity|unit|name|remarks)
- `4|cups|water|` (remarks is empty)
- `1|tsp|salt|or to taste`

## CSV Import Format

When importing from CSV, ingredients can be in pipe-delimited format or as simple names:

**Format 1: Pipe-delimited (Recommended)**
```csv
quantity|unit|name|remarks
2|cups|rice|basmati rice
4|cups|water|
1|tsp|salt|or to taste
```

**Format 2: Simple names (Legacy support)**
```csv
rice
water
salt
```

The system will auto-convert to objects:
- Simple names → `{ name: "rice", quantity: 1, unit: "piece" }`
- Pipe-delimited → `{ name, quantity, unit, remarks }`

## Frontend Integration

### Recipe Interface (TypeScript)

```typescript
interface IRecipe {
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    remarks?: string;
  }>;
  // ... other fields
}
```

### React Component Example

```tsx
const RecipeForm = () => {
  const [ingredients, setIngredients] = useState([
    { name: '', quantity: 0, unit: '', remarks: '' }
  ]);

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: 0, unit: '', remarks: '' }]);
  };

  const handleIngredientChange = (index, field, value) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      name: formData.name,
      ingredients: ingredients.filter(ing => ing.name.trim() !== ''),
      // ... other fields
    };

    const res = await fetch('/api/recipes', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {ingredients.map((ing, idx) => (
        <div key={idx}>
          <input
            value={ing.name}
            onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
            placeholder="Ingredient name"
          />
          <input
            type="number"
            value={ing.quantity}
            onChange={(e) => handleIngredientChange(idx, 'quantity', Number(e.target.value))}
            placeholder="Quantity"
          />
          <input
            value={ing.unit}
            onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
            placeholder="Unit (cups, tbsp, etc.)"
          />
          <input
            value={ing.remarks}
            onChange={(e) => handleIngredientChange(idx, 'remarks', e.target.value)}
            placeholder="Remarks (optional)"
          />
        </div>
      ))}
      <button onClick={handleAddIngredient}>Add Ingredient</button>
      <button type="submit">Save Recipe</button>
    </form>
  );
};
```

## Error Handling

### Validation Errors

**Missing ingredient name:**
```json
{
  "error": "Validation failed",
  "message": "Please check your input data",
  "details": [
    {
      "field": "ingredients.0.name",
      "message": "Ingredient name is required",
      "code": "too_small"
    }
  ]
}
```

**Invalid quantity:**
```json
{
  "error": "Validation failed",
  "message": "Please check your input data",
  "details": [
    {
      "field": "ingredients.1.quantity",
      "message": "Quantity must be positive",
      "code": "custom"
    }
  ]
}
```

**Duplicate recipe (same name + creator):**
```json
{
  "error": "Duplicate entry",
  "message": "A recipe with the same name already exists. Each user must have unique recipe names."
}
```

### Empty ingredients array:
```json
{
  "error": "Validation failed",
  "message": "Please check your input data",
  "details": [
    {
      "field": "ingredients",
      "message": "At least one ingredient is required",
      "code": "too_small"
    }
  ]
}
```

## Migration from Old Format

If you have recipes with simple string ingredients, they will be automatically converted:

**Old Format (String array):**
```json
{
  "ingredients": ["rice", "water", "salt"]
}
```

**Converted to (Object array):**
```json
{
  "ingredients": [
    { "name": "rice", "quantity": 1, "unit": "piece", "remarks": "" },
    { "name": "water", "quantity": 1, "unit": "piece", "remarks": "" },
    { "name": "salt", "quantity": 1, "unit": "piece", "remarks": "" }
  ]
}
```

## Best Practices

1. **Always provide unit of measurement:**
   - ✅ `{ name: "rice", quantity: 2, unit: "cups" }`
   - ❌ `{ name: "rice", quantity: 2, unit: "" }`

2. **Use standard units:**
   - `"cups"`, `"tbsp"` (tablespoon), `"tsp"` (teaspoon), `"ml"`, `"liters"`
   - `"grams"`, `"kg"`, `"oz"` (ounces), `"lbs"` (pounds)
   - `"piece"`, `"pinch"`, `"handful"`, `"whole"`

3. **Include helpful remarks for clarity:**
   - ✅ `{ name: "rice", quantity: 2, unit: "cups", remarks: "basmati, preferably long-grain" }`
   - ❌ `{ name: "rice", quantity: 2, unit: "cups", remarks: "" }`

4. **Trim and normalize ingredient names:**
   - ✅ `"chicken breast"` (lowercase, trimmed)
   - ❌ `"  CHICKEN BREAST  "` (will be auto-trimmed, but not recommended)

5. **Use numbers only for quantities:**
   - ✅ `quantity: 2` (number)
   - ❌ `quantity: "2"` (string, will fail validation)

## Summary

| Operation | Format | Endpoint |
|-----------|--------|----------|
| **Create** | Array of objects | `POST /api/recipes` |
| **Read** | Array of objects | `GET /api/recipes/[id]` |
| **Update** | Array of objects | `PUT /api/recipes/[id]` |
| **Import** | Array of objects | `POST /api/recipes/import` |
| **Export** | Pipe-delimited strings | CSV file download |

All endpoints are **fully tested** and **production-ready** with the new ingredient object format.
