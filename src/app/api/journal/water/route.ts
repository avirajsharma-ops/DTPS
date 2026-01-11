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

// Unit to ml conversion
const unitToMl: Record<string, number> = {
  'Glass (250ml)': 250,
  'Bottle (500ml)': 500,
  'Bottle (1L)': 1000,
  'Cup (200ml)': 200,
  'glasses': 250
};

// GET /api/journal/water - Get water entries for a date
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
      `journal:water:${JSON.stringify({
      client: clientId,
      date: date
    })}`,
      async () => await JournalTracking.findOne({
      client: clientId,
      date: date
    }).lean(),
      { ttl: 120000, tags: ['journal'] }
    );

    const water = journal?.water || [];
    const totalMl = water.reduce((sum: number, e: { amount: number; unit: string }) => {
      return sum + (e.amount * (unitToMl[e.unit] || 250));
    }, 0);
    const totalLiters = (totalMl / 1000).toFixed(1);
    const target = journal?.targets?.water || 2500;

    return NextResponse.json({
      success: true,
      entries: water,
      summary: {
        totalMl,
        totalLiters,
        target,
        percentage: Math.min(Math.round((totalMl / target) * 100), 100)
      }
    });

  } catch (error) {
    console.error('Error fetching water:', error);
    return NextResponse.json(
      { error: 'Failed to fetch water intake' },
      { status: 500 }
    );
  }
}

// POST /api/journal/water - Add new water entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { amount, unit, date, clientId } = await request.json();
    const userId = clientId || session.user.id;

    // Check access permission
    if (!canAccessClientData(session as { user: { id: string; role: string } }, userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!amount || amount < 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    if (!unit) {
      return NextResponse.json({ error: 'Unit is required' }, { status: 400 });
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

    // Add new water entry
    const newEntry = {
      amount,
      unit,
      time: format(new Date(), 'hh:mm a'),
      createdAt: new Date()
    };

    journal.water.push(newEntry);
    
    // Check if assigned water target is met and mark as completed
    const totalMlAfterAdd = journal.water.reduce((sum: number, e: { amount: number; unit: string }) => {
      return sum + (e.amount * (unitToMl[e.unit] || 250));
    }, 0);
    
    if (journal.assignedWater && journal.assignedWater.amount && !journal.assignedWater.isCompleted) {
      if (totalMlAfterAdd >= journal.assignedWater.amount) {
        journal.assignedWater.isCompleted = true;
        journal.assignedWater.completedAt = new Date();
      }
    }
    
    await journal.save();

    // Log history for water intake
    await logHistoryServer({
      userId,
      action: 'create',
      category: 'journal',
      description: `Water intake logged: ${amount} ${unit}`,
      performedById: session.user.id,
      metadata: {
        amount,
        unit,
        date: journalDate,
        totalMl: amount * (unitToMl[unit] || 250)
      }
    });

    // Calculate totals for response
    const totalMl = journal.water.reduce((sum: number, e: { amount: number; unit: string }) => {
      return sum + (e.amount * (unitToMl[e.unit] || 250));
    }, 0);

    return NextResponse.json({
      success: true,
      entry: journal.water[journal.water.length - 1],
      entries: journal.water,
      summary: {
        totalMl,
        totalLiters: (totalMl / 1000).toFixed(1),
        target: journal.targets?.water || 2500,
        percentage: Math.min(Math.round((totalMl / (journal.targets?.water || 2500)) * 100), 100)
      }
    });

  } catch (error) {
    console.error('Error adding water:', error);
    return NextResponse.json(
      { error: 'Failed to add water intake' },
      { status: 500 }
    );
  }
}

// DELETE /api/journal/water - Delete water entry
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
      { $pull: { water: { _id: entryId } } },
      { new: true }
    );

    if (!journal) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    // Calculate totals for response
    const totalMl = journal.water.reduce((sum: number, e: { amount: number; unit: string }) => {
      return sum + (e.amount * (unitToMl[e.unit] || 250));
    }, 0);

    return NextResponse.json({
      success: true,
      entries: journal.water,
      summary: {
        totalMl,
        totalLiters: (totalMl / 1000).toFixed(1),
        target: journal.targets?.water || 2500,
        percentage: Math.min(Math.round((totalMl / (journal.targets?.water || 2500)) * 100), 100)
      }
    });

  } catch (error) {
    console.error('Error deleting water entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete water entry' },
      { status: 500 }
    );
  }
}
