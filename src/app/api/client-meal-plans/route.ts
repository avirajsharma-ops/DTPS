import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import ClientMealPlan from '@/lib/db/models/ClientMealPlan';
import MealPlanTemplate from '@/lib/db/models/MealPlanTemplate';
import User from '@/lib/db/models/User';
import { UserRole } from '@/types';
import { z } from 'zod';

// Validation schema for client meal plan assignment
const clientMealPlanSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  templateId: z.string().min(1, 'Template ID is required'),
  name: z.string().min(1, 'Plan name is required').max(200),
  startDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid start date'),
  endDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid end date'),
  customizations: z.object({
    targetCalories: z.number().min(800).max(5000).optional(),
    targetMacros: z.object({
      protein: z.number().min(0).max(500).optional(),
      carbs: z.number().min(0).max(1000).optional(),
      fat: z.number().min(0).max(300).optional()
    }).optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    notes: z.string().max(1000).optional()
  }).optional(),
  goals: z.object({
    weightGoal: z.number().min(20).max(500).optional(),
    bodyFatGoal: z.number().min(3).max(50).optional(),
    targetDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid target date').optional(),
    primaryGoal: z.enum(['weight-loss', 'weight-gain', 'maintenance', 'muscle-gain', 'health-improvement']),
    secondaryGoals: z.array(z.string()).optional()
  }),
  reminders: z.object({
    mealReminders: z.boolean().default(true),
    progressReminders: z.boolean().default(true),
    checkInReminders: z.boolean().default(true)
  }).optional()
});

// GET /api/client-meal-plans - Get client meal plans
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query based on user role
    const query: any = {};

    if (session.user.role === UserRole.CLIENT) {
      // Clients can only see their own meal plans
      query.clientId = session.user.id;
    } else if (session.user.role === UserRole.DIETITIAN) {
      // Dietitians can see meal plans they created
      query.dietitianId = session.user.id;
      if (clientId) {
        query.clientId = clientId;
      }
    } else if (session.user.role === UserRole.ADMIN) {
      // Admins can see all meal plans
      if (clientId) {
        query.clientId = clientId;
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [mealPlans, total] = await Promise.all([
      ClientMealPlan.find(query)
        .populate('clientId', 'firstName lastName email')
        .populate('dietitianId', 'firstName lastName')
        .populate('templateId', 'name category duration')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ClientMealPlan.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      mealPlans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching client meal plans:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to fetch client meal plans'
    }, { status: 500 });
  }
}

// POST /api/client-meal-plans - Assign meal plan to client
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: 'Please log in to assign meal plans' 
      }, { status: 401 });
    }

    // Only dietitians and admins can assign meal plans
    if (session.user.role !== UserRole.DIETITIAN && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'Only dietitians and admins can assign meal plans to clients' 
      }, { status: 403 });
    }

    const body = await request.json();
    console.log('Received client meal plan data:', JSON.stringify(body, null, 2));

    // Validate input
    let validatedData;
    try {
      validatedData = clientMealPlanSchema.parse(body);
    } catch (validationError) {
      console.error('Validation error:', validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json({
          error: 'Validation failed',
          message: 'Please check your input data',
          details: validationError.issues.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }, { status: 400 });
      }
      throw validationError;
    }

    await connectDB();

    // Validate that the client exists and is a client
    const client = await User.findById(validatedData.clientId);
    if (!client || client.role !== UserRole.CLIENT) {
      return NextResponse.json({
        error: 'Invalid client',
        message: 'The specified client does not exist or is not a client user'
      }, { status: 400 });
    }

    // Validate that the template exists
    const template = await MealPlanTemplate.findById(validatedData.templateId);
    if (!template) {
      return NextResponse.json({
        error: 'Invalid template',
        message: 'The specified meal plan template does not exist'
      }, { status: 400 });
    }

    // Validate date range
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);
    
    if (startDate >= endDate) {
      return NextResponse.json({
        error: 'Invalid date range',
        message: 'Start date must be before end date'
      }, { status: 400 });
    }

    // Check for overlapping active meal plans for the same client
    const overlappingPlan = await ClientMealPlan.findOne({
      clientId: validatedData.clientId,
      status: 'active',
      $or: [
        {
          startDate: { $lte: endDate },
          endDate: { $gte: startDate }
        }
      ]
    });

    if (overlappingPlan) {
      return NextResponse.json({
        error: 'Overlapping meal plan',
        message: 'The client already has an active meal plan during this period'
      }, { status: 409 });
    }

    // Create client meal plan
    const clientMealPlan = new ClientMealPlan({
      clientId: validatedData.clientId,
      dietitianId: session.user.id,
      templateId: validatedData.templateId,
      name: validatedData.name,
      startDate: startDate,
      endDate: endDate,
      customizations: validatedData.customizations,
      goals: validatedData.goals,
      reminders: validatedData.reminders || {
        mealReminders: true,
        progressReminders: true,
        checkInReminders: true
      },
      analytics: {
        totalDaysCompleted: 0
      }
    });

    await clientMealPlan.save();

    // Populate the created meal plan
    await clientMealPlan.populate([
      { path: 'clientId', select: 'firstName lastName email' },
      { path: 'dietitianId', select: 'firstName lastName' },
      { path: 'templateId', select: 'name category duration' }
    ]);

    // Update template usage count
    await MealPlanTemplate.findByIdAndUpdate(
      validatedData.templateId,
      { $inc: { usageCount: 1 } }
    );

    return NextResponse.json({
      success: true,
      message: 'Meal plan assigned successfully',
      mealPlan: clientMealPlan
    }, { status: 201 });

  } catch (error) {
    console.error('Error assigning meal plan:', error);
    
    // Handle specific MongoDB errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({
        error: 'Database validation failed',
        message: 'The meal plan data does not meet the required format',
        details: Object.values((error as any).errors).map((err: any) => ({
          field: err.path,
          message: err.message
        }))
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to assign meal plan. Please try again later.'
    }, { status: 500 });
  }
}
