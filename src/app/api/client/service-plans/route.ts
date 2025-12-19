import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import dbConnect from '@/lib/db/connect';
import { ServicePlan, ClientPurchase } from '@/lib/db/models/ServicePlan';

// GET - Fetch service plans visible to clients (for user dashboard)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Check if client has any active purchases
        const activePurchases = await ClientPurchase.find({
            client: session.user.id,
            status: 'active'
        });

        const hasActivePlan = activePurchases.length > 0;

        // Fetch service plans that are active and visible to clients
        const plans = await ServicePlan.find({
            isActive: true,
            showToClients: true
        }).sort({ createdAt: -1 });

        return NextResponse.json({
            success: true,
            plans,
            hasActivePlan,
            activePurchases: activePurchases.map(p => ({
                _id: p._id,
                planName: p.planName,
                planCategory: p.planCategory,
                durationDays: p.durationDays,
                durationLabel: p.durationLabel,
                startDate: p.startDate,
                endDate: p.endDate,
                status: p.status
            }))
        });
    } catch (error) {
        console.error('Error fetching service plans for client:', error);
        return NextResponse.json({ error: 'Failed to fetch service plans' }, { status: 500 });
    }
}
