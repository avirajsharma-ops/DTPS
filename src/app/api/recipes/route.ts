import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Recipe from '@/lib/db/models/Recipe';
import { UserRole } from '@/types';
import { z } from 'zod';
import { getImageKit } from '@/lib/imagekit';
import { compressImageServer } from '@/lib/imageCompressionServer';
import mongoose from 'mongoose';

// Recipe validation schema - flexible to handle both old and new formats (no word limits)
const recipeSchema = z.object({
  name: z.string().min(1, 'Recipe name is required'),
  description: z.string().optional(),
  ingredients: z.array(z.object({
    name: z.string().min(1, 'Ingredient name is required'),
    quantity: z.number().min(0, 'Quantity must be positive'),
    unit: z.string().min(1, 'Unit is required'),
    remarks: z.string().optional()
  })).min(1, 'At least one ingredient is required'),
  instructions: z.array(z.string().min(1, 'Instruction cannot be empty')).min(1, 'At least one instruction is required'),
  prepTime: z.number().min(0, 'Prep time must be positive'),
  cookTime: z.number().min(0, 'Cook time must be positive'),
  servings: z.union([
    z.number().min(1, 'Servings must be at least 1'),
    z.string().min(1, 'Portion size is required')
  ]),

  // Support both old and new nutrition formats
  nutrition: z.object({
    calories: z.number().min(0, 'Calories must be positive'),
    protein: z.number().min(0, 'Protein must be positive'),
    carbs: z.number().min(0, 'Carbs must be positive'),
    fat: z.number().min(0, 'Fat must be positive'),
    fiber: z.number().min(0).optional(),
    sugar: z.number().min(0).optional(),
    sodium: z.number().min(0).optional()
  }).optional(),

  // Legacy format support
  calories: z.number().min(0).optional(),
  macros: z.object({
    protein: z.number().min(0).optional(),
    carbs: z.number().min(0).optional(),
    fat: z.number().min(0).optional(),
    fiber: z.number().min(0).optional()
  }).optional(),

  // Support both tags and dietaryRestrictions
  tags: z.array(z.string()).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  medicalContraindications: z.array(z.string()).optional(),

  // Active status
  isActive: z.boolean().optional(),

  // Allow any string for image URL
  image: z.string().optional().or(z.literal(''))
});

