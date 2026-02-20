import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import ClientMealPlan from '@/lib/db/models/ClientMealPlan';
import UnifiedPayment from '@/lib/db/models/UnifiedPayment';
import { UserRole } from '@/types';
import { withCache, clearCacheByTag } from '@/lib/api/utils';
import { computeClientStatusFromDocs } from '@/lib/status/computeClientStatus';
import mongoose from 'mongoose';

// GET /api/users/clients - Get clients for dietitians to book appointments 
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only dietitians, health counselors, and admins can access client list
    const userRole = session.user.role?.toLowerCase();
    const userId = session.user.id;
    
    if (userRole !== 'dietitian' && userRole !== 'health_counselor' && userRole !== 'health-counselor' && userRole !== 'healthcounselor' && !userRole?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
 
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '100'); // Increased default limit
    const page = parseInt(searchParams.get('page') || '1');

    // Build query
    let query: any = { role: UserRole.CLIENT };

    const isAdmin = userRole?.includes('admin');
    const isDietitian = userRole === 'dietitian';
    const isHealthCounselor = userRole === 'health_counselor' || userRole === 'health-counselor' || userRole === 'healthcounselor';

    // Convert userId to ObjectId for proper comparison
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // If dietitian, show their assigned clients AND clients they created
    if (isDietitian) {
      query.$or = [
        { assignedDietitian: userObjectId },
        { assignedDietitians: userObjectId },
        { 'createdBy.userId': userObjectId }
      ];
    }
    // If health counselor, show their assigned clients AND clients they created
    else if (isHealthCounselor) {
      query.$or = [
        { assignedHealthCounselor: userObjectId },
        { assignedHealthCounselors: userObjectId },
        { 'createdBy.userId': userObjectId }
      ];
    }
    // Admin can see all clients (no additional filter needed)

    // Add search filter
    if (search) {
      const searchCondition = {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      };
      
      if (query.$or) {
        // Combine existing $or with search $or using $and
        query = {
          role: UserRole.CLIENT,
          $and: [
            { $or: query.$or },
            searchCondition
          ]
        };
      } else {
        query = { ...query, ...searchCondition };
      }
    }

    const clientsData = await User.find(query)
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
      .skip((page - 1) * limit)
      .lean();

    // Fetch meal plan data for all clients to get programStart, programEnd, lastDiet
    const clientIds = clientsData.map((c: any) => c._id);
    
    // Get meal plan info for each client - we need both overall program dates and active plan dates
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
          lastPlanStatus: { $last: '$status' },
          // Collect all plans for active plan detection
          allPlans: { 
            $push: { 
              startDate: '$startDate', 
              endDate: '$endDate', 
              status: '$status',
              name: '$name'
            } 
          }
        }
      }
    ]);

    // Create a map of clientId to meal plan data
    const mealPlanMap = new Map();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    mealPlanData.forEach((mp: any) => {
      // Find the active plan with endDate in the future (for status display)
      const activePlan = mp.allPlans?.find((plan: any) => {
        const end = new Date(plan.endDate);
        end.setHours(23, 59, 59, 999);
        return plan.status === 'active' && end >= today;
      });
      
      mealPlanMap.set(mp._id.toString(), {
        programStart: mp.programStart,
        programEnd: mp.programEnd,
        lastDiet: mp.lastPlanDate ? `${mp.lastPlanName || 'Diet Plan'}` : null,
        // Active plan dates - these are used to determine status
        activePlanStartDate: activePlan?.startDate || null,
        activePlanEndDate: activePlan?.endDate || null,
        activePlanName: activePlan?.name || null
      });
    });

    // Fetch payment data for all clients to determine LEAD vs ACTIVE vs INACTIVE
    const paymentData = await UnifiedPayment.aggregate([
      { $match: { client: { $in: clientIds }, $or: [{ status: { $in: ['paid', 'completed', 'active'] } }, { paymentStatus: 'paid' }] } },
      { $group: { _id: '$client', count: { $sum: 1 } } }
    ]);
    const paidClientIds = new Set(paymentData.map((p: any) => p._id.toString()));

    // Fetch all active meal plans to check validity
    const allMealPlans = await ClientMealPlan.find(
      { clientId: { $in: clientIds } },
      { clientId: 1, startDate: 1, endDate: 1, status: 1 }
    ).lean();

    // Group meal plans by clientId
    const mealPlansByClient = new Map<string, Array<{ startDate: Date | string; endDate: Date | string; status: string }>>();
    allMealPlans.forEach((mp: any) => {
      const cid = mp.clientId.toString();
      if (!mealPlansByClient.has(cid)) mealPlansByClient.set(cid, []);
      mealPlansByClient.get(cid)!.push({ startDate: mp.startDate, endDate: mp.endDate, status: mp.status });
    });

    // Compute status and build bulk update ops
    const bulkOps: any[] = [];

    // Merge meal plan data + computed status into clients
    const clients = clientsData.map((client: any) => {
      const mealData = mealPlanMap.get(client._id.toString());
      const cid = client._id.toString();

      // Compute status dynamically
      const hasPaid = paidClientIds.has(cid);
      const plans = mealPlansByClient.get(cid) || [];
      const payments = hasPaid ? [{ status: 'paid' }] : [];
      const computedStatus = computeClientStatusFromDocs(payments, plans);

      // Queue a DB update if status changed (fire-and-forget)
      if (client.clientStatus !== computedStatus) {
        bulkOps.push({
          updateOne: {
            filter: { _id: client._id },
            update: { $set: { clientStatus: computedStatus } }
          }
        });
      }

      return {
        ...client,
        clientStatus: computedStatus,
        // Overall program dates (first start to last end)
        programStart: mealData?.programStart || null,
        programEnd: mealData?.programEnd || null,
        // Active plan dates - these determine the status
        mealPlanStartDate: mealData?.activePlanStartDate || null,
        mealPlanEndDate: mealData?.activePlanEndDate || null,
        activePlanName: mealData?.activePlanName || null,
        lastDiet: mealData?.lastDiet || null
      };
    });

    // Persist updated statuses in the background
    if (bulkOps.length > 0) {
      User.bulkWrite(bulkOps).catch(err => console.error('Bulk status update error:', err));
    }

    const total = await User.countDocuments(query);

    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      debug: process.env.NODE_ENV === 'development' ? {
        userRole,
        userId,
        queryUsed: JSON.stringify(query),
        totalFound: total
      } : undefined
    });

  } catch (error: any) {
    console.error('[GET /api/users/clients] Error:', {
      errorName: error?.name,
      errorMessage: error?.message,
      errorStack: error?.stack?.split('\n').slice(0, 3).join('\n')
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch clients',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}