import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db/connection';
import PaymentLink from '@/lib/db/models/PaymentLink';
import { ClientPurchase } from '@/lib/db/models/ServicePlan';
import Payment from '@/lib/db/models/Payment';
import { PaymentStatus, PaymentType } from '@/types';

// Razorpay webhook secret
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

// Helper function to create ClientPurchase from PaymentLink
async function createClientPurchaseFromPaymentLink(paymentLink: any): Promise<any> {
  try {
    // Check if ClientPurchase already exists
    const existingPurchase = await ClientPurchase.findOne({
      client: paymentLink.client,
      razorpayPaymentId: paymentLink.razorpayPaymentId
    });

    if (existingPurchase) {
      console.log('ClientPurchase already exists:', existingPurchase._id);
      return existingPurchase;
    }

    const startDate = new Date();
    const endDate = new Date();
    const durationDays = paymentLink.durationDays || 30;
    endDate.setDate(endDate.getDate() + durationDays);

    const purchase = new ClientPurchase({
      client: paymentLink.client,
      dietitian: paymentLink.dietitian,
      servicePlan: paymentLink.servicePlan,
      planName: paymentLink.planName || paymentLink.description || 'Diet Plan',
      planCategory: paymentLink.planCategory || 'general',
      durationDays: durationDays,
      durationLabel: paymentLink.duration || `${durationDays} Days`,
      selectedTier: {
        durationDays: durationDays,
        durationLabel: paymentLink.duration || `${durationDays} Days`,
        amount: paymentLink.finalAmount || paymentLink.amount
      },
      startDate,
      endDate,
      status: 'active',
      paymentStatus: 'paid',
      paymentMethod: paymentLink.paymentMethod || 'razorpay',
      razorpayPaymentId: paymentLink.razorpayPaymentId,
      razorpayOrderId: paymentLink.razorpayOrderId,
      paidAt: paymentLink.paidAt || new Date(),
      mealPlanCreated: false
    });

    await purchase.save();
    console.log('ClientPurchase created from webhook:', purchase._id);
    return purchase;
  } catch (error) {
    console.error('Error creating ClientPurchase:', error);
    return null;
  }
}

// Helper function to create Payment record from PaymentLink
async function createPaymentRecordFromLink(paymentLink: any): Promise<any> {
  try {
    // Check if Payment record already exists
    const existingPayment = await Payment.findOne({
      paymentLink: paymentLink._id
    });

    if (existingPayment) {
      console.log('Payment record already exists:', existingPayment._id);
      return existingPayment;
    }

    const paymentRecord = new Payment({
      client: paymentLink.client,
      dietitian: paymentLink.dietitian,
      type: PaymentType.SERVICE_PLAN,
      amount: paymentLink.finalAmount || paymentLink.amount,
      currency: paymentLink.currency || 'INR',
      status: PaymentStatus.COMPLETED,
      paymentMethod: paymentLink.paymentMethod || 'razorpay',
      transactionId: paymentLink.razorpayPaymentId || paymentLink.razorpayPaymentLinkId,
      description: `Payment for ${paymentLink.planName || 'Service Plan'} - ${paymentLink.duration || paymentLink.durationDays + ' Days'}`,
      planName: paymentLink.planName,
      planCategory: paymentLink.planCategory,
      durationDays: paymentLink.durationDays,
      durationLabel: paymentLink.duration || `${paymentLink.durationDays} Days`,
      paymentLink: paymentLink._id,
      payerEmail: paymentLink.payerEmail,
      payerPhone: paymentLink.payerPhone,
      razorpayPaymentId: paymentLink.razorpayPaymentId,
      razorpayOrderId: paymentLink.razorpayOrderId,
      paidAt: paymentLink.paidAt || new Date(),
      mealPlanCreated: false
    });

    await paymentRecord.save();
    console.log('Payment record created from webhook:', paymentRecord._id);
    return paymentRecord;
  } catch (error) {
    console.error('Error creating Payment record:', error);
    return null;
  }
}

// Verify Razorpay webhook signature
function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!webhookSecret) {
    console.warn('RAZORPAY_WEBHOOK_SECRET not configured');
    return true; // Allow in development
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  return expectedSignature === signature;
}

