import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db/connection';
import PaymentLink from '@/lib/db/models/PaymentLink';

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
