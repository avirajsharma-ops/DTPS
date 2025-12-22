import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import LifestyleInfo from '@/lib/db/models/LifestyleInfo';
import MedicalInfo from '@/lib/db/models/MedicalInfo';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only clients can complete onboarding
    if (session.user.role !== 'client') {
      return NextResponse.json({ error: 'Only clients can complete onboarding' }, { status: 403 });
    }

    await connectDB();

    const data = await request.json();
    const userId = session.user.id;

    // Calculate BMI from height and weight
    let bmi = '';
    let bmiCategory = '';
    const weightKg = parseFloat(data.weightKg);
    const heightCm = parseFloat(data.heightCm);
    
    if (weightKg > 0 && heightCm > 0) {
      const heightM = heightCm / 100;
      const bmiValue = weightKg / (heightM * heightM);
      bmi = bmiValue.toFixed(1);
      
      // Determine BMI category
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

    // Update user profile with onboarding data
    const updateData: any = {
      gender: data.gender,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      weight: weightKg || undefined,
      height: heightCm || undefined,
      bmi: bmi,
      bmiCategory: bmiCategory,
      activityLevel: data.activityLevel,
      generalGoal: data.generalGoal, // weight-loss, weight-gain, disease-management, weight-loss-disease-management
      dietType: data.dietType, // Vegetarian, Vegan, Gluten-Free, Non-Vegetarian, etc.
      allergies: data.allergies || [],
      specificExclusions: data.specificExclusions || {},
      dailyGoals: {
        calories: data.dailyGoals?.calories || 2000,
        steps: data.dailyGoals?.steps || 8000,
        water: data.dailyGoals?.water || 2500,
        targetWeight: data.targetWeightKg || undefined,
      },
      goals: {
        calories: data.dailyGoals?.calories || 2000,
        protein: Math.round((data.dailyGoals?.calories || 2000) * 0.3 / 4),
        carbs: Math.round((data.dailyGoals?.calories || 2000) * 0.4 / 4),
        fat: Math.round((data.dailyGoals?.calories || 2000) * 0.3 / 9),
        water: Math.round((data.dailyGoals?.water || 2500) / 250), // Convert ml to glasses
        steps: data.dailyGoals?.steps || 8000,
      },
      onboardingCompleted: true,
      onboardingStep: 5,
    };

    // Update user document
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create or update lifestyle info
    await LifestyleInfo.findOneAndUpdate(
      { userId },
      {
        $set: {
          userId,
          heightCm: data.heightCm,
          weightKg: data.weightKg,
          targetWeightKg: data.targetWeightKg,
          activityLevel: data.activityLevel,
          foodPreference: data.dietType === 'vegetarian' ? 'veg' : 
                         data.dietType === 'vegan' ? 'vegan' : 
                         data.dietType === 'standard' ? 'non-veg' : 'non-veg',
          allergiesFood: data.allergies || [],
        }
      },
      { upsert: true, new: true }
    );

    // Create or update medical info with allergies
    if (data.allergies && data.allergies.length > 0) {
      await MedicalInfo.findOneAndUpdate(
        { userId },
        {
          $set: {
            userId,
            allergies: data.allergies,
          }
        },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
      }
    });

  } catch (error) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id).select('onboardingCompleted onboardingStep');

    return NextResponse.json({
      onboardingCompleted: user?.onboardingCompleted || false,
      onboardingStep: user?.onboardingStep || 0,
    });

  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return NextResponse.json(
      { error: 'Failed to check onboarding status' },
      { status: 500 }
    );
  }
}
