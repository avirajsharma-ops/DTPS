import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connect';
import MealPlanTemplate from '@/lib/db/models/MealPlanTemplate';
import { UserRole } from '@/types';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const template = await withCache(
      `meal-plan-templates:id:${JSON.stringify(id)}`,
      async () => await MealPlanTemplate.findById(id)
      .populate('createdBy', 'firstName lastName')
      ,
      { ttl: 120000, tags: ['meal_plan_templates'] }
    );
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, template });
  } catch (e) {
    console.error('Error fetching meal plan template by id:', e);
    return NextResponse.json({ success: false, error: 'Failed to fetch template' }, { status: 500 });
  }
}

// Update meal plan template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.DIETITIAN) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const body = await request.json();

    // Find existing template
    const existingTemplate = await withCache(
      `meal-plan-templates:id:${JSON.stringify(id)}`,
      async () => await MealPlanTemplate.findById(id),
      { ttl: 120000, tags: ['meal_plan_templates'] }
    );
    if (!existingTemplate) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    // Check if user owns the template or is admin
    if (existingTemplate.createdBy.toString() !== session.user.id && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ success: false, error: 'Not authorized to update this template' }, { status: 403 });
    }

    // Update fields
    const updateFields = [
      'templateType', 'name', 'description', 'category', 'duration',
      'targetCalories', 'targetMacros', 'dietaryRestrictions', 'tags',
      'meals', 'isPublic', 'isPremium', 'difficulty', 'prepTime', 'targetAudience'
    ];

    updateFields.forEach(field => {
      if (body[field] !== undefined) {
        (existingTemplate as any)[field] = body[field];
      }
    });

    await existingTemplate.save();
    await existingTemplate.populate('createdBy', 'firstName lastName');

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      template: existingTemplate
    });

  } catch (error) {
    console.error('Error updating meal plan template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update template';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// Partial update meal plan template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.DIETITIAN) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const body = await request.json();

    const existingTemplate = await withCache(
      `meal-plan-templates:id:${JSON.stringify(id)}`,
      async () => await MealPlanTemplate.findById(id),
      { ttl: 120000, tags: ['meal_plan_templates'] }
    );
    if (!existingTemplate) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    // Check ownership
    if (existingTemplate.createdBy.toString() !== session.user.id && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ success: false, error: 'Not authorized to update this template' }, { status: 403 });
    }

    // Apply partial updates
    Object.keys(body).forEach(key => {
      if (body[key] !== undefined && key !== '_id' && key !== 'createdBy') {
        (existingTemplate as any)[key] = body[key];
      }
    });

    await existingTemplate.save();
    await existingTemplate.populate('createdBy', 'firstName lastName');

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      template: existingTemplate
    });

  } catch (error) {
    console.error('Error updating meal plan template (PATCH):', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update template';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// Delete meal plan template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.DIETITIAN) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const existingTemplate = await withCache(
      `meal-plan-templates:id:${JSON.stringify(id)}`,
      async () => await MealPlanTemplate.findById(id),
      { ttl: 120000, tags: ['meal_plan_templates'] }
    );
    if (!existingTemplate) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    // Check ownership
    if (existingTemplate.createdBy.toString() !== session.user.id && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ success: false, error: 'Not authorized to delete this template' }, { status: 403 });
    }

    // Soft delete by setting isActive to false
    existingTemplate.isActive = false;
    await existingTemplate.save();

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting meal plan template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete template';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
