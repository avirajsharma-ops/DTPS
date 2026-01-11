import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import dbConnect from '@/lib/db/connect';
import { ClientPurchase } from '@/lib/db/models/ServicePlan';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

// GET - Fetch client purchases
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const query: any = {};
    
    // Filter by client
    if (clientId) {
      query.client = clientId;
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter active purchases (not expired)
    if (activeOnly) {
      query.status = 'active';
      query.endDate = { $gte: new Date() };
    }

    const purchases = await withCache(
      `client-purchases:${JSON.stringify(query)}`,
      async () => await ClientPurchase.find(query)
      .populate('client', 'firstName lastName email phone')
      .populate('dietitian', 'firstName lastName')
      .populate('servicePlan', 'name category')
      .populate('paymentLink', 'razorpayPaymentLinkId status paidAt')
      .sort({ purchaseDate: -1 }),
      { ttl: 120000, tags: ['client_purchases'] }
    );

    // Add remaining days to each purchase
    const purchasesWithInfo = purchases.map(purchase => {
      const purchaseObj = purchase.toObject();
      const now = new Date();
      const endDate = new Date(purchaseObj.endDate);
      const diffTime = endDate.getTime() - now.getTime();
      const remainingDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      
      return {
        ...purchaseObj,
        remainingDays,
        isExpired: remainingDays === 0
      };
    });

    return NextResponse.json({ 
      success: true, 
      purchases: purchasesWithInfo,
      total: purchases.length
    });
  } catch (error) {
    console.error('Error fetching client purchases:', error);
    return NextResponse.json({ error: 'Failed to fetch client purchases' }, { status: 500 });
  }
}

// POST - Create a client purchase (after payment is confirmed)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { 
      clientId, 
      servicePlanId, 
      paymentLinkId,
      pricingTierId,
      planName,
      planCategory,
      durationDays,
      durationLabel,
      baseAmount,
      discountPercent,
      taxPercent,
      finalAmount,
      startDate
    } = body;

    // Validate required fields
    if (!clientId || !servicePlanId || !paymentLinkId || !durationDays) {
      return NextResponse.json({ 
        error: 'Client ID, service plan ID, payment link ID, and duration are required' 
      }, { status: 400 });
    }

    // Calculate dates
    const purchaseStartDate = startDate ? new Date(startDate) : new Date();
    const purchaseEndDate = new Date(purchaseStartDate);
    purchaseEndDate.setDate(purchaseEndDate.getDate() + durationDays);

    const purchase = new ClientPurchase({
      client: clientId,
      dietitian: session.user.id,
      servicePlan: servicePlanId,
      paymentLink: paymentLinkId,
      planName,
      planCategory,
      durationDays,
      durationLabel,
      baseAmount,
      discountPercent: Math.min(discountPercent || 0, 40), // Max 40%
      taxPercent: taxPercent || 0,
      finalAmount,
      purchaseDate: new Date(),
      startDate: purchaseStartDate,
      endDate: purchaseEndDate,
      status: 'active',
      mealPlanCreated: false,
      daysUsed: 0
    });

    await purchase.save();

    return NextResponse.json({ 
      success: true, 
      purchase,
      message: 'Client purchase recorded successfully'
    });
  } catch (error) {
    console.error('Error creating client purchase:', error);
    return NextResponse.json({ error: 'Failed to create client purchase' }, { status: 500 });
  }
}

// PUT - Update client purchase (e.g., mark meal plan created, add days used)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { purchaseId, mealPlanId, mealPlanCreated, daysUsed, addDaysUsed, status, expectedStartDate, expectedEndDate, parentPurchaseId } = body;

    if (!purchaseId) {
      return NextResponse.json({ error: 'Purchase ID is required' }, { status: 400 });
    }

    // Get current purchase to check existing daysUsed
    const currentPurchase = await withCache(
      `client-purchases:${JSON.stringify(purchaseId)}`,
      async () => await ClientPurchase.findById(purchaseId),
      { ttl: 120000, tags: ['client_purchases'] }
    );
    if (!currentPurchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (mealPlanId) updateData.mealPlanId = mealPlanId;
    if (mealPlanCreated !== undefined) updateData.mealPlanCreated = mealPlanCreated;
    
    // Update expected dates
    if (expectedStartDate !== undefined) {
      updateData.expectedStartDate = expectedStartDate ? new Date(expectedStartDate) : null;
    }
    if (expectedEndDate !== undefined) {
      updateData.expectedEndDate = expectedEndDate ? new Date(expectedEndDate) : null;
    }
    
    // Update parent purchase reference (for multi-phase plans)
    if (parentPurchaseId !== undefined) {
      updateData.parentPurchaseId = parentPurchaseId || null;
    }
    
    // If addDaysUsed is provided, ADD to existing daysUsed (for multiple meal plans)
    if (addDaysUsed !== undefined && addDaysUsed > 0) {
      updateData.daysUsed = (currentPurchase.daysUsed || 0) + addDaysUsed;
    } else if (daysUsed !== undefined) {
      // Legacy: direct set (for backwards compatibility)
      updateData.daysUsed = daysUsed;
    }
    
    if (status) updateData.status = status;

    const updatedPurchase = await ClientPurchase.findByIdAndUpdate(
      purchaseId,
      updateData,
      { new: true }
    );

    if (!updatedPurchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      purchase: updatedPurchase,
      totalDaysUsed: updatedPurchase.daysUsed || 0,
      remainingDays: Math.max(0, (updatedPurchase.durationDays || 0) - (updatedPurchase.daysUsed || 0)),
      message: 'Purchase updated successfully'
    });
  } catch (error) {
    console.error('Error updating client purchase:', error);
    return NextResponse.json({ error: 'Failed to update client purchase' }, { status: 500 });
  }
}
