import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import dbConnect from '@/lib/db/connect';
import { ClientPurchase } from '@/lib/db/models/ServicePlan';
import PaymentLink from '@/lib/db/models/PaymentLink';
import Razorpay from 'razorpay';

// Initialize Razorpay for syncing payment status
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

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
      console.log(`Synced payment link ${paymentLink._id} as PAID from Razorpay`);
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

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

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
      }
    }

    // STEP 2: Find client's active purchase that hasn't expired
    let activePurchase = await ClientPurchase.findOne({
      client: clientId,
      status: 'active',
      endDate: { $gte: new Date() }
    })
    .populate('servicePlan', 'name category')
    .sort({ endDate: -1 });

    // STEP 3: If no active purchase found, check for paid payment links without ClientPurchase
    if (!activePurchase) {
      const paidPaymentLink = await PaymentLink.findOne({
        client: clientId,
        status: 'paid',
        servicePlanId: { $exists: true, $ne: null },
        durationDays: { $exists: true, $gt: 0 }
      }).sort({ paidAt: -1 });

      if (paidPaymentLink) {
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
          console.log(`Created missing ClientPurchase ${newPurchase._id} from paid PaymentLink ${paidPaymentLink._id}`);
          
          // Use the newly created purchase
          activePurchase = await ClientPurchase.findById(newPurchase._id)
            .populate('servicePlan', 'name category');
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
        totalDaysUsed: 0
      });
    }

    // Calculate remaining days based on daysUsed (not date difference)
    // This allows multiple meal plans to use the total purchased days
    const totalPurchasedDays = activePurchase.durationDays || 0;
    const totalDaysUsed = activePurchase.daysUsed || 0;
    const remainingDays = Math.max(0, totalPurchasedDays - totalDaysUsed);

    // Check if meal plan can be created (has remaining days and requested days fit)
    const canCreate = remainingDays > 0 && (requestedDays === 0 || requestedDays <= remainingDays);

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
        mealPlanCreated: activePurchase.mealPlanCreated,
        daysUsed: activePurchase.daysUsed
      },
      remainingDays,
      maxDays: remainingDays,
      totalDaysUsed,
      totalPurchasedDays,
      message: canCreate 
        ? `Client has ${remainingDays} days remaining (${totalDaysUsed}/${totalPurchasedDays} days used) in their ${activePurchase.planName} plan.`
        : remainingDays === 0
          ? `All ${totalPurchasedDays} days have been used. Client needs to purchase a new plan.`
          : `Requested ${requestedDays} days but only ${remainingDays} days remaining in plan.`
    });
  } catch (error) {
    console.error('Error checking client paid plan:', error);
    return NextResponse.json({ error: 'Failed to check client paid plan' }, { status: 500 });
  }
}
