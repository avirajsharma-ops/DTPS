import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import dbConnect from '@/lib/db/connect';
import { ServicePlan, ClientPurchase } from '@/lib/db/models/ServicePlan';
import Payment from '@/lib/db/models/Payment';

// GET - Fetch service plans visible to clients (for user dashboard)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Check if client has any purchases in ClientPurchase collection (active, pending, or any status)
        const allPurchases = await ClientPurchase.find({
            client: session.user.id,
            status: { $in: ['active', 'pending'] }
        }).populate('dietitian', 'firstName lastName email phone avatar');

        // Also check Payment collection for any completed payments
        const completedPayments = await Payment.find({
            client: session.user.id,
            status: { $in: ['completed', 'captured', 'paid'] }
        });

        // Check for active purchases specifically
        const activePurchases = allPurchases.filter(p => p.status === 'active');
        const hasActivePlan = activePurchases.length > 0;

        // Check if there are any purchases OR payments at all (to hide swiper)
        const hasAnyPurchase = allPurchases.length > 0 || completedPayments.length > 0;

        // Check for pending purchases (purchased but no dietitian assigned yet)
        const hasPendingDietitianAssignment = allPurchases.some(p => !p.dietitian);

        // Fetch service plans that are active and visible to clients
        const plans = await ServicePlan.find({
            isActive: true,
            showToClients: true
        }).sort({ createdAt: -1 });

        return NextResponse.json({
            success: true,
            plans,
            hasActivePlan,
            hasAnyPurchase,
            hasPendingDietitianAssignment,
            activePurchases: allPurchases.map(p => {
                const dietitian = p.dietitian as any;
                return {
                    _id: p._id,
                    planName: p.planName,
                    planCategory: p.planCategory,
                    durationDays: p.durationDays,
                    durationLabel: p.durationLabel,
                    startDate: p.startDate,
                    endDate: p.endDate,
                    status: p.status,
                    hasDietitian: !!dietitian,
                    mealPlanCreated: p.mealPlanCreated || false,
                    dietitian: dietitian ? {
                        id: dietitian._id,
                        name: `${dietitian.firstName || ''} ${dietitian.lastName || ''}`.trim(),
                        email: dietitian.email,
                        phone: dietitian.phone,
                        avatar: dietitian.avatar
                    } : null
                };
            })
        });
    } catch (error) {
        console.error('Error fetching service plans for client:', error);
        return NextResponse.json({ error: 'Failed to fetch service plans' }, { status: 500 });
    }
}
