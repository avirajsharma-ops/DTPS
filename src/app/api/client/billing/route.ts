import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import Payment from '@/lib/db/models/Payment';
import User from '@/lib/db/models/User';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

// GET /api/client/billing - Get billing information for the client
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get all payments for this client
    const payments = await withCache(
      `client:billing:${JSON.stringify({
      client: session.user.id
    })}`,
      async () => await Payment.find({
      client: session.user.id
    })
      .populate('dietitian', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50),
      { ttl: 120000, tags: ['client'] }
    );

    // Find the most recent active subscription
    const activePayment = payments.find((p: any) => {
      if (p.status !== 'completed' && p.status !== 'paid') return false;
      if (!p.durationDays) return false;
      
      const startDate = p.paidAt || p.createdAt;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + p.durationDays);
      
      return new Date() < endDate;
    });

    // Transform to subscription format
    let subscription = null;
    if (activePayment) {
      const startDate = (activePayment as any).paidAt || (activePayment as any).createdAt;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + ((activePayment as any).durationDays || 30));
      
      subscription = {
        id: (activePayment as any)._id.toString(),
        planName: (activePayment as any).planName || 'Subscription Plan',
        price: (activePayment as any).amount,
        billingCycle: (activePayment as any).durationDays >= 365 ? 'yearly' : 
                      (activePayment as any).durationDays >= 90 ? 'quarterly' : 'monthly',
        status: 'active',
        startDate,
        nextBillingDate: endDate,
        features: (activePayment as any).features || [
          'Personalized meal plans',
          'Dietitian consultations',
          'Progress tracking',
          'Chat support'
        ]
      };
    }

    // Transform payments to invoices
    const invoices = payments.map((payment: any) => ({
      id: `INV-${payment._id.toString().slice(-6).toUpperCase()}`,
      planName: payment.planName || payment.description || 'Payment',
      amount: payment.amount,
      status: payment.status === 'completed' || payment.status === 'paid' ? 'paid' : 
              payment.status === 'pending' ? 'pending' : 'failed',
      date: payment.paidAt || payment.createdAt,
      dueDate: payment.dueDate,
      downloadUrl: `/api/invoices/${payment._id}/download`
    }));

    return NextResponse.json({
      subscription,
      invoices
    });

  } catch (error) {
    console.error('Error fetching billing data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing data' },
      { status: 500 }
    );
  }
}
