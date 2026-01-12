import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db/connect';
import OtherPlatformPayment from '@/lib/db/models/OtherPlatformPayment';
import Payment from '@/lib/db/models/Payment';
import { ClientPurchase } from '@/lib/db/models/ServicePlan';
import PaymentLink from '@/lib/db/models/PaymentLink';
import { PaymentStatus, PaymentType, UserRole } from '@/types';
import { withCache, clearCacheByTag } from '@/lib/api/utils';
import User from '@/lib/db/models/User';
import { SSEManager } from '@/lib/realtime/sse-manager';

// GET - Get single payment details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const payment = await withCache(
      `other-platform-payments:id:${JSON.stringify(id)}`,
      async () => await OtherPlatformPayment.findById(id)
      .populate('client', 'firstName lastName email phone profilePicture')
      .populate('dietitian', 'firstName lastName email phone')
      .populate('paymentLink', 'planName planCategory durationDays amount finalAmount servicePlanId pricingTierId')
      .populate('reviewedBy', 'firstName lastName email'),
      { ttl: 120000, tags: ['other_platform_payments'] }
    );

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({ payment });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment' },
      { status: 500 }
    );
  }
}

// PUT - Update payment (approve/reject by admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can approve/reject payments
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Only admin can approve/reject payments' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { status, reviewNotes } = body;

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const otherPayment = await OtherPlatformPayment.findById(id).populate('paymentLink');

    if (!otherPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (otherPayment.status !== 'pending') {
      return NextResponse.json({ error: 'Payment has already been processed' }, { status: 400 });
    }

    // Update the other platform payment status
    otherPayment.status = status;
    otherPayment.reviewedBy = session.user.id;
    otherPayment.reviewedAt = new Date();
    otherPayment.reviewNotes = reviewNotes || '';
    await otherPayment.save();

    // If approved, create Payment record and ClientPurchase
    if (status === 'approved') {
      // Get payment link details
      const paymentLinkData = otherPayment.paymentLink;
      
      // Determine plan details from OtherPlatformPayment first, fallback to paymentLink
      const planName = otherPayment.planName || paymentLinkData?.planName || 'Service Plan';
      const planCategory = otherPayment.planCategory || paymentLinkData?.planCategory || 'general-wellness';
      const durationDays = otherPayment.durationDays || paymentLinkData?.durationDays || 30;
      const durationLabel = otherPayment.durationLabel || paymentLinkData?.duration || `${durationDays} Days`;
      
      // Create Payment record with mealPlanCreated: false
      const paymentRecord = new Payment({
        client: otherPayment.client,
        dietitian: otherPayment.dietitian,
        type: PaymentType.SERVICE_PLAN,
        amount: otherPayment.amount,
        currency: 'INR',
        status: PaymentStatus.COMPLETED,
        paymentMethod: otherPayment.platform === 'other' ? otherPayment.customPlatform : otherPayment.platform,
        transactionId: `OPP-${otherPayment._id}-${otherPayment.transactionId}`,
        description: `Other Platform Payment - ${otherPayment.platform === 'other' ? otherPayment.customPlatform : otherPayment.platform}`,
        planName: planName,
        planCategory: planCategory,
        durationDays: durationDays,
        durationLabel: durationLabel,
        paymentLink: otherPayment.paymentLink?._id,
        otherPlatformPayment: otherPayment._id,
        mealPlanCreated: false, // Default false - will be set true when meal plan is created
      });

      await paymentRecord.save();

      // Create ClientPurchase - always create if we have plan details
      // This is needed for the Planning section to recognize the payment
      const hasPlanDetails = planName && durationDays > 0;
      
      if (hasPlanDetails) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);

        const clientPurchase = new ClientPurchase({
          client: otherPayment.client,
          dietitian: otherPayment.dietitian,
          servicePlan: paymentLinkData?.servicePlanId || undefined,
          paymentLink: paymentLinkData?._id || undefined,
          otherPlatformPayment: otherPayment._id,
          planName: planName,
          planCategory: planCategory,
          durationDays: durationDays,
          durationLabel: durationLabel,
          baseAmount: paymentLinkData?.amount || otherPayment.amount,
          discountPercent: paymentLinkData?.discount || 0,
          taxPercent: paymentLinkData?.tax || 0,
          finalAmount: otherPayment.amount,
          purchaseDate: new Date(),
          startDate,
          endDate,
          status: 'active',
          mealPlanCreated: false,
          daysUsed: 0,
        });

        await clientPurchase.save();

        // Update payment record with clientPurchase reference
        paymentRecord.clientPurchase = clientPurchase._id;
        await paymentRecord.save();

        // Update payment link status to paid if it exists
        if (paymentLinkData?._id) {
          await PaymentLink.findByIdAndUpdate(paymentLinkData._id, {
            status: 'paid',
            paidAt: new Date(),
          });
        }
      }
    }

    // Invalidate cached lists/details so subsequent fetches reflect the new status.
    clearCacheByTag('other_platform_payments');

    // Notify online admins so their list updates in real-time.
    try {
      const admins = await User.find({ role: UserRole.ADMIN }).select('_id');
      const sse = SSEManager.getInstance();
      sse.sendToUsers(
        admins.map(a => String(a._id)),
        'other_platform_payment_updated',
        {
          paymentId: id,
          status,
          reviewedAt: otherPayment.reviewedAt,
          reviewedBy: session.user.id,
        }
      );
    } catch (e) {
      // Best-effort; do not fail the request if SSE notification fails.
      console.warn('Failed to emit SSE other_platform_payment_updated:', e);
    }

    const updatedPayment = await OtherPlatformPayment.findById(id)
      .populate('client', 'firstName lastName email phone')
      .populate('dietitian', 'firstName lastName email phone')
      .populate('paymentLink', 'planName planCategory durationDays amount finalAmount')
      .populate('reviewedBy', 'firstName lastName email');

    return NextResponse.json({ 
      success: true, 
      payment: updatedPayment,
      message: status === 'approved' ? 'Payment approved successfully' : 'Payment rejected'
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}

// DELETE - Delete payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const payment = await OtherPlatformPayment.findById(id);
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Only admin or the dietitian who created it can delete (and only if pending)
    if (session.user.role !== UserRole.ADMIN) {
      if (payment.dietitian.toString() !== session.user.id || payment.status !== 'pending') {
        return NextResponse.json({ error: 'Cannot delete this payment' }, { status: 403 });
      }
    }

    await OtherPlatformPayment.findByIdAndDelete(id);

    clearCacheByTag('other_platform_payments');

    try {
      const admins = await User.find({ role: UserRole.ADMIN }).select('_id');
      const sse = SSEManager.getInstance();
      sse.sendToUsers(
        admins.map(a => String(a._id)),
        'other_platform_payment_updated',
        { paymentId: id, status: 'deleted' }
      );
    } catch (e) {
      console.warn('Failed to emit SSE other_platform_payment_updated (delete):', e);
    }

    return NextResponse.json({ success: true, message: 'Payment deleted' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment' },
      { status: 500 }
    );
  }
}
