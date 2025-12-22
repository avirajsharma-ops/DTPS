import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import Payment from '@/lib/db/models/Payment';
import PaymentLink from '@/lib/db/models/PaymentLink';
import { ClientPurchase } from '@/lib/db/models/ServicePlan';
import { PaymentStatus, PaymentType } from '@/types';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Helper function to create ClientPurchase from PaymentLink
async function createClientPurchaseFromPaymentLink(paymentLink: any): Promise<any> {
  try {
    // Check if ClientPurchase already exists
    const existingPurchase = await ClientPurchase.findOne({
      client: paymentLink.client,
      $or: [
        { razorpayPaymentId: paymentLink.razorpayPaymentId },
        { razorpayPaymentId: paymentLink.razorpayPaymentLinkId }
      ]
    });

    if (existingPurchase) {
      console.log('ClientPurchase already exists:', existingPurchase._id);
      return existingPurchase;
    }

    const startDate = new Date();
    const endDate = new Date();
    const durationDays = paymentLink.durationDays || 30;
    endDate.setDate(endDate.getDate() + durationDays);

    const purchase = new ClientPurchase({
      client: paymentLink.client,
      dietitian: paymentLink.dietitian,
      servicePlan: paymentLink.servicePlan,
      planName: paymentLink.planName || paymentLink.description || 'Diet Plan',
      planCategory: paymentLink.planCategory || 'general',
      durationDays: durationDays,
      durationLabel: paymentLink.duration || `${durationDays} Days`,
      selectedTier: {
        durationDays: durationDays,
        durationLabel: paymentLink.duration || `${durationDays} Days`,
        amount: paymentLink.finalAmount || paymentLink.amount
      },
      startDate,
      endDate,
      status: 'active',
      paymentStatus: 'paid',
      paymentMethod: paymentLink.paymentMethod || 'razorpay',
      razorpayPaymentId: paymentLink.razorpayPaymentId || paymentLink.razorpayPaymentLinkId,
      razorpayOrderId: paymentLink.razorpayOrderId,
      paidAt: paymentLink.paidAt || new Date(),
      mealPlanCreated: false
    });

    await purchase.save();
    console.log('ClientPurchase created from sync:', purchase._id);
    return purchase;
  } catch (error) {
    console.error('Error creating ClientPurchase:', error);
    return null;
  }
}

// Helper function to create Payment record from PaymentLink
async function createPaymentRecordFromLink(paymentLink: any): Promise<any> {
  try {
    // Check if Payment record already exists
    const existingPayment = await Payment.findOne({
      $or: [
        { paymentLink: paymentLink._id },
        { razorpayPaymentId: paymentLink.razorpayPaymentId }
      ]
    });

    if (existingPayment) {
      // Update existing payment if needed
      if (existingPayment.status !== 'completed' && paymentLink.status === 'paid') {
        existingPayment.status = PaymentStatus.COMPLETED;
        existingPayment.razorpayPaymentId = paymentLink.razorpayPaymentId;
        existingPayment.paidAt = paymentLink.paidAt || new Date();
        existingPayment.transactionId = paymentLink.razorpayPaymentId || paymentLink.transactionId;
        await existingPayment.save();
        console.log('Payment record updated:', existingPayment._id);
      }
      return existingPayment;
    }

    const paymentRecord = new Payment({
      client: paymentLink.client,
      dietitian: paymentLink.dietitian,
      type: PaymentType.SERVICE_PLAN,
      amount: paymentLink.finalAmount || paymentLink.amount,
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
      razorpayPaymentId: paymentLink.razorpayPaymentId,
      razorpayOrderId: paymentLink.razorpayOrderId,
      razorpayPaymentLinkId: paymentLink.razorpayPaymentLinkId,
      paidAt: paymentLink.paidAt || new Date(),
      mealPlanCreated: false
    });

    await paymentRecord.save();
    console.log('Payment record created from sync:', paymentRecord._id);
    return paymentRecord;
  } catch (error) {
    console.error('Error creating Payment record:', error);
    return null;
  }
}