// POST /api/payment-links/webhook - Handle Razorpay webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    // Verify signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    console.log('Razorpay webhook event:', event.event);

    await connectDB();

    switch (event.event) {
      case 'payment_link.paid': {
        const paymentLinkEntity = event.payload.payment_link?.entity;
        const paymentEntity = event.payload.payment?.entity;

        if (!paymentLinkEntity) {
          console.error('Missing payment_link entity in webhook');
          return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // Find payment link by Razorpay ID
        const paymentLink = await PaymentLink.findOne({
          razorpayPaymentLinkId: paymentLinkEntity.id
        });

        if (!paymentLink) {
          console.error('Payment link not found:', paymentLinkEntity.id);
          return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
        }

        // Update payment link status with ALL transaction details
        // This captures payment regardless of which phone/email was used
        paymentLink.status = 'paid';
        paymentLink.paidAt = new Date();
        
        if (paymentEntity) {
          // Core payment identifiers
          paymentLink.razorpayPaymentId = paymentEntity.id;
          paymentLink.razorpayOrderId = paymentEntity.order_id;
          
          // Transaction ID (unique identifier for the payment)
          paymentLink.transactionId = paymentEntity.acquirer_data?.rrn || 
                                      paymentEntity.acquirer_data?.upi_transaction_id ||
                                      paymentEntity.acquirer_data?.bank_transaction_id ||
                                      paymentEntity.id;
          
          // Payment method used
          paymentLink.paymentMethod = paymentEntity.method; // card, netbanking, wallet, upi
          
          // Payer details (whoever actually paid, regardless of registered phone)
          paymentLink.payerEmail = paymentEntity.email;
          paymentLink.payerPhone = paymentEntity.contact;
          
          // Card details
          if (paymentEntity.card) {
            paymentLink.cardLast4 = paymentEntity.card.last4;
            paymentLink.cardNetwork = paymentEntity.card.network;
          }
          
          // Bank/Netbanking
          if (paymentEntity.bank) {
            paymentLink.bank = paymentEntity.bank;
          }
          
          // Wallet
          if (paymentEntity.wallet) {
            paymentLink.wallet = paymentEntity.wallet;
          }
          
          // UPI
          if (paymentEntity.vpa) {
            paymentLink.vpa = paymentEntity.vpa;
          }
        }

        await paymentLink.save();

        // Create ClientPurchase record so dietitian can see in Planning section
        const purchase = await createClientPurchaseFromPaymentLink(paymentLink);
        
        // Create Payment record for accounting
        const payment = await createPaymentRecordFromLink(paymentLink);

        console.log('Payment link marked as paid:', paymentLink._id, 'Transaction ID:', paymentLink.transactionId, 'ClientPurchase:', purchase?._id, 'Payment:', payment?._id);
        break;
      }

      case 'payment_link.expired': {
        const paymentLinkEntity = event.payload.payment_link?.entity;

        if (!paymentLinkEntity) {
          return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const paymentLink = await PaymentLink.findOne({
          razorpayPaymentLinkId: paymentLinkEntity.id
        });

        if (paymentLink && paymentLink.status !== 'paid') {
          paymentLink.status = 'expired';
          await paymentLink.save();
          console.log('Payment link marked as expired:', paymentLink._id);
        }
        break;
      }

      case 'payment_link.cancelled': {
        const paymentLinkEntity = event.payload.payment_link?.entity;

        if (!paymentLinkEntity) {
          return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const paymentLink = await PaymentLink.findOne({
          razorpayPaymentLinkId: paymentLinkEntity.id
        });

        if (paymentLink && paymentLink.status !== 'paid') {
          paymentLink.status = 'cancelled';
          await paymentLink.save();
          console.log('Payment link marked as cancelled:', paymentLink._id);
        }
        break;
      }

      case 'payment.captured': {
        // Handle direct payment capture
        const paymentEntity = event.payload.payment?.entity;
        
        // Try to find payment link by notes or by payment link reference
        let paymentLink = null;
        
        if (paymentEntity?.notes?.paymentLinkId) {
          paymentLink = await PaymentLink.findById(paymentEntity.notes.paymentLinkId);
        } else if (paymentEntity?.notes?.razorpayPaymentLinkId) {
          paymentLink = await PaymentLink.findOne({ razorpayPaymentLinkId: paymentEntity.notes.razorpayPaymentLinkId });
        }
        
        if (paymentLink && paymentLink.status !== 'paid') {
          paymentLink.status = 'paid';
          paymentLink.paidAt = new Date();
          paymentLink.razorpayPaymentId = paymentEntity.id;
          paymentLink.razorpayOrderId = paymentEntity.order_id;
          
          // Capture all transaction details
          paymentLink.transactionId = paymentEntity.acquirer_data?.rrn || 
                                      paymentEntity.acquirer_data?.upi_transaction_id ||
                                      paymentEntity.acquirer_data?.bank_transaction_id ||
                                      paymentEntity.id;
          paymentLink.paymentMethod = paymentEntity.method;
          paymentLink.payerEmail = paymentEntity.email;
          paymentLink.payerPhone = paymentEntity.contact;
          
          if (paymentEntity.card) {
            paymentLink.cardLast4 = paymentEntity.card.last4;
            paymentLink.cardNetwork = paymentEntity.card.network;
          }
          if (paymentEntity.bank) paymentLink.bank = paymentEntity.bank;
          if (paymentEntity.wallet) paymentLink.wallet = paymentEntity.wallet;
          if (paymentEntity.vpa) paymentLink.vpa = paymentEntity.vpa;
          
          await paymentLink.save();
          
          // Create ClientPurchase record so dietitian can see in Planning section
          const purchase = await createClientPurchaseFromPaymentLink(paymentLink);
          
          // Create Payment record for accounting
          const payment = await createPaymentRecordFromLink(paymentLink);
          
          console.log('Payment captured and saved:', paymentLink._id, 'ClientPurchase:', purchase?._id, 'Payment:', payment?._id);
        }
        break;
      }

      default:
        console.log('Unhandled webhook event:', event.event);
    }

    return NextResponse.json({ success: true, received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to check webhook status (for debugging)
export async function GET() {
  return NextResponse.json({
    status: 'active',
    webhookSecretConfigured: !!webhookSecret,
    message: 'Razorpay webhook endpoint is active'
  });
}
