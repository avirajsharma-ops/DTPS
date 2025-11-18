'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Trash2, 
  Search,
  ChefHat,
  Target,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface Client {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Recipe {
  _id: string;
  name: string;
  description: string;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  servings: number;
  category: string;
}

interface MealPlanMeal {
  day: number;
  mealType: string;
  recipe: string;
  quantity: number;
}

export default function CreateMealPlanPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [selectedClient, setSelectedClient] = useState('');
  const [planName, setPlanName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [targetCalories, setTargetCalories] = useState('');
  const [targetProtein, setTargetProtein] = useState('');
  const [targetCarbs, setTargetCarbs] = useState('');
  const [targetFat, setTargetFat] = useState('');
  const [meals, setMeals] = useState<MealPlanMeal[]>([]);
  
  // Recipe search
  const [recipeSearch, setRecipeSearch] = useState('');
  const [showRecipeSearch, setShowRecipeSearch] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedMealType, setSelectedMealType] = useState('breakfast');

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  const planDuration = 7; // 7-day meal plan

  useEffect(() => {
    fetchClients();
    fetchRecipes();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/users?role=client');
      if (response.ok) {
        const data = await response.json();
        setClients(data.users);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes');
      if (response.ok) {
        const data = await response.json();
        setRecipes(data.recipes);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  };

  const addMealToDay = (recipeId: string) => {
    const newMeal: MealPlanMeal = {
      day: selectedDay,
      mealType: selectedMealType,
      recipe: recipeId,
      quantity: 1
    };
    
    setMeals([...meals, newMeal]);
    setShowRecipeSearch(false);
    setRecipeSearch('');
  };

  const removeMeal = (index: number) => {
    setMeals(meals.filter((_, i) => i !== index));
  };

  const updateMealQuantity = (index: number, quantity: number) => {
    const updatedMeals = [...meals];
    updatedMeals[index].quantity = quantity;
    setMeals(updatedMeals);
  };

  const getMealsForDay = (day: number) => {
    return meals.filter(meal => meal.day === day);
  };

  const getRecipeById = (recipeId: string) => {
    return recipes.find(recipe => recipe._id === recipeId);
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(recipeSearch.toLowerCase()) ||
    recipe.description.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClient || !planName || !startDate || !endDate || meals.length === 0) {
      setError('Please fill in all required fields and add at least one meal');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClient,
          name: planName,
          description,
          startDate,
          endDate,
          meals,
          targetCalories: targetCalories ? parseInt(targetCalories) : undefined,
          targetMacros: {
            protein: targetProtein ? parseInt(targetProtein) : 0,
            carbs: targetCarbs ? parseInt(targetCarbs) : 0,
            fat: targetFat ? parseInt(targetFat) : 0
          }
        }),
      });

      if (response.ok) {
        router.push('/meal-plans?success=created');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create meal plan');
      }
    } catch (error) {
      console.error('Error creating meal plan:', error);
      setError('Failed to create meal plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Meal Plan</h1>
          <p className="text-gray-600 mt-1">Design a personalized nutrition plan for your client</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Set up the meal plan details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="client">Select Client</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client._id} value={client._id}>
                          {client.firstName} {client.lastName} ({client.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="planName">Plan Name</Label>
                  <Input
                    id="planName"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="e.g., Weight Loss Plan - Week 1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the meal plan goals and approach..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nutrition Targets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Nutrition Targets</span>
                </CardTitle>
                <CardDescription>Set daily nutrition goals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="targetCalories">Daily Calories</Label>
                  <Input
                    id="targetCalories"
                    type="number"
                    value={targetCalories}
                    onChange={(e) => setTargetCalories(e.target.value)}
                    placeholder="1800"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="targetProtein">Protein (g)</Label>
                    <Input
                      id="targetProtein"
                      type="number"
                      value={targetProtein}
                      onChange={(e) => setTargetProtein(e.target.value)}
                      placeholder="120"
                    />
                  </div>
                  <div>
                    <Label htmlFor="targetCarbs">Carbs (g)</Label>
                    <Input
                      id="targetCarbs"
                      type="number"
                      value={targetCarbs}
                      onChange={(e) => setTargetCarbs(e.target.value)}
                      placeholder="200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="targetFat">Fat (g)</Label>
                    <Input
                      id="targetFat"
                      type="number"
                      value={targetFat}
                      onChange={(e) => setTargetFat(e.target.value)}
                      placeholder="60"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Meal Planning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ChefHat className="h-5 w-5" />
                <span>Meal Planning</span>
              </CardTitle>
              <CardDescription>Add meals for each day of the plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Meal Controls */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>Day</Label>
                  <Select value={selectedDay.toString()} onValueChange={(value) => setSelectedDay(parseInt(value))}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: planDuration }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Meal Type</Label>
                  <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mealTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  onClick={() => setShowRecipeSearch(true)}
                  className="mt-6"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Recipe
                </Button>
              </div>

              {/* Recipe Search Modal */}
              {showRecipeSearch && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Select Recipe</h3>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowRecipeSearch(false)}
                      >
                        Cancel
                      </Button>
                    </div>

                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search recipes..."
                        value={recipeSearch}
                        onChange={(e) => setRecipeSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {filteredRecipes.map((recipe) => (
                        <div
                          key={recipe._id}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                          onClick={() => addMealToDay(recipe._id)}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{recipe.name}</h4>
                              <p className="text-sm text-gray-600">{recipe.description}</p>
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                <span>{recipe.calories} cal</span>
                                <span>P: {recipe.macros.protein}g</span>
                                <span>C: {recipe.macros.carbs}g</span>
                                <span>F: {recipe.macros.fat}g</span>
                              </div>
                            </div>
                            <Badge variant="outline">{recipe.category}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Meal Plan Overview */}
              <div className="space-y-4">
                {Array.from({ length: planDuration }, (_, dayIndex) => {
                  const day = dayIndex + 1;
                  const dayMeals = getMealsForDay(day);
                  
                  return (
                    <div key={day} className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">Day {day}</h3>
                      
                      {dayMeals.length === 0 ? (
                        <p className="text-gray-500 text-sm">No meals planned for this day</p>
                      ) : (
                        <div className="space-y-2">
                          {dayMeals.map((meal, mealIndex) => {
                            const recipe = getRecipeById(meal.recipe);
                            const globalIndex = meals.findIndex(m => 
                              m.day === meal.day && 
                              m.mealType === meal.mealType && 
                              m.recipe === meal.recipe
                            );
                            
                            return (
                              <div key={mealIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className="text-xs">
                                      {meal.mealType}
                                    </Badge>
                                    <span className="font-medium">{recipe?.name}</span>
                                  </div>
                                  <p className="text-sm text-gray-600">{recipe?.description}</p>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Input
                                    type="number"
                                    min="0.5"
                                    step="0.5"
                                    value={meal.quantity}
                                    onChange={(e) => updateMealQuantity(globalIndex, parseFloat(e.target.value))}
                                    className="w-20"
                                  />
                                  <span className="text-sm text-gray-600">servings</span>
                                  
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeMeal(globalIndex)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : (
                'Create Meal Plan'
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
