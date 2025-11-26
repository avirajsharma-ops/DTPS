import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connect';
import MealPlanTemplate from '@/lib/db/models/MealPlanTemplate';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const template = await MealPlanTemplate.findById(params.id)
      .populate('createdBy', 'firstName lastName')
      .lean();
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, template });
  } catch (e) {
    console.error('Error fetching meal plan template by id:', e);
    return NextResponse.json({ success: false, error: 'Failed to fetch template' }, { status: 500 });
  }
}
