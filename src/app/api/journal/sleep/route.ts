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
  const allowedRoles = [UserRole.ADMIN, UserRole.DIETITIAN, UserRole.HEALTH_COUNSELOR, 'health_counselor', 'admin', 'dietitian']; if (allowedRoles.includes(session.user.role as any)) return true;
  return false;
};

// GET /api/journal/sleep - Get sleep entries for a date
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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

    const sleep = journal?.sleep || [];
    const totalMinutes = sleep.reduce((sum: number, e: { hours: number; minutes: number }) => {
      return sum + (e.hours * 60) + e.minutes;
    }, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const targetHours = journal?.targets?.sleep || 8;
    const targetMinutes = targetHours * 60;

    return NextResponse.json({
      success: true,
      entries: sleep,
      summary: {
        totalMinutes,
        totalHours,
        remainingMinutes,
        displayTime: `${totalHours}h ${remainingMinutes}m`,
        target: targetHours,
        percentage: Math.min(Math.round((totalMinutes / targetMinutes) * 100), 100)
      }
    });

  } catch (error) {
    console.error('Error fetching sleep:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sleep data' },
      { status: 500 }
    );
  }
}

// POST /api/journal/sleep - Add new sleep entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { hours, minutes, quality, date, clientId } = body;
    const userId = clientId || session.user.id;

    // Check access permission
    if (!canAccessClientData(session as { user: { id: string; role: string } }, userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await connectDB();

    if (hours === undefined && minutes === undefined) {
      return NextResponse.json({ error: 'Hours or minutes are required' }, { status: 400 });
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
        meals: [],
        progress: [],
        bca: [],
        measurements: []
      });
    } else {
      // Ensure arrays exist on existing documents
      if (!journal.sleep) journal.sleep = [];
      if (!journal.progress) journal.progress = [];
      if (!journal.bca) journal.bca = [];
      if (!journal.measurements) journal.measurements = [];
    }

    // Add new sleep entry
    const newEntry = {
      hours: hours || 0,
      minutes: minutes || 0,
      quality: quality || 'Fair',
      time: format(new Date(), 'hh:mm a'),
      createdAt: new Date()
    };

    journal.sleep.push(newEntry);
    
    // Check if assigned sleep target is met and mark as completed
    const totalMinutesAfterAdd = journal.sleep.reduce((sum: number, e: { hours: number; minutes: number }) => {
      return sum + (e.hours * 60) + e.minutes;
    }, 0);
    
    if (journal.assignedSleep && !journal.assignedSleep.isCompleted) {
      const targetMinutes = (journal.assignedSleep.targetHours || 0) * 60 + (journal.assignedSleep.targetMinutes || 0);
      if (totalMinutesAfterAdd >= targetMinutes) {
        journal.assignedSleep.isCompleted = true;
        journal.assignedSleep.completedAt = new Date();
      }
    }
    
    await journal.save();

    // Log history for sleep entry
    await logHistoryServer({
      userId: userId,
      action: 'create',
      category: 'journal',
      description: `Sleep logged: ${hours || 0}h ${minutes || 0}m - ${quality || 'Fair'}`,
      performedById: session.user.id,
      metadata: {
        entryType: 'sleep',
        hours: hours || 0,
        minutes: minutes || 0,
        quality: quality || 'Fair',
        date: format(journalDate, 'yyyy-MM-dd')
      }
    });

    // Calculate totals for response
    const totalMinutes = journal.sleep.reduce((sum: number, e: { hours: number; minutes: number }) => {
      return sum + (e.hours * 60) + e.minutes;
    }, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    return NextResponse.json({
      success: true,
      entry: journal.sleep[journal.sleep.length - 1],
      entries: journal.sleep,
      summary: {
        totalMinutes,
        totalHours,
        remainingMinutes,
        displayTime: `${totalHours}h ${remainingMinutes}m`,
        target: journal.targets?.sleep || 8,
        percentage: Math.min(Math.round((totalMinutes / ((journal.targets?.sleep || 8) * 60)) * 100), 100)
      }
    });

  } catch (error: any) {
    console.error('Error adding sleep:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to add sleep entry', details: error?.message },
      { status: 500 }
    );
  }
}

// DELETE /api/journal/sleep - Delete sleep entry
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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
      { $pull: { sleep: { _id: entryId } } },
      { new: true }
    );

    if (!journal) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    // Calculate totals for response
    const totalMinutes = journal.sleep.reduce((sum: number, e: { hours: number; minutes: number }) => {
      return sum + (e.hours * 60) + e.minutes;
    }, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    return NextResponse.json({
      success: true,
      entries: journal.sleep,
      summary: {
        totalMinutes,
        totalHours,
        remainingMinutes,
        displayTime: `${totalHours}h ${remainingMinutes}m`,
        target: journal.targets?.sleep || 8,
        percentage: Math.min(Math.round((totalMinutes / ((journal.targets?.sleep || 8) * 60)) * 100), 100)
      }
    });

  } catch (error) {
    console.error('Error deleting sleep entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete sleep entry' },
      { status: 500 }
    );
  }
}
