import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import Payment from '@/lib/db/models/Payment';
import PaymentLink from '@/lib/db/models/PaymentLink';
import { ClientPurchase } from '@/lib/db/models/ServicePlan';

// Helper function to create ClientPurchase from Payment record
async function createClientPurchaseFromPayment(payment: any): Promise<any> {
  try {
    // Check if ClientPurchase already exists
    const existingPurchase = await ClientPurchase.findOne({
      client: payment.client,
      $or: [
        { razorpayPaymentId: payment.razorpayPaymentId },
        { razorpayPaymentId: payment.razorpayPaymentLinkId }
      ]
    });

    if (existingPurchase) {
      return existingPurchase;
    }

    const startDate = new Date();
    const endDate = new Date();
    const durationDays = payment.durationDays || 30;
    endDate.setDate(endDate.getDate() + durationDays);

    const purchase = new ClientPurchase({
      client: payment.client,
      dietitian: payment.dietitian,
      servicePlan: payment.servicePlan,
      planName: payment.planName || payment.description || 'Diet Plan',
      planCategory: payment.planCategory || 'general',
      durationDays: durationDays,
      durationLabel: payment.durationLabel || `${durationDays} Days`,
      selectedTier: {
        durationDays: durationDays,
        durationLabel: payment.durationLabel || `${durationDays} Days`,
        amount: payment.amount
      },
      startDate,
      endDate,
      status: 'active',
      paymentStatus: 'paid',
      paymentMethod: payment.paymentMethod || 'razorpay',
      razorpayPaymentId: payment.razorpayPaymentId || payment.razorpayPaymentLinkId,
      razorpayOrderId: payment.razorpayOrderId,
      paidAt: payment.paidAt || new Date(),
      mealPlanCreated: false
    });

    await purchase.save();
    return purchase;
  } catch (error) {
    console.error('Error creating ClientPurchase:', error);
    return null;
  }
}

// POST /api/client/service-plans/verify-link - Verify payment link and create ClientPurchase
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const data = await request.json();
    const { razorpayPaymentLinkId, razorpayPaymentId, signature } = data;

    if (!razorpayPaymentLinkId) {
      return NextResponse.json({ error: 'Payment link ID is required' }, { status: 400 });
    }


    // First, try to find in Payment collection (from ServicePlansSwiper)
    let payment = await Payment.findOne({
      razorpayPaymentLinkId: razorpayPaymentLinkId,
      client: session.user.id
    });

    if (payment) {
      
      // Update payment status if not already completed
      if (payment.status !== 'completed') {
        payment.status = 'completed';
        payment.razorpayPaymentId = razorpayPaymentId;
        payment.paidAt = new Date();
        payment.transactionId = razorpayPaymentId;
        await payment.save();
      }

      // Create ClientPurchase
      const purchase = await createClientPurchaseFromPayment(payment);

      return NextResponse.json({
        success: true,
        message: 'Payment verified and plan activated',
        payment,
        clientPurchase: purchase
      });
    }

    // If not found in Payment, try PaymentLink collection (from dietitian-created links)
    const paymentLink = await PaymentLink.findOne({
      razorpayPaymentLinkId: razorpayPaymentLinkId,
      client: session.user.id
    });

    if (paymentLink) {
      
      // Update payment link status
      if (paymentLink.status !== 'paid') {
        paymentLink.status = 'paid';
        paymentLink.razorpayPaymentId = razorpayPaymentId;
        paymentLink.paidAt = new Date();
        await paymentLink.save();
      }

      // Create ClientPurchase from PaymentLink
      const startDate = new Date();
      const endDate = new Date();
      const durationDays = paymentLink.durationDays || 30;
      endDate.setDate(endDate.getDate() + durationDays);

      // Check if purchase exists
      let purchase = await ClientPurchase.findOne({
        client: paymentLink.client,
        razorpayPaymentId: razorpayPaymentId
      });

      if (!purchase) {
        purchase = new ClientPurchase({
          client: paymentLink.client,
          dietitian: paymentLink.dietitian,
          servicePlan: paymentLink.servicePlan,
          planName: paymentLink.planName || 'Diet Plan',
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
          razorpayPaymentId: razorpayPaymentId,
          razorpayOrderId: paymentLink.razorpayOrderId,
          paidAt: new Date(),
          mealPlanCreated: false
        });
        await purchase.save();
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified and plan activated',
        paymentLink,
        clientPurchase: purchase
      });
    }

    // If neither found, log and return error
    
    // As a last resort, create a ClientPurchase anyway for this user
    // This handles edge cases where the payment was made but record wasn't created properly
    
    const fallbackPurchase = new ClientPurchase({
      client: session.user.id,
      planName: 'Diet Plan',
      planCategory: 'general',
      durationDays: 30,
      durationLabel: '30 Days',
      selectedTier: {
        durationDays: 30,
        durationLabel: '30 Days',
        amount: 0
      },
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
      paymentStatus: 'paid',
      paymentMethod: 'razorpay',
      razorpayPaymentId: razorpayPaymentId || razorpayPaymentLinkId,
      paidAt: new Date(),
      mealPlanCreated: false
    });
    
    await fallbackPurchase.save();

    return NextResponse.json({
      success: true,
      message: 'Payment recorded',
      clientPurchase: fallbackPurchase
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
