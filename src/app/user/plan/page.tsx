'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Clock, 
  Check, 
  ChevronRight,
  BookOpen,
  X,
  Tag,
  ArrowLeft,
  RefreshCw,
  Camera,
  Upload,
  ImageIcon,
  Loader2,
  CalendarDays
} from 'lucide-react';
import { format, addDays, startOfWeek, isToday, isSameDay } from 'date-fns';

import SpoonGifLoader from '@/components/ui/SpoonGifLoader';
import { toast } from 'sonner';

interface MealItem {
  id: string;
  name: string;
  portion: string;
  calories: number;
  alternatives?: { name: string; portion: string; calories: number }[];
  recipe?: {
    ingredients: string[];
    instructions: string[];
    prepTime?: string;
    cookTime?: string;
    servings?: string | number;
    difficulty?: string;
    cuisine?: string;
    tips?: string[];
    nutrition?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
    };
    image?: string;
    equipment?: string[];
    storage?: {
      refrigerator?: string;
      freezer?: string;
      instructions?: string;
    };
    dietaryRestrictions?: string[];
    allergens?: string[];
  };
  recipeId?: string;
  tags?: string[];
  protein?: number;
  carbs?: number;
  fats?: number;
  fiber?: number;
}

interface Meal {
  id: string;
  type: 'breakfast' | 'morningSnack' | 'lunch' | 'afternoonSnack' | 'dinner' | 'eveningSnack';
  time: string;
  totalCalories: number;
  items: MealItem[];
  isCompleted: boolean;
  notes?: string;
}

interface DayPlan {
  date: Date;
  meals: Meal[];
  totalCalories: number;
  hasPlan: boolean;
  planDetails?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
  };
}

interface RecipeModalData {
  item: MealItem;
  isOpen: boolean;
}

interface CompletionModalData {
  meal: Meal | null;
  isOpen: boolean;
}

// Default meal slots with fixed times - 6 meal types
const DEFAULT_MEAL_SLOTS: { type: Meal['type']; time: string; label: string }[] = [
  { type: 'breakfast', time: '7:00 AM', label: 'Breakfast' },
  { type: 'morningSnack', time: '10:00 AM', label: 'Mid Morning' },
  { type: 'lunch', time: '12:30 PM', label: 'Lunch' },
  { type: 'afternoonSnack', time: '4:00 PM', label: 'Evening Snack' },
  { type: 'dinner', time: '7:30 PM', label: 'Dinner' },
  { type: 'eveningSnack', time: '9:00 PM', label: 'Bedtime' },
];

