import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import JournalTracking from '@/lib/db/models/JournalTracking';
import { format } from 'date-fns';
import { UserRole } from '@/types';
import { logHistoryServer } from '@/lib/server/history';

// Helper to get date without time
const getDateOnly = (date: Date | string): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper to check if user can access client data
const canAccessClientData = (session: { user: { id: string; role: string } }, clientId: string): boolean => {
  if (session.user.id === clientId) return true;
  if ([UserRole.ADMIN, UserRole.DIETITIAN, UserRole.HEALTH_COUNSELOR].includes(session.user.role as UserRole)) return true;
  return false;
};

// GET /api/journal/steps - Get steps entries for a date
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const clientId = searchParams.get('clientId') || session.user.id;
    
    // Check access permission
    if (!canAccessClientData(session as { user: { id: string; role: string } }, clientId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const date = dateParam ? getDateOnly(dateParam) : getDateOnly(new Date());

    const journal = await JournalTracking.findOne({
      client: clientId,
      date: date
    });

    const steps = journal?.steps || [];
    const totalSteps = steps.reduce((sum: number, e: { steps: number }) => sum + e.steps, 0);
    const totalDistance = steps.reduce((sum: number, e: { distance: number }) => sum + e.distance, 0);
    const totalCalories = steps.reduce((sum: number, e: { calories: number }) => sum + e.calories, 0);
    const target = journal?.targets?.steps || 10000;

    return NextResponse.json({
      success: true,
      entries: steps,
      summary: {
        totalSteps,
        totalDistance,
        totalCalories,
        target,
        percentage: Math.min(Math.round((totalSteps / target) * 100), 100)
      }
    });

  } catch (error) {
    console.error('Error fetching steps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch steps' },
      { status: 500 }
    );
  }
}

// POST /api/journal/steps - Add new steps entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { steps, distance, calories, date, clientId } = await request.json();
    const userId = clientId || session.user.id;

    // Check access permission
    if (!canAccessClientData(session as { user: { id: string; role: string } }, userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!steps || steps < 0) {
      return NextResponse.json({ error: 'Valid steps value is required' }, { status: 400 });
    }

    const journalDate = date ? getDateOnly(date) : getDateOnly(new Date());

    // Find or create journal entry
    let journal = await JournalTracking.findOne({
      client: userId,
      date: journalDate
    });

    if (!journal) {
      journal = new JournalTracking({
        client: userId,
        date: journalDate,
        activities: [],
        steps: [],
        water: [],
        sleep: [],
        meals: []
      });
    }

    // Add new steps entry
    const newEntry = {
      steps,
      distance: distance || 0,
      calories: calories || 0,
      time: format(new Date(), 'hh:mm a'),
      createdAt: new Date()
    };

    journal.steps.push(newEntry);
    
    // Check if assigned steps target is met and mark as completed
    const totalStepsAfterAdd = journal.steps.reduce((sum: number, e: { steps: number }) => sum + e.steps, 0);
    
    if (journal.assignedSteps && journal.assignedSteps.target && !journal.assignedSteps.isCompleted) {
      if (totalStepsAfterAdd >= journal.assignedSteps.target) {
        journal.assignedSteps.isCompleted = true;
        journal.assignedSteps.completedAt = new Date();
      }
    }
    
    await journal.save();

    // Log history for steps entry
    await logHistoryServer({
      userId: userId,
      action: 'create',
      category: 'journal',
      description: `Steps logged: ${steps} steps`,
      performedById: session.user.id,
      metadata: {
        entryType: 'steps',
        steps,
        distance: distance || 0,
        calories: calories || 0,
        date: format(journalDate, 'yyyy-MM-dd')
      }
    });

    // Calculate totals for response
    const totalSteps = journal.steps.reduce((sum: number, e: { steps: number }) => sum + e.steps, 0);

    return NextResponse.json({
      success: true,
      entry: journal.steps[journal.steps.length - 1],
      entries: journal.steps,
      summary: {
        totalSteps,
        target: journal.targets?.steps || 10000,
        percentage: Math.min(Math.round((totalSteps / (journal.targets?.steps || 10000)) * 100), 100)
      }
    });

  } catch (error) {
    console.error('Error adding steps:', error);
    return NextResponse.json(
      { error: 'Failed to add steps' },
      { status: 500 }
    );
  }
}

// DELETE /api/journal/steps - Delete steps entry
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');
    const dateParam = searchParams.get('date');
    const clientId = searchParams.get('clientId') || session.user.id;

    // Check access permission
    if (!canAccessClientData(session as { user: { id: string; role: string } }, clientId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    const journalDate = dateParam ? getDateOnly(dateParam) : getDateOnly(new Date());

    const journal = await JournalTracking.findOneAndUpdate(
      { client: clientId, date: journalDate },
      { $pull: { steps: { _id: entryId } } },
      { new: true }
    );

    if (!journal) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    // Calculate totals for response
    const totalSteps = journal.steps.reduce((sum: number, e: { steps: number }) => sum + e.steps, 0);

    return NextResponse.json({
      success: true,
      entries: journal.steps,
      summary: {
        totalSteps,
        target: journal.targets?.steps || 10000,
        percentage: Math.min(Math.round((totalSteps / (journal.targets?.steps || 10000)) * 100), 100)
      }
    });

  } catch (error) {
    console.error('Error deleting steps entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete steps entry' },
      { status: 500 }
    );
  }
}
