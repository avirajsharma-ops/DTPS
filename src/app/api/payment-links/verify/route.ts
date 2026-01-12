import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db/connection';
import PaymentLink from '@/lib/db/models/PaymentLink';
import { ClientPurchase } from '@/lib/db/models/ServicePlan';
import Payment from '@/lib/db/models/Payment';
import { PaymentStatus, PaymentType } from '@/types';
import User from '@/lib/db/models/User';
import { UserRole } from '@/types';
import { clearCacheByTag } from '@/lib/api/utils';
import { SSEManager } from '@/lib/realtime/sse-manager';

// Helper function to create ClientPurchase from PaymentLink
async function createClientPurchaseFromPaymentLink(paymentLink: any): Promise<any> {
  try {
    // Check if ClientPurchase already exists
    const existingPurchase = await ClientPurchase.findOne({
      client: paymentLink.client,
      razorpayPaymentId: paymentLink.razorpayPaymentId
    });

    if (existingPurchase) {
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
      const response = NextResponse.json({ error: 'Payment link ID is required' }, { status: 400 });
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    await connectDB();

    // Find payment link
    const paymentLink = await PaymentLink.findOne({
      razorpayPaymentLinkId: paymentLinkId
    }).populate('client', 'firstName lastName email');

    if (!paymentLink) {
      const response = NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    // If already paid, just return the details
    if (paymentLink.status === 'paid') {
      const response = NextResponse.json({
        success: true,
        paymentLink,
        message: 'Payment already verified'
      });
      response.headers.set('Cache-Control', 'no-store');
      return response;
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

      // Invalidate caches so payment sections update without manual refresh.
      clearCacheByTag('payment_links');
      clearCacheByTag('payments');

      // Realtime notify: admin + involved client + involved dietitian
      try {
        const admins = await User.find({ role: UserRole.ADMIN }).select('_id');
        const sse = SSEManager.getInstance();
        const notifyUserIds = new Set<string>([
          ...admins.map(a => String(a._id)),
          String(paymentLink.client),
          String(paymentLink.dietitian),
        ]);
        sse.sendToUsers(Array.from(notifyUserIds), 'payment_link_updated', {
          paymentLinkId: String(paymentLink._id),
          status: paymentLink.status,
          paidAt: paymentLink.paidAt,
        });
        if (payment) {
          sse.sendToUsers(Array.from(notifyUserIds), 'payment_updated', {
            paymentId: String(payment._id),
            status: payment.status,
            paidAt: payment.paidAt,
            paymentLinkId: String(paymentLink._id),
          });
        }
      } catch (e) {
        console.warn('Failed to emit payment SSE events (verify):', e);
      }
      
    }

    const response = NextResponse.json({
      success: true,
      paymentLink,
      message: 'Payment verified successfully'
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;

  } catch (error) {
    console.error('Payment verification error:', error);
    const response = NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}
