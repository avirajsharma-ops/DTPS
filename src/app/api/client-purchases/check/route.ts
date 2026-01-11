import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import dbConnect from '@/lib/db/connect';
import { ClientPurchase } from '@/lib/db/models/ServicePlan';
import PaymentLink from '@/lib/db/models/PaymentLink';
import Payment from '@/lib/db/models/Payment';
import User from '@/lib/db/models/User';
import MealPlan from '@/lib/db/models/MealPlan';
import { PaymentStatus, PaymentType, ClientStatus } from '@/types';
import Razorpay from 'razorpay';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

// Initialize Razorpay for syncing payment status
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

// Helper function to update client status based on their meal plan status
async function updateClientStatusBasedOnMealPlan(clientId: string): Promise<string> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if client has any active meal plan (current date within plan date range)
    const activeMealPlan = await withCache(
      `client-purchases:check:${JSON.stringify({
      client: clientId,
      status: 'active',
      startDate: { $lte: today },
      endDate: { $gte: today }
    })}`,
      async () => await MealPlan.findOne({
      client: clientId,
      status: 'active',
      startDate: { $lte: today },
      endDate: { $gte: today }
    }),
      { ttl: 120000, tags: ['client_purchases'] }
    );
    
    // Get current client status
    const client = await withCache(
      `client-purchases:check:${JSON.stringify(clientId)}`,
      async () => await User.findById(clientId).select('clientStatus createdAt'),
      { ttl: 120000, tags: ['client_purchases'] }
    );
    if (!client) return 'leading';
    
    let newStatus = client.clientStatus || 'leading';
    
    if (activeMealPlan) {
      // Has active meal plan - set to active
      newStatus = 'active';
    } else {
      // No active meal plan
      // Check if they ever had a meal plan
      const anyMealPlan = await withCache(
      `client-purchases:check:${JSON.stringify({ client: clientId })}`,
      async () => await MealPlan.findOne({ client: clientId }),
      { ttl: 120000, tags: ['client_purchases'] }
    );
      
      if (anyMealPlan) {
        // Had a meal plan before but not active now - set to inactive
        newStatus = 'inactive';
      } else {
        // Never had a meal plan - keep as leading (new client)
        // Only set to leading if not already set to something else manually
        if (!client.clientStatus || client.clientStatus === 'leading') {
          newStatus = 'leading';
        }
      }
    }
    
    // Update if status changed
    if (client.clientStatus !== newStatus) {
      await User.findByIdAndUpdate(clientId, { clientStatus: newStatus });
    }
    
    return newStatus;
  } catch (error) {
    console.error('Error updating client status:', error);
    return 'leading';
  }
}

// Helper function to create Payment record from PaymentLink
async function createPaymentRecordFromLink(paymentLink: any): Promise<string | null> {
  try {
    // Check if Payment record already exists
    const existingPayment = await withCache(
      `client-purchases:check:${JSON.stringify({
      paymentLink: paymentLink._id
    })}`,
      async () => await Payment.findOne({
      paymentLink: paymentLink._id
    }),
      { ttl: 120000, tags: ['client_purchases'] }
    );
    
    if (existingPayment) {
      return existingPayment._id.toString();
    }
    
    const paymentRecord = new Payment({
      client: paymentLink.client,
      dietitian: paymentLink.dietitian,
      type: PaymentType.SERVICE_PLAN,
      amount: paymentLink.finalAmount,
      currency: paymentLink.currency || 'INR',
      status: PaymentStatus.COMPLETED,
      paymentMethod: paymentLink.paymentMethod || 'razorpay',
      transactionId: paymentLink.razorpayPaymentId || paymentLink.razorpayPaymentLinkId,
      description: `Payment for ${paymentLink.planName || 'Service Plan'} - ${paymentLink.duration || paymentLink.durationDays + ' Days'}`,
      planName: paymentLink.planName,
      planCategory: paymentLink.planCategory,
      durationDays: paymentLink.durationDays,
      durationLabel: paymentLink.duration || `${paymentLink.durationDays} Days`,
      paymentLink: paymentLink._id,
      payerEmail: paymentLink.payerEmail,
      payerPhone: paymentLink.payerPhone,
      mealPlanCreated: false, // Default false - will be set true when meal plan is created
    });
    
    await paymentRecord.save();
    return paymentRecord._id.toString();
  } catch (error) {
    console.error('Error creating Payment record:', error);
    return null;
  }
}

