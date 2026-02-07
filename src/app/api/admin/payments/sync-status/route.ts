/**
 * API Route: Sync Payment Status to ClientPurchase
 * PUT /api/admin/payments/sync-status
 * 
 * Syncs payment status from Payment records to their linked ClientPurchase records
 * Updates existing records instead of creating new ones
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import mongoose from 'mongoose';

export const runtime = 'nodejs';

interface SyncResult {
  processed: number;
  updated: number;
  failed: number;
  errors: Array<{
    paymentId: string;
    error: string;
  }>;
}

export async function PUT(request: NextRequest) {
  try {
    // Auth check - admin only
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get the Payment model
    const Payment = mongoose.models.Payment || require('@/lib/db/models/Payment').default;
    const ClientPurchase = mongoose.models.ClientPurchase || require('@/lib/db/models/ServicePlan').ClientPurchase;

    if (!Payment || !ClientPurchase) {
      return NextResponse.json(
        { success: false, error: 'Models not found' },
        { status: 500 }
      );
    }

    const result: SyncResult = {
      processed: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    // Find all payments with pending status that have clientPurchase reference
    const pendingPayments: any[] = await Payment.find({
      clientPurchase: { $exists: true, $ne: null },
      status: { $ne: 'pending' } // Get non-pending (completed, failed, etc)
    }).lean();

    console.log(`[Payment Sync] Found ${pendingPayments.length} payments to sync`);

    // Process each payment
    for (const payment of pendingPayments) {
      result.processed++;
      
      try {
        const paymentId = (payment as any)._id?.toString() || 'unknown';

        // Update existing ClientPurchase record with payment status
        const updateResult = await ClientPurchase.findByIdAndUpdate(
          (payment as any).clientPurchase,
          {
            $set: {
              paymentStatus: (payment as any).status,
              paidAt: (payment as any).status === 'completed' ? (payment as any).paidAt || new Date() : undefined,
              razorpayPaymentId: (payment as any).transactionId,
              paymentMethod: (payment as any).paymentMethod,
              // Update final amounts if payment successful
              ...((payment as any).status === 'completed' && {
                status: 'active',
                startDate: (payment as any).startDate || new Date()
              })
            }
          },
          { new: true }
        ).lean();

        if (updateResult) {
          result.updated++;
          console.log(`[Payment Sync] ✓ Updated ClientPurchase ${(payment as any).clientPurchase} with status: ${(payment as any).status}`);
        } else {
          result.failed++;
          result.errors.push({
            paymentId,
            error: 'ClientPurchase not found or already updated'
          });
        }
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          paymentId: (payment as any)._id?.toString() || 'unknown',
          error: error.message || 'Unknown error'
        });
        console.error(`[Payment Sync] ✗ Error syncing payment ${(payment as any)._id}:`, error);
      }
    }

    console.log(`[Payment Sync] Complete - Processed: ${result.processed}, Updated: ${result.updated}, Failed: ${result.failed}`);

    return NextResponse.json({
      success: true,
      message: `Synced ${result.updated} payment statuses to ClientPurchase records`,
      result
    });

  } catch (error: any) {
    console.error('Payment sync error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Server error',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
