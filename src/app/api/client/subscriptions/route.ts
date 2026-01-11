import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import Payment from '@/lib/db/models/Payment';
import User from '@/lib/db/models/User';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

// GET /api/client/subscriptions - Get client's subscriptions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get all payments for this client that are subscription-related
    const payments = await withCache(
      `client:subscriptions:${JSON.stringify({
      client: session.user.id,
      type: { $in: ['service_plan', 'subscription', 'consultation'] }
    })
      .populate('dietitian', 'firstName lastName')
      .sort({ createdAt: -1 })}`,
      async () => await Payment.find({
      client: session.user.id,
      type: { $in: ['service_plan', 'subscription', 'consultation'] }
    })
      .populate('dietitian', 'firstName lastName')
      .sort({ createdAt: -1 }).lean(),
      { ttl: 120000, tags: ['client'] }
    );

    // Transform payments to subscription format
    const subscriptions = payments.map((payment: any) => {
      const startDate = payment.paidAt || payment.createdAt;
      const durationDays = payment.durationDays || 30;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + durationDays);
      
      const now = new Date();
      let status = 'pending';
      if (payment.status === 'completed' || payment.status === 'paid') {
        status = now > endDate ? 'expired' : 'active';
      } else if (payment.status === 'cancelled') {
        status = 'cancelled';
      }

      return {
        _id: payment._id.toString(),
        planName: payment.planName || payment.description || 'Subscription Plan',
        planCategory: payment.planCategory || 'general-wellness',
        amount: payment.amount,
        currency: payment.currency || 'INR',
        status,
        startDate: payment.status === 'completed' || payment.status === 'paid' ? startDate : null,
        endDate: payment.status === 'completed' || payment.status === 'paid' ? endDate : null,
        durationDays,
        durationLabel: payment.durationLabel || `${durationDays} days`,
        features: payment.features || [],
        paymentStatus: payment.status === 'completed' || payment.status === 'paid' ? 'paid' : 'pending',
        razorpayPaymentLinkUrl: payment.razorpayPaymentLinkUrl,
        razorpayPaymentLinkShortUrl: payment.razorpayPaymentLinkShortUrl,
        dietitian: payment.dietitian ? {
          name: `${payment.dietitian.firstName} ${payment.dietitian.lastName}`
        } : null
      };
    });

    return NextResponse.json({ subscriptions });

  } catch (error) {
    console.error('Error fetching client subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}
