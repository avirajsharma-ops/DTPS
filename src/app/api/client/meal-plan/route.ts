import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import ClientMealPlan from '@/lib/db/models/ClientMealPlan';
import Recipe from '@/lib/db/models/Recipe';
import { UserRole } from '@/types';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

// GET /api/client/meal-plan - Get client's meal plan for a specific date
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.CLIENT) {
      return NextResponse.json({ error: 'Only clients can access this endpoint' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const requestedDate = dateParam ? parseISO(dateParam) : new Date();
    
    // Normalize to start of day for accurate date comparison
    const normalizedDate = startOfDay(requestedDate);

    // Find active meal plan for the client
    const mealPlan = await ClientMealPlan.findOne({
      clientId: session.user.id,
      status: 'active',
      startDate: { $lte: endOfDay(normalizedDate) },
      endDate: { $gte: startOfDay(normalizedDate) }
    }).populate('templateId').lean() as any;

    if (!mealPlan) {
      return NextResponse.json({
        success: true,
        hasPlan: false,
        message: 'No active meal plan for this date'
      });
    }

    // Calculate day index within the plan
    const planStartDate = startOfDay(new Date(mealPlan.startDate));
    const dayIndex = Math.floor((normalizedDate.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get meals for this day
    let dayMeals: any[] = [];
    let mealsSource = 'none';
    
    // 1. Try direct meals array on the plan
    if (mealPlan.meals?.length > 0) {
      const dayData = mealPlan.meals[dayIndex % mealPlan.meals.length];
      
      if (dayData?.meals) {
        const mealsObj = dayData.meals;
        const mealKeys = Object.keys(mealsObj).filter(k => 
          ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner', 'eveningSnack', 'Breakfast', 'Lunch', 'Dinner'].includes(k)
        );
        
        if (mealKeys.length > 0) {
          mealsSource = 'plan-meals';
          dayMeals = extractMeals(mealsObj, mealPlan._id, dayIndex, normalizedDate, mealPlan.mealCompletions);
        }
      }
    }
    
    // 2. Fallback to mealTypes if no meals found (show empty slots)
    if (dayMeals.length === 0 && mealPlan.mealTypes?.length > 0) {
      mealsSource = 'meal-types-empty';
      dayMeals = mealPlan.mealTypes.map((mealType: any, index: number) => ({
        id: `${mealPlan._id}-${dayIndex}-${index}`,
        type: mealType.name?.toLowerCase().replace(/\s+/g, '') || getMealTypeByIndex(index),
        time: mealType.time || getDefaultMealTime(mealType.name || getMealTypeByIndex(index)),
        totalCalories: 0,
        items: [],
        isCompleted: false,
        isEmpty: true
      }));
    }
    
    // 3. Fallback to template if available
    if (dayMeals.length === 0 && mealPlan.templateId) {
      const template = mealPlan.templateId as any;
      
      if (template?.meals?.length > 0) {
        const templateDay = template.meals[dayIndex % template.meals.length];
        if (templateDay) {
          mealsSource = 'template';
          dayMeals = extractMeals(templateDay.meals || templateDay, mealPlan._id, dayIndex, normalizedDate, mealPlan.mealCompletions);
        }
      }
    }
    
    // 4. Ultimate fallback - show default empty meal slots
    if (dayMeals.length === 0) {
      mealsSource = 'default-empty';
      dayMeals = getDefaultMealSlots(mealPlan._id, dayIndex);
    }

    // 5. Enrich meals with full recipe details from Recipe model
    dayMeals = await enrichMealsWithRecipeDetails(dayMeals);

    // Calculate total calories
    const totalCalories = dayMeals.reduce((sum, meal) => sum + (meal.totalCalories || 0), 0) || 
                         mealPlan.customizations?.targetCalories || 0;

    return NextResponse.json({
      success: true,
      hasPlan: true,
      date: normalizedDate.toISOString(),
      totalCalories,
      meals: dayMeals,
      mealsSource, // For debugging
      planDetails: {
        id: mealPlan._id,
        name: mealPlan.name,
        startDate: mealPlan.startDate,
        endDate: mealPlan.endDate,
        status: mealPlan.status,
        goals: mealPlan.goals,
        dayIndex,
        hasMealsData: dayMeals.some(m => m.items?.length > 0)
      }
    });

  } catch (error) {
    console.error('Error fetching client meal plan:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to fetch meal plan'
    }, { status: 500 });
  }
}

// Helper functions
function getMealTypeByIndex(index: number): string {
  const mealTypes = ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner', 'eveningSnack'];
  return mealTypes[index % mealTypes.length] || 'meal';
}

function getDefaultMealTime(mealType: string): string {
  const normalizedType = mealType?.toLowerCase().replace(/\s+/g, '') || '';
  const times: Record<string, string> = {
    breakfast: '8:00 AM',
    morningsnack: '10:30 AM',
    midmorning: '10:30 AM',
    lunch: '1:00 PM',
    afternoonsnack: '4:00 PM',
    eveningsnack: '4:00 PM',
    dinner: '7:30 PM',
    bedtime: '9:00 PM'
  };
  return times[normalizedType] || '12:00 PM';
}

function getDefaultMealSlots(planId: string, dayIndex: number): any[] {
  const defaultSlots = [
    { type: 'breakfast', time: '8:00 AM', label: 'Breakfast' },
    { type: 'morningSnack', time: '10:30 AM', label: 'Mid Morning' },
    { type: 'lunch', time: '1:00 PM', label: 'Lunch' },
    { type: 'afternoonSnack', time: '4:00 PM', label: 'Evening Snack' },
    { type: 'dinner', time: '7:30 PM', label: 'Dinner' },
    { type: 'eveningSnack', time: '9:00 PM', label: 'Bedtime' }
  ];
  
  return defaultSlots.map((slot, index) => ({
    id: `${planId}-${dayIndex}-${index}`,
    type: slot.type,
    time: slot.time,
    totalCalories: 0,
    items: [],
    isCompleted: false,
    isEmpty: true
  }));
}

function calculateMealCalories(meal: any): number {
  if (!meal) return 0;
  if (meal.totalCalories) return Number(meal.totalCalories) || 0;
  
  const foods = meal.foods || meal.items || meal.foodOptions || [];
  if (!Array.isArray(foods)) return 0;
  
  return foods.reduce((sum: number, food: any) => {
    const cal = Number(food.calories) || Number(food.cal) || 0;
    return sum + cal;
  }, 0);
}

function checkMealCompletion(completions: any[], date: Date, mealType: string): boolean {
  if (!completions?.length) return false;
  
  const dateStart = startOfDay(date);
  const dateEnd = endOfDay(date);
  
  return completions.some(c => {
    const cDate = new Date(c.date);
    return cDate >= dateStart && cDate <= dateEnd && c.mealType === mealType && c.completed;
  });
}

// Main extraction function - handles all meal structures
function extractMeals(mealsData: any, planId: string, dayIndex: number, date: Date, completions: any[]): any[] {
  if (!mealsData) return [];
  
  // If it's an array of meals
  if (Array.isArray(mealsData)) {
    return mealsData.map((meal: any, index: number) => {
      const mealType = meal.mealType || meal.type || getMealTypeByIndex(index);
      return {
        id: `${planId}-${dayIndex}-${index}`,
        type: mealType,
        time: meal.time || getDefaultMealTime(mealType),
        totalCalories: calculateMealCalories(meal),
        items: extractFoodItems(meal, planId, dayIndex, index),
        isCompleted: checkMealCompletion(completions, date, mealType),
        isEmpty: !hasFood(meal)
      };
    });
  }
  
  // If it's an object with meal types as keys (breakfast, lunch, etc.)
  if (typeof mealsData === 'object') {
    const validMealTypes = ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner', 'eveningSnack', 
                            'Breakfast', 'Mid Morning', 'Lunch', 'Evening Snack', 'Dinner', 'Bedtime'];
    
    return Object.entries(mealsData)
      .filter(([key]) => validMealTypes.some(t => key.toLowerCase().includes(t.toLowerCase())))
      .map(([mealType, meal]: [string, any], index: number) => {
        const normalizedType = normalizeMealType(mealType);
        return {
          id: `${planId}-${dayIndex}-${index}`,
          type: normalizedType,
          time: (meal as any)?.time || getDefaultMealTime(mealType),
          totalCalories: calculateMealCalories(meal),
          items: extractFoodItems(meal, planId, dayIndex, index),
          isCompleted: checkMealCompletion(completions, date, normalizedType),
          isEmpty: !hasFood(meal)
        };
      });
  }
  
  return [];
}

function normalizeMealType(type: string): string {
  const typeMap: Record<string, string> = {
    'breakfast': 'breakfast',
    'mid morning': 'morningSnack',
    'morningsnack': 'morningSnack',
    'lunch': 'lunch',
    'evening snack': 'afternoonSnack',
    'afternoonsnack': 'afternoonSnack',
    'dinner': 'dinner',
    'bedtime': 'eveningSnack',
    'eveningsnack': 'eveningSnack'
  };
  return typeMap[type.toLowerCase()] || type.toLowerCase().replace(/\s+/g, '');
}

function hasFood(meal: any): boolean {
  if (!meal) return false;
  const foods = meal.foods || meal.items || meal.foodOptions || [];
  return Array.isArray(foods) && foods.length > 0 && foods.some((f: any) => f.food || f.name || f.foodName);
}

function extractFoodItems(meal: any, planId: string, dayIndex: number, mealIndex: number): any[] {
  if (!meal) return [];
  
  const foods = meal.foods || meal.items || meal.foodOptions || [];
  if (!Array.isArray(foods)) return [];
  
  return foods
    .filter((food: any) => food.food || food.name || food.foodName) // Only include items with actual food data
    .map((food: any, foodIndex: number) => ({
      id: `${planId}-${dayIndex}-${mealIndex}-${foodIndex}`,
      name: food.food || food.name || food.foodName || 'Unknown Food',
      portion: food.unit || food.portion || food.quantity || '1 serving',
      calories: Number(food.calories) || Number(food.cal) || 0,
      alternatives: food.alternatives || [],
      recipe: food.recipe || null,
      recipeId: food.recipeId || food.recipe?._id || null, // Store recipe ID for lookup
      tags: food.tags || [],
      // Include extra nutrition info if available
      protein: food.protein || null,
      carbs: food.carbs || null,
      fats: food.fats || null,
      fiber: food.fiber || null
    }));
}

// Fetch full recipe details from Recipe model
async function enrichMealsWithRecipeDetails(meals: any[]): Promise<any[]> {
  // Collect all recipe IDs that need to be fetched
  const recipeIds: string[] = [];
  
  meals.forEach(meal => {
    if (meal.items) {
      meal.items.forEach((item: any) => {
        if (item.recipeId && !item.recipe?.ingredients) {
          recipeIds.push(item.recipeId.toString());
        }
      });
    }
  });
  
  if (recipeIds.length === 0) return meals;
  
  try {
    // Fetch all recipes in one query
    const recipes = await Recipe.find({
      _id: { $in: recipeIds }
    }).lean() as any[];
    
    // Create a map for quick lookup
    const recipeMap = new Map(recipes.map((r: any) => [r._id.toString(), r]));
    
    // Enrich meal items with recipe details
    return meals.map(meal => ({
      ...meal,
      items: meal.items?.map((item: any) => {
        if (item.recipeId) {
          const fullRecipe = recipeMap.get(item.recipeId.toString());
          if (fullRecipe) {
            return {
              ...item,
              recipe: {
                ingredients: fullRecipe.ingredients?.map((ing: any) => 
                  `${ing.quantity} ${ing.unit} ${ing.name}${ing.remarks ? ` (${ing.remarks})` : ''}`
                ) || [],
                instructions: fullRecipe.instructions || [],
                prepTime: fullRecipe.prepTime ? `${fullRecipe.prepTime} min` : null,
                cookTime: fullRecipe.cookTime ? `${fullRecipe.cookTime} min` : null,
                servings: fullRecipe.servings,
                difficulty: fullRecipe.difficulty,
                cuisine: fullRecipe.cuisine,
                tips: fullRecipe.tips || [],
                nutrition: fullRecipe.nutrition,
                image: fullRecipe.image || fullRecipe.images?.[0]?.url,
                video: fullRecipe.video,
                equipment: fullRecipe.equipment || [],
                storage: fullRecipe.storage,
                tags: fullRecipe.tags || [],
                dietaryRestrictions: fullRecipe.dietaryRestrictions || [],
                allergens: fullRecipe.allergens || []
              }
            };
          }
        }
        return item;
      }) || []
    }));
  } catch (error) {
    console.error('Error fetching recipe details:', error);
    return meals; // Return original meals if error
  }
}
