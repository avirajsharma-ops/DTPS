import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import Payment from '@/lib/db/models/Payment';

// GET /api/admin/payments - Get all payments for admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');

    // Build query
    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (type && type !== 'all') {
      query.type = type;
    }

    // Fetch payments
    const payments = await Payment.find(query)
      .populate('client', 'firstName lastName email phone')
      .populate('dietitian', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    // Get stats
    const [totalPayments, completedPayments, pendingPayments, failedPayments, revenueResult] = await Promise.all([
      Payment.countDocuments({}),
      Payment.countDocuments({ status: { $in: ['completed', 'paid'] } }),
      Payment.countDocuments({ status: 'pending' }),
      Payment.countDocuments({ status: 'failed' }),
      Payment.aggregate([
        { $match: { status: { $in: ['completed', 'paid'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    return NextResponse.json({
      payments: payments.map((p: any) => ({
        _id: p._id.toString(),
        client: p.client ? {
          _id: p.client._id.toString(),
          firstName: p.client.firstName,
          lastName: p.client.lastName,
          email: p.client.email,
          phone: p.client.phone
        } : null,
        dietitian: p.dietitian ? {
          _id: p.dietitian._id.toString(),
          firstName: p.dietitian.firstName,
          lastName: p.dietitian.lastName
        } : null,
        type: p.type,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        paymentMethod: p.paymentMethod,
        planName: p.planName,
        planCategory: p.planCategory,
        durationDays: p.durationDays,
        durationLabel: p.durationLabel,
        razorpayOrderId: p.razorpayOrderId,
        razorpayPaymentId: p.razorpayPaymentId,
        razorpayPaymentLinkUrl: p.razorpayPaymentLinkUrl,
        transactionId: p.transactionId,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      })),
      stats: {
        totalPayments,
        totalRevenue,
        completedPayments,
        pendingPayments,
        failedPayments
      }
    });

  } catch (error) {
    console.error('Error fetching admin payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
