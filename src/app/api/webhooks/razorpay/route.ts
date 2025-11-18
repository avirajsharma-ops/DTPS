import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db/connection';
import ClientSubscription from '@/lib/db/models/ClientSubscription';

// Verify Razorpay webhook signature
function verifyRazorpaySignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return hash === signature;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    if (!verifyRazorpaySignature(body, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);
    console.log('Razorpay webhook event:', event.event);

    await connectDB();

    // Handle different webhook events
    switch (event.event) {
      case 'payment.authorized':
      case 'payment.captured':
        await handlePaymentSuccess(event.payload);
        break;

      case 'payment.failed':
        await handlePaymentFailed(event.payload);
        break;

      case 'payment.link.completed':
        await handlePaymentLinkCompleted(event.payload);
        break;

      case 'payment.link.cancelled':
        await handlePaymentLinkCancelled(event.payload);
        break;

      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle successful payment
async function handlePaymentSuccess(payload: any) {
  try {
    const payment = payload.payment;
    const orderId = payment.order_id;

    if (!orderId) {
      console.log('No order ID in payment');
      return;
    }

    // Find subscription by Razorpay order ID
    const subscription = await ClientSubscription.findOne({
      razorpayOrderId: orderId
    });

    if (!subscription) {
      console.log(`Subscription not found for order: ${orderId}`);
      return;
    }

    // Update subscription with payment details
    subscription.razorpayPaymentId = payment.id;
    subscription.paymentStatus = 'paid';
    subscription.status = 'active';
    subscription.paidAt = new Date();
    subscription.transactionId = payment.id;

    await subscription.save();

    console.log(`Payment successful for subscription: ${subscription._id}`);
    console.log(`Client: ${subscription.client}, Amount: ${subscription.amount}`);

    // TODO: Send email notification to client
    // TODO: Send SMS notification to client
    // TODO: Trigger any other business logic (e.g., activate features)
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

// Handle failed payment
async function handlePaymentFailed(payload: any) {
  try {
    const payment = payload.payment;
    const orderId = payment.order_id;

    if (!orderId) {
      console.log('No order ID in failed payment');
      return;
    }

    // Find subscription by Razorpay order ID
    const subscription = await ClientSubscription.findOne({
      razorpayOrderId: orderId
    });

    if (!subscription) {
      console.log(`Subscription not found for order: ${orderId}`);
      return;
    }

    // Update subscription status
    subscription.paymentStatus = 'failed';
    subscription.status = 'pending';

    await subscription.save();

    console.log(`Payment failed for subscription: ${subscription._id}`);
    console.log(`Reason: ${payment.description}`);

    // TODO: Send email notification to client about failed payment
    // TODO: Send SMS notification to client
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

// Handle payment link completed
async function handlePaymentLinkCompleted(payload: any) {
  try {
    const paymentLink = payload.payment_link;
    const notes = paymentLink.notes || {};
    const subscriptionId = notes.subscriptionId;

    if (!subscriptionId) {
      console.log('No subscription ID in payment link');
      return;
    }

    // Find subscription by ID
    const subscription = await ClientSubscription.findById(subscriptionId);

    if (!subscription) {
      console.log(`Subscription not found: ${subscriptionId}`);
      return;
    }

    // Update subscription
    subscription.paymentStatus = 'paid';
    subscription.status = 'active';
    subscription.paidAt = new Date();

    await subscription.save();

    console.log(`Payment link completed for subscription: ${subscriptionId}`);

    // TODO: Send confirmation email
    // TODO: Send SMS notification
  } catch (error) {
    console.error('Error handling payment link completion:', error);
  }
}

// Handle payment link cancelled
async function handlePaymentLinkCancelled(payload: any) {
  try {
    const paymentLink = payload.payment_link;
    const notes = paymentLink.notes || {};
    const subscriptionId = notes.subscriptionId;

    if (!subscriptionId) {
      console.log('No subscription ID in payment link');
      return;
    }

    // Find subscription by ID
    const subscription = await ClientSubscription.findById(subscriptionId);

    if (!subscription) {
      console.log(`Subscription not found: ${subscriptionId}`);
      return;
    }

    // Update subscription
    subscription.paymentStatus = 'failed';
    subscription.status = 'pending';

    await subscription.save();

    console.log(`Payment link cancelled for subscription: ${subscriptionId}`);

    // TODO: Send notification to client
  } catch (error) {
    console.error('Error handling payment link cancellation:', error);
  }
}

