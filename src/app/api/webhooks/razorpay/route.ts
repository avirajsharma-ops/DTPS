import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db/connection';
import ClientSubscription from '@/lib/db/models/ClientSubscription';
import PaymentLink from '@/lib/db/models/PaymentLink';
import { ClientPurchase } from '@/lib/db/models/ServicePlan';
import Payment from '@/lib/db/models/Payment';
import { PaymentStatus, PaymentType } from '@/types';

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
      return;
    }

    // Find subscription by Razorpay order ID
    const subscription = await ClientSubscription.findOne({
      razorpayOrderId: orderId
    });

    if (!subscription) {
      return;
    }

    // Update subscription with payment details
    subscription.razorpayPaymentId = payment.id;
    subscription.paymentStatus = 'paid';
    subscription.status = 'active';
    subscription.paidAt = new Date();
    subscription.transactionId = payment.id;

    await subscription.save();

    // Create Payment record in Payment schema
    try {
      const paymentRecord = new Payment({
        client: subscription.client,
        dietitian: subscription.dietitian,
        type: PaymentType.SUBSCRIPTION,
        amount: subscription.amount,
        currency: 'INR',
        status: PaymentStatus.COMPLETED,
        paymentMethod: 'razorpay',
        transactionId: payment.id,
        description: `Subscription payment - Order: ${orderId}`
      });

      await paymentRecord.save();
    } catch (paymentError) {
      console.error('Error creating Payment record:', paymentError);
    }


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
      return;
    }

    // Find subscription by Razorpay order ID
    const subscription = await ClientSubscription.findOne({
      razorpayOrderId: orderId
    });

    if (!subscription) {
      return;
    }

    // Update subscription status
    subscription.paymentStatus = 'failed';
    subscription.status = 'pending';

    await subscription.save();

    // Create Payment record with FAILED status
    try {
      const paymentRecord = new Payment({
        client: subscription.client,
        dietitian: subscription.dietitian,
        type: PaymentType.SUBSCRIPTION,
        amount: subscription.amount,
        currency: 'INR',
        status: PaymentStatus.FAILED,
        paymentMethod: 'razorpay',
        transactionId: payment.id,
        description: `Failed payment - Order: ${orderId} - Reason: ${payment.description || 'Unknown'}`
      });

      await paymentRecord.save();
    } catch (paymentError) {
      console.error('Error creating Failed Payment record:', paymentError);
    }


    // TODO: Send email notification to client about failed payment
    // TODO: Send SMS notification to client
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

