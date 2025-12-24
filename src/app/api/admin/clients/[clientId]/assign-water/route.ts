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

// GET - Get assigned water status for a client
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

    // Verify the client exists and is assigned to this dietitian
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

    // Calculate total water intake
    const totalWaterIntake = journal?.water?.reduce((sum: number, entry: any) => {
      const unitToMl: Record<string, number> = {
        'Glass (250ml)': 250,
        'Bottle (500ml)': 500,
        'Bottle (1L)': 1000,
        'Cup (200ml)': 200,
        'glasses': 250,
        'ml': 1
      };
      return sum + (entry.amount * (unitToMl[entry.unit] || 1));
    }, 0) || 0;

    return NextResponse.json({
      assignedWater: journal?.assignedWater ? {
        amount: journal.assignedWater.amount || 0,
        assignedAt: journal.assignedWater.assignedAt,
        isCompleted: journal.assignedWater.isCompleted || false,
        completedAt: journal.assignedWater.completedAt
      } : null,
      totalWaterIntake,
      clientName: client.name,
      date: targetDate.toISOString(),
      lastUpdated: journal?.updatedAt || null
    });
  } catch (error) {
    console.error("Error fetching assigned water:", error);
    return NextResponse.json({ error: "Failed to fetch assigned water" }, { status: 500 });
  }
}

// POST - Assign water intake goal to a client
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

    const { amount, date: dateParam } = data;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid water amount" }, { status: 400 });
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
        assignedWater: {
          amount: amount,
          assignedBy: session.user.id,
          assignedAt: new Date(),
          isCompleted: false
        }
      });
    } else {
      // Update existing journal with assigned water
      journal.assignedWater = {
        amount: amount,
        assignedBy: session.user.id,
        assignedAt: new Date(),
        isCompleted: false,
        completedAt: undefined
      };
    }

    await journal.save();

    return NextResponse.json({
      success: true,
      assignedWater: {
        amount: amount,
        assignedAt: journal.assignedWater?.assignedAt,
        isCompleted: false
      },
      message: `Successfully assigned ${amount}ml water intake to ${client.name}`
    });
  } catch (error) {
    console.error("Error assigning water:", error);
    return NextResponse.json({ error: "Failed to assign water" }, { status: 500 });
  }
}

// DELETE - Remove assigned water
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

    // Find journal and remove assigned water
    const result = await JournalTracking.findOneAndUpdate(
      {
        client: clientId,
        date: { $gte: targetDate, $lt: nextDay }
      },
      {
        $unset: { assignedWater: 1 }
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Assigned water removed successfully"
    });
  } catch (error) {
    console.error("Error removing assigned water:", error);
    return NextResponse.json({ error: "Failed to remove assigned water" }, { status: 500 });
  }
}
