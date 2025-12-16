import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import dbConnect from '@/lib/db/connect';
import ClientMealPlan from '@/lib/db/models/ClientMealPlan';
import { ClientPurchase } from '@/lib/db/models/ServicePlan';
import { addDays, format, differenceInDays, startOfDay, parseISO } from 'date-fns';

// Helper function to calculate allowed freeze days based on plan duration in months
function calculateAllowedFreezeDays(durationDays: number): number {
  // Calculate months (approximately 30 days per month)
  const months = Math.ceil(durationDays / 30);
  // Each month allows 10 days of freeze
  return months * 10;
}

// GET - Get freeze information for a meal plan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const mealPlan: any = await ClientMealPlan.findById(id).lean();

    if (!mealPlan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 });
    }

    // Calculate plan duration
    const startDate = new Date(mealPlan.startDate);
    const endDate = new Date(mealPlan.endDate);
    const durationDays = differenceInDays(endDate, startDate) + 1;

    // Calculate allowed freeze days
    const allowedFreezeDays = calculateAllowedFreezeDays(durationDays);

    // Get already frozen days
    const freezedDays = mealPlan.freezedDays || [];
    const totalFreezeCount = mealPlan.totalFreezeCount || 0;

    // Calculate remaining freeze days
    const remainingFreezeDays = Math.max(0, allowedFreezeDays - totalFreezeCount);

    return NextResponse.json({
      success: true,
      data: {
        planId: mealPlan._id,
        planName: mealPlan.name,
        startDate: mealPlan.startDate,
        endDate: mealPlan.endDate,
        durationDays,
        allowedFreezeDays,
        totalFreezeCount,
        remainingFreezeDays,
        freezedDays: freezedDays.map((fd: any) => ({
          date: fd.date,
          createdAt: fd.createdAt
        })),
        canFreeze: remainingFreezeDays > 0
      }
    });
  } catch (error) {
    console.error('Error getting freeze info:', error);
    return NextResponse.json({ error: 'Failed to get freeze information' }, { status: 500 });
  }
}

