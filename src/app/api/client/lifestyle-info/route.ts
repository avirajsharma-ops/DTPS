import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/connection";
import LifestyleInfo from "@/lib/db/models/LifestyleInfo";
import { withCache, clearCacheByTag } from '@/lib/api/utils';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const lifestyleInfo = await withCache(
      `client:lifestyle-info:${JSON.stringify({ userId: session.user.id })}`,
      async () => await LifestyleInfo.findOne({ userId: session.user.id }).lean(),
      { ttl: 120000, tags: ['client'] }
    );
    
    if (!lifestyleInfo) {
      return NextResponse.json({
        heightFeet: "",
        heightInch: "",
        heightCm: "",
        weightKg: "",
        targetWeightKg: "",
        idealWeightKg: "",
        bmi: "",
        foodPreference: "",
        preferredCuisine: [],
        allergiesFood: [],
        fastDays: [],
        nonVegExemptDays: [],
        foodLikes: "",
        foodDislikes: "",
        eatOutFrequency: "",
        smokingFrequency: "",
        alcoholFrequency: "",
        activityRate: "",
        activityLevel: "",
        cookingOil: [],
        monthlyOilConsumption: "",
        cookingSalt: "",
        carbonatedBeverageFrequency: "",
        cravingType: ""
      });
    }

    return NextResponse.json(lifestyleInfo);
  } catch (error) {
    console.error("Error fetching lifestyle info:", error);
    return NextResponse.json({ error: "Failed to fetch lifestyle info" }, { status: 500 });
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

    // Calculate BMI if height and weight are provided
    let bmi = data.bmi;
    if (data.heightCm && data.weightKg) {
      const heightM = parseFloat(data.heightCm) / 100;
      const weight = parseFloat(data.weightKg);
      if (heightM > 0 && weight > 0) {
        bmi = (weight / (heightM * heightM)).toFixed(1);
      }
    }

    const lifestyleInfo = await LifestyleInfo.findOneAndUpdate(
      { userId: session.user.id },
      { 
        ...data,
        bmi,
        userId: session.user.id 
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true
      }
    );

    return NextResponse.json({ success: true, data: lifestyleInfo });
  } catch (error) {
    console.error("Error saving lifestyle info:", error);
    return NextResponse.json({ error: "Failed to save lifestyle info" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
