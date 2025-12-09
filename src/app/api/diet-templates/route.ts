import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connect';
import DietTemplate from '@/lib/db/models/DietTemplate';
import { UserRole } from '@/types';
import { z } from 'zod';

// Validation schema for meal type config
const mealTypeConfigSchema = z.object({
  name: z.string().min(1),
  time: z.string().default('')
});

// Validation schema for diet template (more flexible)
const dietTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().optional().default(''),
  category: z.enum(['weight-loss', 'weight-gain', 'maintenance', 'muscle-gain', 'diabetes', 'heart-healthy', 'keto', 'vegan', 'custom']),
  duration: z.number().min(1).max(365),
  targetCalories: z.object({
    min: z.number().min(0).max(10000),
    max: z.number().min(0).max(10000)
  }).optional().default({ min: 1200, max: 2500 }),
  targetMacros: z.object({
    protein: z.object({
      min: z.number().min(0),
      max: z.number().min(0)
    }).optional().default({ min: 50, max: 150 }),
    carbs: z.object({
      min: z.number().min(0),
      max: z.number().min(0)
    }).optional().default({ min: 100, max: 300 }),
    fat: z.object({
      min: z.number().min(0),
      max: z.number().min(0)
    }).optional().default({ min: 30, max: 100 })
  }).optional().default({
    protein: { min: 50, max: 150 },
    carbs: { min: 100, max: 300 },
    fat: { min: 30, max: 100 }
  }),
  dietaryRestrictions: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  meals: z.array(z.any()).default([]),
  mealTypes: z.array(mealTypeConfigSchema).optional().default([
    { name: 'Breakfast', time: '8:00 AM' },
    { name: 'Mid Morning', time: '10:30 AM' },
    { name: 'Lunch', time: '1:00 PM' },
    { name: 'Evening Snack', time: '4:00 PM' },
    { name: 'Dinner', time: '7:00 PM' },
    { name: 'Bedtime', time: '9:30 PM' }
  ]),
  isPublic: z.boolean().optional().default(false),
  isPremium: z.boolean().optional().default(false),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate'),
  prepTime: z.object({
    daily: z.number().min(0),
    weekly: z.number().min(0)
  }).optional().default({ daily: 30, weekly: 210 }),
  targetAudience: z.object({
    ageGroup: z.array(z.string()).default([]),
    activityLevel: z.array(z.string()).default([]),
    healthConditions: z.array(z.string()).default([]),
    goals: z.array(z.string()).default([])
  }).optional().default({
    ageGroup: [],
    activityLevel: [],
    healthConditions: [],
    goals: []
  })
});

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/diet-templates - Starting request');

    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isPublic = searchParams.get('isPublic');
    const search = searchParams.get('search');
    const difficulty = searchParams.get('difficulty');
    const dietaryRestrictions = searchParams.get('dietaryRestrictions');
    const createdBy = searchParams.get('createdBy');
    const sortBy = searchParams.get('sortBy') || 'newest';
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = parseInt(searchParams.get('skip') || '0');
    const days = searchParams.get('days');

    // Build query
    const query: any = { isActive: true };

    if (createdBy) {
      query.createdBy = createdBy;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (isPublic !== null && isPublic !== undefined) {
      query.isPublic = isPublic === 'true';
    }

    if (difficulty && difficulty !== 'all') {
      query.difficulty = difficulty;
    }

    if (dietaryRestrictions) {
      const restrictions = dietaryRestrictions.split(',').filter(r => r.trim() !== '');
      if (restrictions.length > 0) {
        query.dietaryRestrictions = { $all: restrictions };
      }
    }

    if (days) {
      const durationVal = parseInt(days);
      if (!isNaN(durationVal)) {
        query.duration = durationVal;
      }
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Sort options
    let sortOptions: any = {};
    switch (sortBy) {
      case 'rating':
        sortOptions = { averageRating: -1 };
        break;
      case 'popular':
        sortOptions = { usageCount: -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'name':
        sortOptions = { name: 1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    const templates = await DietTemplate.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort(sortOptions)
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await DietTemplate.countDocuments(query);

    // Get categories for filtering
    const categories = await DietTemplate.distinct('category', { isActive: true });

    return NextResponse.json({
      success: true,
      templates,
      total,
      categories,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error in GET /api/diet-templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch diet templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/diet-templates - Starting request');

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has permission to create templates
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.DIETITIAN) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();

    // Validate input
    const validatedData = dietTemplateSchema.parse(body);
    console.log('Validated diet template data:', {
      name: validatedData.name,
      duration: validatedData.duration,
      mealsCount: Array.isArray(validatedData.meals) ? validatedData.meals.length : 0,
      dietaryRestrictions: validatedData.dietaryRestrictions
    });

    // Create new diet template
    const template = new DietTemplate({
      ...validatedData,
      createdBy: session.user.id
    });

    await template.save();

    // Populate creator info
    await template.populate('createdBy', 'firstName lastName');

    return NextResponse.json({
      success: true,
      message: 'Diet template created successfully',
      template
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating diet template:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues
        },
        { status: 400 }
      );
    }

    // Return more detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to create diet template: ${errorMessage}` },
      { status: 500 }
    );
  }
}