// GET /api/recipes - Get recipes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const cuisine = searchParams.get('cuisine');
    const difficulty = searchParams.get('difficulty');
    const dietaryRestrictions = searchParams.get('dietaryRestrictions');
    const maxCalories = searchParams.get('maxCalories');
    const minProtein = searchParams.get('minProtein');
    const maxPrepTime = searchParams.get('maxPrepTime');
    const sortBy = searchParams.get('sortBy') || 'name';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 0; // 0 means no limit
    const page = parseInt(searchParams.get('page') || '1');

    // Build query
    let query: any = {};

    // Search by name, description, ingredients, recipe ID, or UUID
    if (search) {
      const searchConditions: any[] = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'ingredients.name': { $regex: search, $options: 'i' } }
      ];
      
      // Only add uuid search if it looks like it could be a uuid (numeric or alphanumeric)
      if (/^[a-zA-Z0-9]+$/.test(search.trim())) {
        searchConditions.push({ uuid: search.trim() });
      }
      
      // Check if search term looks like a MongoDB ObjectId (hex characters)
      const cleanSearch = search.trim().toLowerCase();
      if (/^[a-f0-9]+$/.test(cleanSearch)) {
        // If it's a valid hex string, try to match by ID
        if (cleanSearch.length === 24 && mongoose.Types.ObjectId.isValid(cleanSearch)) {
          // Full ObjectId (24 hex chars) - exact match
          try {
            searchConditions.push({ _id: new mongoose.Types.ObjectId(cleanSearch) });
          } catch (e) {
            // Invalid ObjectId, skip
          }
        }
      }
      
      query.$or = searchConditions;
    }

    // Filter by category (tags)
    if (category && category !== 'all') {
      query.tags = category;
    }

    // Filter by cuisine
    if (cuisine && cuisine !== 'all') {
      query.cuisine = cuisine;
    }

    // Filter by difficulty
    if (difficulty && difficulty !== 'all') {
      query.difficulty = difficulty;
    }

    // Filter by dietary restrictions
    if (dietaryRestrictions) {
      const restrictions = dietaryRestrictions.split(',');
      query.dietaryRestrictions = { $in: restrictions };
    }

    // Filter by max calories
    if (maxCalories) {
      query['nutrition.calories'] = { $lte: parseInt(maxCalories) };
    }

    // Filter by minimum protein
    if (minProtein) {
      query['nutrition.protein'] = { $gte: parseInt(minProtein) };
    }

    // Filter by max prep time
    if (maxPrepTime) {
      query.prepTime = { $lte: parseInt(maxPrepTime) };
    }

    // Sort options - always include _id as secondary sort for stable pagination
    let sortOptions: any = {};
    let isNumericUuidSort = false;
    
    switch (sortBy) {
      case 'rating':
        sortOptions = { 'rating.average': -1, _id: -1 };
        break;
      case 'popular':
        sortOptions = { views: -1, _id: -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1, _id: -1 };
        break;
      case 'name':
        sortOptions = { name: 1, _id: 1 };
        break;
      case 'prep-time':
        sortOptions = { prepTime: 1, _id: 1 };
        break;
      case 'calories':
        sortOptions = { 'nutrition.calories': 1, _id: 1 };
        break;
      case 'uuid':
        sortOptions = { _id: 1 }; // Use _id for DB sort, we'll sort by UUID numerically after fetch
        isNumericUuidSort = true;
        break;
      case 'uuid-desc':
        sortOptions = { _id: 1 }; // Use _id for DB sort, we'll sort by UUID numerically after fetch
        isNumericUuidSort = true;
        break;
      default:
        sortOptions = { name: 1, _id: 1 };
    }

    let recipesQuery = Recipe.find(query)
      .populate({
        path: 'createdBy',
        select: 'firstName lastName',
        options: { strictPopulate: false }
      })
      .sort(sortOptions);

    // For numeric UUID sorting, don't use limit/skip yet - we'll do it after sorting
    if (!isNumericUuidSort && limit > 0) {
      recipesQuery = recipesQuery.limit(limit).skip((page - 1) * limit);
    }

    const recipesRaw = await recipesQuery.lean(); // Use lean() for better performance

    // Sanitize recipes to ensure nutrition object exists with default values
    let recipes = recipesRaw.map((recipe: any) => {
      return {
        ...recipe,
        nutrition: recipe.nutrition || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        },
        createdBy: recipe.createdBy || { firstName: 'Unknown', lastName: 'User' }
      };
    });

    // Post-process sorting for UUID (numeric sort for string numbers)
    // This handles all records before pagination
    if (isNumericUuidSort) {
      recipes.sort((a, b) => {
        const aUuid = parseInt(a.uuid || '0') || 0;
        const bUuid = parseInt(b.uuid || '0') || 0;
        if (sortBy === 'uuid') {
          return aUuid - bUuid;
        } else {
          return bUuid - aUuid;
        }
      });
      
      // Apply pagination after sorting
      if (limit > 0) {
        const startIdx = (page - 1) * limit;
        const endIdx = startIdx + limit;
        recipes = recipes.slice(startIdx, endIdx);
      }
    }

    const total = await Recipe.countDocuments(query);

    // Get unique values for filtering
    const cuisines = await Recipe.distinct('cuisine');
    const tags = await Recipe.distinct('tags');

    return NextResponse.json({
      success: true,
      recipes,
      pagination: {
        page,
        limit,
        total,
        pages: limit > 0 ? Math.ceil(total / limit) : 1
      },
      cuisines,
      tags,
      categories: tags
    });

  } catch (error: any) {
    console.error('Error fetching recipes:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes', details: error?.message },
      { status: 500 }
    );
  }
}

