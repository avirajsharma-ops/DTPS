import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/connection";
import MedicalInfo from "@/lib/db/models/MedicalInfo";
import User from "@/lib/db/models/User";
import { withCache, clearCacheByTag } from '@/lib/api/utils';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get user's gender
    const user = await withCache(
      `client:medical-info:${JSON.stringify(session.user.id)}`,
      async () => await User.findById(session.user.id).select('gender'),
      { ttl: 120000, tags: ['client'] }
    );
    const gender = user?.gender || '';

    const medicalInfo = await withCache(
      `client:medical-info:${JSON.stringify({ userId: session.user.id })}`,
      async () => await MedicalInfo.findOne({ userId: session.user.id }),
      { ttl: 120000, tags: ['client'] }
    );
    
    if (!medicalInfo) {
      return NextResponse.json({
        gender: gender,
        medicalConditions: [],
        allergies: [],
        dietaryRestrictions: [],
        bloodGroup: "",
        gutIssues: [],
        isPregnant: false,
        isLactating: false,
        menstrualCycle: "",
        bloodFlow: "",
        diseaseHistory: [],
        reports: [],
        medicalHistory: "",
        familyHistory: "",
        medication: "",
        notes: ""
      });
    }

    return NextResponse.json({
      ...medicalInfo.toObject(),
      gender: gender
    });
  } catch (error) {
    console.error("Error fetching medical info:", error);
    return NextResponse.json({ error: "Failed to fetch medical info" }, { status: 500 });
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

    const medicalInfo = await MedicalInfo.findOneAndUpdate(
      { userId: session.user.id },
      { 
        ...data,
        userId: session.user.id 
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true
      }
    );

    return NextResponse.json({ success: true, data: medicalInfo });
  } catch (error: any) {
    console.error("Error saving medical info:", error);
    // Return more detailed error for validation failures
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save medical info" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