// POST /api/admin/payments/sync - Sync payments with Razorpay
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    let syncedCount = 0;
    let clientPurchasesCreated = 0;
    const errors: string[] = [];

    // ============================================
    // STEP 1: Sync PaymentLinks with Razorpay
    // ============================================
    const pendingPaymentLinks = await PaymentLink.find({
      status: { $nin: ['paid', 'cancelled', 'expired'] },
      razorpayPaymentLinkId: { $exists: true, $ne: null }
    });

    console.log(`Found ${pendingPaymentLinks.length} pending payment links to sync`);

    for (const paymentLink of pendingPaymentLinks) {
      try {
        const razorpayLink = await razorpay.paymentLink.fetch(paymentLink.razorpayPaymentLinkId) as any;
        
        if (razorpayLink.status === 'paid') {
          paymentLink.status = 'paid';
          paymentLink.paidAt = razorpayLink.paid_at ? new Date(razorpayLink.paid_at * 1000) : new Date();
          
          // Get payment details
          if (razorpayLink.payments?.length > 0) {
            const latestPayment = razorpayLink.payments[razorpayLink.payments.length - 1];
            paymentLink.razorpayPaymentId = latestPayment.payment_id;
            paymentLink.transactionId = latestPayment.payment_id;
          }
          
          await paymentLink.save();
          console.log(`PaymentLink ${paymentLink._id} marked as paid`);
          
          // Create ClientPurchase record
          const purchase = await createClientPurchaseFromPaymentLink(paymentLink);
          if (purchase) {
            clientPurchasesCreated++;
          }
          
          // Create/Update Payment record
          await createPaymentRecordFromLink(paymentLink);
          
          syncedCount++;
        } else if (razorpayLink.status === 'cancelled' || razorpayLink.status === 'expired') {
          paymentLink.status = razorpayLink.status;
          await paymentLink.save();
          syncedCount++;
        }
      } catch (error: any) {
        console.error(`Error syncing payment link ${paymentLink._id}:`, error);
        errors.push(`PaymentLink ${paymentLink._id}: ${error.message}`);
      }
    }

    // ============================================
    // STEP 2: Check paid PaymentLinks that might not have ClientPurchase
    // ============================================
    const paidPaymentLinksWithoutPurchase = await PaymentLink.find({
      status: 'paid'
    });

    for (const paymentLink of paidPaymentLinksWithoutPurchase) {
      // Check if ClientPurchase exists
      const existingPurchase = await ClientPurchase.findOne({
        client: paymentLink.client,
        $or: [
          { razorpayPaymentId: paymentLink.razorpayPaymentId },
          { razorpayPaymentId: paymentLink.razorpayPaymentLinkId }
        ]
      });

      if (!existingPurchase) {
        const purchase = await createClientPurchaseFromPaymentLink(paymentLink);
        if (purchase) {
          clientPurchasesCreated++;
          console.log(`Created missing ClientPurchase for PaymentLink ${paymentLink._id}`);
        }
        
        // Also ensure Payment record exists
        await createPaymentRecordFromLink(paymentLink);
      }
    }

    // ============================================
    // STEP 3: Sync pending Payment records
    // ============================================
    const pendingPayments = await Payment.find({
      status: 'pending',
      $or: [
        { razorpayOrderId: { $exists: true, $ne: null } },
        { razorpayPaymentLinkId: { $exists: true, $ne: null } }
      ]
    });

    console.log(`Found ${pendingPayments.length} pending payments to sync`);

    for (const payment of pendingPayments) {
      try {
        let paymentUpdated = false;
        
        // Try to fetch order status
        if (payment.razorpayOrderId) {
          const order = await razorpay.orders.fetch(payment.razorpayOrderId) as any;
          
          if (order.status === 'paid' || order.status === 'attempted') {
            const payments = await razorpay.orders.fetchPayments(payment.razorpayOrderId) as any;
            const successfulPayment = payments.items?.find((p: any) => p.status === 'captured');
            
            if (successfulPayment) {
              payment.status = 'completed';
              payment.razorpayPaymentId = successfulPayment.id;
              payment.paidAt = new Date(successfulPayment.created_at * 1000);
              payment.transactionId = successfulPayment.id;
              await payment.save();
              paymentUpdated = true;
              syncedCount++;
            }
          }
        }

        // Try to fetch payment link status
        if (payment.razorpayPaymentLinkId && payment.status === 'pending') {
          try {
            const razorpayLink = await razorpay.paymentLink.fetch(payment.razorpayPaymentLinkId) as any;
            
            if (razorpayLink.status === 'paid') {
              payment.status = 'completed';
              payment.paidAt = razorpayLink.paid_at ? new Date(razorpayLink.paid_at * 1000) : new Date();
              
              if (razorpayLink.payments?.length > 0) {
                const latestPayment = razorpayLink.payments[razorpayLink.payments.length - 1];
                payment.razorpayPaymentId = latestPayment.payment_id;
                payment.transactionId = latestPayment.payment_id;
              }
              
              await payment.save();
              paymentUpdated = true;
              syncedCount++;
            } else if (razorpayLink.status === 'cancelled' || razorpayLink.status === 'expired') {
              payment.status = 'cancelled';
              await payment.save();
              syncedCount++;
            }
          } catch (linkError) {
            console.error(`Error fetching payment link ${payment.razorpayPaymentLinkId}:`, linkError);
          }
        }
        
        // If payment was updated to completed, create ClientPurchase
        if (paymentUpdated && payment.status === 'completed') {
          const existingPurchase = await ClientPurchase.findOne({
            client: payment.client,
            razorpayPaymentId: payment.razorpayPaymentId
          });
          
          if (!existingPurchase) {
            const startDate = new Date();
            const endDate = new Date();
            const durationDays = payment.durationDays || 30;
            endDate.setDate(endDate.getDate() + durationDays);
            
            const purchase = new ClientPurchase({
              client: payment.client,
              dietitian: payment.dietitian,
              planName: payment.planName || 'Diet Plan',
              planCategory: payment.planCategory || 'general',
              durationDays: durationDays,
              durationLabel: payment.durationLabel || `${durationDays} Days`,
              selectedTier: {
                durationDays: durationDays,
                durationLabel: payment.durationLabel || `${durationDays} Days`,
                amount: payment.amount
              },
              startDate,
              endDate,
              status: 'active',
              paymentStatus: 'paid',
              paymentMethod: payment.paymentMethod || 'razorpay',
              razorpayPaymentId: payment.razorpayPaymentId,
              razorpayOrderId: payment.razorpayOrderId,
              paidAt: payment.paidAt || new Date(),
              mealPlanCreated: false
            });
            await purchase.save();
            clientPurchasesCreated++;
            console.log(`Created ClientPurchase from Payment: ${purchase._id}`);
          }
        }
      } catch (error: any) {
        console.error(`Error syncing payment ${payment._id}:`, error);
        errors.push(`Payment ${payment._id}: ${error.message}`);
      }
    }

    // ============================================
    // STEP 4: Fetch recent Razorpay payments
    // ============================================
    try {
      const recentPayments = await razorpay.payments.all({
        from: Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000),
        to: Math.floor(Date.now() / 1000),
        count: 100
      }) as any;

      for (const razorpayPayment of recentPayments.items || []) {
        if (razorpayPayment.status === 'captured' && razorpayPayment.order_id) {
          const existingPayment = await Payment.findOne({
            $or: [
              { razorpayOrderId: razorpayPayment.order_id },
              { razorpayPaymentId: razorpayPayment.id }
            ]
          });

          if (existingPayment && existingPayment.status === 'pending') {
            existingPayment.status = 'completed';
            existingPayment.razorpayPaymentId = razorpayPayment.id;
            existingPayment.paidAt = new Date(razorpayPayment.created_at * 1000);
            existingPayment.transactionId = razorpayPayment.id;
            await existingPayment.save();
            syncedCount++;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching recent Razorpay payments:', error);
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      clientPurchasesCreated,
      errors: errors.length > 0 ? errors : undefined,
      message: `Synced ${syncedCount} payment(s), created ${clientPurchasesCreated} client purchase(s)`
    });

  } catch (error) {
    console.error('Error syncing with Razorpay:', error);
    return NextResponse.json(
      { error: 'Failed to sync with Razorpay' },
      { status: 500 }
    );
  }
}
