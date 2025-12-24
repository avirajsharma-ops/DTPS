import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/connection";
import JournalTracking from "@/lib/db/models/JournalTracking";
import User from "@/lib/db/models/User";
import ClientMealPlan from "@/lib/db/models/ClientMealPlan";

// Helper to check if client has active meal plan for a given date
async function hasActiveMealPlan(clientId: string, targetDate: Date): Promise<boolean> {
    const planStartOfDay = new Date(targetDate);
    planStartOfDay.setHours(0, 0, 0, 0);
    const planEndOfDay = new Date(targetDate);
    planEndOfDay.setHours(23, 59, 59, 999);
    
    const activePlan = await ClientMealPlan.findOne({
        clientId: clientId,
        status: 'active',
        startDate: { $lte: planEndOfDay },
        endDate: { $gte: planStartOfDay }
    });
    
    return !!activePlan;
}

// GET - Get assigned sleep status for a client
export async function GET(
    request: Request,
    { params }: { params: Promise<{ clientId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { clientId } = await params;
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('date');

        await dbConnect();

        // Verify the user is a dietitian/admin
        const currentUser = await User.findById(session.user.id);
        if (!currentUser || !['admin', 'dietitian'].includes(currentUser.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Verify the client exists
        const client = await User.findById(clientId);
        if (!client) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        // Get date range
        const targetDate = dateParam ? new Date(dateParam) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Find journal for the date
        const journal = await JournalTracking.findOne({
            client: clientId,
            date: { $gte: targetDate, $lt: nextDay }
        });

        // Calculate current sleep
        const currentSleepMinutes = journal?.sleep?.reduce((sum: number, entry: any) =>
            sum + (entry.hours * 60) + (entry.minutes || 0), 0) || 0;

        return NextResponse.json({
            assignedSleep: journal?.assignedSleep?.targetHours ? {
                targetHours: journal.assignedSleep.targetHours,
                targetMinutes: journal.assignedSleep.targetMinutes || 0,
                assignedAt: journal.assignedSleep.assignedAt,
                isCompleted: journal.assignedSleep.isCompleted || false,
                completedAt: journal.assignedSleep.completedAt
            } : null,
            currentSleepMinutes,
            currentSleepHours: Math.floor(currentSleepMinutes / 60),
            currentSleepMins: currentSleepMinutes % 60,
            clientName: client.name,
            date: targetDate.toISOString(),
            lastUpdated: journal?.updatedAt || null
        });
    } catch (error) {
        console.error("Error fetching assigned sleep:", error);
        return NextResponse.json({ error: "Failed to fetch assigned sleep" }, { status: 500 });
    }
}

// POST - Assign sleep goal to a client
export async function POST(
    request: Request,
    { params }: { params: Promise<{ clientId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { clientId } = await params;

        await dbConnect();
        const data = await request.json();

        // Verify the user is a dietitian/admin
        const currentUser = await User.findById(session.user.id);
        if (!currentUser || !['admin', 'dietitian'].includes(currentUser.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Verify the client exists
        const client = await User.findById(clientId);
        if (!client) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        const { targetHours, targetMinutes = 0, date: dateParam } = data;

        if (!targetHours || targetHours <= 0) {
            return NextResponse.json({ error: "Invalid sleep target" }, { status: 400 });
        }

        // Get date range
        const targetDate = dateParam ? new Date(dateParam) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Check if client has active meal plan for this date
        const hasPlan = await hasActiveMealPlan(clientId, targetDate);
        if (!hasPlan) {
            return NextResponse.json({ 
                error: "Cannot assign tasks - Client does not have an active meal plan for this date",
                noActivePlan: true 
            }, { status: 400 });
        }

        // Find or create journal entry
        let journal = await JournalTracking.findOne({
            client: clientId,
            date: { $gte: targetDate, $lt: nextDay }
        });

        if (!journal) {
            journal = new JournalTracking({
                client: clientId,
                date: targetDate,
                water: [],
                activities: [],
                steps: [],
                sleep: [],
                meals: [],
                progress: [],
                bca: [],
                measurements: [],
                assignedSleep: {
                    targetHours: targetHours,
                    targetMinutes: targetMinutes,
                    assignedBy: session.user.id,
                    assignedAt: new Date(),
                    isCompleted: false
                }
            });
        } else {
            journal.assignedSleep = {
                targetHours: targetHours,
                targetMinutes: targetMinutes,
                assignedBy: session.user.id,
                assignedAt: new Date(),
                isCompleted: false,
                completedAt: undefined
            };
            journal.markModified('assignedSleep');
        }

        await journal.save();
        console.log('Sleep assigned successfully:', journal.assignedSleep);

        return NextResponse.json({
            success: true,
            assignedSleep: {
                targetHours: targetHours,
                targetMinutes: targetMinutes,
                assignedAt: journal.assignedSleep?.assignedAt,
                isCompleted: false
            },
            message: `Successfully assigned ${targetHours}h ${targetMinutes}m sleep to ${client.name}`
        });
    } catch (error) {
        console.error("Error assigning sleep:", error);
        return NextResponse.json({ error: "Failed to assign sleep" }, { status: 500 });
    }
}

// DELETE - Remove assigned sleep
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ clientId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { clientId } = await params;
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('date');

        await dbConnect();

        // Verify the user is a dietitian/admin
        const currentUser = await User.findById(session.user.id);
        if (!currentUser || !['admin', 'dietitian'].includes(currentUser.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Get date range
        const targetDate = dateParam ? new Date(dateParam) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        await JournalTracking.findOneAndUpdate(
            {
                client: clientId,
                date: { $gte: targetDate, $lt: nextDay }
            },
            {
                $unset: { assignedSleep: 1 }
            },
            { new: true }
        );

        return NextResponse.json({
            success: true,
            message: "Assigned sleep removed successfully"
        });
    } catch (error) {
        console.error("Error removing assigned sleep:", error);
        return NextResponse.json({ error: "Failed to remove assigned sleep" }, { status: 500 });
    }
}
