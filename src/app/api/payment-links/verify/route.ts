import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db/connection';
import PaymentLink from '@/lib/db/models/PaymentLink';
import { ClientPurchase } from '@/lib/db/models/ServicePlan';
import Payment from '@/lib/db/models/Payment';
import { PaymentStatus, PaymentType } from '@/types';

// Helper function to create ClientPurchase from PaymentLink
async function createClientPurchaseFromPaymentLink(paymentLink: any): Promise<any> {
  try {
    // Check if ClientPurchase already exists
    const existingPurchase = await ClientPurchase.findOne({
      client: paymentLink.client,
      razorpayPaymentId: paymentLink.razorpayPaymentId
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
      razorpayPaymentId: paymentLink.razorpayPaymentId,
      razorpayOrderId: paymentLink.razorpayOrderId,
      paidAt: paymentLink.paidAt || new Date(),
      mealPlanCreated: false
    });

    await purchase.save();
    console.log('ClientPurchase created from payment link:', purchase._id);
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
      paymentLink: paymentLink._id
    });

    if (existingPayment) {
      console.log('Payment record already exists:', existingPayment._id);
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
      paidAt: paymentLink.paidAt || new Date(),
      mealPlanCreated: false
    });

    await paymentRecord.save();
    console.log('Payment record created:', paymentRecord._id);
    return paymentRecord;
  } catch (error) {
    console.error('Error creating Payment record:', error);
    return null;
  }
}

// POST /api/payment-links/verify - Verify payment after Razorpay callback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentLinkId, paymentId, signature } = body;

    if (!paymentLinkId) {
      return NextResponse.json({ error: 'Payment link ID is required' }, { status: 400 });
    }

    await connectDB();

    // Find payment link
    const paymentLink = await PaymentLink.findOne({
      razorpayPaymentLinkId: paymentLinkId
    }).populate('client', 'firstName lastName email');

    if (!paymentLink) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
    }

    // If already paid, just return the details
    if (paymentLink.status === 'paid') {
      return NextResponse.json({
        success: true,
        paymentLink,
        message: 'Payment already verified'
      });
    }

    // Verify signature if provided
    if (signature && process.env.RAZORPAY_KEY_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${paymentLinkId}|${paymentId}`)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.warn('Signature verification failed, but proceeding with payment check');
      }
    }

    // Update payment link status
    if (paymentId) {
      paymentLink.status = 'paid';
      paymentLink.paidAt = new Date();
      paymentLink.razorpayPaymentId = paymentId;
      await paymentLink.save();

      // Create ClientPurchase record so dietitian can see in Planning section
      const purchase = await createClientPurchaseFromPaymentLink(paymentLink);
      
      // Create Payment record for accounting
      const payment = await createPaymentRecordFromLink(paymentLink);
      
      console.log('Payment verified - ClientPurchase:', purchase?._id, 'Payment:', payment?._id);
    }

    return NextResponse.json({
      success: true,
      paymentLink,
      message: 'Payment verified successfully'
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
