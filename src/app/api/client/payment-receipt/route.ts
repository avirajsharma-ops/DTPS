import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import Payment from '@/lib/db/models/Payment';

// GET /api/client/payment-receipt - Get payment receipt details
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('payment_id') || searchParams.get('paymentId');
    const orderId = searchParams.get('order_id');
    const razorpayPaymentId = searchParams.get('razorpay_payment_id');

    let query: any = { client: session.user.id };

    if (paymentId) {
      query._id = paymentId;
    } else if (orderId) {
      query.razorpayOrderId = orderId;
    } else if (razorpayPaymentId) {
      query.razorpayPaymentId = razorpayPaymentId;
    } else {
      // Get the most recent completed payment
      query.status = { $in: ['completed', 'paid'] };
    }

    const payment = await Payment.findOne(query)
      .populate('dietitian', 'firstName lastName email')
      .populate('client', 'firstName lastName email phone')
      .sort({ createdAt: -1 });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    const userName = `${payment.client?.firstName || ''} ${payment.client?.lastName || ''}`.trim() || payment.payerName || 'User';
    const userEmail = payment.client?.email || payment.payerEmail || '';

    return NextResponse.json({
      receipt: {
        paymentId: payment._id.toString(),
        planName: payment.planName || payment.description || 'Service Plan',
        planCategory: payment.planCategory || 'general-wellness',
        amount: payment.amount,
        currency: payment.currency || 'INR',
        status: payment.status,
        durationDays: payment.durationDays || 30,
        durationLabel: payment.durationLabel || '1 Month',
        razorpayPaymentId: payment.razorpayPaymentId,
        razorpayOrderId: payment.razorpayOrderId,
        transactionId: payment.transactionId,
        paidAt: payment.paidAt || payment.createdAt,
        userName,
        userEmail,
        dietitian: payment.dietitian ? {
          firstName: payment.dietitian.firstName,
          lastName: payment.dietitian.lastName
        } : null
      },
      // Also include payment for backward compatibility
      payment: {
        _id: payment._id.toString(),
        planName: payment.planName || payment.description || 'Service Plan',
        planCategory: payment.planCategory || 'general-wellness',
        amount: payment.amount,
        currency: payment.currency || 'INR',
        status: payment.status,
        durationDays: payment.durationDays || 30,
        durationLabel: payment.durationLabel || '1 Month',
        payerEmail: payment.payerEmail || payment.client?.email,
        payerName: userName,
        razorpayPaymentId: payment.razorpayPaymentId,
        razorpayOrderId: payment.razorpayOrderId,
        transactionId: payment.transactionId,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        dietitian: payment.dietitian ? {
          firstName: payment.dietitian.firstName,
          lastName: payment.dietitian.lastName
        } : null
      }
    });

  } catch (error) {
    console.error('Error fetching payment receipt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment details' },
      { status: 500 }
    );
  }
}
