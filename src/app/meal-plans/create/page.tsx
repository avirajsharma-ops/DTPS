'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { DietPlanDashboard } from '@/components/dietplandashboard/DietPlanDashboard';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { LifestyleForm } from '@/components/clients/LifestyleForm';
import { MedicalForm } from '@/components/clients/MedicalForm';
import { RecallForm, RecallEntry } from '@/components/clients/RecallForm';

interface Client {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  type?: string;
  programStart?: string;
  programEnd?: string;
  dateJoined?: string;
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
  const searchParams = useSearchParams();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [selectedClient, setSelectedClient] = useState('');
  const [planName, setPlanName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');

  const [endDate, setEndDate] = useState('');
  const [targetCalories, setTargetCalories] = useState('');
  const [targetProtein, setTargetProtein] = useState('');
  const [targetCarbs, setTargetCarbs] = useState('');
  const [targetFat, setTargetFat] = useState('');
  const [meals, setMeals] = useState<MealPlanMeal[]>([]);
  // Overlay section states
  const [showLifestyle, setShowLifestyle] = useState(false);
  const [showMedical, setShowMedical] = useState(false);
  const [showRecall, setShowRecall] = useState(false);
  // Minimal lifestyle placeholder state reuse
  const [bmi, setBmi] = useState('');
  const [idealWeightKg, setIdealWeightKg] = useState('');
  // Medical placeholders
  const [medicalConditions, setMedicalConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [notes, setNotes] = useState('');
  const [recallEntries, setRecallEntries] = useState<RecallEntry[]>([]);
  
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

  // When clients load, if client query param present, auto-select
  useEffect(() => {
    const clientParam = searchParams?.get('client');
    if (clientParam && clients.length > 0) {
      const found = clients.find(c => c._id === clientParam);
      if (found && selectedClient !== found._id) {
        setSelectedClient(found._id);
        if (!description) {
          setDescription(`Nutrition plan for ${found.firstName} ${found.lastName}`);
        }
      }
    }
  }, [searchParams, clients]);

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

  // Lookup selected client object
  const selectedClientObj = clients.find(c => c._id === selectedClient);
  const dietClientData = {
    name: selectedClientObj ? `${selectedClientObj.firstName} ${selectedClientObj.lastName}` : 'Select a client',
    age: 0,
    goal: description ? description.slice(0, 30) : 'Goal not set',
    planType: planName || 'Untitled Plan'
  };
  
  const handleSubmit = async () => {
    if (!selectedClient || !planName || !startDate || !endDate) {
      setError('Fill required fields first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        })
      });
      if (response.ok) {
        router.push('/meal-plans?success=created');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create meal plan');
      }
    } catch (err) {
      console.error('Error creating meal plan:', err);
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

        {/* Summary Header & Controls */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Card className="border border-slate-300 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs font-semibold">Client<span className="text-red-500">*</span></Label>
                {selectedClientObj ? (
                  <div className="flex items-center gap-2">
                    <div className="h-9 flex items-center px-3 text-xs rounded border border-slate-300 bg-slate-50 font-medium">
                      {selectedClientObj.firstName} {selectedClientObj.lastName}
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={()=>setSelectedClient('')}>Change</Button>
                  </div>
                ) : (
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>{clients.map(c => (
                      <SelectItem key={c._id} value={c._id}>{c.firstName} {c.lastName}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label className="text-xs font-semibold">Plan Name<span className="text-red-500">*</span></Label>
                <Input value={planName} onChange={e=>setPlanName(e.target.value)} placeholder="Week 1 Plan" className="h-9 text-xs" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Start Date<span className="text-red-500">*</span></Label>
                <Input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="h-9 text-xs" />
              </div>
              <div>
                <Label className="text-xs font-semibold">End Date<span className="text-red-500">*</span></Label>
                <Input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs font-semibold">Calories</Label>
                <Input type="number" value={targetCalories} onChange={e=>setTargetCalories(e.target.value)} placeholder="1800" className="h-9 text-xs" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Protein (g)</Label>
                <Input type="number" value={targetProtein} onChange={e=>setTargetProtein(e.target.value)} placeholder="120" className="h-9 text-xs" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Carbs (g)</Label>
                <Input type="number" value={targetCarbs} onChange={e=>setTargetCarbs(e.target.value)} placeholder="200" className="h-9 text-xs" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Fat (g)</Label>
                <Input type="number" value={targetFat} onChange={e=>setTargetFat(e.target.value)} placeholder="60" className="h-9 text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea value={description} onChange={e=>setDescription(e.target.value.slice(0,240))} rows={3} className="text-xs" placeholder="Goals and approach..." />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={()=>setShowLifestyle(true)} className="gap-1">Lifestyle</Button>
              <Button variant="outline" size="sm" onClick={()=>setShowMedical(true)} className="gap-1">Medical</Button>
              <Button variant="outline" size="sm" onClick={()=>setShowRecall(true)} className="gap-1">Recall</Button>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={()=>router.back()}>Back</Button>
                <Button size="sm" onClick={handleSubmit} disabled={loading} className="bg-slate-900 text-white">
                  {loading ? 'Saving...' : 'Save Plan'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='mt-6'>
          <DietPlanDashboard 
            clientData={dietClientData}
            onBack={() => router.back()}
            onSavePlan={handleSubmit}
          />
        </Card>

        {/* Overlays */}
        <Dialog open={showLifestyle} onOpenChange={setShowLifestyle}>
          <DialogContent className="max-w-3xl backdrop-blur">
            <CardTitle className="mb-4 text-sm">Lifestyle</CardTitle>
            <div className="text-xs text-slate-600">Placeholder lifestyle details...</div>
          </DialogContent>
        </Dialog>
        <Dialog open={showMedical} onOpenChange={setShowMedical}>
          <DialogContent className="max-w-3xl backdrop-blur">
            <CardTitle className="mb-4 text-sm">Medical</CardTitle>
            <div className="text-xs text-slate-600">Medical history: {medicalHistory || 'None entered'}</div>
          </DialogContent>
        </Dialog>
        <Dialog open={showRecall} onOpenChange={setShowRecall}>
          <DialogContent className="max-w-3xl backdrop-blur flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-3">
              <CardTitle className="text-sm">Recall</CardTitle>
              
            </div>
            <div className="overflow-y-auto pr-2 space-y-4">
              <RecallForm entries={recallEntries} onChange={setRecallEntries} onSave={()=>setShowRecall(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
