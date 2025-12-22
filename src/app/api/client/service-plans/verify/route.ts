import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import Payment from '@/lib/db/models/Payment';
import { ClientPurchase } from '@/lib/db/models/ServicePlan';
import crypto from 'crypto';

// Helper to create ClientPurchase record
async function createClientPurchase(payment: any, userId: string) {
  try {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (payment.durationDays || 30));

    const purchase = new ClientPurchase({
      client: userId,
      dietitian: payment.dietitian,
      servicePlan: payment.servicePlan,
      planName: payment.planName,
      planCategory: payment.planCategory,
      selectedTier: {
        durationDays: payment.durationDays || 30,
        durationLabel: payment.durationLabel || '1 Month',
        amount: payment.amount
      },
      startDate,
      endDate,
      status: 'active',
      paymentStatus: 'paid',
      paymentMethod: 'razorpay',
      razorpayPaymentId: payment.razorpayPaymentId,
      razorpayOrderId: payment.razorpayOrderId,
      paidAt: payment.paidAt || new Date()
    });

    await purchase.save();
    
    // Link purchase to payment
    payment.clientPurchase = purchase._id;
    await payment.save();
    
    return purchase;
  } catch (error) {
    console.error('Error creating ClientPurchase:', error);
    return null;
  }
}

// POST /api/client/service-plans/verify - Verify Razorpay payment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const data = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId } = data;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing payment verification data' },
        { status: 400 }
      );
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { 
        _id: paymentId,
        client: session.user.id,
        razorpayOrderId: razorpay_order_id
      },
      {
        status: 'completed',
        razorpayPaymentId: razorpay_payment_id,
        paidAt: new Date(),
        transactionId: razorpay_payment_id
      },
      { new: true }
    );

    if (!payment) {
      // Try finding by order ID only
      const paymentByOrder = await Payment.findOneAndUpdate(
        { 
          razorpayOrderId: razorpay_order_id,
          client: session.user.id
        },
        {
          status: 'completed',
          razorpayPaymentId: razorpay_payment_id,
          paidAt: new Date(),
          transactionId: razorpay_payment_id
        },
        { new: true }
      );

      if (!paymentByOrder) {
        return NextResponse.json(
          { error: 'Payment record not found' },
          { status: 404 }
        );
      }

      // Create ClientPurchase record
      await createClientPurchase(paymentByOrder, session.user.id);

      return NextResponse.json({
        success: true,
        message: 'Payment verified and plan activated',
        payment: paymentByOrder
      });
    }

    // Create ClientPurchase record
    await createClientPurchase(payment, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Payment verified and plan activated',
      payment
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
