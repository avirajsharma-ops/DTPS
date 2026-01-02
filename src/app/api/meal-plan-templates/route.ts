import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connect';
import MealPlanTemplate from '@/lib/db/models/MealPlanTemplate';
import Recipe from '@/lib/db/models/Recipe';
import { UserRole } from '@/types';
import { z } from 'zod';

// Validation schema for meal plan template (no word limits)
const mealPlanTemplateSchema = z.object({
  templateType: z.enum(['plan','diet']).default('plan'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.enum(['weight-loss', 'weight-gain', 'maintenance', 'muscle-gain', 'diabetes', 'heart-healthy', 'keto', 'vegan', 'custom']),
  duration: z.number().min(1).max(365),
  targetCalories: z.object({
    min: z.number().min(800).max(5000),
    max: z.number().min(800).max(5000)
  }),
  targetMacros: z.object({
    protein: z.object({
      min: z.number().min(0),
      max: z.number().min(0)
    }),
    carbs: z.object({
      min: z.number().min(0),
      max: z.number().min(0)
    }),
    fat: z.object({
      min: z.number().min(0),
      max: z.number().min(0)
    })
  }),
  dietaryRestrictions: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  meals: z.array(z.any()).default([]),
  isPublic: z.boolean().default(false),
  isPremium: z.boolean().default(false),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  prepTime: z.object({
    daily: z.number().min(0),
    weekly: z.number().min(0)
  }).optional(),
  targetAudience: z.object({
    ageGroup: z.array(z.string()).default([]),
    activityLevel: z.array(z.string()).default([]),
    healthConditions: z.array(z.string()).default([]),
    goals: z.array(z.string()).default([])
  }).optional()
});

export async function GET(request: NextRequest) {
  try {

    await connectDB();

  const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isPublic = searchParams.get('isPublic');
    const search = searchParams.get('search');
    const difficulty = searchParams.get('difficulty');
    const dietaryRestrictions = searchParams.get('dietaryRestrictions');
  const templateType = searchParams.get('templateType');
  const createdBy = searchParams.get('createdBy');
  const sortBy = searchParams.get('sortBy') || 'newest';
  const limit = parseInt(searchParams.get('limit') || '1000');
  const skip = parseInt(searchParams.get('skip') || '0');
  const days = searchParams.get('days'); // filter by duration

    // Build query
  const query: any = { isActive: true };
    if (templateType) {
      if (templateType === 'plan') {
        // include legacy documents with no templateType field
        query.$or = [{ templateType: 'plan' }, { templateType: { $exists: false } }];
      } else {
        query.templateType = templateType;
      }
    }
    if (createdBy) {
      query.createdBy = createdBy;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (isPublic !== null) {
      query.isPublic = isPublic === 'true';
    }

    if (difficulty && difficulty !== 'all') {
      query.difficulty = difficulty;
    }

    if (dietaryRestrictions) {
      const restrictions = dietaryRestrictions.split(',').filter(r => r.trim() !== '');
      if (restrictions.length > 0) {
        query.dietaryRestrictions = { $in: restrictions };
      }
    }

    if (days) {
      const durationVal = parseInt(days);
      if (!isNaN(durationVal)) {
        query.duration = durationVal; // exact match on duration
      }
    }

    if (search) {
      query.$text = { $search: search };
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

    const templates = await MealPlanTemplate.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort(sortOptions)
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await MealPlanTemplate.countDocuments(query);

    // Get categories for filtering
    const categories = await MealPlanTemplate.distinct('category', { isActive: true, isPublic: true });

    return NextResponse.json({
      success: true,
      templates,
      total,
      categories,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error in GET /api/meal-plan-templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch meal plan templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {

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
    const validatedData = mealPlanTemplateSchema.parse(body);
    // Create new meal plan template
    const template = new MealPlanTemplate({
      ...validatedData,
      createdBy: session.user.id
    });

    await template.save();

    // Populate creator info
    await template.populate('createdBy', 'firstName lastName');

    return NextResponse.json({
      success: true,
      message: 'Meal plan template created successfully',
      template
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating meal plan template:', error);

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

    return NextResponse.json(
      { success: false, error: 'Failed to create meal plan template' },
      { status: 500 }
    );
  }
}