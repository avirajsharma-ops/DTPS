import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import { LifestyleInfo } from '@/lib/db/models';
import { UserRole } from '@/types';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

// GET /api/users/[id]/lifestyle - Get lifestyle info for user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const lifestyleInfo = await withCache(
      `users:id:lifestyle:${JSON.stringify({ userId: id })}`,
      async () => await LifestyleInfo.findOne({ userId: id }),
      { ttl: 120000, tags: ['users'] }
    );

    if (!lifestyleInfo) {
      return NextResponse.json({ lifestyleInfo: null });
    }

    return NextResponse.json({ lifestyleInfo });
  } catch (error) {
    console.error('Error fetching lifestyle info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lifestyle info' },
      { status: 500 }
    );
  }
}

// POST/PUT /api/users/[id]/lifestyle - Create or update lifestyle info
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    // Find existing or create new
    let lifestyleInfo = await LifestyleInfo.findOne({ userId: id });

    if (lifestyleInfo) {
      // Update existing
      Object.assign(lifestyleInfo, body);
      await lifestyleInfo.save();
    } else {
      // Create new
      lifestyleInfo = await LifestyleInfo.create({
        userId: id,
        ...body
      });
    }

    return NextResponse.json({ lifestyleInfo });
  } catch (error) {
    console.error('Error saving lifestyle info:', error);
    return NextResponse.json(
      { error: 'Failed to save lifestyle info' },
      { status: 500 }
    );
  }
}
