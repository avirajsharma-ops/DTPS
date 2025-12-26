  'use client';

import { useEffect, useState, useRef, useCallback, Suspense, lazy } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Droplet,
  Moon,
  Activity,
  Utensils,
  Bed,
  User,
  ChevronRight,
  ChevronLeft,
  Flame,
  Footprints,
  BookOpen,
  Clock,
  UserCheck,
  Loader2,
  Calendar,
  Phone,
  Mail
} from 'lucide-react';
import SpoonGifLoader from '@/components/ui/SpoonGifLoader';

// Lazy load heavy components for better performance
const ServicePlansSwiper = lazy(() => import('@/components/client/ServicePlansSwiper'));
const TransformationSwiper = lazy(() => import('@/components/client/TransformationSwiper'));

// Utility function to dispatch data change events (meal plan, purchases, payments)
export function triggerDataRefresh(dataType: 'meal-plan' | 'client-purchases' | 'payment' | 'dietitian-assigned' | 'all') {
  window.dispatchEvent(new CustomEvent('user-data-changed', { detail: { dataType } }));
}

// Custom hook to listen for data changes and refresh UI
function useDataChangeListener(onDataChange: (dataType?: string) => void) {
  useEffect(() => {
    const handleDataChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { dataType } = customEvent.detail || {};
      onDataChange(dataType);
    };

    window.addEventListener('user-data-changed', handleDataChange);
    return () => {
      window.removeEventListener('user-data-changed', handleDataChange);
    };
  }, [onDataChange]);
}

interface DashboardData {
  caloriesLeft: number;
  caloriesGoal: number;
  protein: number;
  proteinGoal: number;
  carbs: number;
  carbsGoal: number;
  fat: number;
  fatGoal: number;
  water: { current: number; goal: number };
  sleep: { hours: number; minutes: number; quality: number };
  activity: { minutes: number; active: boolean };
  meals: { eaten: number; total: number; calories: number };
  steps: { current: number; goal: number };
}

interface UserProfile {
  bmi: string;
  bmiCategory: string;
  weightKg: string;
  heightCm: string;
  generalGoal: string;
}

interface PurchaseInfo {
  _id: string;
  planName: string;
  planCategory: string;
  durationDays: number;
  durationLabel: string;
  startDate: string;
  endDate: string;
  status: string;
  hasDietitian: boolean;
  mealPlanCreated: boolean;
  dietitian: {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar?: string;
  } | null;
}

