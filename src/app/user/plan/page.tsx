'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ResponsiveLayout } from '@/components/client/layouts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  Flame, 
  Check, 
  ChevronRight,
  Calendar,
  ChefHat,
  Plus
} from 'lucide-react';
import { format, addDays, startOfWeek, isToday } from 'date-fns';

interface MealItem {
  id: string;
  name: string;
  portion: string;
  calories: number;
}

interface Meal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  time: string;
  totalCalories: number;
  items: MealItem[];
  isCompleted: boolean;
}

interface DayPlan {
  date: Date;
  meals: Meal[];
  totalCalories: number;
}

export default function UserPlanPage() {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate week dates
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    setWeekDates(dates);
    
    fetchDayPlan(selectedDate);
  }, []);

  useEffect(() => {
    fetchDayPlan(selectedDate);
  }, [selectedDate]);

  const fetchDayPlan = async (date: Date) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/client/meal-plan?date=${format(date, 'yyyy-MM-dd')}`);
      if (response.ok) {
        const data = await response.json();
        setDayPlan(data);
      }
    } catch (error) {
      console.error('Error fetching meal plan:', error);
    } finally {
      setLoading(false);
    }
  };

  // Default plan data
  const defaultPlan: DayPlan = {
    date: selectedDate,
    totalCalories: 1800,
    meals: [
      {
        id: '1',
        type: 'breakfast',
        time: '8:00 AM',
        totalCalories: 450,
        isCompleted: true,
        items: [
          { id: '1a', name: 'Oatmeal with Berries', portion: '1 bowl', calories: 280 },
          { id: '1b', name: 'Boiled Eggs', portion: '2 eggs', calories: 140 },
          { id: '1c', name: 'Green Tea', portion: '1 cup', calories: 30 },
        ],
      },
      {
        id: '2',
        type: 'lunch',
        time: '1:00 PM',
        totalCalories: 550,
        isCompleted: true,
        items: [
          { id: '2a', name: 'Grilled Chicken Salad', portion: '1 plate', calories: 350 },
          { id: '2b', name: 'Brown Rice', portion: '1/2 cup', calories: 120 },
          { id: '2c', name: 'Mixed Vegetables', portion: '1 cup', calories: 80 },
        ],
      },
      {
        id: '3',
        type: 'snack',
        time: '4:30 PM',
        totalCalories: 200,
        isCompleted: false,
        items: [
          { id: '3a', name: 'Greek Yogurt', portion: '1 cup', calories: 120 },
          { id: '3b', name: 'Mixed Nuts', portion: '1 handful', calories: 80 },
        ],
      },
      {
        id: '4',
        type: 'dinner',
        time: '7:30 PM',
        totalCalories: 600,
        isCompleted: false,
        items: [
          { id: '4a', name: 'Grilled Fish', portion: '150g', calories: 250 },
          { id: '4b', name: 'Quinoa', portion: '1 cup', calories: 220 },
          { id: '4c', name: 'Steamed Broccoli', portion: '1 cup', calories: 55 },
          { id: '4d', name: 'Olive Oil Dressing', portion: '1 tbsp', calories: 75 },
        ],
      },
    ],
  };

  const plan = dayPlan || defaultPlan;

  const getMealIcon = (type: string) => {
    switch (type) {
      case 'breakfast': return '🌅';
      case 'lunch': return '☀️';
      case 'snack': return '🍎';
      case 'dinner': return '🌙';
      default: return '🍽️';
    }
  };

  const getMealColor = (type: string) => {
    switch (type) {
      case 'breakfast': return 'bg-orange-100 text-orange-700';
      case 'lunch': return 'bg-yellow-100 text-yellow-700';
      case 'snack': return 'bg-green-100 text-green-700';
      case 'dinner': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <ResponsiveLayout title="My Meal Plan" subtitle={format(selectedDate, 'EEEE, MMMM d')}>
      <div className="space-y-6">
        {/* Week Date Selector */}
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex gap-2 min-w-max md:justify-center">
            {weekDates.map((date) => {
              const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
              const today = isToday(date);
              
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={`flex flex-col items-center p-3 rounded-xl min-w-[60px] transition-all ${
                    isSelected 
                      ? 'bg-green-600 text-white shadow-lg' 
                      : today
                        ? 'bg-green-50 text-green-700 border-2 border-green-200'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xs font-medium opacity-80">
                    {format(date, 'EEE')}
                  </span>
                  <span className="text-lg font-bold">
                    {format(date, 'd')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Daily Summary */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Daily Target</p>
                <p className="text-2xl font-bold text-gray-900">{plan.totalCalories} kcal</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {plan.meals.filter(m => m.isCompleted).length}/{plan.meals.length} meals
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meals List */}
        <div className="space-y-4">
          {plan.meals.map((meal) => (
            <Card 
              key={meal.id} 
              className={`border-0 shadow-sm transition-all ${
                meal.isCompleted ? 'bg-green-50/50' : 'bg-white'
              }`}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getMealIcon(meal.type)}</span>
                    <div>
                      <CardTitle className="text-base font-semibold capitalize">
                        {meal.type}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-3 w-3" />
                        {meal.time}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {meal.isCompleted ? (
                      <Badge className="bg-green-100 text-green-700">
                        <Check className="h-3 w-3 mr-1" />
                        Done
                      </Badge>
                    ) : (
                      <Badge className={getMealColor(meal.type)}>
                        <Flame className="h-3 w-3 mr-1" />
                        {meal.totalCalories} kcal
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {/* Meal Items */}
                <div className="space-y-2 mb-3">
                  {meal.items.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-400" />
                        <span className="text-sm text-gray-700">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-500">{item.portion}</span>
                        <span className="text-sm text-gray-400 ml-2">({item.calories} kcal)</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  {!meal.isCompleted && (
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                      <Check className="h-4 w-4 mr-1" />
                      Mark Complete
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="flex-1">
                    <ChefHat className="h-4 w-4 mr-1" />
                    View Recipes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Custom Meal Button - Mobile Only */}
        <div className="md:hidden">
          <Button className="w-full bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Meal
          </Button>
        </div>
      </div>
    </ResponsiveLayout>
  );
}
