import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import PaymentLink from '@/lib/db/models/PaymentLink';
import { ClientPurchase } from '@/lib/db/models/ServicePlan';
import { UserRole } from '@/types';
import Razorpay from 'razorpay';

// Initialize Razorpay
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

// POST /api/payment-links/sync - Sync payment status from Razorpay
// This endpoint can be used when webhook doesn't update the status
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only dietitians and admins can sync payment status
    if (session.user.role !== UserRole.DIETITIAN && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { paymentLinkId } = body;

    if (!paymentLinkId) {
      return NextResponse.json({ error: 'Payment link ID is required' }, { status: 400 });
    }

    await connectDB();

    // Find the payment link
    const paymentLink = await PaymentLink.findById(paymentLinkId);
    if (!paymentLink) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
    }

    // Check permissions
    if (session.user.role === UserRole.DIETITIAN && paymentLink.dietitian.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If already paid, no need to sync
    if (paymentLink.status === 'paid') {
      return NextResponse.json({ 
        success: true, 
        message: 'Payment already marked as paid',
        paymentLink 
      });
    }

    // Check if Razorpay is configured
    if (!razorpay || !paymentLink.razorpayPaymentLinkId) {
      return NextResponse.json({ 
        error: 'Razorpay not configured or no Razorpay payment link ID' 
      }, { status: 400 });
    }

    // Fetch payment link status from Razorpay
    try {
      const razorpayLink: any = await razorpay.paymentLink.fetch(paymentLink.razorpayPaymentLinkId);
      

      // Update status based on Razorpay response
      if (razorpayLink.status === 'paid') {
        paymentLink.status = 'paid';
        paymentLink.paidAt = razorpayLink.paid_at ? new Date(razorpayLink.paid_at * 1000) : new Date(); // Convert Unix timestamp
        
        // Try to fetch payment details if available
        if (razorpayLink.payments && Array.isArray(razorpayLink.payments) && razorpayLink.payments.length > 0) {
          const latestPayment = razorpayLink.payments[razorpayLink.payments.length - 1];
          
          try {
            // Fetch full payment details
            const paymentDetails: any = await razorpay.payments.fetch(latestPayment.payment_id);
            
            paymentLink.razorpayPaymentId = paymentDetails.id;
            paymentLink.razorpayOrderId = paymentDetails.order_id;
            
            // Transaction ID
            paymentLink.transactionId = paymentDetails.acquirer_data?.rrn || 
                                        paymentDetails.acquirer_data?.upi_transaction_id ||
                                        paymentDetails.acquirer_data?.bank_transaction_id ||
                                        paymentDetails.id;
            
            // Payment method
            paymentLink.paymentMethod = paymentDetails.method;
            
            // Payer details
            paymentLink.payerEmail = paymentDetails.email;
            paymentLink.payerPhone = paymentDetails.contact;
            
            // Card details
            if (paymentDetails.card) {
              paymentLink.cardLast4 = paymentDetails.card.last4;
              paymentLink.cardNetwork = paymentDetails.card.network;
            }
            
            // Bank/Wallet/UPI
            if (paymentDetails.bank) paymentLink.bank = paymentDetails.bank;
            if (paymentDetails.wallet) paymentLink.wallet = paymentDetails.wallet;
            if (paymentDetails.vpa) paymentLink.vpa = paymentDetails.vpa;
            
          } catch (paymentFetchError) {
            console.error('Error fetching payment details:', paymentFetchError);
            // Continue with what we have
            paymentLink.razorpayPaymentId = latestPayment.payment_id;
          }
        }
        
        await paymentLink.save();

        // Create ClientPurchase if it doesn't exist and servicePlanId is present
        let clientPurchaseCreated = false;
        if (paymentLink.servicePlanId && paymentLink.durationDays) {
          try {
            // Check if ClientPurchase already exists
            const existingPurchase = await ClientPurchase.findOne({
              paymentLink: paymentLink._id
            });

            if (!existingPurchase) {
              const startDate = paymentLink.paidAt || new Date();
              const endDate = new Date(startDate);
              endDate.setDate(endDate.getDate() + paymentLink.durationDays);

              const newPurchase = new ClientPurchase({
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
                purchaseDate: startDate,
                startDate: startDate,
                endDate: endDate,
                status: 'active',
                mealPlanCreated: false,
                daysUsed: 0
              });

              await newPurchase.save();
              clientPurchaseCreated = true;
            }
          } catch (purchaseError) {
            console.error('Error creating ClientPurchase during sync:', purchaseError);
          }
        }
        
        return NextResponse.json({
          success: true,
          message: 'Payment status synced successfully - Payment is PAID',
          paymentLink,
          razorpayStatus: razorpayLink.status,
          clientPurchaseCreated
        });
      } else if (razorpayLink.status === 'expired') {
        paymentLink.status = 'expired';
        await paymentLink.save();
        
        return NextResponse.json({
          success: true,
          message: 'Payment link is expired',
          paymentLink,
          razorpayStatus: razorpayLink.status
        });
      } else if (razorpayLink.status === 'cancelled') {
        paymentLink.status = 'cancelled';
        await paymentLink.save();
        
        return NextResponse.json({
          success: true,
          message: 'Payment link is cancelled',
          paymentLink,
          razorpayStatus: razorpayLink.status
        });
      } else {
        // Still pending
        return NextResponse.json({
          success: true,
          message: `Payment is still ${razorpayLink.status}`,
          paymentLink,
          razorpayStatus: razorpayLink.status
        });
      }

    } catch (razorpayError: any) {
      console.error('Error fetching from Razorpay:', razorpayError);
      return NextResponse.json({ 
        error: 'Failed to fetch payment status from Razorpay',
        details: razorpayError.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error syncing payment status:', error);
    return NextResponse.json(
      { error: 'Failed to sync payment status' },
      { status: 500 }
    );
  }
}

// GET /api/payment-links/sync - Sync ALL pending payments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can bulk sync
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (!razorpay) {
      return NextResponse.json({ error: 'Razorpay not configured' }, { status: 400 });
    }

    await connectDB();

    // Find all pending payment links with Razorpay IDs
    const pendingLinks = await PaymentLink.find({
      status: { $in: ['created', 'pending'] },
      razorpayPaymentLinkId: { $exists: true, $ne: null }
    });

    const results = {
      total: pendingLinks.length,
      updated: 0,
      stillPending: 0,
      errors: 0
    };

    for (const paymentLink of pendingLinks) {
      try {
        const razorpayLink: any = await razorpay.paymentLink.fetch(paymentLink.razorpayPaymentLinkId!);
        
        if (razorpayLink.status === 'paid') {
          paymentLink.status = 'paid';
          paymentLink.paidAt = razorpayLink.paid_at ? new Date(razorpayLink.paid_at * 1000) : new Date();
          await paymentLink.save();
          results.updated++;
        } else if (razorpayLink.status === 'expired') {
          paymentLink.status = 'expired';
          await paymentLink.save();
          results.updated++;
        } else {
          results.stillPending++;
        }
      } catch (err) {
        console.error(`Error syncing payment link ${paymentLink._id}:`, err);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Bulk sync completed',
      results
    });

  } catch (error) {
    console.error('Error in bulk sync:', error);
    return NextResponse.json(
      { error: 'Failed to bulk sync payment statuses' },
      { status: 500 }
    );
  }
}
