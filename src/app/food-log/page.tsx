'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Utensils,
  Coffee,
  Sun,
  Sunset,
  Moon
} from 'lucide-react';
import { format } from 'date-fns';

interface FoodLog {
  _id: string;
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  mealType: string;
  loggedAt: string;
}

interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function FoodLogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [dailyTotals, setDailyTotals] = useState<DailyTotals>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);

  // Daily targets
  const targets = {
    calories: 1800,
    protein: 120,
    carbs: 200,
    fat: 60
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    if (session.user.role !== 'client') {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    fetchFoodLogs();
  }, [selectedDate]);

  const fetchFoodLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/food-logs?date=${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        setFoodLogs(data.foodLogs || []);
        setDailyTotals(data.dailyTotals || { calories: 0, protein: 0, carbs: 0, fat: 0 });
      }
    } catch (error) {
      console.error('Error fetching food logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return <Coffee className="h-5 w-5" />;
      case 'lunch': return <Sun className="h-5 w-5" />;
      case 'dinner': return <Sunset className="h-5 w-5" />;
      case 'snack': return <Moon className="h-5 w-5" />;
      default: return <Utensils className="h-5 w-5" />;
    }
  };

  const getMealColor = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return 'from-amber-400 to-orange-500';
      case 'lunch': return 'from-emerald-400 to-teal-500';
      case 'dinner': return 'from-blue-400 to-indigo-500';
      case 'snack': return 'from-purple-400 to-pink-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const getMealBgColor = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return 'bg-amber-50';
      case 'lunch': return 'bg-emerald-50';
      case 'dinner': return 'bg-blue-50';
      case 'snack': return 'bg-purple-50';
      default: return 'bg-gray-50';
    }
  };

  const groupedLogs = {
    breakfast: foodLogs.filter(log => log.mealType === 'breakfast'),
    lunch: foodLogs.filter(log => log.mealType === 'lunch'),
    dinner: foodLogs.filter(log => log.mealType === 'dinner'),
    snack: foodLogs.filter(log => log.mealType === 'snack'),
  };

  const getMealTotals = (logs: FoodLog[]) => {
    return logs.reduce((acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.macros.protein,
      carbs: acc.carbs + log.macros.carbs,
      fat: acc.fat + log.macros.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner className="h-12 w-12 text-emerald-500" />
      </div>
    );
  }

  if (!session || session.user.role !== 'client') {
    return null;
  }

  const caloriesPercentage = Math.round((dailyTotals.calories / targets.calories) * 100);

  return (
    <>
      {/* Daily Summary Card */}
      <div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Today's Summary</h2>
            <span className="text-sm font-semibold text-emerald-600">{caloriesPercentage}%</span>
          </div>

          {/* Calorie Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Calories</span>
              <span className="text-sm font-bold text-gray-900">{dailyTotals.calories} / {targets.calories}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(caloriesPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Macros Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-gray-600 mb-1">Protein</p>
              <p className="text-lg font-bold text-blue-600">{dailyTotals.protein}g</p>
              <p className="text-xs text-gray-500">{targets.protein}g</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-xl">
              <p className="text-xs text-gray-600 mb-1">Carbs</p>
              <p className="text-lg font-bold text-amber-600">{dailyTotals.carbs}g</p>
              <p className="text-xs text-gray-500">{targets.carbs}g</p>
            </div>
            <div className="text-center p-3 bg-rose-50 rounded-xl">
              <p className="text-xs text-gray-600 mb-1">Fats</p>
              <p className="text-lg font-bold text-rose-600">{dailyTotals.fat}g</p>
              <p className="text-xs text-gray-500">{targets.fat}g</p>
            </div>
          </div>
        </div>
      </div>

      {/* Meals */}
      <div className="px-4  md:mt-0 mt-5 space-y-4">
        {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => {
          const logs = groupedLogs[mealType];
          const totals = getMealTotals(logs);
          
          return (
            <div key={mealType} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Meal Header */}
              <div className={`p-4 ${getMealBgColor(mealType)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${getMealColor(mealType)} flex items-center justify-center text-white shadow-md`}>
                      {getMealIcon(mealType)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 capitalize">{mealType}</h3>
                      <p className="text-xs text-gray-600">{totals.calories} cal</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Food Items */}
              {logs.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <div key={log._id} className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{log.foodName}</p>
                        <p className="text-xs text-gray-500">{log.quantity} {log.unit}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{log.calories}</p>
                        <p className="text-xs text-gray-500">cal</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-500">No food logged yet</p>
                  <p className="text-xs text-gray-400 mt-1">Your dietician will add meals here</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

