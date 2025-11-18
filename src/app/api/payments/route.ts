import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Payment from '@/lib/db/models/Payment';
import { UserRole } from '@/types';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
}) : null;

// GET /api/payments - Get payments for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');

    // Build query based on user role
    let query: any = {};
    if (session.user.role === UserRole.CLIENT) {
      query.client = session.user.id;
    } else if (session.user.role === UserRole.DIETITIAN) {
      query.dietitian = session.user.id;
    } else {
      // Admin can see all payments
    }

    // Add status filter
    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .populate('client', 'firstName lastName email')
      .populate('dietitian', 'firstName lastName email')
      .populate('appointment', 'type scheduledAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// POST /api/payments - Create payment intent
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, currency = 'USD', description, appointmentId, dietitianId } = body;

    await connectDB();

    // Validate required fields
    if (!amount || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create payment record
    const payment = new Payment({
      client: session.user.id,
      dietitian: dietitianId,
      appointment: appointmentId,
      amount,
      currency,
      description,
      status: 'pending',
      paymentMethod: 'stripe', // Default to Stripe
      metadata: {
        sessionId: session.user.id,
        timestamp: new Date().toISOString()
      }
    });

    await payment.save();

    // Create Stripe payment intent
    if (!stripe) {
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses cents
      currency: currency.toLowerCase(),
      description,
      metadata: {
        appointmentId: appointmentId || '',
        dietitianId: dietitianId || '',
        clientId: session.user.id
      }
    });

    // Update payment with Stripe payment intent ID
    payment.stripePaymentIntentId = paymentIntent.id;
    await payment.save();

    return NextResponse.json({
      payment,
      paymentIntent
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

// PUT /api/payments - Update payment status (webhook handler)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentIntentId, status, metadata } = body;

    await connectDB();

    // Find payment by Stripe payment intent ID
    const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Update payment status
    payment.status = status;
    if (status === 'completed') {
      payment.paidAt = new Date();
    }
    
    if (metadata) {
      payment.metadata = { ...payment.metadata, ...metadata };
    }

    await payment.save();

    return NextResponse.json({ message: 'Payment updated successfully' });

  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}