// POST /api/recipes - Create new recipe
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'Please log in to create recipes'
      }, { status: 401 });
    }

    // Only dietitians, health counselors, and admins can create recipes
    if (session.user.role !== UserRole.DIETITIAN && session.user.role !== UserRole.HEALTH_COUNSELOR && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({
        error: 'Forbidden',
        message: 'Only dietitians, health counselors, and admins can create recipes'
      }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    let validatedData;
    try {
      validatedData = recipeSchema.parse(body);
    } catch (validationError) {
      console.error('Validation error:', validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json({
          error: 'Validation failed',
          message: 'Please check your input data',
          details: validationError.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        }, { status: 400 });
      }
      throw validationError;
    }

    await connectDB();

    // Transform data to match database schema
    const recipeData: any = {
      name: validatedData.name,
      description: validatedData.description || '',
      ingredients: validatedData.ingredients,
      instructions: validatedData.instructions,
      prepTime: validatedData.prepTime,
      cookTime: validatedData.cookTime,
      servings: validatedData.servings,
      createdBy: session.user.id
    };

    // Handle nutrition data - support both old and new formats
    if (validatedData.nutrition) {
      recipeData.nutrition = validatedData.nutrition;
    } else if (validatedData.calories !== undefined || validatedData.macros) {
      // Transform legacy format to new format
      recipeData.nutrition = {
        calories: validatedData.calories || 0,
        protein: validatedData.macros?.protein || 0,
        carbs: validatedData.macros?.carbs || 0,
        fat: validatedData.macros?.fat || 0,
        fiber: validatedData.macros?.fiber
      };
    } else {
      return NextResponse.json({
        error: 'Missing nutrition data',
        message: 'Please provide either nutrition object or calories/macros data'
      }, { status: 400 });
    }

    // Handle tags
    if (validatedData.tags) {
      recipeData.tags = validatedData.tags;
    } else {
      recipeData.tags = [];
    }

    // Handle dietary restrictions
    if (validatedData.dietaryRestrictions) {
      recipeData.dietaryRestrictions = validatedData.dietaryRestrictions;
    } else {
      recipeData.dietaryRestrictions = [];
    }

    // Handle medical contraindications
    if (validatedData.medicalContraindications) {
      recipeData.medicalContraindications = validatedData.medicalContraindications;
    } else {
      recipeData.medicalContraindications = [];
    }


    // Always upload the image to ImageKit if provided
    if (validatedData.image && validatedData.image.trim() !== '') {
      const imageValue = validatedData.image.trim();
      try {
        let compressedBase64: string;
        
        if (imageValue.startsWith('data:image/')) {
          // Base64 image - extract and compress
          const base64Data = imageValue.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const compressed = await compressImageServer(buffer, {
            quality: 85,
            maxWidth: 1200,
            maxHeight: 1200,
            format: 'jpeg'
          });
          compressedBase64 = `data:image/jpeg;base64,${compressed}`;
        } else {
          // URL - fetch, compress, and convert to base64
          const response = await fetch(imageValue);
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const compressed = await compressImageServer(buffer, {
            quality: 85,
            maxWidth: 1200,
            maxHeight: 1200,
            format: 'jpeg'
          });
          compressedBase64 = `data:image/jpeg;base64,${compressed}`;
        }
        
        const imageKit = getImageKit();
        const uploadResponse = await imageKit.upload({
          file: compressedBase64,
          fileName: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
          folder: '/recipes',
        });
        recipeData.image = uploadResponse.url;
      } catch (err) {
        console.error('ImageKit upload failed:', err);
        return NextResponse.json({
          error: 'Image upload failed',
          message: 'Could not upload image to ImageKit',
        }, { status: 500 });
      }
    } else {
    }


    // Create recipe
    const recipe = new Recipe(recipeData);
    await recipe.save();

    // Populate the created recipe
    await recipe.populate('createdBy', 'firstName lastName');

    return NextResponse.json({
      success: true,
      message: 'Recipe created successfully',
      recipe
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating recipe:', error);

    // Handle specific MongoDB errors
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return NextResponse.json({
          error: 'Database validation failed',
          message: 'The recipe data does not meet the required format',
          details: error.message
        }, { status: 400 });
      }

      if ((error as any).code === 11000) {
        return NextResponse.json({
          error: 'Duplicate recipe',
          message: 'A recipe with this name already exists'
        }, { status: 409 });
      }
    }

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to create recipe. Please try again later.'
    }, { status: 500 });
  }
}