export default function UserHomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeCard, setActiveCard] = useState(0);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [hasActivePlan, setHasActivePlan] = useState<boolean | null>(null);
  const [hasAnyPurchase, setHasAnyPurchase] = useState(false);
  const [hasPendingDietitianAssignment, setHasPendingDietitianAssignment] = useState(false);
  const [activePurchases, setActivePurchases] = useState<PurchaseInfo[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [paymentVerifying, setPaymentVerifying] = useState(false);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<DashboardData>({
    caloriesLeft: 0,
    caloriesGoal: 2000,
    protein: 0,
    proteinGoal: 120,
    carbs: 0,
    carbsGoal: 250,
    fat: 0,
    fatGoal: 65,
    water: { current: 0, goal: 2500 },
    sleep: { hours: 0, minutes: 0, quality: 0 },
    activity: { minutes: 0, active: false },
    meals: { eaten: 0, total: 4, calories: 0 },
    steps: { current: 0, goal: 10000 },
  });

  // Function to fetch real-time health data (water, sleep, activity, steps, calories)
  const fetchHealthData = useCallback(async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const [hydrationRes, sleepRes, activityRes, stepsRes, mealPlanRes, foodLogRes, progressRes] = await Promise.all([
        fetch(`/api/client/hydration?date=${today}`),
        fetch(`/api/client/sleep?date=${today}`),
        fetch(`/api/client/activity?date=${today}`),
        fetch(`/api/client/steps?date=${today}`),
        fetch(`/api/client/meal-plan?date=${today}`),
        fetch(`/api/client/food-log?date=${today}`),
        fetch(`/api/client/progress`)
      ]);

      const newData = { ...data };

      if (hydrationRes.ok) {
        const hydrationData = await hydrationRes.json();
        newData.water = {
          current: (hydrationData.totalToday / 1000) || 0, // Convert ml to L
          goal: (hydrationData.goal / 1000) || 2.5
        };
      }

      if (sleepRes.ok) {
        const sleepData = await sleepRes.json();
        const totalHours = sleepData.totalToday || 0;
        const hours = Math.floor(totalHours);
        const minutes = Math.round((totalHours - hours) * 60);
        const quality = sleepData.goal > 0 ? Math.round((totalHours / sleepData.goal) * 100) : 0;
        newData.sleep = { hours, minutes, quality: Math.min(quality, 100) };
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        newData.activity = {
          minutes: Math.round(activityData.totalToday || 0),
          active: (activityData.totalToday || 0) > 0
        };
      }

      if (stepsRes.ok) {
        const stepsData = await stepsRes.json();
        newData.steps = {
          current: stepsData.totalToday || 0,
          goal: stepsData.goal || 10000
        };
      }

      // Calculate calories from meal plan and food log
      let caloriesGoal = 2000; // Default goal
      let proteinGoal = 120; // Default protein goal in grams
      let carbsGoal = 250; // Default carbs goal in grams
      let fatGoal = 65; // Default fat goal in grams
      let caloriesConsumed = 0;
      let proteinConsumed = 0;
      let carbsConsumed = 0;
      let fatConsumed = 0;
      let mealsEaten = 0;
      let totalMeals = 4;

      // First, try to get goals from progress API
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        if (progressData.goals) {
          caloriesGoal = progressData.goals.calories || caloriesGoal;
          proteinGoal = progressData.goals.protein || proteinGoal;
          carbsGoal = progressData.goals.carbs || carbsGoal;
          fatGoal = progressData.goals.fat || fatGoal;
        }
        // Also get today's intake from progress API if available
        if (progressData.todayIntake) {
          caloriesConsumed = progressData.todayIntake.calories || 0;
          proteinConsumed = progressData.todayIntake.protein || 0;
          carbsConsumed = progressData.todayIntake.carbs || 0;
          fatConsumed = progressData.todayIntake.fat || 0;
        }
      }

      if (mealPlanRes.ok) {
        const mealPlanData = await mealPlanRes.json();
        if (mealPlanData.hasPlan) {
          // Get total calories goal from meal plan
          caloriesGoal = mealPlanData.totalCalories || mealPlanData.planDetails?.customizations?.targetCalories || caloriesGoal;
          totalMeals = mealPlanData.meals?.length || 4;
          
          // Only calculate macro goals from meal plan if progress API didn't provide them
          if (!progressRes.ok || caloriesConsumed === 0) {
            // Calculate macro goals from actual meal plan food items (sum of all meals for today)
            let totalProteinGoal = 0;
            let totalCarbsGoal = 0;
            let totalFatGoal = 0;
            
            // Calculate from all meals in today's plan
            for (const meal of (mealPlanData.meals || [])) {
              // Sum up macros from meal items
              if (meal.items && Array.isArray(meal.items)) {
                for (const item of meal.items) {
                  totalProteinGoal += parseFloat(item.protein) || 0;
                  totalCarbsGoal += parseFloat(item.carbs) || 0;
                  totalFatGoal += parseFloat(item.fats) || parseFloat(item.fat) || 0;
                }
              }
              // Also try meal-level macros if available
              if (meal.protein) totalProteinGoal += parseFloat(meal.protein) || 0;
              if (meal.carbs) totalCarbsGoal += parseFloat(meal.carbs) || 0;
              if (meal.fat) totalFatGoal += parseFloat(meal.fat) || 0;
            }
            
            // Use calculated goals if > 0, otherwise fall back to customizations or defaults
            proteinGoal = totalProteinGoal > 0 ? Math.round(totalProteinGoal) : (mealPlanData.planDetails?.customizations?.proteinGoal || proteinGoal);
            carbsGoal = totalCarbsGoal > 0 ? Math.round(totalCarbsGoal) : (mealPlanData.planDetails?.customizations?.carbsGoal || carbsGoal);
            fatGoal = totalFatGoal > 0 ? Math.round(totalFatGoal) : (mealPlanData.planDetails?.customizations?.fatGoal || fatGoal);
          }
          
          // Count completed meals
          mealsEaten = (mealPlanData.meals || []).filter((meal: any) => meal.isCompleted).length;
          
          // Only calculate consumed from meal plan if progress API didn't provide them
          if (!progressRes.ok || caloriesConsumed === 0) {
            // Calculate calories and macros from completed meals
            const completedMeals = (mealPlanData.meals || []).filter((meal: any) => meal.isCompleted);
            
            for (const meal of completedMeals) {
              // First try to use meal-level macros
              if (meal.totalCalories || meal.protein || meal.carbs || meal.fat) {
                caloriesConsumed += parseFloat(meal.totalCalories) || 0;
                proteinConsumed += parseFloat(meal.protein) || 0;
                carbsConsumed += parseFloat(meal.carbs) || 0;
                fatConsumed += parseFloat(meal.fat) || 0;
              }
              // If no meal-level macros, calculate from items
              else if (meal.items && Array.isArray(meal.items)) {
                for (const item of meal.items) {
                  caloriesConsumed += parseFloat(item.calories) || parseFloat(item.cal) || 0;
                  proteinConsumed += parseFloat(item.protein) || 0;
                  carbsConsumed += parseFloat(item.carbs) || 0;
                  fatConsumed += parseFloat(item.fats) || parseFloat(item.fat) || 0;
                }
              }
            }
          }
        }
      }

      // Also add calories from food log entries (manual food logging) if progress API didn't provide data
      if (caloriesConsumed === 0 && foodLogRes.ok) {
        const foodLogData = await foodLogRes.json();
        if (foodLogData.success && foodLogData.entries) {
          const entries = foodLogData.entries || [];
          const foodLogCalories = entries.reduce((sum: number, entry: any) => sum + (parseFloat(entry.calories) || 0), 0);
          const foodLogProtein = entries.reduce((sum: number, entry: any) => sum + (parseFloat(entry.protein) || 0), 0);
          const foodLogCarbs = entries.reduce((sum: number, entry: any) => sum + (parseFloat(entry.carbs) || 0), 0);
          const foodLogFat = entries.reduce((sum: number, entry: any) => sum + (parseFloat(entry.fat) || 0), 0);
          caloriesConsumed += foodLogCalories;
          proteinConsumed += foodLogProtein;
          carbsConsumed += foodLogCarbs;
          fatConsumed += foodLogFat;
        }
      }

      newData.caloriesGoal = caloriesGoal;
      newData.caloriesLeft = Math.max(0, caloriesGoal - caloriesConsumed);
      newData.protein = proteinConsumed;
      newData.proteinGoal = proteinGoal;
      newData.carbs = carbsConsumed;
      newData.carbsGoal = carbsGoal;
      newData.fat = fatConsumed;
      newData.fatGoal = fatGoal;
      newData.meals = { eaten: mealsEaten, total: totalMeals, calories: caloriesConsumed };

      setData(newData);
    } catch (error) {
      console.error('Error fetching health data:', error);
    }
  }, []);

  
  // Function to refresh all data (called when meal plan, purchases, or payments change)
  const refreshAllData = useCallback(async () => {
    try {
      const [planRes, profileRes] = await Promise.all([
        fetch('/api/client/service-plans'),
        fetch('/api/client/profile')
      ]);
      
      // Also fetch health data
      fetchHealthData();

      if (planRes.ok) {
        const planData = await planRes.json();
        setHasActivePlan(planData.hasActivePlan || false);
        setHasAnyPurchase(planData.hasAnyPurchase || false);
        setHasPendingDietitianAssignment(planData.hasPendingDietitianAssignment || false);
        setActivePurchases(planData.activePurchases || []);
      }

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setUserProfile({
          bmi: profileData.bmi || '',
          bmiCategory: profileData.bmiCategory || '',
          weightKg: profileData.weightKg || '',
          heightCm: profileData.heightCm || '',
          generalGoal: profileData.generalGoal || ''
        });
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [fetchHealthData]);

  // Listen for data changes and refresh
  useDataChangeListener(refreshAllData);

  // SSE listener for real-time BMI updates
  useEffect(() => {
    if (!session?.user?.id) return;

    const eventSource = new EventSource('/api/realtime/sse');

    eventSource.addEventListener('bmi_update', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Update the userProfile state with new BMI data
        setUserProfile(prev => prev ? {
          ...prev,
          bmi: data.bmi || prev.bmi,
          bmiCategory: data.bmiCategory || prev.bmiCategory,
          weightKg: data.weightKg || prev.weightKg,
          heightCm: data.heightCm || prev.heightCm
        } : null);
      } catch (error) {
        console.error('Error parsing BMI SSE event:', error);
      }
    });

    eventSource.onerror = (error) => {
      console.warn('SSE connection error:', error);
    };

    return () => {
      eventSource.close();
    };
  }, [session?.user?.id]);

  // Refresh data when page becomes visible (user switches back to tab)
  // useEffect(() => {
  //   const handleVisibilityChange = () => {
  //     if (document.visibilityState === 'visible' && session?.user) {
  //       Refresh when user comes back to the page
  //       refreshAllData();
  //     }
  //   };

  //   document.addEventListener('visibilitychange', handleVisibilityChange);

  //   return () => {
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //   };
  // }, [session, refreshAllData]);

  // Handle payment callback verification
  useEffect(() => {
    const verifyPaymentCallback = async () => {
      const paymentSuccess = searchParams.get('payment_success');
      const paymentLinkId = searchParams.get('razorpay_payment_link_id');
      const razorpayPaymentId = searchParams.get('razorpay_payment_id');
      const paymentStatus = searchParams.get('razorpay_payment_link_status');
      const signature = searchParams.get('razorpay_signature');

      // If payment callback parameters exist, verify the payment
      if (paymentLinkId && paymentStatus === 'paid') {
        setPaymentVerifying(true);
        try {
          // Try the client service-plans verify first (for purchases made via ServicePlansSwiper)
          const response = await fetch('/api/client/service-plans/verify-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpayPaymentLinkId: paymentLinkId,
              razorpayPaymentId: razorpayPaymentId,
              signature
            })
          });

          const data = await response.json();

          if (data.success) {
            toast.success('Payment successful! Your plan is now active.');
            setHasAnyPurchase(true);
            // Refresh all data to show updated status
            refreshAllData();
            // Clear the URL parameters
            router.replace('/user');
          } else {
            toast.error(data.error || 'Payment verification failed');
          }
        } catch (error) {
          console.error('Payment verification error:', error);
          toast.error('Failed to verify payment. Please contact support.');
        } finally {
          setPaymentVerifying(false);
        }
      } else if (paymentSuccess === 'true' && !paymentLinkId) {
        // Direct payment success without link ID - just show success
        toast.success('Payment successful!');
        router.replace('/user');
      }
    };

    verifyPaymentCallback();
  }, [searchParams, router]);

  // Check onboarding status on mount
  useEffect(() => {
    const checkOnboarding = async () => {
      if (status === 'loading') return;

      try {
        // Check onboarding and active plan in parallel
        const [onboardingRes, planRes] = await Promise.all([
          fetch('/api/client/onboarding'),
          fetch('/api/client/service-plans')
        ]);

        if (onboardingRes.ok) {
          const data = await onboardingRes.json();
          if (!data.onboardingCompleted) {
            router.replace('/user/onboarding');
            return;
          }
        }

        if (planRes.ok) {
          const planData = await planRes.json();
          setHasActivePlan(planData.hasActivePlan || false);
          setHasAnyPurchase(planData.hasAnyPurchase || false);
          setHasPendingDietitianAssignment(planData.hasPendingDietitianAssignment || false);
          setActivePurchases(planData.activePurchases || []);
        } else {
          // If API fails, assume no active plan so user can see available plans
          setHasActivePlan(false);
        }

        // Fetch user profile data (BMI, weight, height, etc.)
        try {
          const profileRes = await fetch('/api/client/profile');
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            setUserProfile({
              bmi: profileData.bmi || '',
              bmiCategory: profileData.bmiCategory || '',
              weightKg: profileData.weightKg || '',
              heightCm: profileData.heightCm || '',
              generalGoal: profileData.generalGoal || ''
            });
          }
        } catch (profileError) {
          console.error('Error fetching profile:', profileError);
        }
        
        // Fetch real-time health data (water, sleep, activity, steps)
        fetchHealthData();
      } catch (error) {
        console.error('Error checking onboarding:', error);
        // If there's an error, assume no active plan so user can see available plans
        setHasActivePlan(false);
      }
      setCheckingOnboarding(false);
    };

    checkOnboarding();
  }, [status, router]);

  // Handle scroll to update active card indicator
  const handleCardsScroll = () => {
    if (cardsContainerRef.current) {
      const container = cardsContainerRef.current;
      const scrollLeft = container.scrollLeft;
      const cardWidth = container.offsetWidth;
      const newActiveCard = Math.round(scrollLeft / cardWidth);
      setActiveCard(newActiveCard);
    }
  };

  const today = new Date();
  const dayName = format(today, 'EEEE').toUpperCase();
  const dateStr = format(today, 'MMM d').toUpperCase();

  const caloriesConsumed = data.caloriesGoal - data.caloriesLeft;
  const caloriesPercent = (caloriesConsumed / data.caloriesGoal) * 100;
  const waterPercent = (data.water.current / data.water.goal) * 100;
  const mealsPercent = (data.meals.eaten / data.meals.total) * 100;

  const userName = session?.user?.firstName || 'Alex';

  // Show loading while checking onboarding or verifying payment
  if (checkingOnboarding || paymentVerifying) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
        <SpoonGifLoader size="lg" />
        {paymentVerifying && (
          <p className="mt-4 text-gray-600 font-medium">Verifying your payment...</p>
        )}
      </div>
    );
  }

  // BMI values derived from userProfile
  const bmiValue = userProfile?.bmi || '';
  const bmiCategory = userProfile?.bmiCategory || '';
  // Calculate BMI progress for indicator (between 15 and 40)
  const bmiNum = parseFloat(bmiValue);
  const bmiProgress = !isNaN(bmiNum)
    ? Math.min(100, Math.max(0, ((bmiNum - 15) / (40 - 15)) * 100))
    : 0;

  return (
    <div className="bg-gray-50">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium tracking-wider text-gray-500">
              {dayName}, {dateStr}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              Hi, {userName}
            </h1>
          </div>
          <Link href="/user/profile">
            <div className="h-12 w-12 rounded-full bg-[#E06A26]/10 flex items-center justify-center overflow-hidden border-2 border-[#E06A26]/30">
              {session?.user?.avatar ? (
                <img
                  src={session.user.avatar}
                  alt="Profile"
                  loading="lazy"
                  className="w-full h-full rounded-full "
                />
              ) : (
                <User className="h-6 w-6 text-[#E06A26]" />
              )}
            </div>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-4 space-y-4 ">
        {/* Calories Card */}
        <div className="bg-linear-to-br from-[#3AB1A0]/10 to-[#3AB1A0]/20 rounded-3xl p-5 shadow-sm border border-[#3AB1A0]/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Calories Left</p>
              <div className="flex items-baseline mt-1">
                <span className="text-5xl font-bold text-gray-900">{data.caloriesLeft}</span>
                <span className="ml-1 text-lg text-gray-500">kcal</span>
              </div>
              <div className="flex items-center px-3 py-1 mt-2 rounded-full bg-white/60 w-fit">
                <span className="text-[#3AB1A0] text-sm">🏁 Goal: {data.caloriesGoal.toLocaleString()}</span>
              </div>
            </div>

            {/* Circular Progress */}
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${caloriesPercent * 2.51} 251`}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3AB1A0" />
                    <stop offset="100%" stopColor="#2d9a8a" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-14 w-14 rounded-full bg-[#3AB1A0]/20 flex items-center justify-center">
                  <Flame className="h-7 w-7 text-[#3AB1A0]" />
                </div>
              </div>
            </div>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium tracking-wider text-gray-500 uppercase">Protein</p>
                <p className="text-xs text-gray-400">/{data.proteinGoal}g</p>
              </div>
              <p className="mt-1 text-xl font-bold text-gray-900">{data.protein}g</p>
              <div className="h-1.5 bg-white rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-[#3AB1A0] rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min((data.protein / data.proteinGoal) * 100, 100)}%` }} 
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium tracking-wider text-gray-500 uppercase">Carbs</p>
                <p className="text-xs text-gray-400">/{data.carbsGoal}g</p>
              </div>
              <p className="mt-1 text-xl font-bold text-gray-900">{data.carbs}g</p>
              <div className="h-1.5 bg-white rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-[#E06A26] rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min((data.carbs / data.carbsGoal) * 100, 100)}%` }} 
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium tracking-wider text-gray-500 uppercase">Fat</p>
                <p className="text-xs text-gray-400">/{data.fatGoal}g</p>
              </div>
              <p className="mt-1 text-xl font-bold text-gray-900">{data.fat}g</p>
              <div className="h-1.5 bg-white rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-[#DB9C6E] rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min((data.fat / data.fatGoal) * 100, 100)}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

    
{/* Service Plans Swiper - Only shown when user has no purchases at all */}
{!hasAnyPurchase && (
  <div className="pt-6 pb-4">
    <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-5 w-5 mr-2 animate-spin" /></div>}>
      <ServicePlansSwiper />
    </Suspense>
  </div>
)}

        {/* Purchase Status Cards - Show only the first/current active purchase */}
        {activePurchases.length > 0 && (() => {
          // Get the current active purchase (first one or most recent)
          const currentPurchase = activePurchases[0];
          return (
          <div key={currentPurchase._id}>
            {currentPurchase.mealPlanCreated ? (
              /* STATE 3: Meal Plan Created - Full Details with actions */
              <div className="rounded-3xl bg-linear-to-br from-[#3AB1A0]/10 to-[#61a035]/10 p-6 shadow-sm border border-[#3AB1A0]/20">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-[#3AB1A0]/20 flex items-center justify-center overflow-hidden border-2 border-[#3AB1A0]/30">
                    {currentPurchase.dietitian?.avatar ? (
                      <img 
                        src={currentPurchase.dietitian.avatar} 
                        alt={currentPurchase.dietitian.name}
                        loading="lazy"
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <UserCheck className="h-8 w-8 text-[#3AB1A0]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {currentPurchase.hasDietitian ? 'Your Dietitian' : 'Your Plan'}
                      </h3>
                      <span className="px-2 py-0.5 bg-[#3AB1A0] text-white text-xs font-semibold rounded-full">
                        Active ✓
                      </span>
                    </div>
                    {currentPurchase.hasDietitian && (
                      <>
                        <p className="text-base font-semibold text-[#3AB1A0] mt-1">
                          {currentPurchase.dietitian?.name || 'Dietitian'}
                        </p>
                        {currentPurchase.dietitian?.email && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <Mail className="w-3 h-3" />
                            <span>{currentPurchase.dietitian.email}</span>
                          </div>
                        )}
                        {currentPurchase.dietitian?.phone && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <Phone className="w-3 h-3" />
                            <span>{currentPurchase.dietitian.phone}</span>
                          </div>
                        )}
                      </>
                    )}
                    {!currentPurchase.hasDietitian && (
                      <p className="text-base font-semibold text-[#3AB1A0] mt-1">
                        {currentPurchase.planName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Plan Info - Full Details */}
                <div className="mt-4 pt-4 border-t border-[#3AB1A0]/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Active Plan</span>
                    <span className="px-3 py-1 bg-[#61a035]/15 text-[#61a035] text-xs font-semibold rounded-full">
                      🟢 Active
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white/60 rounded-xl">
                      <p className="text-xs tracking-wide text-gray-500 uppercase">Plan</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">{currentPurchase.planName}</p>
                    </div>
                    <div className="p-3 bg-white/60 rounded-xl">
                      <p className="text-xs tracking-wide text-gray-500 uppercase">Duration</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">{currentPurchase.durationDays} Days</p>
                    </div>
                    {/* Show dates when meal plan is created */}
                    {currentPurchase.startDate && (
                      <div className="p-3 bg-white/60 rounded-xl">
                        <p className="text-xs tracking-wide text-gray-500 uppercase">Start Date</p>
                        <p className="mt-1 text-sm font-semibold text-gray-800">
                          {format(new Date(currentPurchase.startDate), 'dd MMM yyyy')}
                        </p>
                      </div>
                    )}
                    {currentPurchase.endDate && (
                      <div className="p-3 bg-white/60 rounded-xl">
                        <p className="text-xs tracking-wide text-gray-500 uppercase">End Date</p>
                        <p className="mt-1 text-sm font-semibold text-gray-800">
                          {format(new Date(currentPurchase.endDate), 'dd MMM yyyy')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions - View Meal Plan, Message & Book Appointment */}
                <div className="mt-4 pt-4 border-t border-[#3AB1A0]/10 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Link 
                      href="/user/plan"
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-[#3AB1A0] text-white rounded-xl text-sm font-semibold hover:bg-[#2A9A8B] transition-colors"
                    >
                      <Utensils className="w-4 h-4" />
                      <span>View Meal Plan</span>
                    </Link>
                    <Link 
                      href="/user/messages"
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-[#3AB1A0] text-[#3AB1A0] rounded-xl text-sm font-semibold hover:bg-[#3AB1A0]/10 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Message</span>
                    </Link>
                  </div>
                  {currentPurchase.hasDietitian && (
                    <Link 
                      href="/user/appointments/book"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#E06A26] text-white rounded-xl text-sm font-semibold hover:bg-[#d55f1f] transition-colors"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Book Appointment</span>
                    </Link>
                  )}
                </div>
              </div>
            ) : currentPurchase.hasDietitian ? (
              /* STATE 2: Dietitian Assigned but Meal Plan NOT Created Yet */
              <div className="rounded-3xl bg-linear-to-br from-[#3AB1A0]/10 to-[#61a035]/10 p-6 shadow-sm border border-[#3AB1A0]/20">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-[#3AB1A0]/20 flex items-center justify-center overflow-hidden border-2 border-[#3AB1A0]/30">
                    {currentPurchase.dietitian?.avatar ? (
                      <img 
                        src={currentPurchase.dietitian.avatar} 
                        alt={currentPurchase.dietitian.name}
                        loading="lazy"
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <UserCheck className="h-8 w-8 text-[#3AB1A0]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">Your Dietitian</h3>
                      <span className="px-2 py-0.5 bg-[#3AB1A0] text-white text-xs font-semibold rounded-full">
                        Assigned ✓
                      </span>
                    </div>
                    <p className="text-base font-semibold text-[#3AB1A0] mt-1">
                      {currentPurchase.dietitian?.name || 'Dietitian'}
                    </p>
                    {currentPurchase.dietitian?.email && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <Mail className="w-3 h-3" />
                        <span>{currentPurchase.dietitian.email}</span>
                      </div>
                    )}
                    {currentPurchase.dietitian?.phone && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span>{currentPurchase.dietitian.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Plan Info - No meal plan yet */}
                <div className="mt-4 pt-4 border-t border-[#3AB1A0]/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Your Plan</span>
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Plan Soon
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white/60 rounded-xl">
                      <p className="text-xs tracking-wide text-gray-500 uppercase">Plan</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">{currentPurchase.planName}</p>
                    </div>
                    <div className="p-3 bg-white/60 rounded-xl">
                      <p className="text-xs tracking-wide text-gray-500 uppercase">Duration</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">{currentPurchase.durationDays} Days</p>
                    </div>
                  </div>
                  {/* Notice - Meal plan being prepared */}
                  <div className="p-4 mt-3 border bg-blue-50 rounded-xl border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Utensils className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-blue-800">Meal Plan Coming Soon!</p>
                        <p className="text-xs text-blue-600 mt-1">
                          Your dietitian is preparing a personalized meal plan for you. You'll be notified once it's ready.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message & Book Appointment Actions */}
                <div className="mt-4 pt-4 border-t border-[#3AB1A0]/10 space-y-3">
                  <Link 
                    href="/user/messages"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#3AB1A0] text-white rounded-xl text-sm font-semibold hover:bg-[#2A9A8B] transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Message Your Dietitian</span>
                  </Link>
                  <Link 
                    href="/user/appointments/book"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#E06A26] text-white rounded-xl text-sm font-semibold hover:bg-[#d55f1f] transition-colors"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Book Appointment</span>
                  </Link>
                </div>
              </div>
            ) : (
              /* STATE 1: Plan Purchased, Waiting for Dietitian Assignment */
              <div className="rounded-3xl bg-linear-to-br from-[#E06A26]/10 to-[#DB9C6E]/10 p-6 shadow-sm border border-[#E06A26]/20">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center">
                     <img
                       src="/images/dtps-logo.png"
                       alt="DTPS"
                       loading="lazy"
                       className="object-cover w-full h-full"
                     />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">Plan Purchased! 🎉</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      You've successfully purchased <span className="font-semibold text-[#E06A26]">{currentPurchase.planName}</span>
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-sm text-[#DB9C6E]">
                      <Clock className="w-4 h-4" />
                      <span>Dietitian will be assigned shortly...</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Our team is reviewing your profile and will assign the best dietitian for your goals.
                    </p>
                  </div>
                </div>
                
                {/* Plan Details - Only show duration, no dates until dietitian assigned */}
                <div className="mt-4 pt-4 border-t border-[#E06A26]/10">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white/60 rounded-xl">
                      <p className="text-xs tracking-wide text-gray-500 uppercase">Plan</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">{currentPurchase.planName}</p>
                    </div>
                    <div className="p-3 bg-white/60 rounded-xl">
                      <p className="text-xs tracking-wide text-gray-500 uppercase">Duration</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">{currentPurchase.durationDays} Days</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        })()}
       
    {/* BMI Card - Show if BMI is available */}
    {/* BMI Card */}
{bmiValue && (
  <div className="rounded-3xl bg-white p-6 shadow-sm border border-[#E06A26]/15">

    {/* Header */}
    <div className="flex items-center justify-between mb-5">
      <div>
        <p className="text-xs font-medium tracking-wider text-gray-500 uppercase">
          Body Mass Index
        </p>
        <div className="flex items-end gap-2 mt-1">
          <span className="text-4xl font-bold text-gray-900">
            {bmiValue}
          </span>
          <span className="mb-1 text-sm text-gray-500">kg/m²</span>
        </div>
      </div>

      {/* Category Badge */}
      <span
        className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
          bmiCategory === 'Normal'
            ? 'bg-[#3AB1A0]/15 text-[#3AB1A0]'
            : bmiCategory === 'Underweight'
            ? 'bg-blue-100 text-blue-700'
            : bmiCategory === 'Overweight'
            ? 'bg-[#DB9C6E]/20 text-[#DB9C6E]'
            : 'bg-[#E06A26]/15 text-[#E06A26]'
        }`}
      >
        {bmiCategory}
      </span>
    </div>

    {/* Progress Bar */}
    <div className="relative mt-6">
      <div className="flex h-3 overflow-hidden rounded-full">
        <div className="w-[14%] bg-blue-400/70" />
        <div className="w-[26%] bg-[#3AB1A0]" />
        <div className="w-[20%] bg-[#DB9C6E]" />
        <div className="w-[40%] bg-[#E06A26]" />
      </div>

      {/* Indicator */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 top-1/2 transition-all duration-300"
        style={{ left: `${bmiProgress}%` }}
      >
        <div className="w-5 h-5 bg-white border-2 border-gray-900 rounded-full shadow-md" />
      </div>
    </div>

    {/* Scale */}
    <div className="flex justify-between mt-2 text-xs text-gray-400">
      <span>15</span>
      <span>18.5</span>
      <span>25</span>
      <span>30</span>
      <span>40</span>
    </div>

    <div className="flex justify-between mt-1 text-xs font-medium">
      <span className="text-blue-500">Under</span>
      <span className="text-[#3AB1A0]">Normal</span>
      <span className="text-[#DB9C6E]">Over</span>
      <span className="text-[#E06A26]">Obese</span>
    </div>

    {/* Weight & Height */}
    <div className="grid grid-cols-2 gap-4 pt-4 mt-6 border-t border-gray-100">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#3AB1A0]/15 flex items-center justify-center">
          <Activity className="h-5 w-5 text-[#3AB1A0]" />
        </div>
        <div>
          <p className="text-xs text-gray-500">Weight</p>
          <p className="font-semibold text-gray-900">
            {userProfile?.weightKg} kg
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#E06A26]/15 flex items-center justify-center">
          <User className="h-5 w-5 text-[#E06A26]" />
        </div>
        <div>
          <p className="text-xs text-gray-500">Height</p>
          <p className="font-semibold text-gray-900">
            {userProfile?.heightCm} cm
          </p>
        </div>
      </div>
    </div>
  </div>
)}



        {/* Swipeable Image Cards - Only shown when user has no purchases at all */}
        {!hasAnyPurchase && (
          <div className="relative">
            <div
              ref={cardsContainerRef}
              onScroll={handleCardsScroll}
              className="flex gap-4 pb-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            >
              {/* Card 1 - Nutrition Tips */}
              <div className="min-w-full snap-start bg-linear-to-br from-[#DB9C6E] to-[#c88b5d] rounded-3xl p-5 text-white">
                <h4 className="mb-4 text-lg font-bold">Nutrition Tips</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center justify-center h-24 mb-3 overflow-hidden bg-white/30 rounded-xl">
                      <img src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=200&h=150&fit=crop" alt="Healthy breakfast" loading="lazy" className="object-cover w-full h-full rounded-xl" />
                    </div>
                    <p className="text-sm font-semibold">Healthy Breakfast</p>
                    <p className="mt-1 text-xs text-white/80">Start your day right</p>
                  </div>
                  <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center justify-center h-24 mb-3 overflow-hidden bg-white/30 rounded-xl">
                      <img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=150&fit=crop" alt="Fresh salad" loading="lazy" className="object-cover w-full h-full rounded-xl" />
                    </div>
                    <p className="text-sm font-semibold">Fresh Salads</p>
                    <p className="mt-1 text-xs text-white/80">Colorful vegetables</p>
                  </div>
                </div>
              </div>

              {/* Card 2 - Fitness Goals */}
              <div className="min-w-full snap-start bg-linear-to-br from-[#DB9C6E] to-[#c88b5d] rounded-3xl p-5 text-white">
                <h4 className="mb-4 text-lg font-bold">Fitness Goals</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center justify-center h-24 mb-3 overflow-hidden bg-white/30 rounded-xl">
                      <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=150&fit=crop" alt="Workout" loading="lazy" className="object-cover w-full h-full rounded-xl" />
                    </div>
                    <p className="text-sm font-semibold">Daily Workout</p>
                    <p className="mt-1 text-xs text-white/80">30 mins exercise</p>
                  </div>
                  <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center justify-center h-24 mb-3 overflow-hidden bg-white/30 rounded-xl">
                      <img src="https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=200&h=150&fit=crop" alt="Running" loading="lazy" className="object-cover w-full h-full rounded-xl" />
                    </div>
                    <p className="text-sm font-semibold">Cardio Run</p>
                    <p className="mt-1 text-xs text-white/80">Build endurance</p>
                  </div>
                </div>
              </div>

              {/* Card 3 - Wellness */}
              <div className="min-w-full snap-start bg-linear-to-br from-[#DB9C6E] to-[#c88b5d] rounded-3xl p-5 text-white">
                <h4 className="mb-4 text-lg font-bold">Wellness & Rest</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center justify-center h-24 mb-3 overflow-hidden bg-white/30 rounded-xl">
                      <img src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=150&fit=crop" alt="Yoga" loading="lazy" className="object-cover w-full h-full rounded-xl" />
                    </div>
                    <p className="text-sm font-semibold">Morning Yoga</p>
                    <p className="mt-1 text-xs text-white/80">Stretch & relax</p>
                  </div>
                  <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center justify-center h-24 mb-3 overflow-hidden bg-white/30 rounded-xl">
                      <img src="https://images.unsplash.com/photo-1531353826977-0941b4779a1c?w=200&h=150&fit=crop" alt="Sleep" loading="lazy" className="object-cover w-full h-full rounded-xl" />
                    </div>
                    <p className="text-sm font-semibold">Quality Sleep</p>
                    <p className="mt-1 text-xs text-white/80">7-8 hours rest</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Swipe indicator dots */}
            <div className="flex justify-center gap-1.5 mt-3">
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${activeCard === index ? 'bg-[#E06A26]' : 'bg-gray-300'
                    }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Motivational Quote */}
        <div className="p-5 bg-white shadow-sm rounded-2xl">
          <div className="flex items-start gap-3">
            <span className="text-3xl text-[#3AB1A0]/30">"</span>
            <div className="flex-1">
              <p className="italic text-gray-700">
                "The only bad workout is the one that didn't happen."
              </p>
              <p className="text-[#E06A26] text-xs font-semibold mt-2 tracking-wider uppercase">
                Daily Motivation
              </p>
            </div>
            <span className="text-3xl text-[#3AB1A0]/30 self-end">"</span>
          </div>
        </div>

        {/* Water & Sleep Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Water Card */}
          <Link href="/user/hydration" className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border border-[#3AB1A0]/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium tracking-wider text-gray-500 uppercase">Water</p>
              <span className="text-[#3AB1A0] text-sm font-semibold">{Math.round(waterPercent)}%</span>
            </div>
            <div className="flex items-center justify-center mb-3">
              <div className="relative w-16 h-16">
                {/* Circular progress background */}
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="#3AB1A0" strokeOpacity="0.2" strokeWidth="6" fill="none" />
                  <circle
                    cx="32" cy="32" r="28"
                    stroke="#3AB1A0"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${waterPercent * 1.76} 176`}
                    className="transition-all duration-500"
                  />
                </svg>
                {/* Water drop icon in center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Droplet className="h-6 w-6 text-[#3AB1A0]" fill="#3AB1A0" fillOpacity="0.3" />
                </div>
              </div>
            </div>
            <p className="text-center">
              <span className="text-2xl font-bold text-gray-900">{data.water.current}</span>
              <span className="text-sm text-gray-500"> / {data.water.goal}L</span>
            </p>
          </Link>

          {/* Sleep Card */}
          <Link href="/user/sleep" className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border border-[#DB9C6E]/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium tracking-wider text-gray-500 uppercase">Sleep</p>
              <span className="text-[#DB9C6E] text-sm font-semibold">{data.sleep.hours}h {data.sleep.minutes}m</span>
            </div>
            <div className="flex items-center justify-center mb-3">
              <div className="h-16 w-16 rounded-2xl bg-[#DB9C6E]/10 flex items-center justify-center">
                <Bed className="h-8 w-8 text-[#DB9C6E]" />
              </div>
            </div>
            <p className="text-center">
              <span className="text-2xl font-bold text-gray-900">{data.sleep.quality}</span>
              <span className="text-sm text-gray-500"> %</span>
            </p>
          </Link>
        </div>

        {/* Activity & Steps Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Activity Card */}
          <Link href="/user/activity" className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border border-[#E06A26]/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium tracking-wider text-gray-500 uppercase">Activity</p>
              <span className={`text-sm font-semibold ${data.activity.active ? 'text-[#E06A26]' : 'text-gray-400'}`}>
                {data.activity.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center justify-center mb-3">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="#E06A26" strokeOpacity="0.2" strokeWidth="6" fill="none" />
                  <circle
                    cx="32" cy="32" r="28"
                    stroke="#E06A26"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${(data.activity.minutes / 60) * 176} 176`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-[#E06A26]" />
                </div>
              </div>
            </div>
            <p className="text-center">
              <span className="text-2xl font-bold text-gray-900">{data.activity.minutes}</span>
              <span className="text-sm text-gray-500"> min</span>
            </p>
          </Link>

          {/* Steps Card */}
          <Link href="/user/steps" className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border border-[#3AB1A0]/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium tracking-wider text-gray-500 uppercase">Steps</p>
              <span className="text-[#3AB1A0] text-sm font-semibold">{data.steps.current} / {data.steps.goal}</span>
            </div>
            <div className="flex items-center justify-center mb-3">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="#3AB1A0" strokeOpacity="0.2" strokeWidth="6" fill="none" />
                  <circle
                    cx="32" cy="32" r="28"
                    stroke="#3AB1A0"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${mealsPercent * 1.76} 176`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Footprints className="h-6 w-6 text-[#3AB1A0]" />
                </div>
              </div>
            </div>
            <p className="text-center">
              <span className="text-2xl font-bold text-gray-900">{data.steps.current.toLocaleString()}</span>
              <span className="text-sm text-gray-500"> Steps</span>
            </p>
          </Link>
        </div>

        {/* Quick Log Section */}

        <div>
  <h2 className="text-lg font-bold text-[#E06A26] mb-4">
    Quick Log
  </h2>

  {/* Grid Container */}
  <div className="grid grid-cols-2 gap-4">
    
    {/* Water */}
    <Link
      href="/user/hydration"
      className="flex flex-col items-center gap-4 p-6 transition-all bg-white shadow-md rounded-3xl hover:shadow-lg hover:bg-gray-50"
    >
      <div className="h-16 w-16 rounded-full bg-[#3AB1A0]/10 flex items-center justify-center">
        <Droplet className="h-8 w-8 text-[#3AB1A0]" fill="#3AB1A0" fillOpacity="0.3" />
      </div>
      <span className="text-base font-semibold text-gray-900">Water</span>
      <span className="text-sm text-gray-400">+250 ml</span>
    </Link>

    {/* Exercise */}
    <Link
      href="/user/activity"
      className="flex flex-col items-center gap-4 p-6 transition-all bg-white shadow-md rounded-3xl hover:shadow-lg hover:bg-gray-50"
    >
      <div className="h-16 w-16 rounded-full bg-[#E06A26]/10 flex items-center justify-center">
        <Activity className="h-8 w-8 text-[#E06A26]" />
      </div>
      <span className="text-base font-semibold text-gray-900">Exercise</span>
      <span className="text-sm text-gray-400">Log Activity</span>
    </Link>

    {/* Sleep */}
    <Link
      href="/user/sleep"
      className="flex flex-col items-center gap-4 p-6 transition-all bg-white shadow-md rounded-3xl hover:shadow-lg hover:bg-gray-50"
    >
      <div className="h-16 w-16 rounded-full bg-[#DB9C6E]/20 flex items-center justify-center">
        <Moon className="h-8 w-8 text-[#DB9C6E]" />
      </div>
      <span className="text-base font-semibold text-gray-900">Sleep</span>
      <span className="text-sm text-gray-400">Duration</span>
    </Link>

    {/* Steps */}
    <Link
      href="/user/steps"
      className="flex flex-col items-center gap-4 p-6 transition-all bg-white shadow-md rounded-3xl hover:shadow-lg hover:bg-gray-50"
    >
      <div className="h-16 w-16 rounded-full bg-[#3AB1A0]/10 flex items-center justify-center">
        <Footprints className="h-8 w-8 text-[#3AB1A0]" />
      </div>
      <span className="text-base font-semibold text-gray-900">Steps</span>
      <span className="text-sm text-gray-400">
        {data.steps.current.toLocaleString()}
      </span>
    </Link>

  </div>
</div>

        {/* Transformation Success Stories */}
        <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-5 w-5 mr-2 animate-spin" /></div>}>
          <TransformationSwiper />
        </Suspense>

        {/* Blogs Section */}
        <div className="">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-[#E06A26]">Blogs</h2>
            <Link href="/user/blogs" className="text-[#3AB1A0] text-sm font-medium uppercase tracking-wider hover:underline">
              View All
            </Link>
          </div>
        </div>
        <div className="px-">
          <div className="flex gap-4 pb-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
            {/* Blog Card 1 */}
            <div className="min-w-65 snap-start bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="relative h-32 bg-linear-to-br from-amber-100 to-orange-100">
                <span className="absolute px-2 py-1 text-xs font-semibold text-gray-700 rounded-full top-3 left-3 bg-white/90">
                  NUTRITION
                </span>
                <div className="absolute flex items-center gap-1 px-2 py-1 text-xs text-white rounded-full bottom-3 right-3 bg-black/50">
                  <Clock className="w-3 h-3" />
                  5 min read
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900">Meal Prep 101: A Guide</h3>
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                  Master the art of preparing healthy meals for the entire week in under two hours.
                </p>
                <Link href="/user/blogs/1" className="text-[#E06A26] text-sm font-semibold mt-3 inline-flex items-center">
                  Read More <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>

            {/* Blog Card 2 */}
            <div className="min-w-65 snap-start bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="h-32 bg-linear-to-br from-[#3AB1A0]/20 to-[#3AB1A0]/10 relative">
                <span className="absolute px-2 py-1 text-xs font-semibold text-gray-700 rounded-full top-3 left-3 bg-white/90">
                  FITNESS
                </span>
                <div className="absolute flex items-center gap-1 px-2 py-1 text-xs text-white rounded-full bottom-3 right-3 bg-black/50">
                  <Clock className="w-3 h-3" />
                  4 min read
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900">5 Moves for Core Strength</h3>
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                  Strengthen your core with these simple yet effective exercises you can do anywhere.
                </p>
                <Link href="/user/blogs/2" className="text-[#3AB1A0] text-sm font-semibold mt-3 inline-flex items-center">
                  Read More <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>

            {/* Blog Card 3 */}
            <div className="min-w-65 snap-start bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="h-32 bg-linear-to-br from-[#DB9C6E]/20 to-[#DB9C6E]/10 relative">
                <span className="absolute px-2 py-1 text-xs font-semibold text-gray-700 rounded-full top-3 left-3 bg-white/90">
                  WELLNESS
                </span>
                <div className="absolute flex items-center gap-1 px-2 py-1 text-xs text-white rounded-full bottom-3 right-3 bg-black/50">
                  <Clock className="w-3 h-3" />
                  6 min read
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900">Mindful Eating Habits</h3>
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                  Learn how to develop a healthier relationship with food through mindfulness.
                </p>
                <Link href="/user/blogs/3" className="text-[#DB9C6E] text-sm font-semibold mt-3 inline-flex items-center">
                  Read More <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}