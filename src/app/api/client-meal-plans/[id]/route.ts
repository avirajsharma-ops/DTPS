import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import ClientMealPlan from '@/lib/db/models/ClientMealPlan';

// GET single meal plan by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await context.params;
    
    const mealPlan = await ClientMealPlan.findById(id)
      .populate('templateId', 'name category duration')
      .lean();
    
    if (!mealPlan) {
      return NextResponse.json(
        { success: false, error: 'Meal plan not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      mealPlan
    });
  } catch (error) {
    console.error('Error fetching meal plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch meal plan' },
      { status: 500 }
    );
  }
}

// PUT - Update meal plan
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await context.params;
    const body = await request.json();
    
    const {
      name,
      description,
      startDate,
      endDate,
      meals,
      mealTypes,
      customizations,
      goals,
      status
    } = body;
    
    // Build update object
    const updateData: Record<string, any> = {};
    
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (meals) updateData.meals = meals;
    if (mealTypes) updateData.mealTypes = mealTypes;
    if (customizations) updateData.customizations = customizations;
    if (goals) updateData.goals = goals;
    if (status) updateData.status = status;
    
    const updatedPlan = await ClientMealPlan.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('templateId', 'name category duration');
    
    if (!updatedPlan) {
      return NextResponse.json(
        { success: false, error: 'Meal plan not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Meal plan updated successfully',
      mealPlan: updatedPlan
    });
  } catch (error) {
    console.error('Error updating meal plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update meal plan' },
      { status: 500 }
    );
  }
}

// DELETE - Remove meal plan
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await context.params;
    
    const deletedPlan = await ClientMealPlan.findByIdAndDelete(id);
    
    if (!deletedPlan) {
      return NextResponse.json(
        { success: false, error: 'Meal plan not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Meal plan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting meal plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete meal plan' },
      { status: 500 }
    );
  }
}
