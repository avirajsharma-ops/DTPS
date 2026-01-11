import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import JournalTracking from '@/lib/db/models/JournalTracking';
import { format } from 'date-fns';
import { UserRole } from '@/types';
import { logHistoryServer } from '@/lib/server/history';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

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

// GET /api/journal/activity - Get activity entries for a date
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

    const journal = await withCache(
      `journal:activity:${JSON.stringify({
      client: clientId,
      date: date
    })}`,
      async () => await JournalTracking.findOne({
      client: clientId,
      date: date
    }).lean(),
      { ttl: 120000, tags: ['journal'] }
    );

    const activities = journal?.activities || [];
    const totalDuration = activities.reduce((sum: number, a: { duration: number }) => sum + a.duration, 0);
    const totalSets = activities.reduce((sum: number, a: { sets: number }) => sum + a.sets, 0);

    return NextResponse.json({
      success: true,
      activities,
      summary: {
        totalDuration,
        totalSets,
        target: journal?.targets?.activityMinutes || 60,
        percentage: Math.min(Math.round((totalDuration / (journal?.targets?.activityMinutes || 60)) * 100), 100)
      }
    });

  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

// POST /api/journal/activity - Add new activity entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { name, sets, reps, duration, date, clientId, videoLink } = await request.json();
    const userId = clientId || session.user.id;

    // Check access permission
    if (!canAccessClientData(session as { user: { id: string; role: string } }, userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Activity name is required' }, { status: 400 });
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

    // Add new activity entry
    const newActivity = {
      name,
      sets: sets || 0,
      reps: reps || 0,
      duration: duration || 0,
      videoLink: videoLink || '',
      completed: false,
      time: format(new Date(), 'hh:mm a'),
      createdAt: new Date()
    };

    journal.activities.push(newActivity);
    await journal.save();

    // Log history for activity entry
    await logHistoryServer({
      userId: userId,
      action: 'create',
      category: 'journal',
      description: `Activity logged: ${name} - ${duration || 0} mins`,
      performedById: session.user.id,
      metadata: {
        entryType: 'activity',
        name,
        sets: sets || 0,
        reps: reps || 0,
        duration: duration || 0,
        date: format(journalDate, 'yyyy-MM-dd')
      }
    });

    return NextResponse.json({
      success: true,
      activity: journal.activities[journal.activities.length - 1],
      activities: journal.activities
    });

  } catch (error) {
    console.error('Error adding activity:', error);
    return NextResponse.json(
      { error: 'Failed to add activity' },
      { status: 500 }
    );
  }
}

// DELETE /api/journal/activity - Delete activity entry
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
      { $pull: { activities: { _id: entryId } } },
      { new: true }
    );

    if (!journal) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      activities: journal.activities
    });

  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json(
      { error: 'Failed to delete activity' },
      { status: 500 }
    );
  }
}

// PATCH /api/journal/activity - Mark activity as complete
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { entryId, completed, date, clientId } = await request.json();
    const userId = clientId || session.user.id;

    // Check access permission
    if (!canAccessClientData(session as { user: { id: string; role: string } }, userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    const journalDate = date ? getDateOnly(date) : getDateOnly(new Date());

    const journal = await JournalTracking.findOneAndUpdate(
      { 
        client: userId, 
        date: journalDate,
        'activities._id': entryId 
      },
      { 
        $set: { 
          'activities.$.completed': completed !== false,
          'activities.$.completedAt': completed !== false ? new Date() : undefined
        } 
      },
      { new: true }
    );

    if (!journal) {
      return NextResponse.json({ error: 'Activity entry not found' }, { status: 404 });
    }

    // Check if all assigned activities are completed
    if (journal.assignedActivities && journal.assignedActivities.activities?.length > 0) {
      const allCompleted = journal.activities.every((a: any) => a.completed === true);
      if (allCompleted && !journal.assignedActivities.isCompleted) {
        journal.assignedActivities.isCompleted = true;
        journal.assignedActivities.completedAt = new Date();
        await journal.save();
      }
    }

    return NextResponse.json({
      success: true,
      activities: journal.activities
    });

  } catch (error) {
    console.error('Error updating activity:', error);
    return NextResponse.json(
      { error: 'Failed to update activity' },
      { status: 500 }
    );
  }
}
