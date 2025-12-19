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

    const user = await User.findById(session.user.id).select(
      "name firstName lastName email phone dateOfBirth gender address city state pincode profileImage avatar createdAt heightCm weightKg targetWeightKg activityLevel generalGoal dietType alternativeEmail alternativePhone anniversary source referralSource"
    );
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
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
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
