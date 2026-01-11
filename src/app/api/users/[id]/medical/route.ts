import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import { MedicalInfo } from '@/lib/db/models';
import { UserRole } from '@/types';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

// GET /api/users/[id]/medical - Get medical info for user
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

    const medicalInfo = await withCache(
      `users:id:medical:${JSON.stringify({ userId: id })}`,
      async () => await MedicalInfo.findOne({ userId: id }),
      { ttl: 120000, tags: ['users'] }
    );

    if (!medicalInfo) {
      return NextResponse.json({ medicalInfo: null });
    }

    return NextResponse.json({ medicalInfo });
  } catch (error) {
    console.error('Error fetching medical info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medical info' },
      { status: 500 }
    );
  }
}

// POST/PUT /api/users/[id]/medical - Create or update medical info
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
    let medicalInfo = await MedicalInfo.findOne({ userId: id });

    if (medicalInfo) {
      // Update existing
      Object.assign(medicalInfo, body);
      await medicalInfo.save();
    } else {
      // Create new
      medicalInfo = await MedicalInfo.create({
        userId: id,
        ...body
      });
    }

    return NextResponse.json({ medicalInfo });
  } catch (error) {
    console.error('Error saving medical info:', error);
    return NextResponse.json(
      { error: 'Failed to save medical info' },
      { status: 500 }
    );
  }
}
