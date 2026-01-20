import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import ClientMealPlan from '@/lib/db/models/ClientMealPlan';
import { UserRole } from '@/types';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

// GET /api/users/clients - Get clients for dietitians to book appointments 
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only dietitians, health counselors, and admins can access client list
    const userRole = session.user.role?.toLowerCase();
    if (userRole !== 'dietitian' && userRole !== 'health_counselor' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
 
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    // Build query
    let query: any = { role: UserRole.CLIENT };

    // If dietitian, show their assigned clients AND clients they created
    if (userRole === 'dietitian') {
      query.$or = [
        { assignedDietitian: session.user.id },
        { assignedDietitians: session.user.id },
        { 'createdBy.userId': session.user.id, 'createdBy.role': 'dietitian' }
      ];
    }
    // If health counselor, show their assigned clients AND clients they created
    else if (userRole === 'health_counselor') {
      query.$or = [
        { assignedHealthCounselor: session.user.id },
        { assignedHealthCounselors: session.user.id },
        { 'createdBy.userId': session.user.id, 'createdBy.role': 'health_counselor' }
      ];
    }
    // Admin can see all clients (no additional filter needed)

    // Add search filter
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const clientsData = await withCache(
      `users:clients:${JSON.stringify(query)}:page=${page}:limit=${limit}`,
      async () => await User.find(query)
        .select('firstName lastName email avatar phone dateOfBirth gender height weight activityLevel healthGoals medicalConditions allergies dietaryRestrictions assignedDietitian assignedDietitians assignedHealthCounselor assignedHealthCounselors status clientStatus createdAt createdBy tags')
        .populate('assignedDietitian', 'firstName lastName email avatar')
        .populate('assignedDietitians', 'firstName lastName email avatar')
        .populate('assignedHealthCounselor', 'firstName lastName email avatar')
        .populate('assignedHealthCounselors', 'firstName lastName email avatar')
        .populate('tags', 'name color icon')
        .populate({
          path: 'createdBy.userId',
          select: 'firstName lastName role',
          strictPopulate: false
        })
        .sort({ firstName: 1, lastName: 1 })
        .limit(limit)
        .skip((page - 1) * limit),
      { ttl: 120000, tags: ['users'] }
    );

    // Fetch meal plan data for all clients to get programStart, programEnd, lastDiet
    const clientIds = clientsData.map((c: any) => c._id);
    
    // Get meal plan info for each client
    const mealPlanData = await ClientMealPlan.aggregate([
      { $match: { clientId: { $in: clientIds } } },
      { $sort: { startDate: 1 } },
      {
        $group: {
          _id: '$clientId',
          // First meal plan start date (earliest)
          programStart: { $first: '$startDate' },
          // Last meal plan end date (latest)
          programEnd: { $last: '$endDate' },
          // Last meal plan info for lastDiet display
          lastPlanDate: { $last: '$updatedAt' },
          lastPlanName: { $last: '$name' },
          lastPlanStatus: { $last: '$status' }
        }
      }
    ]);

    // Create a map of clientId to meal plan data
    const mealPlanMap = new Map();
    mealPlanData.forEach((mp: any) => {
      mealPlanMap.set(mp._id.toString(), {
        programStart: mp.programStart,
        programEnd: mp.programEnd,
        lastDiet: mp.lastPlanDate ? `${mp.lastPlanName || 'Diet Plan'}` : null
      });
    });

    // Merge meal plan data into clients
    const clients = clientsData.map((client: any) => {
      const clientObj = client.toObject ? client.toObject() : client;
      const mealData = mealPlanMap.get(clientObj._id.toString());
      return {
        ...clientObj,
        programStart: mealData?.programStart || null,
        programEnd: mealData?.programEnd || null,
        lastDiet: mealData?.lastDiet || null
      };
    });

    const total = await User.countDocuments(query);

    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}