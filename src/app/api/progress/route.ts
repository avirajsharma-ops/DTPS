import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import ProgressEntry from '@/lib/db/models/ProgressEntry';
import { UserRole } from '@/types';

// GET /api/progress - Get progress entries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type'); // weight, measurements, etc.
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    // Build query based on user role
    let query: any = {};
    
    if (session.user.role === UserRole.CLIENT) {
      query.user = session.user.id;
    } else if (session.user.role === UserRole.DIETITIAN) {
      if (clientId) {
        query.user = clientId;
      } else {
        return NextResponse.json(
          { error: 'Client ID required for dietitian' },
          { status: 400 }
        );
      }
    } else {
      // Admin can see all progress
      if (clientId) {
        query.user = clientId;
      }
    }

    // Date filtering
    if (startDate && endDate) {
      query.recordedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Type filtering
    if (type) {
      query.type = type;
    }

    const progressEntries = await ProgressEntry.find(query)
      .populate('user', 'firstName lastName')
      .sort({ recordedAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await ProgressEntry.countDocuments(query);

    // Get latest entry for each type for summary
    const latestEntries = await ProgressEntry.aggregate([
      { $match: query },
      { $sort: { recordedAt: -1 } },
      {
        $group: {
          _id: '$type',
          latestEntry: { $first: '$$ROOT' }
        }
      }
    ]);

    return NextResponse.json({
      progressEntries,
      latestEntries: latestEntries.reduce((acc, item) => {
        acc[item._id] = item.latestEntry;
        return acc;
      }, {}),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching progress entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress entries' },
      { status: 500 }
    );
  }
}

// POST /api/progress - Create new progress entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, value, unit, notes, recordedAt } = body;

    await connectDB();

    // Validate required fields
    if (!type || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create progress entry
    const progressEntry = new ProgressEntry({
      user: session.user.id,
      type,
      value,
      unit,
      notes,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date()
    });

    await progressEntry.save();

    return NextResponse.json(progressEntry, { status: 201 });

  } catch (error) {
    console.error('Error creating progress entry:', error);
    return NextResponse.json(
      { error: 'Failed to create progress entry' },
      { status: 500 }
    );
  }
}