export default function UserPlanPage() {
  const { data: session, status } = useSession();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChangingDate, setIsChangingDate] = useState(false); // For skeleton loader on date change
  const [completingMeal, setCompletingMeal] = useState<string | null>(null);
  const [recipeModal, setRecipeModal] = useState<RecipeModalData>({ item: {} as MealItem, isOpen: false });
  const [alternativesModal, setAlternativesModal] = useState<{ item: MealItem; isOpen: boolean }>({ item: {} as MealItem, isOpen: false });
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState('');
  const dateScrollRef = useRef<HTMLDivElement>(null);
  
  // Cache for meal plans - key: date string, value: DayPlan
  const mealPlanCache = useRef<Map<string, DayPlan>>(new Map());
  
  // Completion modal state
  const [completionModal, setCompletionModal] = useState<CompletionModalData>({ meal: null, isOpen: false });
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionImage, setCompletionImage] = useState<File | null>(null);
  const [completionImagePreview, setCompletionImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Generate dates: today at START (index 0) + 30 future days + 15 previous days at end (for scrolling back)
    const today = new Date();
    const dates: Date[] = [];
    
    // Add today first (index 0) - will be at START
    dates.push(today);
    // Add 30 future days
    for (let i = 1; i <= 30; i++) {
      dates.push(addDays(today, i));
    }
    // Add 15 previous days at the end (user can scroll right to see them)
    for (let i = 1; i <= 15; i++) {
      dates.unshift(addDays(today, -i));
    }
    
    setWeekDates(dates);
    setDatePickerValue(format(today, 'yyyy-MM-dd'));
    fetchDayPlan(today, true); // Fetch today's plan (initial load)
    
    // Pre-fetch next 3 days and previous 3 days for faster navigation
    setTimeout(() => {
      [-3, -2, -1, 1, 2, 3].forEach(offset => {
        const prefetchDate = addDays(today, offset);
        prefetchDayPlan(prefetchDate);
      });
    }, 500);
  }, []);

  // Scroll to today's date when dates are loaded - today is at index 15
  useEffect(() => {
    if (weekDates.length > 0 && dateScrollRef.current) {
      // Scroll to position today (index 15) so it appears at START of visible area
      setTimeout(() => {
        if (dateScrollRef.current) {
          const todayIndex = 15; // Today is at index 15 (after 15 previous days)
          const buttonWidth = 58; // Approximate width of each date button
          // Scroll so today is at the START (left edge)
          dateScrollRef.current.scrollLeft = todayIndex * buttonWidth;
        }
      }, 50);
    }
  }, [weekDates]);

  useEffect(() => {
    fetchDayPlan(selectedDate, false);
    
    // Pre-fetch adjacent days when date changes
    setTimeout(() => {
      [-1, 1].forEach(offset => {
        prefetchDayPlan(addDays(selectedDate, offset));
      });
    }, 100);
  }, [selectedDate]);

  // Prevent body scroll when any modal is open
  useEffect(() => {
    if (recipeModal.isOpen || alternativesModal.isOpen || completionModal.isOpen || showDatePicker) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [recipeModal.isOpen, alternativesModal.isOpen, completionModal.isOpen, showDatePicker]);

  // Handle date picker selection
  const handleDatePickerSelect = () => {
    if (datePickerValue) {
      const selected = new Date(datePickerValue + 'T00:00:00');
      setSelectedDate(selected);
      setShowDatePicker(false);
    }
  };

  // Pre-fetch meal plan without updating UI (for caching)
  const prefetchDayPlan = async (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    
    // Skip if already in cache
    if (mealPlanCache.current.has(dateKey)) return;
    
    try {
      const response = await fetch(`/api/client/meal-plan?date=${dateKey}`);
      if (response.ok) {
        const data = await response.json();
        const plan: DayPlan = data.success && data.hasPlan 
          ? {
              date: new Date(data.date),
              meals: data.meals || [],
              totalCalories: data.totalCalories || 0,
              hasPlan: true,
              planDetails: data.planDetails
            }
          : {
              date: date,
              meals: [],
              totalCalories: 0,
              hasPlan: false
            };
        mealPlanCache.current.set(dateKey, plan);
      }
    } catch (error) {
      // Silently fail for pre-fetch
    }
  };

  const fetchDayPlan = async (date: Date, isInitialLoad = false) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    
    // Check cache first - instant load!
    if (mealPlanCache.current.has(dateKey)) {
      setDayPlan(mealPlanCache.current.get(dateKey)!);
      if (isInitialLoad) setLoading(false);
      return;
    }
    
    // Show skeleton for date changes, full loader for initial
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setIsChangingDate(true);
    }
    
    try {
      const response = await fetch(`/api/client/meal-plan?date=${dateKey}`);
      if (response.ok) {
        const data = await response.json();
        
        const plan: DayPlan = data.success && data.hasPlan 
          ? {
              date: new Date(data.date),
              meals: data.meals || [],
              totalCalories: data.totalCalories || 0,
              hasPlan: true,
              planDetails: data.planDetails
            }
          : {
              date: date,
              meals: [],
              totalCalories: 0,
              hasPlan: false
            };
        
        // Cache the result
        mealPlanCache.current.set(dateKey, plan);
        setDayPlan(plan);
      } else {
        const noplan: DayPlan = {
          date: date,
          meals: [],
          totalCalories: 0,
          hasPlan: false
        };
        mealPlanCache.current.set(dateKey, noplan);
        setDayPlan(noplan);
      }
    } catch (error) {
      console.error('Error fetching meal plan:', error);
      setDayPlan({
        date: date,
        meals: [],
        totalCalories: 0,
        hasPlan: false
      });
    } finally {
      setLoading(false);
      setIsChangingDate(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Clear cache for current date to force refresh
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    mealPlanCache.current.delete(dateKey);
    await fetchDayPlan(selectedDate, false);
    setRefreshing(false);
    toast.success('Meal plan refreshed');
  };

  // Open completion modal
  const openCompletionModal = (meal: Meal) => {
    setCompletionModal({ meal, isOpen: true });
    setCompletionNotes('');
    setCompletionImage(null);
    setCompletionImagePreview(null);
  };

  // Close completion modal
  const closeCompletionModal = () => {
    setCompletionModal({ meal: null, isOpen: false });
    setCompletionNotes('');
    setCompletionImage(null);
    setCompletionImagePreview(null);
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCompletionImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompletionImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit meal completion with image
  const handleSubmitCompletion = async () => {
    if (!completionModal.meal) return;
    
    if (!completionImage) {
      toast.error('Please add a photo of your meal');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('mealId', completionModal.meal.id);
      formData.append('date', format(selectedDate, 'yyyy-MM-dd'));
      formData.append('mealType', completionModal.meal.type);
      if (completionNotes) formData.append('notes', completionNotes);
      formData.append('image', completionImage);

      const response = await fetch('/api/client/meal-plan/complete', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        toast.success('Meal marked as complete!');
        closeCompletionModal();
        await fetchDayPlan(selectedDate);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to mark meal as complete');
      }
    } catch (error) {
      console.error('Error completing meal:', error);
      toast.error('Error completing meal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkComplete = async (mealId: string) => {
    setCompletingMeal(mealId);
    try {
      const response = await fetch('/api/client/meal-plan/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealId, date: format(selectedDate, 'yyyy-MM-dd') })
      });
      if (response.ok) {
        toast.success('Meal marked as complete!');
        // Refresh the plan
        await fetchDayPlan(selectedDate);
      } else {
        toast.error('Failed to mark meal as complete');
      }
    } catch (error) {
      console.error('Error completing meal:', error);
      toast.error('Error completing meal');
    } finally {
      setCompletingMeal(null);
    }
  };

  const getMealIcon = (type: string) => {
    switch (type) {
      case 'breakfast': return '🌅';
      case 'morningSnack': return '🍎';
      case 'lunch': return '☀️';
      case 'afternoonSnack': return '🥜';
      case 'dinner': return '🌙';
      case 'eveningSnack': return '🍵';
      default: return '🍽️';
    }
  };

  const getMealLabel = (type: string) => {
    switch (type) {
      case 'breakfast': return 'Breakfast';
      case 'morningSnack': return 'Mid Morning';
      case 'lunch': return 'Lunch';
      case 'afternoonSnack': return 'Evening Snack';
      case 'dinner': return 'Dinner';
      case 'eveningSnack': return 'Bedtime';
      default: return type;
    }
  };

  const getMealTime = (type: string) => {
    const slot = DEFAULT_MEAL_SLOTS.find(s => s.type === type);
    return slot?.time || '';
  };

  // Get all 6 meal slots - merge defaults with actual meals
  const getAllMealSlots = (): Meal[] => {
    if (!dayPlan?.hasPlan) return [];
    
    // Start with the 6 default meal slots
    const slots: Meal[] = DEFAULT_MEAL_SLOTS.map(slot => {
      const existingMeal = dayPlan.meals.find(m => m.type === slot.type);
      if (existingMeal) {
        return {
          ...existingMeal,
          time: existingMeal.time || slot.time
        };
      }
      // Create empty meal slot for default types
      return {
        id: `empty-${slot.type}`,
        type: slot.type,
        time: slot.time,
        totalCalories: 0,
        items: [],
        isCompleted: false
      };
    });

    return slots;
  };

  const allMealSlots = getAllMealSlots();
  // Only count meals that have food assigned
  const mealsWithFood = allMealSlots.filter(m => m.items.length > 0);
  const completedMeals = mealsWithFood.filter(m => m.isCompleted).length;
  const totalMeals = mealsWithFood.length || 0;
  const isTodaySelected = isToday(selectedDate);

  // Calculate progress segments only for meals with food
  const progressSegments = mealsWithFood.map((meal, index) => {
    const isCompleted = meal.isCompleted;
    return { isCompleted, index };
  });

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <SpoonGifLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-gray-50">
      {/* Header */}
      <div className="px-4 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <Link href="/user" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-bold text-[#E06A26]">My Meal Plan</h1>
            <p className="text-xs text-gray-500 uppercase">{format(selectedDate, 'EEEE, MMMM d')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setDatePickerValue(format(selectedDate, 'yyyy-MM-dd'));
                setShowDatePicker(true);
              }}
              className="p-2"
              title="Open Calendar"
            >
              <CalendarDays className="w-5 h-5 text-gray-700" />
            </button>
            <button 
              onClick={handleRefresh}
              className="p-2"
              disabled={refreshing}
            >
              <RefreshCw className={`w-5 h-5 text-gray-700 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#3AB1A0] flex items-center justify-center text-white text-sm font-semibold">
              {session?.user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Date Display */}
      <div className="px-4 py-4 bg-gradient-to-r from-[#3AB1A0] to-[#2A9A8B] text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs tracking-wider opacity-90 uppercase">
              {isToday(selectedDate) ? 'Today' : 'Selected Date'}
            </p>
            <p className="text-2xl font-bold">{format(selectedDate, 'EEEE')}</p>
            <p className="text-sm opacity-90">{format(selectedDate, 'MMMM d, yyyy')}</p>
          </div>
          <div className="bg-white/20 rounded-2xl p-3 text-center min-w-[70px]">
            <p className="text-xs font-medium opacity-90">{format(selectedDate, 'MMM')}</p>
            <p className="text-3xl font-bold">{format(selectedDate, 'd')}</p>
          </div>
        </div>
      </div>

      {/* Week Date Selector */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div 
          ref={dateScrollRef}
          className="flex gap-2 overflow-x-auto hide-scrollbar scroll-smooth"
        >
          {weekDates.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const today = isToday(date);
            
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center py-2 px-4 rounded-2xl min-w-[50px] transition-all ${
                  isSelected 
                    ? 'bg-[#3AB1A0] text-white' 
                    : 'bg-transparent text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className={`text-xs font-medium ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                  {format(date, 'EEE')}
                </span>
                <span className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                  {format(date, 'd')}
                </span>
                {today && !isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E06A26] mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Skeleton Loader when changing dates */}
        {isChangingDate ? (
          <div className="space-y-4 animate-pulse">
            {/* Summary skeleton */}
            <div className="p-5 bg-white shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="h-3 w-20 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 w-24 bg-gray-200 rounded"></div>
                </div>
                <div className="text-right">
                  <div className="h-3 w-20 bg-gray-200 rounded mb-2 ml-auto"></div>
                  <div className="h-8 w-16 bg-gray-200 rounded ml-auto"></div>
                </div>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-2 flex-1 bg-gray-200 rounded-full"></div>
                ))}
              </div>
            </div>
            
            {/* Meal cards skeleton */}
            {[1, 2, 3].map(i => (
              <div key={i} className="p-5 bg-white shadow-sm rounded-2xl">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-2xl"></div>
                    <div>
                      <div className="h-5 w-24 bg-gray-200 rounded mb-1"></div>
                      <div className="h-3 w-16 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                </div>
                <div className="space-y-3">
                  {[1, 2].map(j => (
                    <div key={j} className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-32 bg-gray-200 rounded"></div>
                        <div className="h-4 w-16 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !dayPlan?.hasPlan ? (
          /* No Plan Message - Show Buy Plan option */
          <div className="p-8 text-center bg-white shadow-sm rounded-2xl">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#E06A26]/20 to-[#DB9C6E]/20 rounded-full flex items-center justify-center">
              <span className="text-4xl">🍽️</span>
            </div>
            <h3 className="mb-2 text-xl font-bold text-gray-800">No Meal Plan Available</h3>
            <p className="mb-2 text-sm text-gray-600 font-medium">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="mb-6 text-sm text-gray-500">
              You don't have a meal plan for this date. Get a personalized diet plan from our expert dietitians!
            </p>
            <div className="flex flex-col gap-3">
              <Link 
                href="/user/services"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E06A26] to-[#DB9C6E] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg"
              >
                🛒 Buy a Plan
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link 
                href="/user/messages"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#3AB1A0]/10 text-[#3AB1A0] rounded-xl text-sm font-medium hover:bg-[#3AB1A0]/20 transition-colors"
              >
                💬 Contact Dietitian
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Daily Summary Card */}
            <div className="p-5 bg-white shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs tracking-wide text-gray-500 uppercase">Daily Target</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {dayPlan?.totalCalories}<span className="ml-1 text-lg font-normal text-gray-400">kcal</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs tracking-wide text-gray-500 uppercase">Completed</p>
                  <p className="text-3xl font-bold text-[#3AB1A0]">
                    {completedMeals}/{totalMeals}<span className="ml-1 text-lg font-normal text-gray-400">meals</span>
                  </p>
                </div>
              </div>
              
              {/* Progress Bar - Segmented */}
              <div className="flex gap-1">
                {progressSegments.map((segment, index) => (
                  <div 
                    key={index}
                    className={`h-2 flex-1 rounded-full transition-all ${
                      segment.isCompleted ? 'bg-[#3AB1A0]' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Meals List - Show all 6 meal slots */}
            {allMealSlots.map((meal) => (
              <div 
                key={meal.id} 
                className="p-5 bg-white shadow-sm rounded-2xl"
              >
                {/* Meal Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 text-2xl rounded-2xl bg-gray-50">
                      {getMealIcon(meal.type)}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{getMealLabel(meal.type)}</h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{meal.time}</span>
                      </div>
                    </div>
                  </div>
                  {meal.isCompleted ? (
                    <div className="flex items-center gap-1 text-[#3AB1A0]">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">Done</span>
                    </div>
                  ) : meal.items.length > 0 ? (
                    <div className="bg-[#E06A26]/10 text-[#E06A26] px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <span>⚡</span>
                      <span>{meal.totalCalories} kcal</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1 text-sm font-medium text-gray-500 bg-gray-100 rounded-full">
                      No food allotted
                    </div>
                  )}
                </div>

                {/* Meal Notes if any */}
                {meal.notes && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-xs font-semibold text-yellow-700 mb-1">📝 Notes from Dietitian</p>
                    <p className="text-sm text-yellow-800">{meal.notes}</p>
                  </div>
                )}

                {/* Meal Items - Show food if assigned, otherwise show empty message */}
                {meal.items.length > 0 ? (
                  <div className="mb-4 space-y-3">
                    {meal.items.map((item) => (
                      <div 
                        key={item.id}
                        className="p-3 bg-gray-50 rounded-xl"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1 gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#3AB1A0]" />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-800">{item.name}</span>
                              {/* Tags */}
                              {item.tags && item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                {item.tags.map((tag, i) => (
                                  <span 
                                    key={i}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#DB9C6E]/20 text-[#DB9C6E] rounded-full text-xs"
                                  >
                                    <Tag className="w-2.5 h-2.5" />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium text-gray-700">{item.portion}</span>
                            <p className="text-xs text-gray-400">({item.calories} kcal)</p>
                          </div>
                        </div>
                        
                        {/* Alternatives - Show inline */}
                        {item.alternatives && item.alternatives.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-1">🔄 Alternatives:</p>
                            <div className="flex flex-wrap gap-2">
                              {item.alternatives.map((alt, altIndex) => (
                                <span 
                                  key={altIndex}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-[#3AB1A0]/10 text-[#3AB1A0] rounded-lg text-xs"
                                >
                                  {alt.name} ({alt.portion}) - {alt.calories} kcal
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 mb-4 text-center text-gray-400 bg-gray-50 rounded-xl">
                    <span className="block mb-2 text-2xl">🍽️</span>
                    <p className="text-sm">No food assigned for this meal</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3 flex-wrap">
                  {meal.isCompleted ? (
                    <button className="flex-1 min-w-[120px] py-2.5 px-4 bg-[#3AB1A0]/10 text-[#3AB1A0] rounded-xl text-sm font-semibold cursor-default">
                      ✓ Completed
                    </button>
                  ) : !isTodaySelected ? (
                    /* Disabled for past/future dates */
                    <button 
                      disabled
                      className="flex-1 py-2.5 px-4 bg-gray-200 text-gray-500 rounded-xl text-sm font-semibold cursor-not-allowed flex items-center justify-center gap-2"
                      title={selectedDate < new Date() ? 'Cannot mark past meals as complete' : 'Cannot mark future meals as complete'}
                    >
                      <Clock className="w-4 h-4" />
                      <span>{selectedDate < new Date() ? 'Past Date' : 'Future Date'}</span>
                    </button>
                  ) : meal.items.length === 0 ? (
                    /* Hide complete button when no food is allotted */
                    <div className="flex-1 min-w-[120px] py-2.5 px-4 bg-gray-100 text-gray-400 rounded-xl text-sm font-medium text-center">
                      No food to mark as complete
                    </div>
                  ) : (
                    <button 
                      onClick={() => openCompletionModal(meal)}
                      disabled={completingMeal === meal.id}
                      className="flex-1 min-w-[120px] py-2.5 px-4 bg-[#3AB1A0] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#2A9A8B] transition-colors disabled:opacity-50"
                    >
                      {completingMeal === meal.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          <span>Complete</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  {/* View Recipe Button - Show next to Complete if items exist */}
                  {meal.items.length > 0 && (
                    <button 
                      onClick={() => {
                        const itemWithRecipe = meal.items.find(item => item.recipe);
                        if (itemWithRecipe) {
                          setRecipeModal({ item: itemWithRecipe, isOpen: true });
                        } else {
                          // Show first item details even if no full recipe
                          setRecipeModal({ item: meal.items[0], isOpen: true });
                        }
                      }}
                      className="flex-1 min-w-[120px] py-2.5 px-4 bg-[#DB9C6E]/10 text-[#DB9C6E] rounded-xl text-sm font-semibold hover:bg-[#DB9C6E]/20 transition-colors flex items-center justify-center gap-2"
                      title="View recipe details"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>View Recipe</span>
                    </button>
                  )}
                  
                  {/* View Alternatives */}
                  {meal.items.some(item => item.alternatives && item.alternatives.length > 0) && (
                    <button 
                      onClick={() => setAlternativesModal({ item: meal.items[0], isOpen: true })}
                      className="py-2.5 px-4 border border-[#DB9C6E] rounded-xl text-sm font-medium text-[#DB9C6E] flex items-center gap-2 hover:bg-[#DB9C6E]/10 transition-colors"
                    >
                      <Tag className="w-4 h-4" />
                      <span>Alt</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Recipe Modal */}
      {recipeModal.isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRecipeModal({ item: {} as MealItem, isOpen: false });
            }
          }}
        >
          <div className="bg-white w-full max-w-lg mx-4 rounded-3xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Modal Header - Sticky */}
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-[#3AB1A0] to-[#2A9A8B]">
              <h3 className="text-lg font-bold text-white">{recipeModal.item.name}</h3>
              <button 
                onClick={() => setRecipeModal({ item: {} as MealItem, isOpen: false })}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* Modal Content - Scrollable */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              <div className="p-5 space-y-5">
                {/* Food Info */}
                <div className="flex items-center justify-between p-4 bg-[#E06A26]/10 rounded-xl">
                  <div>
                    <p className="text-sm text-gray-500">Portion</p>
                    <p className="font-semibold text-gray-800">{recipeModal.item.portion}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Calories</p>
                    <p className="font-bold text-[#E06A26]">{recipeModal.item.calories} kcal</p>
                  </div>
                </div>

                {/* Tags */}
                {recipeModal.item.tags && recipeModal.item.tags.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-bold text-gray-900">🏷️ Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {recipeModal.item.tags.map((tag, i) => (
                        <span 
                          key={i}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-[#DB9C6E]/20 text-[#DB9C6E] rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alternatives */}
                {recipeModal.item.alternatives && recipeModal.item.alternatives.length > 0 && (
                  <div className="p-4 bg-[#3AB1A0]/10 rounded-xl">
                    <h4 className="mb-2 text-sm font-bold text-gray-900">🔄 Alternative Options</h4>
                    <div className="space-y-2">
                      {recipeModal.item.alternatives.map((alt, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-white rounded-lg">
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{alt.name}</p>
                            <p className="text-xs text-gray-500">{alt.portion}</p>
                          </div>
                          <span className="text-sm font-semibold text-[#3AB1A0]">{alt.calories} kcal</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recipeModal.item.recipe ? (
                  (() => {
                    const recipe = recipeModal.item.recipe;
                    return (
                      <>
                        {/* Recipe Image */}
                        {recipe.image && (
                          <div className="rounded-xl overflow-hidden">
                            <img 
                              src={recipe.image} 
                              alt={recipeModal.item.name}
                              className="w-full h-48 object-cover"
                            />
                          </div>
                        )}

                        {/* Quick Info Row */}
                        <div className="flex flex-wrap gap-2">
                          {recipe.servings && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                              🍽️ {recipe.servings} servings
                            </span>
                          )}
                          {recipe.difficulty && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              recipe.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                              recipe.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {recipe.difficulty === 'easy' ? '🟢' : recipe.difficulty === 'medium' ? '🟡' : '🔴'} {recipe.difficulty}
                            </span>
                          )}
                          {recipe.cuisine && (
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                              🌍 {recipe.cuisine}
                            </span>
                          )}
                        </div>

                        {/* Prep & Cook Time */}
                        {(recipe.prepTime || recipe.cookTime) && (
                          <div className="flex gap-6 pb-4 border-b border-gray-100">
                            {recipe.prepTime && (
                              <div className="text-center">
                                <Clock className="w-5 h-5 text-[#3AB1A0] mx-auto mb-1" />
                                <p className="text-xs text-gray-500">Prep Time</p>
                                <p className="font-bold text-gray-800">{recipe.prepTime}</p>
                              </div>
                            )}
                            {recipe.cookTime && (
                              <div className="text-center">
                                <Clock className="w-5 h-5 text-[#E06A26] mx-auto mb-1" />
                                <p className="text-xs text-gray-500">Cook Time</p>
                                <p className="font-bold text-gray-800">{recipe.cookTime}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Nutrition Info */}
                        {recipe.nutrition && (
                          <div>
                            <h4 className="mb-3 text-base font-bold text-gray-900">📊 Nutrition (per serving)</h4>
                            <div className="grid grid-cols-4 gap-2">
                              <div className="text-center p-2 bg-red-50 rounded-lg">
                                <p className="text-lg font-bold text-red-600">{recipe.nutrition.calories}</p>
                                <p className="text-xs text-gray-500">kcal</p>
                              </div>
                              <div className="text-center p-2 bg-blue-50 rounded-lg">
                                <p className="text-lg font-bold text-blue-600">{recipe.nutrition.protein}g</p>
                                <p className="text-xs text-gray-500">Protein</p>
                              </div>
                              <div className="text-center p-2 bg-yellow-50 rounded-lg">
                                <p className="text-lg font-bold text-yellow-600">{recipe.nutrition.carbs}g</p>
                                <p className="text-xs text-gray-500">Carbs</p>
                              </div>
                              <div className="text-center p-2 bg-orange-50 rounded-lg">
                                <p className="text-lg font-bold text-orange-600">{recipe.nutrition.fat}g</p>
                                <p className="text-xs text-gray-500">Fat</p>
                              </div>
                            </div>
                            {(recipe.nutrition.fiber || recipe.nutrition.sugar || recipe.nutrition.sodium) && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {recipe.nutrition.fiber && (
                                  <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                                    Fiber: {recipe.nutrition.fiber}g
                                  </span>
                                )}
                                {recipe.nutrition.sugar && (
                                  <span className="px-2 py-1 bg-pink-50 text-pink-700 rounded text-xs">
                                    Sugar: {recipe.nutrition.sugar}g
                                  </span>
                                )}
                                {recipe.nutrition.sodium && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                    Sodium: {recipe.nutrition.sodium}mg
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Dietary Info */}
                        {((Array.isArray(recipe.dietaryRestrictions) && recipe.dietaryRestrictions.length > 0) || (Array.isArray(recipe.allergens) && recipe.allergens.length > 0)) && (
                          <div className="p-3 bg-amber-50 rounded-xl">
                            {Array.isArray(recipe.dietaryRestrictions) && recipe.dietaryRestrictions.length > 0 && (
                              <div className="mb-2">
                                <p className="text-xs font-bold text-amber-800 mb-1">✅ Suitable for:</p>
                                <div className="flex flex-wrap gap-1">
                                  {recipe.dietaryRestrictions.map((d, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">{d}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {Array.isArray(recipe.allergens) && recipe.allergens.length > 0 && (
                              <div>
                                <p className="text-xs font-bold text-amber-800 mb-1">⚠️ Contains allergens:</p>
                                <div className="flex flex-wrap gap-1">
                                  {recipe.allergens.map((a, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">{a}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Equipment */}
                        {recipe.equipment && recipe.equipment.length > 0 && (
                          <div>
                            <h4 className="mb-2 text-sm font-bold text-gray-900">🔧 Equipment Needed</h4>
                            <div className="flex flex-wrap gap-2">
                              {recipe.equipment.map((eq, i) => (
                                <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{eq}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Ingredients */}
                        {recipe.ingredients && recipe.ingredients.length > 0 && (
                          <div>
                            <h4 className="mb-3 text-base font-bold text-gray-900">🥗 Ingredients</h4>
                            <ul className="space-y-2">
                              {recipe.ingredients.map((ing, i) => (
                                <li key={i} className="flex items-start gap-3 p-3 bg-[#3AB1A0]/5 rounded-lg">
                                  <div className="w-2 h-2 rounded-full bg-[#3AB1A0] mt-1.5 flex-shrink-0" />
                                  <span className="text-gray-700 text-sm">{ing}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Instructions */}
                        {recipe.instructions && recipe.instructions.length > 0 && (
                          <div>
                            <h4 className="mb-3 text-base font-bold text-gray-900">👨‍🍳 Instructions</h4>
                            <ol className="space-y-3">
                              {recipe.instructions.map((step, i) => (
                                <li key={i} className="flex gap-3">
                                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#E06A26] text-white flex items-center justify-center text-xs font-bold">
                                    {i + 1}
                                  </span>
                                  <span className="text-gray-700 text-sm pt-0.5">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* Tips */}
                        {recipe.tips && recipe.tips.length > 0 && (
                          <div className="p-4 bg-blue-50 rounded-xl">
                            <h4 className="mb-2 text-sm font-bold text-blue-900">💡 Pro Tips</h4>
                            <ul className="space-y-1">
                              {recipe.tips.map((tip, i) => (
                                <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                                  <span>•</span>
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Storage Info */}
                        {recipe.storage && (recipe.storage.refrigerator || recipe.storage.freezer) && (
                          <div className="p-4 bg-gray-50 rounded-xl">
                            <h4 className="mb-2 text-sm font-bold text-gray-900">🧊 Storage</h4>
                            <div className="space-y-1 text-sm text-gray-700">
                              {recipe.storage.refrigerator && (
                                <p>🥶 Refrigerator: {recipe.storage.refrigerator}</p>
                              )}
                              {recipe.storage.freezer && (
                                <p>❄️ Freezer: {recipe.storage.freezer}</p>
                              )}
                              {recipe.storage.instructions && (
                                <p className="text-xs text-gray-500 mt-1">{recipe.storage.instructions}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No recipe details available for this food item</p>
                    <p className="text-xs text-gray-400 mt-1">The dietitian will add recipe soon</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Modal Footer - Close Button */}
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => setRecipeModal({ item: {} as MealItem, isOpen: false })}
                className="w-full py-3 bg-[#3AB1A0] text-white rounded-xl font-bold hover:bg-[#2A9A8B] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alternatives Modal */}
      {alternativesModal.isOpen && alternativesModal.item.alternatives && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[80vh] overflow-hidden">
            <div className="sticky top-0 flex items-center justify-between p-4 bg-white border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Alternative Foods</h3>
              <button 
                onClick={() => setAlternativesModal({ item: {} as MealItem, isOpen: false })}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <p className="mb-4 text-sm text-gray-500">
                Instead of <span className="font-medium text-gray-700">{alternativesModal.item.name}</span>, you can have:
              </p>
              <div className="space-y-3">
                {alternativesModal.item.alternatives.map((alt, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#DB9C6E]/10 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-800">{alt.name}</p>
                      <p className="text-sm text-gray-500">{alt.portion}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#E06A26]">{alt.calories} kcal</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meal Completion Modal */}
      {completionModal.isOpen && completionModal.meal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 flex items-center justify-between p-4 bg-white border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Complete Meal</h3>
                <p className="text-sm text-gray-500">
                  {getMealLabel(completionModal.meal.type)} • {completionModal.meal.time}
                </p>
              </div>
              <button 
                onClick={closeCompletionModal}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[70vh] space-y-5">
              {/* Meal Type - Auto fetched */}
              <div className="bg-gradient-to-r from-[#3AB1A0]/10 to-[#E06A26]/10 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 text-2xl bg-white shadow-sm rounded-2xl">
                    {getMealIcon(completionModal.meal.type)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Meal Type</p>
                    <p className="font-semibold text-gray-900">{getMealLabel(completionModal.meal.type)}</p>
                  </div>
                </div>
                {completionModal.meal.items.length > 0 && (
                  <div className="pt-3 mt-3 border-t border-gray-200/50">
                    <p className="mb-2 text-xs text-gray-500">Planned foods:</p>
                    <div className="flex flex-wrap gap-2">
                      {completionModal.meal.items.map((item, i) => (
                        <span key={i} className="px-2 py-1 text-xs text-gray-700 bg-white rounded-full shadow-sm">
                          {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes - Optional */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Notes <span className="text-gray-400">(Optional)</span>
                </label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Any notes about this meal? (e.g., substitutions made, how you felt)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3AB1A0] focus:border-transparent resize-none"
                  rows={3}
                  maxLength={300}
                />
                <p className="mt-1 text-xs text-right text-gray-400">{completionNotes.length}/300</p>
              </div>

              {/* Image Upload - Required */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Meal Photo <span className="text-red-500">*</span>
                </label>
                <p className="mb-3 text-xs text-gray-500">
                  Please upload a photo of your meal as proof of completion
                </p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  capture="environment"
                />
                
                {completionImagePreview ? (
                  <div className="relative">
                    <div className="relative w-full h-48 overflow-hidden bg-gray-100 rounded-xl">
                      <Image
                        src={completionImagePreview}
                        alt="Meal preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setCompletionImage(null);
                        setCompletionImagePreview(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="absolute p-2 text-white transition-colors bg-red-500 rounded-full top-2 right-2 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 text-gray-700 rounded-lg text-sm font-medium hover:bg-white transition-colors flex items-center gap-1"
                    >
                      <Camera className="w-4 h-4" />
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-[#3AB1A0] hover:bg-[#3AB1A0]/5 transition-all"
                  >
                    <div className="w-16 h-16 rounded-full bg-[#3AB1A0]/10 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-[#3AB1A0]" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-700">Take or upload a photo</p>
                      <p className="text-sm text-gray-500">Tap to add meal photo</p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="p-4 bg-white border-t border-gray-100">
              <button
                onClick={handleSubmitCompletion}
                disabled={isSubmitting || !completionImage}
                className="w-full py-3 bg-[#3AB1A0] text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#2A9A8B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <SpoonGifLoader size="sm" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Submit Completion</span>
                  </>
                )}
              </button>
              {!completionImage && (
                <p className="mt-2 text-xs text-center text-red-500">
                  * Photo is required to complete meal
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowDatePicker(false)}
        >
          <div 
            className="bg-white w-full max-w-sm mx-4 rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-[#3AB1A0] to-[#2A9A8B]">
              <h3 className="text-lg font-bold text-white">📅 Select Date</h3>
              <button 
                onClick={() => setShowDatePicker(false)}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* Date Input */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 text-center">
                Choose a date to view your meal plan
              </p>
              <input
                type="date"
                value={datePickerValue}
                onChange={(e) => setDatePickerValue(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 text-center text-lg font-medium focus:outline-none focus:border-[#3AB1A0] transition-colors"
              />
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDatePickerSelect}
                  className="flex-1 py-3 bg-[#3AB1A0] text-white rounded-xl font-semibold hover:bg-[#2A9A8B] transition-colors"
                >
                  View Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
