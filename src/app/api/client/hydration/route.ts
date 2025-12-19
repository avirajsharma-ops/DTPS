import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/connection";
import JournalTracking from "@/lib/db/models/JournalTracking";
import User from "@/lib/db/models/User";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get date from query params
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    // Get date range
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get or create today's journal
    let journal = await JournalTracking.findOne({
      client: session.user.id,
      date: { $gte: targetDate, $lt: nextDay }
    });

    // Get user's water goal from their profile
    const user = await User.findById(session.user.id).select('goals');
    const waterGoal = user?.goals?.water || 2500; // Default 2500ml

    // Calculate total water intake
    const totalToday = journal?.water?.reduce((sum: number, entry: any) => {
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

    // Format entries for response
    const entries = (journal?.water || []).map((entry: any) => ({
      _id: entry._id.toString(),
      amount: entry.amount * (entry.unit === 'ml' ? 1 : 
               entry.unit === 'Glass (250ml)' ? 250 :
               entry.unit === 'Bottle (500ml)' ? 500 :
               entry.unit === 'Bottle (1L)' ? 1000 :
               entry.unit === 'Cup (200ml)' ? 200 : 250),
      unit: 'ml',
      type: entry.type || 'water',
      time: entry.time,
      createdAt: entry.createdAt
    })).sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      totalToday,
      goal: waterGoal,
      entries,
      date: targetDate.toISOString(),
      assignedWater: journal?.assignedWater ? {
        amount: journal.assignedWater.amount || 0,
        assignedAt: journal.assignedWater.assignedAt,
        isCompleted: journal.assignedWater.isCompleted || false,
        completedAt: journal.assignedWater.completedAt
      } : null
    });
  } catch (error) {
    console.error("Error fetching hydration data:", error);
    return NextResponse.json({ error: "Failed to fetch hydration data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const data = await request.json();

    const { amount, unit = 'ml', type = 'water', time } = data;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find or create today's journal entry
    let journal = await JournalTracking.findOne({
      client: session.user.id,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!journal) {
      journal = new JournalTracking({
        client: session.user.id,
        date: today,
        water: [],
        activities: [],
        steps: [],
        sleep: [],
        meals: [],
        progress: [],
        bca: [],
        measurements: []
      });
    }

    // Add water entry
    const waterEntry = {
      amount: amount,
      unit: unit,
      type: type,
      time: time || new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      createdAt: new Date()
    };

    journal.water.push(waterEntry);
    await journal.save();

    return NextResponse.json({ 
      success: true, 
      entry: {
        _id: journal.water[journal.water.length - 1]._id,
        ...waterEntry,
        amount: amount
      }
    });
  } catch (error) {
    console.error("Error adding water:", error);
    return NextResponse.json({ error: "Failed to add water" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('id');

    if (!entryId) {
      return NextResponse.json({ error: "Entry ID required" }, { status: 400 });
    }

    await dbConnect();

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's journal and remove the water entry
    const result = await JournalTracking.updateOne(
      {
        client: session.user.id,
        date: { $gte: today, $lt: tomorrow }
      },
      {
        $pull: { water: { _id: entryId } }
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting water entry:", error);
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
  }
}

// Mark assigned water as completed
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const data = await request.json();
    const { action } = data;

    if (action !== 'complete') {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's journal and update assigned water
    const result = await JournalTracking.findOneAndUpdate(
      {
        client: session.user.id,
        date: { $gte: today, $lt: tomorrow },
        'assignedWater.amount': { $gt: 0 }
      },
      {
        $set: { 
          'assignedWater.isCompleted': true,
          'assignedWater.completedAt': new Date()
        }
      },
      { new: true }
    );

    if (!result) {
      return NextResponse.json({ error: "No assigned water found for today" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      assignedWater: {
        amount: result.assignedWater?.amount || 0,
        isCompleted: result.assignedWater?.isCompleted || true,
        completedAt: result.assignedWater?.completedAt
      }
    });
  } catch (error) {
    console.error("Error completing assigned water:", error);
    return NextResponse.json({ error: "Failed to complete assigned water" }, { status: 500 });
  }
}