// Handle payment link completed
async function handlePaymentLinkCompleted(payload: any) {
  try {
    const paymentLinkData = payload.payment_link;
    const notes = paymentLinkData.notes || {};
    const subscriptionId = notes.subscriptionId;
    const clientId = notes.clientId;
    const dietitianId = notes.dietitianId;

    // First, check if this is from our PaymentLink model
    const paymentLink = await PaymentLink.findOne({
      razorpayPaymentLinkId: paymentLinkData.id
    });

    if (paymentLink) {
      // Extract payment details if available
      let paymentMethod = 'razorpay';
      let payerEmail = '';
      let payerPhone = '';
      let razorpayPaymentId = paymentLinkData.id;
      
      if (payload.payment) {
        razorpayPaymentId = payload.payment.entity?.id || paymentLinkData.id;
        paymentMethod = payload.payment.entity?.method || 'razorpay';
        payerEmail = payload.payment.entity?.email || '';
        payerPhone = payload.payment.entity?.contact || '';
      }
      
      // Update PaymentLink status
      paymentLink.status = 'paid';
      paymentLink.paidAt = new Date();
      paymentLink.razorpayPaymentId = razorpayPaymentId;
      paymentLink.paymentMethod = paymentMethod;
      paymentLink.payerEmail = payerEmail;
      paymentLink.payerPhone = payerPhone;

      await paymentLink.save();

      // Create Payment record in Payment schema with full plan details
      let paymentRecordId = null;
      try {
        // Check if payment record already exists to avoid duplicates
        let existingPayment = await Payment.findOne({
          transactionId: razorpayPaymentId,
          client: paymentLink.client
        });

        if (existingPayment) {
          paymentRecordId = existingPayment._id;
        } else {
          const paymentRecord = new Payment({
            client: paymentLink.client,
            dietitian: paymentLink.dietitian,
            type: PaymentType.SERVICE_PLAN,
            amount: paymentLink.finalAmount,
            currency: paymentLink.currency || 'INR',
            status: PaymentStatus.COMPLETED,
            paymentMethod: paymentMethod,
            transactionId: razorpayPaymentId,
            description: `Payment for ${paymentLink.planName || 'Service Plan'} - ${paymentLink.duration || paymentLink.durationDays + ' Days'} (${paymentLink.planCategory || 'general-wellness'})`,
            
            // Plan details
            planName: paymentLink.planName,
            planCategory: paymentLink.planCategory,
            durationDays: paymentLink.durationDays,
            durationLabel: paymentLink.duration || `${paymentLink.durationDays} Days`,
            
            // References
            paymentLink: paymentLink._id,
            
            // Payer details
            payerEmail: payerEmail,
            payerPhone: payerPhone
          });

          // Save the Payment record
          const savedPayment = await paymentRecord.save();
          paymentRecordId = savedPayment._id;
        }
      } catch (paymentError) {
        console.error('Error creating Payment record:', paymentError);
      }

      // Create ClientPurchase record if servicePlanId exists
      if (paymentLink.servicePlanId && paymentLink.durationDays) {
        try {
          // Check if ClientPurchase already exists for this payment link
          const existingPurchase = await ClientPurchase.findOne({ paymentLink: paymentLink._id });
          
          if (existingPurchase) {
          } else {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + paymentLink.durationDays);

            const clientPurchase = new ClientPurchase({
              client: paymentLink.client,
              dietitian: paymentLink.dietitian,
              servicePlan: paymentLink.servicePlanId,
              paymentLink: paymentLink._id,
              planName: paymentLink.planName || 'Service Plan',
              planCategory: paymentLink.planCategory || 'general-wellness',
              durationDays: paymentLink.durationDays,
              durationLabel: paymentLink.duration || `${paymentLink.durationDays} Days`,
              baseAmount: paymentLink.amount,
              discountPercent: paymentLink.discount || 0,
              taxPercent: paymentLink.tax || 0,
              finalAmount: paymentLink.finalAmount,
              purchaseDate: new Date(),
              startDate: startDate,
              endDate: endDate,
              status: 'active',
              mealPlanCreated: false,
              daysUsed: 0
            });

            const savedPurchase = await clientPurchase.save();
            
            // Update Payment record with ClientPurchase reference
            if (paymentRecordId) {
              const updatedPayment = await Payment.findByIdAndUpdate(
                paymentRecordId, 
                { clientPurchase: savedPurchase._id },
                { new: true }
              );
            }
          }
        } catch (purchaseError) {
          console.error('Error creating ClientPurchase:', purchaseError);
        }
      } else {
      }

      return;
    }

    // Legacy handling for ClientSubscription
    if (!subscriptionId) {
      return;
    }

    // Find subscription by ID
    const subscription = await ClientSubscription.findById(subscriptionId);

    if (!subscription) {
      return;
    }

    // Update subscription
    subscription.paymentStatus = 'paid';
    subscription.status = 'active';
    subscription.paidAt = new Date();

    await subscription.save();


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
      return;
    }

    // Find subscription by ID
    const subscription = await ClientSubscription.findById(subscriptionId);

    if (!subscription) {
      return;
    }

    // Update subscription
    subscription.paymentStatus = 'failed';
    subscription.status = 'pending';

    await subscription.save();


    // TODO: Send notification to client
  } catch (error) {
    console.error('Error handling payment link cancellation:', error);
  }
}

