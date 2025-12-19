import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/connection";
import JournalTracking from "@/lib/db/models/JournalTracking";
import User from "@/lib/db/models/User";

// GET - Get assigned steps status for a client
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

        // Calculate current steps
        const currentSteps = journal?.steps?.reduce((sum: number, entry: any) => sum + entry.steps, 0) || 0;

        return NextResponse.json({
            assignedSteps: journal?.assignedSteps?.target ? {
                target: journal.assignedSteps.target,
                assignedAt: journal.assignedSteps.assignedAt,
                isCompleted: journal.assignedSteps.isCompleted || false,
                completedAt: journal.assignedSteps.completedAt
            } : null,
            currentSteps,
            clientName: client.name,
            date: targetDate.toISOString(),
            lastUpdated: journal?.updatedAt || null
        });
    } catch (error) {
        console.error("Error fetching assigned steps:", error);
        return NextResponse.json({ error: "Failed to fetch assigned steps" }, { status: 500 });
    }
}

// POST - Assign steps goal to a client
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

        const { target, date: dateParam } = data;

        if (!target || target <= 0) {
            return NextResponse.json({ error: "Invalid steps target" }, { status: 400 });
        }

        // Get date range
        const targetDate = dateParam ? new Date(dateParam) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

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
                assignedSteps: {
                    target: target,
                    assignedBy: session.user.id,
                    assignedAt: new Date(),
                    isCompleted: false
                }
            });
        } else {
            journal.assignedSteps = {
                target: target,
                assignedBy: session.user.id,
                assignedAt: new Date(),
                isCompleted: false,
                completedAt: undefined
            };
            journal.markModified('assignedSteps');
        }

        await journal.save();
        console.log('Steps assigned successfully:', journal.assignedSteps);

        return NextResponse.json({
            success: true,
            assignedSteps: {
                target: target,
                assignedAt: journal.assignedSteps?.assignedAt,
                isCompleted: false
            },
            message: `Successfully assigned ${target} steps to ${client.name}`
        });
    } catch (error) {
        console.error("Error assigning steps:", error);
        return NextResponse.json({ error: "Failed to assign steps" }, { status: 500 });
    }
}

// DELETE - Remove assigned steps
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
                $unset: { assignedSteps: 1 }
            },
            { new: true }
        );

        return NextResponse.json({
            success: true,
            message: "Assigned steps removed successfully"
        });
    } catch (error) {
        console.error("Error removing assigned steps:", error);
        return NextResponse.json({ error: "Failed to remove assigned steps" }, { status: 500 });
    }
}
