import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/connection";
import User from "@/lib/db/models/User";
import ProgressEntry from "@/lib/db/models/ProgressEntry";
import FoodLog from "@/lib/db/models/FoodLog";

// Helper to get date range based on filter
function getStartDate(range: string): Date {
  const now = new Date();
  switch (range) {
    case '1W': return new Date(now.setDate(now.getDate() - 7));
    case '1M': return new Date(now.setMonth(now.getMonth() - 1));
    case '3M': return new Date(now.setMonth(now.getMonth() - 3));
    case '6M': return new Date(now.setMonth(now.getMonth() - 6));
    case '1Y': return new Date(now.setFullYear(now.getFullYear() - 1));
    default: return new Date(now.setDate(now.getDate() - 7));
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get range from query params
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '1W';
    const startDate = getStartDate(range);

    // Get user data for current and target weight
    const user = await User.findById(session.user.id).select(
      "weightKg targetWeightKg heightCm goals"
    );

    // Get all progress entries (for overall stats) - last year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const allProgressEntries = await ProgressEntry.find({
      user: session.user.id,
      recordedAt: { $gte: oneYearAgo }
    }).sort({ recordedAt: -1 });

    // Get weight entries
    const weightEntries = allProgressEntries
      .filter(entry => entry.type === 'weight' && entry.value)
      .map(entry => ({
        date: entry.recordedAt,
        weight: Number(entry.value)
      }));

    // Get latest weight entry
    const latestWeight = weightEntries[0]?.weight || parseFloat(user?.weightKg) || 0;
    const startWeight = weightEntries[weightEntries.length - 1]?.weight || parseFloat(user?.weightKg) || latestWeight;
    const targetWeight = parseFloat(user?.targetWeightKg) || parseFloat(user?.goals?.targetWeight) || 0;

    // Calculate week's change
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekAgoEntry = weightEntries.find(entry => 
      new Date(entry.date) <= oneWeekAgo
    );
    const weightChange = weekAgoEntry ? latestWeight - weekAgoEntry.weight : 0;

    // Calculate BMI - ensure proper calculation with validation
    const heightCm = parseFloat(user?.heightCm);
    const heightM = heightCm && !isNaN(heightCm) && heightCm > 0 ? heightCm / 100 : 0;
    const bmi = latestWeight > 0 && heightM > 0 
      ? Math.round((latestWeight / (heightM * heightM)) * 10) / 10 
      : 0;
    
    // Validate BMI is in reasonable range (10-60)
    const validBmi = bmi > 10 && bmi < 60 ? bmi : 0;

    // Get latest measurements - each type is stored separately
    const measurementTypes = ['waist', 'hips', 'chest', 'arms', 'thighs'];
    const measurements: Record<string, number> = {};
    
    for (const type of measurementTypes) {
      const latestEntry = allProgressEntries.find(entry => entry.type === type);
      measurements[type] = latestEntry ? Number(latestEntry.value) : 0;
    }

    // Get today's measurements specifically
    const todayStr = new Date().toISOString().split('T')[0];
    const todayMeasurements: Record<string, number> = {};
    
    for (const type of measurementTypes) {
      const todayEntry = allProgressEntries.find(entry => {
        const entryDate = new Date(entry.recordedAt).toISOString().split('T')[0];
        return entry.type === type && entryDate === todayStr;
      });
      todayMeasurements[type] = todayEntry ? Number(todayEntry.value) : 0;
    }

    // Build measurement history - group by date
    const measurementHistoryMap = new Map<string, any>();
    
    for (const entry of allProgressEntries) {
      if (measurementTypes.includes(entry.type)) {
        const dateKey = new Date(entry.recordedAt).toISOString().split('T')[0];
        
        if (!measurementHistoryMap.has(dateKey)) {
          measurementHistoryMap.set(dateKey, { date: entry.recordedAt });
        }
        
        const existing = measurementHistoryMap.get(dateKey);
        existing[entry.type] = Number(entry.value);
      }
    }
    
    const measurementHistory = Array.from(measurementHistoryMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Get last measurement date for 7-day restriction check
    const lastMeasurementEntry = allProgressEntries.find(entry => 
      measurementTypes.includes(entry.type)
    );
    const lastMeasurementDate = lastMeasurementEntry?.recordedAt?.toISOString() || null;

    // Check if user can add new measurement (7 days restriction)
    const canAddMeasurement = !lastMeasurementEntry || 
      (new Date().getTime() - new Date(lastMeasurementEntry.recordedAt).getTime()) >= 7 * 24 * 60 * 60 * 1000;

    // Calculate days until next measurement
    const daysUntilNextMeasurement = lastMeasurementEntry 
      ? Math.max(0, 7 - Math.floor((new Date().getTime() - new Date(lastMeasurementEntry.recordedAt).getTime()) / (24 * 60 * 60 * 1000)))
      : 0;

    // Calculate progress percentage
    const totalToLose = startWeight - targetWeight;
    const lost = startWeight - latestWeight;
    const progressPercent = totalToLose > 0 ? Math.round((lost / totalToLose) * 100) : 0;

    // Get today's food intake
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayFoodLog = await FoodLog.findOne({
      client: session.user.id,
      date: { $gte: today, $lt: tomorrow }
    });

    const todayIntake = todayFoodLog?.totalNutrition ? {
      calories: todayFoodLog.totalNutrition.calories || 0,
      protein: todayFoodLog.totalNutrition.protein || 0,
      carbs: todayFoodLog.totalNutrition.carbs || 0,
      fat: todayFoodLog.totalNutrition.fat || 0
    } : { calories: 0, protein: 0, carbs: 0, fat: 0 };

    // Get calorie history from food logs
    const foodLogs = await FoodLog.find({
      client: session.user.id,
      date: { $gte: oneYearAgo }
    }).select('date totalNutrition').sort({ date: -1 });

    const calorieHistory = foodLogs.map(log => ({
      date: log.date,
      calories: log.totalNutrition?.calories || 0
    })).reverse();

    // Get transformation photos
    const transformationPhotos = allProgressEntries
      .filter(entry => entry.type === 'photo')
      .map(entry => ({
        _id: entry._id,
        url: entry.value as string,
        date: entry.recordedAt,
        notes: entry.notes || ''
      }));

    return NextResponse.json({
      currentWeight: latestWeight,
      startWeight: startWeight,
      targetWeight: targetWeight || 0,
      weightChange: Math.round(weightChange * 10) / 10,
      bmi: validBmi,
      progressPercent: Math.max(0, Math.min(100, progressPercent)),
      weightHistory: weightEntries.slice(0, 365).reverse(),
      measurements: measurements,
      todayMeasurements: todayMeasurements,
      measurementHistory: measurementHistory,
      lastMeasurementDate: lastMeasurementDate,
      canAddMeasurement: canAddMeasurement,
      daysUntilNextMeasurement: daysUntilNextMeasurement,
      goals: user?.goals || {},
      todayIntake: todayIntake,
      calorieHistory: calorieHistory,
      transformationPhotos: transformationPhotos
    });
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
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

    const { type, value, measurements, notes, photoUrl } = data;

    // Handle transformation photo
    if (type === 'photo' && photoUrl) {
      const progressEntry = new ProgressEntry({
        user: session.user.id,
        type: 'photo',
        value: photoUrl,
        unit: '',
        notes: notes || '',
        recordedAt: new Date()
      });
      await progressEntry.save();
      return NextResponse.json({ success: true, entry: progressEntry });
    }

    // Handle saving body measurements (multiple entries)
    if (type === 'measurements' && measurements) {
      const measurementTypes = ['waist', 'hips', 'chest', 'arms', 'thighs'];
      const savedEntries = [];

      for (const measureType of measurementTypes) {
        if (measurements[measureType] && measurements[measureType] > 0) {
          const progressEntry = new ProgressEntry({
            user: session.user.id,
            type: measureType,
            value: measurements[measureType],
            unit: 'cm',
            notes: notes,
            recordedAt: new Date()
          });
          await progressEntry.save();
          savedEntries.push(progressEntry);
        }
      }

      return NextResponse.json({ success: true, entries: savedEntries });
    }

    // Handle single entry (weight, etc.)
    const progressEntry = new ProgressEntry({
      user: session.user.id,
      type: type || 'weight',
      value: value,
      unit: type === 'weight' ? 'kg' : 'cm',
      notes: notes,
      recordedAt: new Date()
    });

    await progressEntry.save();

    // Also update user's current weight if it's a weight entry
    if (type === 'weight' && value) {
      await User.findByIdAndUpdate(session.user.id, {
        weightKg: value.toString()
      });
    }

    return NextResponse.json({ success: true, entry: progressEntry });
  } catch (error) {
    console.error("Error saving progress:", error);
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('id');
    
    if (!entryId) {
      return NextResponse.json({ error: "Entry ID is required" }, { status: 400 });
    }

    // Find and delete the entry, ensuring it belongs to the current user
    const deletedEntry = await ProgressEntry.findOneAndDelete({
      _id: entryId,
      user: session.user.id
    });

    if (!deletedEntry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting progress entry:", error);
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
  }
}
