import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/connection";
import MedicalInfo from "@/lib/db/models/MedicalInfo";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const medicalInfo = await MedicalInfo.findOne({ userId: session.user.id });
    
    if (!medicalInfo) {
      return NextResponse.json({
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

    return NextResponse.json(medicalInfo);
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
  } catch (error) {
    console.error("Error saving medical info:", error);
    return NextResponse.json({ error: "Failed to save medical info" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
