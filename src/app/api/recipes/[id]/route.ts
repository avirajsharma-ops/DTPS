import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Recipe from '@/lib/db/models/Recipe';

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
    const recipe = await Recipe.findById(id).populate(
      'createdBy',
      'firstName lastName'
    );

    if (!recipe)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await Recipe.findByIdAndUpdate(id, { $inc: { views: 1 } });

    return NextResponse.json({ success: true, recipe });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch recipe' }, { status: 500 });
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

    if (
      recipe.createdBy.toString() !== session.user.id &&
      session.user.role !== 'admin'
    ) {
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
    const recipe = await Recipe.findById(id);
    if (!recipe)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (
      recipe.createdBy.toString() !== session.user.id &&
      session.user.role !== 'admin'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await Recipe.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}
