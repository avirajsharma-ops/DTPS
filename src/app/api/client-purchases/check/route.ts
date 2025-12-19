import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import dbConnect from '@/lib/db/connect';
import { ClientPurchase } from '@/lib/db/models/ServicePlan';
import PaymentLink from '@/lib/db/models/PaymentLink';
import Payment from '@/lib/db/models/Payment';
import { PaymentStatus, PaymentType } from '@/types';
import Razorpay from 'razorpay';

// Initialize Razorpay for syncing payment status
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

// Helper function to create Payment record from PaymentLink
async function createPaymentRecordFromLink(paymentLink: any): Promise<string | null> {
  try {
    // Check if Payment record already exists
    const existingPayment = await Payment.findOne({
      paymentLink: paymentLink._id
    });
    
    if (existingPayment) {
      console.log(`Payment record already exists for PaymentLink ${paymentLink._id}`);
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
    console.log(`✅ Created Payment record ${paymentRecord._id} for PaymentLink ${paymentLink._id}`);
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
      console.log(`✅ Synced payment link ${paymentLink._id} as PAID from Razorpay`);
      
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
      console.log(`🔄 Force syncing payment for client ${clientId}`);

      // Aggressively sync ALL payment links for this client
      const allPaymentLinks = await PaymentLink.find({
        client: clientId,
        servicePlanId: { $exists: true, $ne: null },
        durationDays: { $exists: true, $gt: 0 }
      }).sort({ createdAt: -1 }).limit(10); // Check all recent links

      console.log(`Found ${allPaymentLinks.length} payment links to check for client ${clientId}`);

      let syncedCount = 0;
      for (const paymentLink of allPaymentLinks) {
        if (paymentLink.status !== 'paid') {
          const wasPaid = await syncPaymentLinkWithRazorpay(paymentLink);
          if (wasPaid) {
            syncedCount++;
            console.log(`✅ Synced payment link ${paymentLink._id} as PAID`);

            // Create Payment record from synced link
            await createPaymentRecordFromLink(paymentLink);

            // Create ClientPurchase for newly synced paid payment
            const existingPurchase = await ClientPurchase.findOne({ 
              paymentLink: paymentLink._id 
            });

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
              console.log(`✅ Created ClientPurchase ${newPurchase._id} from force-synced payment`);
            }
          }
        }
      }

      console.log(`Force sync complete: ${syncedCount} payments synced for client ${clientId}`);
    } else {
      // STEP 1: Try to sync any pending payment links with Razorpay
      // This ensures we catch payments that webhook might have missed
      const pendingPaymentLinks = await PaymentLink.find({
        client: clientId,
        status: { $in: ['pending', 'created'] },
        servicePlanId: { $exists: true, $ne: null },
        durationDays: { $exists: true, $gt: 0 }
      }).sort({ createdAt: -1 }).limit(5); // Check last 5 pending links

      for (const pendingLink of pendingPaymentLinks) {
        const wasPaid = await syncPaymentLinkWithRazorpay(pendingLink);
        if (wasPaid) {
          // Create ClientPurchase for newly synced paid payment
          const existingPurchase = await ClientPurchase.findOne({ paymentLink: pendingLink._id });
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
            console.log(`Created ClientPurchase ${newPurchase._id} from synced pending payment ${pendingLink._id}`);
          }

          // Create Payment record for the synced payment
          await createPaymentRecordFromLink(pendingLink);
        }
      }
    }

    // STEP 2: Find ALL client's active purchases that haven't expired
    console.log(`🔍 Looking for active ClientPurchases for client ${clientId}`);
    
    const allActivePurchases = await ClientPurchase.find({
      client: clientId,
      status: 'active',
      endDate: { $gte: new Date() }
    })
    .populate('servicePlan', 'name category')
    .sort({ createdAt: -1 });

    console.log(`Found ${allActivePurchases.length} active purchases for client ${clientId}`);

    // Prioritize purchase that needs meal plan (mealPlanCreated: false and has remaining days)
    let activePurchase = allActivePurchases.find(p => 
      !p.mealPlanCreated && (p.durationDays - (p.daysUsed || 0)) > 0
    );

    // If no purchase needs meal plan, find one with remaining days
    if (!activePurchase) {
      activePurchase = allActivePurchases.find(p => 
        (p.durationDays - (p.daysUsed || 0)) > 0
      );
    }

    // If still no purchase with remaining days, use the most recent one
    if (!activePurchase && allActivePurchases.length > 0) {
      activePurchase = allActivePurchases[0];
    }

    if (activePurchase) {
      console.log(`✅ Selected ClientPurchase:`, {
        _id: activePurchase._id,
        planName: activePurchase.planName,
        mealPlanCreated: activePurchase.mealPlanCreated,
        daysUsed: activePurchase.daysUsed,
        durationDays: activePurchase.durationDays,
        remainingDays: activePurchase.durationDays - (activePurchase.daysUsed || 0)
      });
    } else {
      console.log(`⚠️ No active ClientPurchase found for client ${clientId}`);
    }

    // STEP 3: If no active purchase found, check for paid payment links without ClientPurchase
    if (!activePurchase) {
      const paidPaymentLink = await PaymentLink.findOne({
        client: clientId,
        status: 'paid',
        servicePlanId: { $exists: true, $ne: null },
        durationDays: { $exists: true, $gt: 0 }
      }).sort({ paidAt: -1 });

      if (paidPaymentLink) {
        // Ensure Payment record exists for this paid link
        await createPaymentRecordFromLink(paidPaymentLink);
        
        // Check if ClientPurchase already exists for this payment link
        const existingPurchase = await ClientPurchase.findOne({
          paymentLink: paidPaymentLink._id
        });

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
          console.log(`✅ Created missing ClientPurchase ${newPurchase._id} from paid PaymentLink ${paidPaymentLink._id}`);
          
          // Update Payment record with ClientPurchase reference
          await Payment.findOneAndUpdate(
            { paymentLink: paidPaymentLink._id },
            { clientPurchase: newPurchase._id }
          );
          
          // Use the newly created purchase
          const createdPurchase = await ClientPurchase.findById(newPurchase._id)
            .populate('servicePlan', 'name category');
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
      return NextResponse.json({ 
        success: true,
        hasPaidPlan: false,
        canCreateMealPlan: false,
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

    // Find all purchases that need meal plans
    const purchasesNeedingMealPlan = allActivePurchases.filter(p => 
      !p.mealPlanCreated && (p.durationDays - (p.daysUsed || 0)) > 0
    );

    console.log(`📊 Aggregated Stats: Total Purchased: ${aggregatedTotalPurchasedDays}, Used: ${aggregatedTotalDaysUsed}, Remaining: ${aggregatedRemainingDays}`);
    console.log(`📋 Purchases needing meal plan: ${purchasesNeedingMealPlan.length}`);

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
      console.log('🔍 Searching for Payment record...');
      console.log(`   ClientPurchase ID: ${activePurchase._id}`);
      console.log(`   PaymentLink ID: ${activePurchase.paymentLink}`);
      console.log(`   Client ID: ${clientId}`);
      
      // First try: Find by clientPurchase
      let payment: any = null;
      if (activePurchase._id) {
        payment = await Payment.findOne({ clientPurchase: activePurchase._id }).lean();
        if (payment) {
          console.log(`✅ Found Payment by clientPurchase ID`);
        }
      }
      
      // Second try: Find by paymentLink
      if (!payment && activePurchase.paymentLink) {
        payment = await Payment.findOne({ paymentLink: activePurchase.paymentLink }).lean();
        if (payment) {
          console.log(`✅ Found Payment by paymentLink ID`);
        }
      }
      
      // Third try: Find by client and status
      if (!payment) {
        payment = await Payment.findOne({
          client: clientId,
          status: PaymentStatus.COMPLETED
        }).sort({ createdAt: -1 }).lean();
        if (payment) {
          console.log(`✅ Found Payment by client ID (most recent)`);
        }
      }
      
      if (payment && typeof payment === 'object' && '_id' in payment) {
        console.log('✅ Payment Details:', {
          _id: payment._id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          transactionId: payment.transactionId,
          planName: payment.planName
        });
        
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
        console.log('⚠️ No Payment record found for this purchase');
        console.log('   Checked: clientPurchase, paymentLink, and client filters');
      }
    } catch (err) {
      console.error('❌ Error fetching payment details:', err);
    }

    return NextResponse.json({ 
      success: true,
      hasPaidPlan: true,
      canCreateMealPlan: canCreate,
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
        purchasesNeedingMealPlan: purchasesNeedingMealPlan.length
      },
      // All purchases that need meal plans created
      allPurchasesNeedingMealPlan: purchasesNeedingMealPlan.map(p => ({
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
        parentPurchaseId: p.parentPurchaseId || null
      })),
      message: canCreate 
        ? `Client has ${remainingDays} days remaining (${totalDaysUsed}/${totalPurchasedDays} days used) in their ${activePurchase.planName} plan.${purchasesNeedingMealPlan.length > 1 ? ` (${purchasesNeedingMealPlan.length} purchases need meal plans)` : ''}`
        : remainingDays === 0
          ? `All ${totalPurchasedDays} days have been used. Client needs to purchase a new plan.`
          : `Requested ${requestedDays} days but only ${remainingDays} days remaining in plan.`
    });
  } catch (error) {
    console.error('Error checking client paid plan:', error);
    return NextResponse.json({ error: 'Failed to check client paid plan' }, { status: 500 });
  }
}
