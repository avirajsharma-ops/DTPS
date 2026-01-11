import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Recipe from '@/lib/db/models/Recipe';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

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
    let recipe = await Recipe.findById(id).populate({
      path: 'createdBy',
      select: 'firstName lastName',
      options: { strictPopulate: false }
    }).lean();

    if (!recipe)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Sanitize nutrition data - ensure it's a proper object
    if (recipe && !Array.isArray(recipe) && !recipe.nutrition) {
      recipe.nutrition = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      };
    }
    
    // Ensure createdBy has default values
    const singleRecipe = recipe as { createdBy?: { firstName?: string; lastName?: string } };
    if (!singleRecipe.createdBy) {
      singleRecipe.createdBy = { firstName: 'Unknown', lastName: 'User' };
    }

    await Recipe.findByIdAndUpdate(id, { $inc: { views: 1 } });

    return NextResponse.json({ success: true, recipe });
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

    const recipe = await withCache(
      `recipes:id:${JSON.stringify(id)}`,
      async () => await Recipe.findById(id).lean(),
      { ttl: 120000, tags: ['recipes'] }
    );
    if (!recipe)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Allow any dietitian, health_counselor, or admin to edit any recipe
    const allowedRoles = ['dietitian', 'health_counselor', 'admin'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await Recipe.findByIdAndUpdate(id, data, {
      new: true,
    });

    return NextResponse.json({ success: true, recipe: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
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
    const recipe = await withCache(
      `recipes:id:${JSON.stringify(id)}`,
      async () => await Recipe.findById(id).lean(),
      { ttl: 120000, tags: ['recipes'] }
    );
    if (!recipe)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Allow any dietitian, health_counselor, or admin to delete any recipe
    const allowedRoles = ['dietitian', 'health_counselor', 'admin'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await Recipe.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}
