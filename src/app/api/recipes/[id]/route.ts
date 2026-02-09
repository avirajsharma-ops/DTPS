import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Recipe from '@/lib/db/models/Recipe';
import User from '@/lib/db/models/User';
import mongoose from 'mongoose';
import { clearCacheByTag } from '@/lib/api/utils';

/* -------- GET SINGLE -------- */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    
    // Fetch recipe without populate to avoid ObjectId cast errors
    let recipe = await Recipe.findById(id).lean();

    if (!recipe)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Ensure proper typing for recipe data
    const recipeData = recipe as Record<string, any>;
    
    // Manually fetch creator if valid ObjectId
    if (recipeData.createdBy && mongoose.Types.ObjectId.isValid(recipeData.createdBy)) {
      try {
        const creator = await User.findById(recipeData.createdBy, { firstName: 1, lastName: 1 }).lean();
        recipeData.createdBy = creator || { firstName: 'Unknown', lastName: 'User' };
      } catch {
        recipeData.createdBy = { firstName: 'Unknown', lastName: 'User' };
      }
    } else {
      recipeData.createdBy = { firstName: 'Unknown', lastName: 'User' };
    }
    
    // Add flat nutrition values
    const flatNutrition = {
      calories: recipeData.calories || 0,
      protein: recipeData.protein || 0,
      carbs: recipeData.carbs || 0,
      fat: recipeData.fat || 0
    };
    recipeData.flatNutrition = flatNutrition;

    await Recipe.findByIdAndUpdate(id, { $inc: { views: 1 } });

    return NextResponse.json({ success: true, recipe: recipeData });
  } catch (error: any) {
    console.error('Error fetching recipe:', error?.message || error);
    return NextResponse.json({ error: 'Failed to fetch recipe', details: error?.message }, { status: 500 });
  }
}

/* -------- UPDATE -------- */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const data = await req.json();

    const recipe = await Recipe.findById(id);
    if (!recipe)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Allow any dietitian, health_counselor, or admin to edit any recipe (case-insensitive)
    const userRole = (session.user.role || '').toLowerCase();
    const allowedRoles = ['dietitian', 'health_counselor', 'admin'];
    if (!allowedRoles.includes(userRole)) {
      console.log('User role not allowed for recipe edit:', userRole);
      return NextResponse.json({ error: 'Forbidden', message: 'You do not have permission to edit recipes' }, { status: 403 });
    }

    // Transform ingredients if provided - ensure they are objects
    if (data.ingredients && Array.isArray(data.ingredients)) {
      data.ingredients = data.ingredients
        .filter((ing: any) => ing.name && ing.name.trim() !== '')
        .map((ing: any) => ({
          name: ing.name.trim(),
          quantity: ing.quantity || 0,
          unit: ing.unit || '',
          remarks: ing.remarks || ''
        }));
    }

    // Transform nutrition if provided
    if (data.nutrition && typeof data.nutrition === 'object') {
      data.calories = data.nutrition.calories || 0;
      data.protein = data.nutrition.protein || 0;
      data.carbs = data.nutrition.carbs || 0;
      data.fat = data.nutrition.fat || 0;
    }

    // Calculate total time if times changed
    if (data.prepTime !== undefined || data.cookTime !== undefined) {
      data.totalTime = (data.prepTime || recipe.prepTime || 0) + (data.cookTime || recipe.cookTime || 0);
    }

    // Clear cache for this recipe
    clearCacheByTag('recipes');

    const updated = await Recipe.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true
    });

    return NextResponse.json({ success: true, recipe: updated });
  } catch (error: any) {
    console.error('Error updating recipe:', error?.message || error);
    return NextResponse.json({ error: 'Failed to update recipe', details: error?.message }, { status: 500 });
  }
}

/* -------- DELETE -------- */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const recipe = await Recipe.findById(id);
    if (!recipe)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Allow any dietitian, health_counselor, or admin to delete any recipe (case-insensitive)
    const userRole = (session.user.role || '').toLowerCase();
    const allowedRoles = ['dietitian', 'health_counselor', 'admin'];
    if (!allowedRoles.includes(userRole)) {
      console.log('User role not allowed for recipe delete:', userRole);
      return NextResponse.json({ error: 'Forbidden', message: 'You do not have permission to delete recipes' }, { status: 403 });
    }

    // Clear cache for recipes
    clearCacheByTag('recipes');

    await Recipe.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting recipe:', error?.message || error);
    return NextResponse.json({ error: 'Failed to delete recipe', details: error?.message }, { status: 500 });
  }
}
