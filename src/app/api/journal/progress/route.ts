import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import JournalTracking from '@/lib/db/models/JournalTracking';
import { format } from 'date-fns';
import { UserRole } from '@/types';
import mongoose from 'mongoose';
import { logHistoryServer } from '@/lib/server/history';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

// Helper to check if user has permission to access client data
const checkPermission = (session: any, clientId?: string): boolean => {
  const userRole = session?.user?.role;
  const allowedRoles = [UserRole.ADMIN, UserRole.DIETITIAN, UserRole.HEALTH_COUNSELOR, 'health_counselor', 'admin', 'dietitian'];
  if (allowedRoles.includes(userRole)) {
    return true;
  }
  if (userRole === UserRole.CLIENT || userRole === 'client') {
    return !clientId || clientId === session?.user?.id;
  }
  return false;
};

// GET /api/journal/progress - Get all progress entries for a client
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user ID - handle different possible locations
    const userId = session.user.id || (session.user as any).sub || (session as any).sub;

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId') || session.user.id;
    const dateParam = searchParams.get('date');

    if (!checkPermission(session, clientId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await connectDB();

    // Convert clientId to ObjectId
    const clientObjectId = new mongoose.Types.ObjectId(clientId);

    // Build query - filter by date if provided
    const query: any = {
      client: clientObjectId,
      'progress.0': { $exists: true }
    };

    if (dateParam) {
      const filterDate = new Date(dateParam);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { $gte: filterDate, $lt: nextDay };
    }

    // Get journal entries for this client with progress data
    const journals = await withCache(
      `journal:progress:${JSON.stringify(query)}`,
      async () => await JournalTracking.find(query).sort({ date: -1 }),
      { ttl: 120000, tags: ['journal'] }
    );

    // Flatten all progress entries with their dates
    const allProgress: any[] = [];
    journals.forEach(journal => {
      journal.progress.forEach((entry: any) => {
        allProgress.push({
          ...entry.toObject(),
          journalDate: journal.date
        });
      });
    });

    // Sort by date descending
    allProgress.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate started with (first entry) and currently at (latest entry)
    const sortedByDateAsc = [...allProgress].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const startedWith = sortedByDateAsc.length > 0 ? {
      weight: sortedByDateAsc[0].weight,
      bmr: sortedByDateAsc[0].bmr,
      bmi: sortedByDateAsc[0].bmi,
      bodyFat: sortedByDateAsc[0].bodyFat
    } : { weight: 0, bmr: 0, bmi: 0, bodyFat: 0 };

    const currentlyAt = allProgress.length > 0 ? {
      weight: allProgress[0].weight,
      bmr: allProgress[0].bmr,
      bmi: allProgress[0].bmi,
      bodyFat: allProgress[0].bodyFat
    } : { weight: 0, bmr: 0, bmi: 0, bodyFat: 0 };

    const difference = {
      weight: currentlyAt.weight - startedWith.weight,
      bmr: currentlyAt.bmr - startedWith.bmr,
      bmi: currentlyAt.bmi - startedWith.bmi,
      bodyFat: currentlyAt.bodyFat - startedWith.bodyFat
    };

    return NextResponse.json({
      success: true,
      progress: allProgress,
      summary: {
        startedWith,
        currentlyAt,
        difference,
        totalEntries: allProgress.length
      }
    });

  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

// POST /api/journal/progress - Add new progress entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { weight, bmi, bmr, bodyFat, dietPlan, notes, date, clientId } = body;
    const userId = clientId || session.user.id;

    if (!checkPermission(session, userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await connectDB();

    const progressDate = date ? new Date(date) : new Date();
    progressDate.setHours(0, 0, 0, 0);

    // Convert userId to ObjectId
    const clientObjectId = new mongoose.Types.ObjectId(userId);

    // Find or create journal entry for this date
    let journal = await JournalTracking.findOne({
      client: clientObjectId,
      date: progressDate
    });

    if (!journal) {
      journal = new JournalTracking({
        client: clientObjectId,
        date: progressDate,
        activities: [],
        steps: [],
        water: [],
        sleep: [],
        meals: [],
        progress: [],
        bca: [],
        measurements: []
      });
    } else {
      // Ensure arrays exist on existing documents
      if (!journal.progress) journal.progress = [];
      if (!journal.bca) journal.bca = [];
      if (!journal.measurements) journal.measurements = [];
    }

    // Add new progress entry
    const newProgress = {
      weight: weight || 0,
      bmi: bmi || 0,
      bmr: bmr || 0,
      bodyFat: bodyFat || 0,
      dietPlan: dietPlan || '',
      notes: notes || '',
      date: progressDate,
      createdAt: new Date()
    };

    journal.progress.push(newProgress);
    await journal.save();

    // Log history for progress entry
    await logHistoryServer({
      userId: userId,
      action: 'create',
      category: 'journal',
      description: `Progress logged: Weight ${weight || 0}kg, BMI ${bmi || 0}`,
      performedById: session.user.id,
      metadata: {
        entryType: 'progress',
        weight: weight || 0,
        bmi: bmi || 0,
        bmr: bmr || 0,
        bodyFat: bodyFat || 0,
        date: format(progressDate, 'yyyy-MM-dd')
      }
    });

    return NextResponse.json({
      success: true,
      progress: journal.progress[journal.progress.length - 1]
    });

  } catch (error: any) {
    console.error('Error adding progress:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to add progress', details: error?.message },
      { status: 500 }
    );
  }
}

// DELETE /api/journal/progress - Delete progress entry
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');
    const clientId = searchParams.get('clientId') || session.user.id;

    if (!checkPermission(session, clientId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    await connectDB();

    // Convert clientId to ObjectId
    const clientObjectId = new mongoose.Types.ObjectId(clientId);

    const journal = await JournalTracking.findOneAndUpdate(
      { client: clientObjectId, 'progress._id': entryId },
      { $pull: { progress: { _id: entryId } } },
      { new: true }
    );

    if (!journal) {
      return NextResponse.json({ error: 'Progress entry not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Progress entry deleted'
    });

  } catch (error) {
    console.error('Error deleting progress:', error);
    return NextResponse.json(
      { error: 'Failed to delete progress' },
      { status: 500 }
    );
  }
}
