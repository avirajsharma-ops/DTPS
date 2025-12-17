import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db/connect';
import OtherPlatformPayment from '@/lib/db/models/OtherPlatformPayment';
import PaymentLink from '@/lib/db/models/PaymentLink';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { UserRole } from '@/types';
import User from '@/lib/db/models/User';

// GET - List other platform payments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};

    // Role-based filtering
    if (session.user.role === UserRole.CLIENT) {
      filter.client = session.user.id;
    } else if (session.user.role === UserRole.DIETITIAN || session.user.role === UserRole.HEALTH_COUNSELOR) {
      filter.dietitian = session.user.id;
      if (clientId) {
        filter.client = clientId;
      }
    }
    // Admin can see all

    if (status) {
      filter.status = status;
    }

    const payments = await OtherPlatformPayment.find(filter)
      .populate('client', 'firstName lastName email phone profilePicture')
      .populate('dietitian', 'firstName lastName email phone')
      .populate('paymentLink', 'planName planCategory durationDays amount finalAmount')
      .populate('reviewedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Error fetching other platform payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// POST - Create new other platform payment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.DIETITIAN && session.user.role !== UserRole.HEALTH_COUNSELOR && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Only dietitians can create other platform payments' }, { status: 403 });
    }

    await dbConnect();

    const formData = await request.formData();
    
    const clientId = formData.get('clientId') as string;
    const platform = formData.get('platform') as string;
    const customPlatform = formData.get('customPlatform') as string;
    const transactionId = formData.get('transactionId') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const paymentLinkId = formData.get('paymentLinkId') as string;
    const planName = formData.get('planName') as string;
    const planCategory = formData.get('planCategory') as string;
    const durationDays = formData.get('durationDays') as string;
    const durationLabel = formData.get('durationLabel') as string;
    const paymentDate = formData.get('paymentDate') as string;
    const notes = formData.get('notes') as string;
    const receiptImage = formData.get('receiptImage') as File | null;

    if (!clientId || !platform || !transactionId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let receiptImagePath = '';
    let receiptImageUrl = '';

    // Handle receipt image upload
    if (receiptImage && receiptImage.size > 0) {
      const bytes = await receiptImage.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create upload directory
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'payment-receipts');
      await mkdir(uploadDir, { recursive: true });

      // Generate unique filename
      const ext = path.extname(receiptImage.name) || '.jpg';
      const filename = `${crypto.randomUUID()}${ext}`;
      const filepath = path.join(uploadDir, filename);

      await writeFile(filepath, buffer);
      receiptImagePath = `/uploads/payment-receipts/${filename}`;
      receiptImageUrl = receiptImagePath;
    }

    const otherPlatformPayment = new OtherPlatformPayment({
      client: clientId,
      dietitian: session.user.id,
      platform,
      customPlatform: platform === 'other' ? customPlatform : undefined,
      transactionId,
      amount,
      paymentLink: paymentLinkId || undefined,
      planName: planName || undefined,
      planCategory: planCategory || undefined,
      durationDays: durationDays ? parseInt(durationDays) : undefined,
      durationLabel: durationLabel || undefined,
      receiptImage: receiptImagePath,
      receiptImageUrl,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      notes,
      status: 'pending',
    });

    await otherPlatformPayment.save();

    const populatedPayment = await OtherPlatformPayment.findById(otherPlatformPayment._id)
      .populate('client', 'firstName lastName email phone')
      .populate('paymentLink', 'planName planCategory durationDays amount finalAmount');

    return NextResponse.json({ 
      success: true, 
      payment: populatedPayment,
      message: 'Payment submitted for admin approval'
    });
  } catch (error) {
    console.error('Error creating other platform payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