// POST - Freeze selected dates
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { freezeDates } = body; // Array of date strings in YYYY-MM-DD format

    if (!freezeDates || !Array.isArray(freezeDates) || freezeDates.length === 0) {
      return NextResponse.json({ error: 'freezeDates array is required' }, { status: 400 });
    }

    // Fetch the meal plan
    const mealPlan = await ClientMealPlan.findById(id);

    if (!mealPlan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 });
    }

    // Calculate plan duration and allowed freeze days
    const startDate = startOfDay(new Date(mealPlan.startDate));
    const endDate = startOfDay(new Date(mealPlan.endDate));
    const durationDays = differenceInDays(endDate, startDate) + 1;
    const allowedFreezeDays = calculateAllowedFreezeDays(durationDays);

    // Get current freeze count
    const currentFreezeCount = mealPlan.totalFreezeCount || 0;
    const existingFreezedDays = mealPlan.freezedDays || [];

    // Validate freeze dates
    const today = startOfDay(new Date());
    const validFreezeDates: Date[] = [];
    const existingFreezeSet = new Set(
      existingFreezedDays.map((fd: any) => format(new Date(fd.date), 'yyyy-MM-dd'))
    );

    for (const dateStr of freezeDates) {
      const freezeDate = startOfDay(parseISO(dateStr));
      const formattedDate = format(freezeDate, 'yyyy-MM-dd');

      // Check if date is already frozen
      if (existingFreezeSet.has(formattedDate)) {
        continue; // Skip already frozen dates
      }

      // Check if date is within plan range
      if (freezeDate < startDate || freezeDate > endDate) {
        return NextResponse.json({ 
          error: `Date ${formattedDate} is outside the plan range (${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')})` 
        }, { status: 400 });
      }

      // Check if date is not in the past
      if (freezeDate < today) {
        return NextResponse.json({ 
          error: `Cannot freeze past date: ${formattedDate}` 
        }, { status: 400 });
      }

      validFreezeDates.push(freezeDate);
    }

    if (validFreezeDates.length === 0) {
      return NextResponse.json({ 
        error: 'No valid dates to freeze. All dates may already be frozen.' 
      }, { status: 400 });
    }

    // Check if we have enough remaining freeze days
    const newTotalFreezeCount = currentFreezeCount + validFreezeDates.length;
    if (newTotalFreezeCount > allowedFreezeDays) {
      return NextResponse.json({ 
        error: `Cannot freeze ${validFreezeDates.length} days. Only ${allowedFreezeDays - currentFreezeCount} days remaining.`,
        allowedFreezeDays,
        currentFreezeCount,
        requestedDays: validFreezeDates.length
      }, { status: 400 });
    }

    // Get meals array
    const meals = mealPlan.meals || [];

    // Sort freeze dates
    validFreezeDates.sort((a, b) => a.getTime() - b.getTime());

    // Find meals on freeze dates to COPY (not move)
    const mealsToCopy: any[] = [];

    for (const meal of meals) {
      const mealDate = startOfDay(new Date(meal.date));
      const mealDateStr = format(mealDate, 'yyyy-MM-dd');
      
      // Check if this meal's date is in the freeze dates
      const isFreezeDate = validFreezeDates.some(
        fd => format(fd, 'yyyy-MM-dd') === mealDateStr
      );

      if (isFreezeDate) {
        mealsToCopy.push({ ...meal }); // Create a copy
      }
    }

    // Find the last meal date in the existing meals array (to add after it)
    let lastMealDate = endDate;
    if (meals.length > 0) {
      const sortedMeals = [...meals].sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const lastMealDateStr = sortedMeals[0].date;
      if (lastMealDateStr) {
        const parsedLastDate = startOfDay(new Date(lastMealDateStr));
        if (parsedLastDate > lastMealDate) {
          lastMealDate = parsedLastDate;
        }
      }
    }

    // Calculate new dates for the copied meals (after the LAST meal date, not endDate)
    const addedMealDates: string[] = [];
    const newMeals: any[] = [];

    for (let i = 0; i < mealsToCopy.length; i++) {
      const mealToCopy = mealsToCopy[i];
      const newDate = addDays(lastMealDate, i + 1);
      const dayNumber = differenceInDays(newDate, startDate);
      const newDateStr = format(newDate, 'yyyy-MM-dd');
      const newDateOfMonth = newDate.getDate();
      const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const newDayName = fullDayNames[newDate.getDay()];

      // Get original frozen day info for recovery label
      const originalDate = validFreezeDates[i] || validFreezeDates[0];
      const originalDateObj = new Date(originalDate);
      const originalDayOfMonth = originalDateObj.getDate();
      const originalDayName = fullDayNames[originalDateObj.getDay()];
      
      // Find the original day number from the original meal
      const originalMealIndex = meals.findIndex((m: any) => m.date === format(originalDate, 'yyyy-MM-dd'));
      const originalDayNum = originalMealIndex >= 0 ? originalMealIndex + 1 : i + 1;
      const originalFreezeDateLabel = `${originalDayOfMonth} - Day ${originalDayNum} - ${originalDayName}`;

      newMeals.push({
        ...mealToCopy,
        id: `day-${dayNumber}`,
        day: `${newDateOfMonth} - Day ${dayNumber + 1} - ${newDayName}`,
        date: newDateStr,
        isFreezeRecovery: true, // Mark as freeze recovery day
        originalFreezeDate: format(originalDate, 'yyyy-MM-dd'),
        originalFreezeDateLabel: originalFreezeDateLabel // e.g. "16 - Day 5 - Tuesday"
      });

      addedMealDates.push(newDateStr);
    }

    // Mark original frozen days with isFrozen: true
    const frozenDateStrings = validFreezeDates.map(d => format(d, 'yyyy-MM-dd'));
    const mealsWithFrozenMarked = meals.map((meal: any) => {
      if (frozenDateStrings.includes(meal.date)) {
        return { ...meal, isFrozen: true };
      }
      return meal;
    });

    // Combine existing meals (with frozen marked) with new copied meals
    const updatedMeals = [...mealsWithFrozenMarked, ...newMeals];

    // Sort meals by date
    updatedMeals.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    // Create new freeze day entries with added date info
    const newFreezeDays = validFreezeDates.map((date, index) => ({
      date: date,
      addedDate: addedMealDates[index] || null,
      createdAt: new Date()
    }));

    // Calculate new end date by extending it by the number of frozen days
    const newEndDate = addDays(endDate, validFreezeDates.length);

    // Update the meal plan - extend endDate by frozen days count
    mealPlan.freezedDays = [...existingFreezedDays, ...newFreezeDays];
    mealPlan.totalFreezeCount = newTotalFreezeCount;
    mealPlan.meals = updatedMeals;
    mealPlan.endDate = newEndDate; // Extend end date by frozen days

    await mealPlan.save();

    // Also update ClientPurchase end date to keep in sync
    await ClientPurchase.updateOne(
      { mealPlanId: mealPlan._id },
      { $set: { endDate: newEndDate } }
    );

    return NextResponse.json({
      success: true,
      message: `Successfully froze ${validFreezeDates.length} days. Meals copied to new days. End date extended to ${format(newEndDate, 'yyyy-MM-dd')}.`,
      data: {
        planId: mealPlan._id,
        originalEndDate: format(endDate, 'yyyy-MM-dd'),
        newEndDate: format(newEndDate, 'yyyy-MM-dd'),
        totalFreezeCount: newTotalFreezeCount,
        allowedFreezeDays,
        remainingFreezeDays: allowedFreezeDays - newTotalFreezeCount,
        frozenDates: validFreezeDates.map(d => format(d, 'yyyy-MM-dd')),
        addedMealDates: addedMealDates,
        copiedMeals: mealsToCopy.length
      }
    });

  } catch (error) {
    console.error('Error freezing dates:', error);
    return NextResponse.json({ error: 'Failed to freeze dates' }, { status: 500 });
  }
}
