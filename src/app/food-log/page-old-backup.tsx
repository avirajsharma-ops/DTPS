'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Utensils, 
  Calendar,
  Target,
  TrendingUp
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
  const { data: session } = useSession();
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [dailyTotals, setDailyTotals] = useState<DailyTotals>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [isAddingFood, setIsAddingFood] = useState(false);
  
  // Form state
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('grams');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState('breakfast');

  // Daily targets (these would come from user profile or meal plan)
  const targets = {
    calories: 1800,
    protein: 120,
    carbs: 200,
    fat: 60
  };

  useEffect(() => {
    fetchFoodLogs();
  }, [selectedDate]);

  const fetchFoodLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/food-logs?date=${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        setFoodLogs(data.foodLogs);
        setDailyTotals(data.dailyTotals || { calories: 0, protein: 0, carbs: 0, fat: 0 });
      }
    } catch (error) {
      console.error('Error fetching food logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/food-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodName,
          quantity: parseFloat(quantity),
          unit,
          calories: parseFloat(calories),
          macros: {
            protein: parseFloat(protein) || 0,
            carbs: parseFloat(carbs) || 0,
            fat: parseFloat(fat) || 0
          },
          mealType,
          loggedAt: selectedDate
        }),
      });

      if (response.ok) {
        // Reset form
        setFoodName('');
        setQuantity('');
        setCalories('');
        setProtein('');
        setCarbs('');
        setFat('');
        setMealType('breakfast');
        setIsAddingFood(false);
        
        // Refresh data
        fetchFoodLogs();
      }
    } catch (error) {
      console.error('Error adding food log:', error);
    }
  };

  const getMealLogs = (meal: string) => {
    return foodLogs.filter(log => log.mealType === meal);
  };

  const getMealTotals = (meal: string) => {
    const mealLogs = getMealLogs(meal);
    return mealLogs.reduce((totals, log) => ({
      calories: totals.calories + log.calories,
      protein: totals.protein + (log.macros?.protein || 0),
      carbs: totals.carbs + (log.macros?.carbs || 0),
      fat: totals.fat + (log.macros?.fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Food Log</h1>
            <p className="text-gray-600 mt-1">Track your daily nutrition intake</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
            
            <Dialog open={isAddingFood} onOpenChange={setIsAddingFood}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Food
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Food Entry</DialogTitle>
                  <DialogDescription>
                    Log what you ate and track your nutrition
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleAddFood} className="space-y-4">
                  <div>
                    <Label htmlFor="foodName">Food Name</Label>
                    <Input
                      id="foodName"
                      value={foodName}
                      onChange={(e) => setFoodName(e.target.value)}
                      placeholder="e.g., Grilled Chicken Breast"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="100"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Select value={unit} onValueChange={setUnit}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="grams">Grams</SelectItem>
                          <SelectItem value="ounces">Ounces</SelectItem>
                          <SelectItem value="cups">Cups</SelectItem>
                          <SelectItem value="pieces">Pieces</SelectItem>
                          <SelectItem value="servings">Servings</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="mealType">Meal Type</Label>
                    <Select value={mealType} onValueChange={setMealType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                        <SelectItem value="snack">Snack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="calories">Calories</Label>
                    <Input
                      id="calories"
                      type="number"
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                      placeholder="250"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="protein">Protein (g)</Label>
                      <Input
                        id="protein"
                        type="number"
                        step="0.1"
                        value={protein}
                        onChange={(e) => setProtein(e.target.value)}
                        placeholder="25"
                      />
                    </div>
                    <div>
                      <Label htmlFor="carbs">Carbs (g)</Label>
                      <Input
                        id="carbs"
                        type="number"
                        step="0.1"
                        value={carbs}
                        onChange={(e) => setCarbs(e.target.value)}
                        placeholder="10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fat">Fat (g)</Label>
                      <Input
                        id="fat"
                        type="number"
                        step="0.1"
                        value={fat}
                        onChange={(e) => setFat(e.target.value)}
                        placeholder="5"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddingFood(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Food</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Daily Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-green-600" />
              <span>Daily Summary - {format(new Date(selectedDate), 'MMMM d, yyyy')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Calories</span>
                  <span className="text-sm text-gray-600">
                    {Math.round(dailyTotals.calories)} / {targets.calories}
                  </span>
                </div>
                <Progress 
                  value={(dailyTotals.calories / targets.calories) * 100} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Protein</span>
                  <span className="text-sm text-gray-600">
                    {Math.round(dailyTotals.protein)}g / {targets.protein}g
                  </span>
                </div>
                <Progress 
                  value={(dailyTotals.protein / targets.protein) * 100} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Carbs</span>
                  <span className="text-sm text-gray-600">
                    {Math.round(dailyTotals.carbs)}g / {targets.carbs}g
                  </span>
                </div>
                <Progress 
                  value={(dailyTotals.carbs / targets.carbs) * 100} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Fat</span>
                  <span className="text-sm text-gray-600">
                    {Math.round(dailyTotals.fat)}g / {targets.fat}g
                  </span>
                </div>
                <Progress 
                  value={(dailyTotals.fat / targets.fat) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meals */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-6">
            {mealTypes.map((meal) => {
              const mealLogs = getMealLogs(meal);
              const mealTotals = getMealTotals(meal);
              
              return (
                <Card key={meal}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Utensils className="h-5 w-5 text-green-600" />
                        <span className="capitalize">{meal}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {Math.round(mealTotals.calories)} calories
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {mealLogs.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No food logged for {meal}</p>
                    ) : (
                      <div className="space-y-3">
                        {mealLogs.map((log) => (
                          <div key={log._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{log.foodName}</p>
                              <p className="text-sm text-gray-600">
                                {log.quantity} {log.unit}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{log.calories} cal</p>
                              <div className="flex space-x-2 text-xs text-gray-600">
                                <span>P: {Math.round(log.macros?.protein || 0)}g</span>
                                <span>C: {Math.round(log.macros?.carbs || 0)}g</span>
                                <span>F: {Math.round(log.macros?.fat || 0)}g</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
