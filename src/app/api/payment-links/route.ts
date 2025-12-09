import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import PaymentLink from '@/lib/db/models/PaymentLink';
import User from '@/lib/db/models/User';
import { UserRole } from '@/types';
import { z } from 'zod';
import Razorpay from 'razorpay';

// Initialize Razorpay
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

const createPaymentLinkSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  amount: z.number().positive('Amount must be positive'),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).max(40).default(0), // Max 40% discount
  finalAmount: z.number().positive('Final amount must be positive'),
  planCategory: z.string().optional(),
  planName: z.string().optional(),
  duration: z.string().optional(),
  durationDays: z.number().min(1).optional(),
  servicePlanId: z.string().optional(),
  pricingTierId: z.string().optional(),
  catalogue: z.string().optional(),
  expireDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
  showToClient: z.boolean().default(true),
});

// GET /api/payment-links - Get payment links
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    let query: any = {};

    // Clients can only see their own payment links
    if (session.user.role === UserRole.CLIENT) {
      query.client = session.user.id;
      query.showToClient = true;
    }
    // Dietitians can see payment links for their assigned clients
    else if (session.user.role === UserRole.DIETITIAN) {
      // Get all clients assigned to this dietitian
      const assignedClients = await User.find({
        role: UserRole.CLIENT,
        $or: [
          { assignedDietitian: session.user.id },
          { assignedDietitians: session.user.id }
        ]
      }).select('_id');
      const assignedClientIds = assignedClients.map(c => c._id);
      
      // Dietitian can see payment links they created OR for their assigned clients
      query.$or = [
        { dietitian: session.user.id },
        { client: { $in: assignedClientIds } }
      ];
      if (clientId) query.client = clientId;
    }
    // Admins can see all
    else if (session.user.role === UserRole.ADMIN) {
      if (clientId) query.client = clientId;
    }

    if (status) query.status = status;

    // Auto-expire payment links that have passed their expiry date
    const now = new Date();
    await PaymentLink.updateMany(
      {
        expireDate: { $lt: now },
        status: { $in: ['created', 'pending'] }
      },
      {
        $set: { status: 'cancelled' }
      }
    );

    const paymentLinks = await PaymentLink.find(query)
      .populate('client', 'firstName lastName email phone')
      .populate('dietitian', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await PaymentLink.countDocuments(query);

    return NextResponse.json({
      success: true,
      paymentLinks,
      total,
      limit,
      skip
    });

  } catch (error) {
    console.error('Error fetching payment links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment links' },
      { status: 500 }
    );
  }
}

// POST /api/payment-links - Create new payment link
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only dietitians and admins can create payment links
    if (session.user.role !== UserRole.DIETITIAN && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createPaymentLinkSchema.parse(body);

    await connectDB();

    // Verify client exists
    const client = await User.findById(validatedData.clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Create payment link in database first
    const paymentLinkData: any = {
      client: validatedData.clientId,
      dietitian: session.user.id,
      amount: validatedData.amount,
      tax: validatedData.tax,
      discount: Math.min(validatedData.discount, 40), // Enforce max 40% discount
      finalAmount: validatedData.finalAmount,
      planCategory: validatedData.planCategory,
      planName: validatedData.planName,
      duration: validatedData.duration,
      durationDays: validatedData.durationDays,
      servicePlanId: validatedData.servicePlanId,
      pricingTierId: validatedData.pricingTierId,
      catalogue: validatedData.catalogue,
      notes: validatedData.notes,
      showToClient: validatedData.showToClient,
      status: 'created',
    };

    if (validatedData.expireDate) {
      paymentLinkData.expireDate = new Date(validatedData.expireDate);
    }

    // Create Razorpay payment link if configured
    if (razorpay) {
      try {
        const clientName = `${client.firstName} ${client.lastName}`.trim() || 'Customer';
        const description = validatedData.planName 
          ? `Payment for ${validatedData.planName}${validatedData.duration ? ` - ${validatedData.duration}` : ''}`
          : 'Payment Link';

        const razorpayPaymentLinkOptions: any = {
          amount: Math.round(validatedData.finalAmount * 100), // Amount in paise
          currency: 'INR',
          accept_partial: false,
          description: description,
          customer: {
            name: clientName,
            email: client.email || undefined,
            contact: client.phone || undefined,
          },
          notify: {
            sms: !!client.phone,
            email: !!client.email,
          },
          reminder_enable: true,
          notes: {
            clientId: validatedData.clientId,
            dietitianId: session.user.id,
            planName: validatedData.planName || '',
            planCategory: validatedData.planCategory || '',
          },
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success`,
          callback_method: 'get'
        };

        // Set expiry if provided
        if (validatedData.expireDate) {
          const expireTimestamp = Math.floor(new Date(validatedData.expireDate).getTime() / 1000);
          razorpayPaymentLinkOptions.expire_by = expireTimestamp;
        }

        const razorpayLink = await razorpay.paymentLink.create(razorpayPaymentLinkOptions);

        paymentLinkData.razorpayPaymentLinkId = razorpayLink.id;
        paymentLinkData.razorpayPaymentLinkUrl = razorpayLink.short_url;
        paymentLinkData.razorpayPaymentLinkShortUrl = razorpayLink.short_url;
        paymentLinkData.status = 'pending';

      } catch (razorpayError: any) {
        console.error('Razorpay payment link creation failed:', razorpayError);
        // Continue without Razorpay link - will create a manual link
        paymentLinkData.razorpayPaymentLinkUrl = null;
      }
    }

    // If no Razorpay link was created, generate a placeholder
    if (!paymentLinkData.razorpayPaymentLinkUrl) {
      const linkId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      paymentLinkData.razorpayPaymentLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/manual/${linkId}`;
    }

    const paymentLink = await PaymentLink.create(paymentLinkData);

    // Populate and return
    const populatedPaymentLink = await PaymentLink.findById(paymentLink._id)
      .populate('client', 'firstName lastName email phone')
      .populate('dietitian', 'firstName lastName email');

    return NextResponse.json({
      success: true,
      paymentLink: populatedPaymentLink,
      message: razorpay ? 'Payment link created with Razorpay' : 'Payment link created (manual mode)'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating payment link:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create payment link' },
      { status: 500 }
    );
  }
}

// DELETE /api/payment-links - Delete/Cancel payment link
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Payment link ID is required' }, { status: 400 });
    }

    await connectDB();

    const paymentLink = await PaymentLink.findById(id);

    if (!paymentLink) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
    }

    // Check permissions
    if (session.user.role === UserRole.DIETITIAN && paymentLink.dietitian.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Cannot delete paid payment links
    if (paymentLink.status === 'paid') {
      return NextResponse.json({ error: 'Cannot delete a paid payment link' }, { status: 400 });
    }

    // Cancel in Razorpay if applicable
    if (razorpay && paymentLink.razorpayPaymentLinkId) {
      try {
        await razorpay.paymentLink.cancel(paymentLink.razorpayPaymentLinkId);
      } catch (razorpayError) {
        console.error('Failed to cancel Razorpay payment link:', razorpayError);
        // Continue with deletion even if Razorpay cancellation fails
      }
    }

    // Mark as cancelled instead of deleting
    paymentLink.status = 'cancelled';
    await paymentLink.save();

    return NextResponse.json({
      success: true,
      message: 'Payment link cancelled successfully'
    });

  } catch (error) {
    console.error('Error deleting payment link:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment link' },
      { status: 500 }
    );
  }
}
