import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import { ServicePlan } from '@/lib/db/models/ServicePlan';

// GET - Fetch a single service plan by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await dbConnect();

    const plan = await ServicePlan.findById(id).lean();

    if (!plan) {
      return NextResponse.json(
        { error: 'Service plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      plan
    });
  } catch (error) {
    console.error('Error fetching service plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service plan' },
      { status: 500 }
    );
  }
}
