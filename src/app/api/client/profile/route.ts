import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/connection";
import User from "@/lib/db/models/User";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById(session.user.id)
      .select(
        "name firstName lastName email phone dateOfBirth gender address city state pincode profileImage avatar createdAt heightCm weightKg targetWeightKg activityLevel generalGoal dietType alternativeEmail alternativePhone anniversary source referralSource assignedDietitian bmi bmiCategory height weight"
      )
      .populate('assignedDietitian', 'firstName lastName email phone');

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate BMI if not stored but weight and height available
    let bmi = user.bmi;
    let bmiCategory = user.bmiCategory;
    
    if (!bmi && user.weightKg && user.heightCm) {
      const weightKg = parseFloat(user.weightKg);
      const heightCm = parseFloat(user.heightCm);
      if (weightKg > 0 && heightCm > 0) {
        const heightM = heightCm / 100;
        const bmiValue = weightKg / (heightM * heightM);
        bmi = bmiValue.toFixed(1);
        
        if (bmiValue < 18.5) {
          bmiCategory = 'Underweight';
        } else if (bmiValue < 25) {
          bmiCategory = 'Normal';
        } else if (bmiValue < 30) {
          bmiCategory = 'Overweight';
        } else {
          bmiCategory = 'Obese';
        }
      }
    }

    return NextResponse.json({ 
      ...user.toObject(),
      bmi,
      bmiCategory
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const data = await request.json();

    // Only allow certain fields to be updated
    const allowedFields = [
      "name", "firstName", "lastName", "phone", "dateOfBirth", "gender",
      "address", "city", "state", "pincode", "profileImage", "avatar",
      "heightCm", "weightKg", "targetWeightKg", "activityLevel", "generalGoal", "dietType",
      "alternativeEmail", "alternativePhone", "anniversary", "source", "referralSource"
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    const user = await User.findByIdAndUpdate(
      session.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select("name firstName lastName email phone dateOfBirth gender address city state pincode profileImage avatar createdAt heightCm weightKg targetWeightKg activityLevel generalGoal dietType alternativeEmail alternativePhone anniversary source referralSource");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    // Return more detailed error for validation failures
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
