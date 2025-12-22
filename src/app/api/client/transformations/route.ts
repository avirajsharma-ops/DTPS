import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connection';
import Transformation from '@/lib/db/models/Transformation';

// GET - Fetch all active transformations for public display
export async function GET() {
  try {
    await dbConnect();

    const transformations = await Transformation.find({ isActive: true })
      .select('uuid title description beforeImage afterImage clientName durationWeeks weightLoss displayOrder')
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({ transformations });
  } catch (error) {
    console.error('Error fetching transformations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transformations' },
      { status: 500 }
    );
  }
}