// Helper function to sync a single payment link with Razorpay
async function syncPaymentLinkWithRazorpay(paymentLink: any): Promise<boolean> {
  if (!razorpay || !paymentLink.razorpayPaymentLinkId) return false;
  if (paymentLink.status === 'paid') return true; // Already paid
  
  try {
    const razorpayLink: any = await razorpay.paymentLink.fetch(paymentLink.razorpayPaymentLinkId);
    
    if (razorpayLink.status === 'paid') {
      paymentLink.status = 'paid';
      paymentLink.paidAt = razorpayLink.paid_at 
        ? new Date(razorpayLink.paid_at * 1000) 
        : new Date();
      
      // Try to get payment details
      if (razorpayLink.payments?.length > 0) {
        const latestPayment = razorpayLink.payments[razorpayLink.payments.length - 1];
        paymentLink.razorpayPaymentId = latestPayment.payment_id;
      }
      
      await paymentLink.save();
      
      // Create Payment record for this newly synced payment
      await createPaymentRecordFromLink(paymentLink);
      
      return true;
    }
  } catch (error) {
    console.error(`Error syncing payment link ${paymentLink._id}:`, error);
  }
  return false;
}

// GET - Check if client has active paid plan and can create meal plan
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const requestedDays = parseInt(searchParams.get('requestedDays') || '0');
    const forceSync = searchParams.get('forceSync') === 'true';

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    // If force sync requested, use aggressive checking
    if (forceSync) {

      // Aggressively sync ALL payment links for this client
      const allPaymentLinks = await withCache(
      `client-purchases:check:${JSON.stringify({
        client: clientId,
        servicePlanId: { $exists: true, $ne: null },
        durationDays: { $exists: true, $gt: 0 }
      })}`,
      async () => await PaymentLink.find({
        client: clientId,
        servicePlanId: { $exists: true, $ne: null },
        durationDays: { $exists: true, $gt: 0 }
      }).sort({ createdAt: -1 }).limit(10),
      { ttl: 120000, tags: ['client_purchases'] }
    ); // Check all recent links


      let syncedCount = 0;
      for (const paymentLink of allPaymentLinks) {
        if (paymentLink.status !== 'paid') {
          const wasPaid = await syncPaymentLinkWithRazorpay(paymentLink);
          if (wasPaid) {
            syncedCount++;

            // Create Payment record from synced link
            await createPaymentRecordFromLink(paymentLink);

            // Create ClientPurchase for newly synced paid payment
            const existingPurchase = await withCache(
      `client-purchases:check:${JSON.stringify({ 
              paymentLink: paymentLink._id 
            })}`,
      async () => await ClientPurchase.findOne({ 
              paymentLink: paymentLink._id 
            }),
      { ttl: 120000, tags: ['client_purchases'] }
    );

            if (!existingPurchase) {
              const startDate = paymentLink.paidAt || new Date();
              const endDate = new Date(startDate);
              endDate.setDate(endDate.getDate() + paymentLink.durationDays);

              const newPurchase = new ClientPurchase({
                client: paymentLink.client,
                dietitian: paymentLink.dietitian,
                servicePlan: paymentLink.servicePlanId,
                paymentLink: paymentLink._id,
                planName: paymentLink.planName || 'Service Plan',
                planCategory: paymentLink.planCategory || 'general-wellness',
                durationDays: paymentLink.durationDays,
                durationLabel: paymentLink.duration || `${paymentLink.durationDays} Days`,
                baseAmount: paymentLink.amount,
                discountPercent: paymentLink.discount || 0,
                taxPercent: paymentLink.tax || 0,
                finalAmount: paymentLink.finalAmount,
                purchaseDate: startDate,
                startDate: startDate,
                endDate: endDate,
                status: 'active',
                mealPlanCreated: false,
                daysUsed: 0
              });

              await newPurchase.save();
            }
          }
        }
      }

    } else {
      // STEP 1: Try to sync any pending payment links with Razorpay
      // This ensures we catch payments that webhook might have missed
      const pendingPaymentLinks = await withCache(
      `client-purchases:check:${JSON.stringify({
        client: clientId,
        status: { $in: ['pending', 'created'] },
        servicePlanId: { $exists: true, $ne: null },
        durationDays: { $exists: true, $gt: 0 }
      })}`,
      async () => await PaymentLink.find({
        client: clientId,
        status: { $in: ['pending', 'created'] },
        servicePlanId: { $exists: true, $ne: null },
        durationDays: { $exists: true, $gt: 0 }
      }).sort({ createdAt: -1 }).limit(5),
      { ttl: 120000, tags: ['client_purchases'] }
    ); // Check last 5 pending links

      for (const pendingLink of pendingPaymentLinks) {
        const wasPaid = await syncPaymentLinkWithRazorpay(pendingLink);
        if (wasPaid) {
          // Create ClientPurchase for newly synced paid payment
          const existingPurchase = await withCache(
      `client-purchases:check:${JSON.stringify({ paymentLink: pendingLink._id })}`,
      async () => await ClientPurchase.findOne({ paymentLink: pendingLink._id }),
      { ttl: 120000, tags: ['client_purchases'] }
    );
          if (!existingPurchase) {
            const startDate = pendingLink.paidAt || new Date();
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + pendingLink.durationDays);

            const newPurchase = new ClientPurchase({
              client: pendingLink.client,
              dietitian: pendingLink.dietitian,
              servicePlan: pendingLink.servicePlanId,
              paymentLink: pendingLink._id,
              planName: pendingLink.planName || 'Service Plan',
              planCategory: pendingLink.planCategory || 'general-wellness',
              durationDays: pendingLink.durationDays,
              durationLabel: pendingLink.duration || `${pendingLink.durationDays} Days`,
              baseAmount: pendingLink.amount,
              discountPercent: pendingLink.discount || 0,
              taxPercent: pendingLink.tax || 0,
              finalAmount: pendingLink.finalAmount,
              purchaseDate: startDate,
              startDate: startDate,
              endDate: endDate,
              status: 'active',
              mealPlanCreated: false,
              daysUsed: 0
            });
            await newPurchase.save();
          }

          // Create Payment record for the synced payment
          await createPaymentRecordFromLink(pendingLink);
        }
      }
    }

    // STEP 2: Find ALL client's active purchases that haven't expired
    
    const allActivePurchases = await withCache(
      `client-purchases:check:active:${clientId}`,
      async () => await ClientPurchase.find({
      client: clientId,
      status: 'active',
      endDate: { $gte: new Date() }
    })
    .populate('servicePlan', 'name category')
    .sort({ createdAt: 1 }),
      { ttl: 120000, tags: ['client_purchases'] }
    ); // Sort by creation date (oldest first - FIFO)

    // PRIORITY ORDER FOR MEAL PLAN CREATION:
    // 1. FIRST: Complete any partially used purchase (daysUsed > 0 but still has remaining days)
    // 2. SECOND: Then start new purchases (sorted by expected date, then creation date)
    
    // Find partially used purchase (already started but not complete)
    const partiallyUsedPurchase = allActivePurchases.find(p => 
      (p.daysUsed || 0) > 0 && (p.durationDays - (p.daysUsed || 0)) > 0
    );
    
    // Find purchases that haven't been started yet (daysUsed = 0)
    const unstartedPurchases = allActivePurchases
      .filter(p => (p.daysUsed || 0) === 0 && (p.durationDays - (p.daysUsed || 0)) > 0)
      .sort((a, b) => {
        // Sort by expected start date first
        if (a.expectedStartDate && b.expectedStartDate) {
          return new Date(a.expectedStartDate).getTime() - new Date(b.expectedStartDate).getTime();
        }
        if (a.expectedStartDate && !b.expectedStartDate) return -1;
        if (!a.expectedStartDate && b.expectedStartDate) return 1;
        // Fall back to creation date (earliest first for FIFO)
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    // Priority: Partially used first, then unstarted purchases
    let activePurchase = partiallyUsedPurchase || (unstartedPurchases.length > 0 ? unstartedPurchases[0] : null);

    // If no purchase with remaining days, find any purchase
    if (!activePurchase) {
      activePurchase = allActivePurchases.find(p => 
        (p.durationDays - (p.daysUsed || 0)) > 0
      );
    }

    // Build the list of purchases needing meal plans (for display)
    // Show partially used first, then unstarted
    const purchasesNeedingPlan = [
      ...(partiallyUsedPurchase ? [partiallyUsedPurchase] : []),
      ...unstartedPurchases.filter(p => p._id.toString() !== partiallyUsedPurchase?._id?.toString())
    ];

    // If still no purchase with remaining days, use the most recent one
    if (!activePurchase && allActivePurchases.length > 0) {
      activePurchase = allActivePurchases[0];
    }

    if (activePurchase) {
    } else {
    }

    // STEP 3: If no active purchase found, check for paid payment links without ClientPurchase
    if (!activePurchase) {
      const paidPaymentLink = await withCache(
      `client-purchases:check:${JSON.stringify({
        client: clientId,
        status: 'paid',
        servicePlanId: { $exists: true, $ne: null },
        durationDays: { $exists: true, $gt: 0 }
      })}`,
      async () => await PaymentLink.findOne({
        client: clientId,
        status: 'paid',
        servicePlanId: { $exists: true, $ne: null },
        durationDays: { $exists: true, $gt: 0 }
      }).sort({ paidAt: -1 }),
      { ttl: 120000, tags: ['client_purchases'] }
    );

      if (paidPaymentLink) {
        // Ensure Payment record exists for this paid link
        await createPaymentRecordFromLink(paidPaymentLink);
        
        // Check if ClientPurchase already exists for this payment link
        const existingPurchase = await withCache(
      `client-purchases:check:${JSON.stringify({
          paymentLink: paidPaymentLink._id
        })}`,
      async () => await ClientPurchase.findOne({
          paymentLink: paidPaymentLink._id
        }),
      { ttl: 120000, tags: ['client_purchases'] }
    );

        if (!existingPurchase) {
          // Create ClientPurchase from paid payment link
          const startDate = paidPaymentLink.paidAt || new Date();
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + paidPaymentLink.durationDays);

          const newPurchase = new ClientPurchase({
            client: paidPaymentLink.client,
            dietitian: paidPaymentLink.dietitian,
            servicePlan: paidPaymentLink.servicePlanId,
            paymentLink: paidPaymentLink._id,
            planName: paidPaymentLink.planName || 'Service Plan',
            planCategory: paidPaymentLink.planCategory || 'general-wellness',
            durationDays: paidPaymentLink.durationDays,
            durationLabel: paidPaymentLink.duration || `${paidPaymentLink.durationDays} Days`,
            baseAmount: paidPaymentLink.amount,
            discountPercent: paidPaymentLink.discount || 0,
            taxPercent: paidPaymentLink.tax || 0,
            finalAmount: paidPaymentLink.finalAmount,
            purchaseDate: startDate,
            startDate: startDate,
            endDate: endDate,
            status: 'active',
            mealPlanCreated: false,
            daysUsed: 0
          });

          await newPurchase.save();
          
          // Update Payment record with ClientPurchase reference
          await Payment.findOneAndUpdate(
            { paymentLink: paidPaymentLink._id },
            { clientPurchase: newPurchase._id }
          );
          
          // Use the newly created purchase
          const createdPurchase = await withCache(
      `client-purchases:check:${JSON.stringify(newPurchase._id)}`,
      async () => await ClientPurchase.findById(newPurchase._id)
            .populate('servicePlan', 'name category'),
      { ttl: 120000, tags: ['client_purchases'] }
    );
          if (createdPurchase) {
            activePurchase = createdPurchase;
          }
        } else {
          // Use existing purchase if it's still active
          if (existingPurchase.status === 'active' && new Date(existingPurchase.endDate) >= new Date()) {
            activePurchase = existingPurchase;
          }
        }
      }
    }

    if (!activePurchase) {
      // Update client status even when no paid plan
      const updatedClientStatus = await updateClientStatusBasedOnMealPlan(clientId);
      
      return NextResponse.json({ 
        success: true,
        hasPaidPlan: false,
        canCreateMealPlan: false,
        clientStatus: updatedClientStatus,
        message: 'No active paid plan found. Client needs to purchase a plan first.',
        remainingDays: 0,
        maxDays: 0,
        totalDaysUsed: 0,
        allPurchases: []
      });
    }

    // Aggregate data from ALL active purchases
    const aggregatedTotalPurchasedDays = allActivePurchases.reduce((sum, p) => sum + (p.durationDays || 0), 0);
    const aggregatedTotalDaysUsed = allActivePurchases.reduce((sum, p) => sum + (p.daysUsed || 0), 0);
    const aggregatedRemainingDays = Math.max(0, aggregatedTotalPurchasedDays - aggregatedTotalDaysUsed);

    // Use the already sorted purchasesNeedingPlan for the response
    // This ensures consistent ordering by expected date, then creation date


    // Calculate remaining days based on daysUsed (not date difference)
    // This allows multiple meal plans to use the total purchased days
    const totalPurchasedDays = activePurchase.durationDays || 0;
    const totalDaysUsed = activePurchase.daysUsed || 0;
    const remainingDays = Math.max(0, totalPurchasedDays - totalDaysUsed);

    // Check if meal plan can be created (has remaining days and requested days fit)
    const canCreate = remainingDays > 0 && (requestedDays === 0 || requestedDays <= remainingDays);

    // Get associated payment details
    let paymentDetails = null;
    try {
      
      // First try: Find by clientPurchase
      let payment: any = null;
      if (activePurchase._id) {
        payment = await Payment.findOne({ clientPurchase: activePurchase._id }).lean();
        if (payment) {
        }
      }
      
      // Second try: Find by paymentLink
      if (!payment && activePurchase.paymentLink) {
        payment = await Payment.findOne({ paymentLink: activePurchase.paymentLink }).lean();
        if (payment) {
        }
      }
      
      // Third try: Find by client and status
      if (!payment) {
        payment = await Payment.findOne({
          client: clientId,
          status: PaymentStatus.COMPLETED
        }).sort({ createdAt: -1 }).lean();
        if (payment) {
        }
      }
      
      if (payment && typeof payment === 'object' && '_id' in payment) {
        paymentDetails = {
          _id: payment._id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          transactionId: payment.transactionId,
          paidAt: payment.createdAt,
          mealPlanCreated: payment.mealPlanCreated || false,
          mealPlanId: payment.mealPlanId || null,
        };
      } else {
      }
    } catch (err) {
      console.error('❌ Error fetching payment details:', err);
    }

    // Update client status based on meal plan status
    const updatedClientStatus = await updateClientStatusBasedOnMealPlan(clientId);

    return NextResponse.json({ 
      success: true,
      hasPaidPlan: true,
      canCreateMealPlan: canCreate,
      clientStatus: updatedClientStatus,
      purchase: {
        _id: activePurchase._id,
        planName: activePurchase.planName,
        planCategory: activePurchase.planCategory,
        durationDays: activePurchase.durationDays,
        durationLabel: activePurchase.durationLabel,
        startDate: activePurchase.startDate,
        endDate: activePurchase.endDate,
        expectedStartDate: activePurchase.expectedStartDate || null,
        expectedEndDate: activePurchase.expectedEndDate || null,
        parentPurchaseId: activePurchase.parentPurchaseId || null,
        mealPlanCreated: activePurchase.mealPlanCreated,
        daysUsed: activePurchase.daysUsed,
        baseAmount: activePurchase.baseAmount,
        discountPercent: activePurchase.discountPercent,
        taxPercent: activePurchase.taxPercent,
        finalAmount: activePurchase.finalAmount
      },
      payment: paymentDetails,
      remainingDays,
      maxDays: remainingDays,
      totalDaysUsed,
      totalPurchasedDays,
      // Aggregated data across ALL active purchases
      aggregated: {
        totalPurchases: allActivePurchases.length,
        totalPurchasedDays: aggregatedTotalPurchasedDays,
        totalDaysUsed: aggregatedTotalDaysUsed,
        totalRemainingDays: aggregatedRemainingDays,
        purchasesNeedingMealPlan: purchasesNeedingPlan.length
      },
      // All purchases that need meal plans created (sorted by expected start date, then creation date)
      allPurchasesNeedingMealPlan: purchasesNeedingPlan.map(p => ({
        _id: p._id,
        planName: p.planName,
        planCategory: p.planCategory,
        durationDays: p.durationDays,
        durationLabel: p.durationLabel,
        daysUsed: p.daysUsed || 0,
        remainingDays: (p.durationDays || 0) - (p.daysUsed || 0),
        mealPlanCreated: p.mealPlanCreated,
        startDate: p.startDate,
        endDate: p.endDate,
        expectedStartDate: p.expectedStartDate || null,
        expectedEndDate: p.expectedEndDate || null,
        parentPurchaseId: p.parentPurchaseId || null,
        createdAt: p.createdAt
      })),
      message: canCreate 
        ? `Client has ${remainingDays} days remaining (${totalDaysUsed}/${totalPurchasedDays} days used) in their ${activePurchase.planName} plan.${purchasesNeedingPlan.length > 1 ? ` (${purchasesNeedingPlan.length} purchases need meal plans)` : ''}`
        : remainingDays === 0
          ? `All ${totalPurchasedDays} days have been used. Client needs to purchase a new plan.`
          : `Requested ${requestedDays} days but only ${remainingDays} days remaining in plan.`
    });
  } catch (error) {
    console.error('Error checking client paid plan:', error);
    return NextResponse.json({ error: 'Failed to check client paid plan' }, { status: 500 });
  }
}
