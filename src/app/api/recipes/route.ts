import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Recipe from '@/lib/db/models/Recipe';
import { UserRole } from '@/types';
import { z } from 'zod';

// Recipe validation schema - flexible to handle both old and new formats
const recipeSchema = z.object({
  name: z.string().min(1, 'Recipe name is required').max(200, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
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
    const cuisine = searchParams.get('cuisine');
    const difficulty = searchParams.get('difficulty');
    const dietaryRestrictions = searchParams.get('dietaryRestrictions');
    const maxCalories = searchParams.get('maxCalories');
    const minProtein = searchParams.get('minProtein');
    const maxPrepTime = searchParams.get('maxPrepTime');
    const sortBy = searchParams.get('sortBy') || 'newest';
    const limit = parseInt(searchParams.get('limit') || '12');
    const page = parseInt(searchParams.get('page') || '1');

    // Build query
    let query: any = {};

    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'ingredients.name': { $regex: search, $options: 'i' } }
      ];
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

    // Sort options
    let sortOptions: any = {};
    switch (sortBy) {
      case 'rating':
        sortOptions = { 'rating.average': -1 };
        break;
      case 'popular':
        sortOptions = { views: -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'name':
        sortOptions = { name: 1 };
        break;
      case 'prep-time':
        sortOptions = { prepTime: 1 };
        break;
      case 'calories':
        sortOptions = { 'nutrition.calories': 1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    const recipes = await Recipe.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort(sortOptions)
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Recipe.countDocuments(query);

    // Get unique values for filtering
    const cuisines = await Recipe.distinct('cuisine');
    const tags = await Recipe.distinct('tags');

    return NextResponse.json({
      success: true,
      recipes,
      total,
      cuisines,
      tags,
      page,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
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
    console.log('Received recipe data:', JSON.stringify(body, null, 2));

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

    // Add image if provided (support WordPress URLs, data URLs, relative paths)
    if (validatedData.image && validatedData.image.trim() !== '') {
      recipeData.image = validatedData.image;
      console.log('Image URL added:', validatedData.image);
    } else {
      console.log('No image provided or empty image URL');
    }

    console.log('Transformed recipe data:', JSON.stringify(recipeData, null, 2));

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
