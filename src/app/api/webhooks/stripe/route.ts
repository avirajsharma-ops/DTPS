import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import connectDB from '@/lib/db/connection';
import Payment from '@/lib/db/models/Payment';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
}) : null;

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!stripe || !endpointSecret) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Update payment status in database
        const payment = await Payment.findOne({ 
          stripePaymentIntentId: paymentIntent.id 
        });
        
        if (payment) {
          payment.status = 'completed';
          payment.paidAt = new Date();
          payment.metadata = {
            ...payment.metadata,
            stripePaymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
          };
          await payment.save();
          
          console.log('Payment completed:', paymentIntent.id);
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        
        const failedPaymentRecord = await Payment.findOne({ 
          stripePaymentIntentId: failedPayment.id 
        });
        
        if (failedPaymentRecord) {
          failedPaymentRecord.status = 'failed';
          failedPaymentRecord.metadata = {
            ...failedPaymentRecord.metadata,
            failureReason: failedPayment.last_payment_error?.message || 'Payment failed'
          };
          await failedPaymentRecord.save();
          
          console.log('Payment failed:', failedPayment.id);
        }
        break;

      case 'payment_intent.canceled':
        const canceledPayment = event.data.object as Stripe.PaymentIntent;
        
        const canceledPaymentRecord = await Payment.findOne({ 
          stripePaymentIntentId: canceledPayment.id 
        });
        
        if (canceledPaymentRecord) {
          canceledPaymentRecord.status = 'cancelled';
          await canceledPaymentRecord.save();
          
          console.log('Payment canceled:', canceledPayment.id);
        }
        break;

      case 'invoice.payment_succeeded':
        // Handle subscription payments if you implement subscriptions
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice payment succeeded:', invoice.id);
        break;

      case 'customer.subscription.created':
        // Handle new subscriptions
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription created:', subscription.id);
        break;

      case 'customer.subscription.updated':
        // Handle subscription updates
        const updatedSubscription = event.data.object as Stripe.Subscription;
        console.log('Subscription updated:', updatedSubscription.id);
        break;

      case 'customer.subscription.deleted':
        // Handle subscription cancellations
        const deletedSubscription = event.data.object as Stripe.Subscription;
        console.log('Subscription deleted:', deletedSubscription.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
