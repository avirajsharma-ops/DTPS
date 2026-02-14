import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import DietaryRecall from '@/lib/db/models/DietaryRecall';
import User from '@/lib/db/models/User';
import { logHistoryServer } from '@/lib/server/history';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

// GET /api/users/[id]/recall - Fetch dietary recall for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id: userId } = await params;

    // Verify user exists
    const user = await withCache(
      `users:id:recall:${JSON.stringify(userId)}`,
      async () => await User.findById(userId),
      { ttl: 120000, tags: ['users'] }
    );
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch the latest dietary recall document for this user (or create default)
    const recall: any = await DietaryRecall.findOne({ userId }).sort({ date: -1 }).lean();

    // If no recall exists, return empty meals array
    if (!recall) {
      return NextResponse.json({ 
        success: true, 
        meals: [],
        entries: [],
        recallId: null 
      }, { status: 200 });
    }

    // Map meals to include id for frontend
    const entriesWithId = (recall.meals || []).map((meal: any, index: number) => ({
      id: meal._id?.toString() || `meal-${index}`,
      _id: meal._id?.toString(),
      mealType: meal.mealType,
      hour: meal.hour,
      minute: meal.minute,
      meridian: meal.meridian,
      food: meal.food || ''
    }));

    return NextResponse.json({ 
      success: true, 
      meals: recall.meals || [],
      entries: entriesWithId,
      recallId: recall._id,
      date: recall.date
    }, { status: 200 });
  } catch (error) {
    // console.error('Error fetching dietary recall:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dietary recall' },
      { status: 500 }
    );
  }
}

// POST /api/users/[id]/recall - Save/update dietary recall meals array
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id: userId } = await params;
    const body = await request.json();
  
    // console.log('Saving dietary recall for user:', userId);
    // console.log('Request body:', body);

    // Handle both 'meals' array and 'entries' array (frontend sends entries)
    const mealsData = body.meals || body.entries || [];

    // Verify user exists
    const user = await withCache(
      `users:id:recall:${JSON.stringify(userId)}`,
      async () => await User.findById(userId),
      { ttl: 120000, tags: ['users'] }
    );
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Default times for each meal type (canonical 8 types)
    const defaultTimes: { [key: string]: { hour: string; minute: string; meridian: 'AM' | 'PM' } } = {
      'Early Morning': { hour: '6', minute: '00', meridian: 'AM' },
      'Breakfast': { hour: '9', minute: '00', meridian: 'AM' },
      'Mid Morning': { hour: '11', minute: '00', meridian: 'AM' },
      'Lunch': { hour: '1', minute: '00', meridian: 'PM' },
      'Mid Evening': { hour: '4', minute: '00', meridian: 'PM' },
      'Evening': { hour: '7', minute: '00', meridian: 'PM' },
      'Dinner': { hour: '7', minute: '00', meridian: 'PM' },
      'Past Dinner': { hour: '9', minute: '00', meridian: 'PM' },
    };

    // Ensure all meals have valid times
    const mealsWithDefaults = mealsData
      .filter((meal: any) => meal.mealType) // Only include meals with mealType
      .map((meal: any) => {
        const defaultTime = defaultTimes[meal.mealType] || { hour: '12', minute: '00', meridian: 'PM' };
        return {
          mealType: meal.mealType,
          hour: meal.hour || defaultTime.hour,
          minute: meal.minute || defaultTime.minute,
          meridian: meal.meridian || defaultTime.meridian,
          food: meal.food || ''
        };
      });

    // Find existing recall for today or create new one
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let recall = await DietaryRecall.findOne({ 
      userId,
      date: { $gte: today }
    });

    if (recall) {
      // Update existing recall
      recall.meals = mealsWithDefaults;
      await recall.save();

      await logHistoryServer({
        userId,
        action: 'update',
        category: 'diet',
        description: `${session.user.role} updated dietary recall with ${mealsWithDefaults.length} meals`,
        performedById: session.user.id,
        metadata: {
          recallId: recall._id,
          mealCount: mealsWithDefaults.length,
          date: recall.date,
        },
      });
    } else {
      // Create new recall
      recall = new DietaryRecall({
        userId,
        date: new Date(),
        meals: mealsWithDefaults
      });
      await recall.save();

      await logHistoryServer({
        userId,
        action: 'create',
        category: 'diet',
        description: `${session.user.role} logged dietary recall with ${mealsWithDefaults.length} meals`,
        performedById: session.user.id,
        metadata: {
          recallId: recall._id,
          mealCount: mealsWithDefaults.length,
          date: recall.date,
        },
      });
    }

    return NextResponse.json(
      { success: true, recall, recallId: recall._id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving dietary recall:', error);
    return NextResponse.json(
      { error: 'Failed to save dietary recall', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
