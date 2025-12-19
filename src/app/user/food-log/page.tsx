'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ResponsiveLayout } from '@/components/client/layouts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Clock, 
  Flame, 
  Camera,
  Barcode,
  Apple,
  Coffee,
  Utensils,
  Moon,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';

interface FoodEntry {
  id: string;
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface DayLog {
  date: Date;
  entries: FoodEntry[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export default function UserFoodLogPage() {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayLog, setDayLog] = useState<DayLog | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchDayLog(selectedDate);
  }, [selectedDate]);

  const fetchDayLog = async (date: Date) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/client/food-log?date=${format(date, 'yyyy-MM-dd')}`);
      if (response.ok) {
        const data = await response.json();
        setDayLog(data);
      }
    } catch (error) {
      console.error('Error fetching food log:', error);
    } finally {
      setLoading(false);
    }
  };

  // Default log data
  const defaultLog: DayLog = {
    date: selectedDate,
    totals: { calories: 1450, protein: 65, carbs: 180, fat: 48 },
    targets: { calories: 2000, protein: 80, carbs: 250, fat: 65 },
    entries: [
      {
        id: '1',
        name: 'Oatmeal with Berries',
        portion: '1 bowl (250g)',
        calories: 280,
        protein: 8,
        carbs: 48,
        fat: 6,
        time: '8:30 AM',
        mealType: 'breakfast',
      },
      {
        id: '2',
        name: 'Boiled Eggs',
        portion: '2 large eggs',
        calories: 140,
        protein: 12,
        carbs: 1,
        fat: 10,
        time: '8:30 AM',
        mealType: 'breakfast',
      },
      {
        id: '3',
        name: 'Grilled Chicken Salad',
        portion: '1 plate (350g)',
        calories: 380,
        protein: 35,
        carbs: 15,
        fat: 18,
        time: '1:15 PM',
        mealType: 'lunch',
      },
      {
        id: '4',
        name: 'Brown Rice',
        portion: '1/2 cup (100g)',
        calories: 120,
        protein: 3,
        carbs: 25,
        fat: 1,
        time: '1:15 PM',
        mealType: 'lunch',
      },
      {
        id: '5',
        name: 'Greek Yogurt',
        portion: '1 cup (200g)',
        calories: 130,
        protein: 15,
        carbs: 8,
        fat: 4,
        time: '4:30 PM',
        mealType: 'snack',
      },
    ],
  };

  const log = dayLog || defaultLog;

  const getMealIcon = (type: string) => {
    switch (type) {
      case 'breakfast': return Coffee;
      case 'lunch': return Utensils;
      case 'snack': return Apple;
      case 'dinner': return Moon;
      default: return Utensils;
    }
  };

  const getMealColor = (type: string) => {
    switch (type) {
      case 'breakfast': return 'bg-orange-100 text-orange-600';
      case 'lunch': return 'bg-yellow-100 text-yellow-600';
      case 'snack': return 'bg-green-100 text-green-600';
      case 'dinner': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const groupedEntries = log.entries.reduce((acc, entry) => {
    if (!acc[entry.mealType]) {
      acc[entry.mealType] = [];
    }
    acc[entry.mealType].push(entry);
    return acc;
  }, {} as Record<string, FoodEntry[]>);

  const mealOrder = ['breakfast', 'lunch', 'snack', 'dinner'];

  return (
    <ResponsiveLayout 
      title="Food Log" 
      subtitle={format(selectedDate, 'EEEE, MMMM d')}
      headerAction={
        <Button size="sm" className="bg-green-600 hover:bg-green-700 hidden md:flex">
          <Plus className="h-4 w-4 mr-1" />
          Add Food
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Date Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:justify-center">
          {[-2, -1, 0].map((offset) => {
            const date = new Date();
            date.setDate(date.getDate() + offset);
            const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            
            return (
              <button
                key={offset}
                onClick={() => setSelectedDate(date)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  isSelected 
                    ? 'bg-green-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : format(date, 'MMM d')}
              </button>
            );
          })}
          <Button variant="outline" size="sm" className="rounded-full">
            <Clock className="h-4 w-4 mr-1" />
            Pick Date
          </Button>
        </div>

        {/* Daily Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Calories', value: log.totals.calories, target: log.targets.calories, unit: 'kcal', color: 'orange' },
            { label: 'Protein', value: log.totals.protein, target: log.targets.protein, unit: 'g', color: 'green' },
            { label: 'Carbs', value: log.totals.carbs, target: log.targets.carbs, unit: 'g', color: 'blue' },
            { label: 'Fat', value: log.totals.fat, target: log.targets.fat, unit: 'g', color: 'purple' },
          ].map((stat) => (
            <Card key={stat.label} className="border-0 shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-lg font-bold text-gray-900">
                  {stat.value}
                  <span className="text-sm font-normal text-gray-400">/{stat.target}{stat.unit}</span>
                </p>
                <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      stat.color === 'orange' ? 'bg-orange-500' :
                      stat.color === 'green' ? 'bg-green-500' :
                      stat.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${Math.min((stat.value / stat.target) * 100, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Add Actions - Mobile */}
        <div className="grid grid-cols-3 gap-3 md:hidden">
          <Button variant="outline" className="flex flex-col h-auto py-4 gap-2">
            <Search className="h-5 w-5 text-gray-600" />
            <span className="text-xs">Search</span>
          </Button>
          <Button variant="outline" className="flex flex-col h-auto py-4 gap-2">
            <Barcode className="h-5 w-5 text-gray-600" />
            <span className="text-xs">Scan</span>
          </Button>
          <Button variant="outline" className="flex flex-col h-auto py-4 gap-2">
            <Camera className="h-5 w-5 text-gray-600" />
            <span className="text-xs">Photo</span>
          </Button>
        </div>

        {/* Food Entries by Meal */}
        <div className="space-y-4">
          {mealOrder.map((mealType) => {
            const entries = groupedEntries[mealType] || [];
            const MealIcon = getMealIcon(mealType);
            const mealCalories = entries.reduce((sum, e) => sum + e.calories, 0);

            return (
              <Card key={mealType} className="border-0 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-8 w-8 rounded-lg ${getMealColor(mealType)} flex items-center justify-center`}>
                        <MealIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold capitalize">{mealType}</CardTitle>
                        <p className="text-xs text-gray-500">{mealCalories} kcal</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-green-600">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {entries.length > 0 ? (
                    <div className="space-y-2">
                      {entries.map((entry) => (
                        <div 
                          key={entry.id}
                          className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{entry.name}</p>
                            <p className="text-xs text-gray-500">{entry.portion} • {entry.time}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-medium text-gray-900 text-sm">{entry.calories}</p>
                              <p className="text-xs text-gray-500">kcal</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No entries yet</p>
                      <Button variant="link" className="text-green-600 text-sm">
                        Add {mealType}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Floating Add Button - Mobile */}
        <div className="fixed bottom-20 right-4 md:hidden">
          <Button 
            size="lg" 
            className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 shadow-lg"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </ResponsiveLayout>
  );
}
