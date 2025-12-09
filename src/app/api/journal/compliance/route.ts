import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import JournalTracking from '@/lib/db/models/JournalTracking';
import { UserRole } from '@/types';
import { subDays, format } from 'date-fns';
import mongoose from 'mongoose';

// Helper to check if user has permission to access client data
const checkPermission = (session: any, clientId?: string): boolean => {
  const userRole = session?.user?.role;
  if ([UserRole.ADMIN, UserRole.DIETITIAN, UserRole.HEALTH_COUNSELOR].includes(userRole)) {
    return true;
  }
  if (userRole === UserRole.CLIENT) {
    return !clientId || clientId === session?.user?.id;
  }
  return false;
};

// GET /api/journal/compliance - Get food compliance data for graphs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId') || session.user.id;
    const days = parseInt(searchParams.get('days') || '7');
    const mealType = searchParams.get('mealType') || 'all';
    const selectedDateParam = searchParams.get('selectedDate');

    if (!checkPermission(session, clientId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await connectDB();

    // Convert clientId to ObjectId
    const clientObjectId = new mongoose.Types.ObjectId(clientId);

    // Get date range - use selectedDate as end date if provided
    const endDate = selectedDateParam ? new Date(selectedDateParam) : new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = subDays(endDate, days - 1);
    startDate.setHours(0, 0, 0, 0);

    // Get all journal entries in the date range
    const journals = await JournalTracking.find({
      client: clientObjectId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    // Build daily data for chart
    const dailyData: any[] = [];
    let totalTaken = 0;
    let totalMissed = 0;
    let totalNotRecorded = 0;
    let totalOptions = 0;

    for (let i = 0; i < days; i++) {
      const currentDate = subDays(endDate, days - 1 - i);
      currentDate.setHours(0, 0, 0, 0);
      
      const journal = journals.find(j => {
        const journalDate = new Date(j.date);
        journalDate.setHours(0, 0, 0, 0);
        return journalDate.getTime() === currentDate.getTime();
      });

      let meals = journal?.meals || [];
      
      // Filter by meal type if specified
      if (mealType !== 'all') {
        meals = meals.filter((m: any) => m.type.toLowerCase() === mealType.toLowerCase());
      }

      const consumed = meals.filter((m: any) => m.consumed);
      const notConsumed = meals.filter((m: any) => !m.consumed);
      
      // Calculate expected meals per day (4 by default: Breakfast, Lunch, Dinner, Snack)
      const expectedMeals = mealType === 'all' ? 4 : 1;
      const recordedMeals = meals.length;
      const notRecorded = Math.max(0, expectedMeals - recordedMeals);

      const dayData = {
        date: format(currentDate, 'dd/MM'),
        fullDate: currentDate.toISOString(),
        taken: consumed.length,
        missed: notConsumed.length,
        notRecorded: notRecorded,
        options: 0, // Could be meal options/alternatives if implemented
        totalMeals: meals.length
      };

      dailyData.push(dayData);

      totalTaken += consumed.length;
      totalMissed += notConsumed.length;
      totalNotRecorded += notRecorded;
    }

    // Calculate percentages for donut chart
    const total = totalTaken + totalMissed + totalNotRecorded + totalOptions;
    const complianceSummary = {
      taken: total > 0 ? Math.round((totalTaken / total) * 100) : 0,
      missed: total > 0 ? Math.round((totalMissed / total) * 100) : 0,
      notRecorded: total > 0 ? Math.round((totalNotRecorded / total) * 100) : 0,
      options: total > 0 ? Math.round((totalOptions / total) * 100) : 0,
      rawCounts: {
        taken: totalTaken,
        missed: totalMissed,
        notRecorded: totalNotRecorded,
        options: totalOptions,
        total
      }
    };

    return NextResponse.json({
      success: true,
      dailyData,
      complianceSummary,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days
      }
    });

  } catch (error) {
    console.error('Error fetching compliance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compliance data' },
      { status: 500 }
    );
  }
}
