import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import ClientMealPlan from '@/lib/db/models/ClientMealPlan';
import { UserRole } from '@/types';
import { parseISO, startOfDay, isToday } from 'date-fns';
import { getImageKit } from '@/lib/imagekit';
import { compressImageServer } from '@/lib/imageCompressionServer';
import { MEAL_TYPE_KEYS } from '@/lib/mealConfig';

// POST /api/client/meal-plan/complete - Mark a meal as completed with image
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.CLIENT) {
      return NextResponse.json({ error: 'Only clients can complete meals' }, { status: 403 });
    }

    await connectDB();

    // Handle both FormData and JSON requests
    const contentType = request.headers.get('content-type') || '';
    let mealId: string = '';
    let date: string = '';
    let mealType: string = '';
    let notes: string = '';
    let imageFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      // FormData request (with image)
      const formData = await request.formData();
      mealId = formData.get('mealId') as string || '';
      date = formData.get('date') as string || '';
      mealType = formData.get('mealType') as string || '';
      notes = formData.get('notes') as string || '';
      imageFile = formData.get('image') as File | null;
    } else {
      // JSON request (without image - for backwards compatibility)
      const body = await request.json();
      mealId = body.mealId || '';
      date = body.date || '';
      mealType = body.mealType || '';
      notes = body.notes || '';
    }

    // Parse the meal ID to extract plan ID and meal info
    // Format: planId-dayIndex-mealIndex
    const [planId] = mealId.split('-');
    const requestedDate = date ? parseISO(date) : new Date();

    // *** IMPORTANT: Only allow completion for today's date ***
    if (!isToday(requestedDate)) {
      return NextResponse.json({ 
        error: 'You can only mark meals as complete for today\'s plan. Past and future meals cannot be modified.' 
      }, { status: 400 });
    }

    // Find the active meal plan
    const mealPlan = await ClientMealPlan.findOne({
      _id: planId,
      clientId: session.user.id,
      status: 'active'
    });

    if (!mealPlan) {
      return NextResponse.json({ 
        error: 'Meal plan not found or not active' 
      }, { status: 404 });
    }

    // Determine meal type from mealId if not provided
    const mealIdParts = mealId.split('-');
    const mealIndex = parseInt(mealIdParts[2] || '0');
    // Use canonical meal types from config
    const determinedMealType = mealType || MEAL_TYPE_KEYS[mealIndex % MEAL_TYPE_KEYS.length];

    // Handle image upload - save to ImageKit
    let imagePath: string | undefined;
    if (imageFile) {
      try {
        // Generate unique filename
        const timestamp = Date.now();
        const clientId = session.user.id;
        const determinedExt = 'jpg'; // Will be jpg after compression
        const filename = `${clientId}-${timestamp}-${determinedMealType}.${determinedExt}`;

        // Convert File to buffer and compress
        const bytes = await imageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Compress the image before upload
        const compressedBase64 = await compressImageServer(buffer, {
          quality: 85,
          maxWidth: 1200,
          maxHeight: 1200,
          format: 'jpeg'
        });

        // Upload to ImageKit in complete-meal folder
        const ik = getImageKit();
        const uploadResponse = await ik.upload({
          file: compressedBase64,
          fileName: filename,
          folder: '/complete-meal',
        });

        // Store the ImageKit URL
        imagePath = uploadResponse.url;
      } catch (uploadError) {
        console.error('Error uploading meal image to ImageKit:', uploadError);
        return NextResponse.json({ 
          error: 'Failed to upload meal image' 
        }, { status: 500 });
      }
    }

    // Check if meal is already completed for this date
    const existingCompletionIndex = mealPlan.mealCompletions?.findIndex((c: any) => {
      const completionDate = new Date(c.date);
      const targetDate = startOfDay(requestedDate);
      return startOfDay(completionDate).getTime() === targetDate.getTime() && 
             c.mealType === determinedMealType;
    }) ?? -1;

    if (existingCompletionIndex >= 0) {
      // Update existing completion
      mealPlan.mealCompletions[existingCompletionIndex].completed = true;
      mealPlan.mealCompletions[existingCompletionIndex].notes = notes || undefined;
      if (imagePath) {
        mealPlan.mealCompletions[existingCompletionIndex].imagePath = imagePath;
      }
    } else {
      // Add new completion
      if (!mealPlan.mealCompletions) {
        mealPlan.mealCompletions = [];
      }
      
      mealPlan.mealCompletions.push({
        date: startOfDay(requestedDate),
        mealType: determinedMealType,
        completed: true,
        notes: notes || undefined,
        imagePath: imagePath || undefined
      });
    }

    // Update analytics
    if (!mealPlan.analytics) {
      mealPlan.analytics = {};
    }
    
    // Calculate total days completed
    const uniqueDates = new Set(
      mealPlan.mealCompletions
        .filter((c: any) => c.completed)
        .map((c: any) => startOfDay(new Date(c.date)).toISOString())
    );
    mealPlan.analytics.totalDaysCompleted = uniqueDates.size;

    // Calculate average adherence
    const totalMeals = mealPlan.mealCompletions.length;
    const completedMeals = mealPlan.mealCompletions.filter((c: any) => c.completed).length;
    mealPlan.analytics.averageAdherence = Math.round((completedMeals / totalMeals) * 100);

    await mealPlan.save();

    return NextResponse.json({
      success: true,
      message: 'Meal marked as completed',
      completion: {
        date: requestedDate,
        mealType: determinedMealType,
        completed: true,
        imagePath: imagePath
      },
      analytics: mealPlan.analytics
    });

  } catch (error) {
    console.error('Error completing meal:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to complete meal'
    }, { status: 500 });
  }
}
