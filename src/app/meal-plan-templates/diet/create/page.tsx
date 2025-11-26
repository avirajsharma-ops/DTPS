'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ChefHat, Target, Calendar, AlertCircle, ArrowLeft, Heart, Leaf, Stethoscope, LayoutGrid, User } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DietPlanDashboard } from '@/components/dietplandashboard/DietPlanDashboard';
import Link from 'next/link';
import { UserRole } from '@/types';

// ------------------ INTERFACES ------------------

interface Recipe {
  _id: string;
  name: string;
  description: string;
  category: string;
  cuisine: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
  tags: string[];
  dietaryRestrictions: string[];
  allergens: string[];
  image: string;
  rating: { average: number; count: number };
  isPublic: boolean;
  isPremium: boolean;
}

interface MealItem {
  type: 'recipe' | 'custom';
  recipeId?: string;
  recipe?: Recipe;
  customMeal?: {
    name: string;
    description: string;
    ingredients: string[];
    instructions: string[];
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    servings: number;
    prepTime: number;
    cookTime: number;
  };
  servings: number;
  alternatives?: MealItem[];
  notes?: string;
}

interface DailyMeal {
  day: number;
  breakfast: MealItem[];
  morningSnack?: MealItem[];
  lunch: MealItem[];
  afternoonSnack?: MealItem[];
  dinner: MealItem[];
  eveningSnack?: MealItem[];
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
  notes?: string;
}

interface MealPlanTemplate {
  name: string;
  description: string;
  category: string;
  duration: number;
  targetCalories: { min: number; max: number };
  targetMacros: {
    protein: { min: number; max: number };
    carbs: { min: number; max: number };
    fat: { min: number; max: number };
  };
  dietaryRestrictions: string[];
  tags: string[];
  meals: DailyMeal[];
  isPublic: boolean;
  isPremium: boolean;
  difficulty: string;
  prepTime: { daily: number; weekly: number };
  targetAudience: {
    ageGroup: string[];
    activityLevel: string[];
    healthConditions: string[];
    goals: string[];
  };
}

// ---------- CONSTANTS ----------------

const categories = [
  { value: 'weight-loss', label: 'Weight Loss', icon: '⚖️' },
  { value: 'weight-gain', label: 'Weight Gain', icon: '💪' },
  { value: 'maintenance', label: 'Maintenance', icon: '⚖️' },
  { value: 'muscle-gain', label: 'Muscle Gain', icon: '🏋️' },
  { value: 'diabetes', label: 'Diabetes Friendly', icon: '🩺' },
  { value: 'heart-healthy', label: 'Heart Healthy', icon: '❤️' },
  { value: 'keto', label: 'Keto', icon: '🥑' },
  { value: 'vegan', label: 'Vegan', icon: '🌱' },
  { value: 'custom', label: 'Custom', icon: '⚙️' }
];

const dietaryRestrictions = [
  'vegetarian','vegan','gluten-free','dairy-free','nut-free','egg-free','soy-free','keto','paleo','low-carb','low-fat','diabetic-friendly'
];

const difficultyLevels = [
  { value: 'beginner', label: 'Beginner', description: 'Simple recipes, minimal prep' },
  { value: 'intermediate', label: 'Intermediate', description: 'Moderate complexity' },
  { value: 'advanced', label: 'Advanced', description: 'Complex recipes, extensive prep' }
];

// ------------------- MAIN COMPONENT ------------------

export default function CreateDietTemplatePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<any>({});
  const [selectedDay, setSelectedDay] = useState(1);
  const [draftRestored, setDraftRestored] = useState(false);

  // Panel dialogs for basic/lifestyle/dietary/medical info
  const [showBasicPanel, setShowBasicPanel] = useState(false);
  const [showLifestylePanel, setShowLifestylePanel] = useState(false);
  const [showDietaryPanel, setShowDietaryPanel] = useState(false);
  const [showMedicalPanel, setShowMedicalPanel] = useState(false);

  // Main template state
  const [template, setTemplate] = useState<MealPlanTemplate>({
    name: '', description: '', category: '', duration: 7,
    targetCalories: { min: 1200, max: 2500 },
    targetMacros: { protein: { min: 50, max: 150 }, carbs: { min: 100, max: 300 }, fat: { min: 30, max: 100 } },
    dietaryRestrictions: [], tags: [], meals: [], isPublic: false, isPremium: false,
    difficulty: 'intermediate', prepTime: { daily: 30, weekly: 210 },
    targetAudience: { ageGroup: [], activityLevel: [], healthConditions: [], goals: [] }
  });

  // ----------- AUTO REDIRECT FOR ROLE ---------
  useEffect(() => {
    if (!session) return;
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.DIETITIAN) {
      router.push('/dashboard');
    }
  }, [session, router]);

  // ----------- AUTO-REFRESH RECIPES ----------
  useEffect(() => { fetchRecipes(); }, [searchQuery, selectedFilters]);

  // ---------- RESTORE DRAFT ON MOUNT ----------
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('dietTemplateDraft_custom') : null;
      if (raw) {
        const d = JSON.parse(raw);
        if (d?.template) setTemplate(d.template);
        if (d?.currentStep) setCurrentStep(d.currentStep);
        if (d?.selectedDay) setSelectedDay(d.selectedDay);
        setDraftRestored(true);
      }
    } catch { /* ignore */ }
  }, []);

  // --------- SAVE DRAFT ON CHANGES ----------
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('dietTemplateDraft_custom', JSON.stringify({ template, currentStep, selectedDay }));
      }
    } catch {/* ignore */}
  }, [template, currentStep, selectedDay]);

  // ----------- FETCH RECIPES -------------
  const fetchRecipes = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      let normalizedMeals = template.meals;
      if (!Array.isArray(normalizedMeals) || normalizedMeals.length !== template.duration) {
        normalizedMeals = Array.from({ length: template.duration }).map((_, i) => ({
          day: i + 1,
          breakfast: [],
          morningSnack: [],
          lunch: [],
          afternoonSnack: [],
          dinner: [],
          eveningSnack: [],
          totalNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
          notes: ''
        }));
      }
      const submitPayload = { ...template, meals: normalizedMeals, templateType: 'diet' };
      if (selectedFilters.difficulty) params.append('difficulty', selectedFilters.difficulty);
      const res = await fetch(`/api/recipes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.recipes || []);
      }
    } catch (e) { console.error(e); }
  };

  // --------- DURATION CHANGE RESET MEALS ---------
  useEffect(() => {
    setTemplate(prev => {
      const days = prev.duration;
      if (prev.meals.length === days) return prev;
      try { if (typeof window !== 'undefined') localStorage.removeItem(`dietPlan_week_${prev.duration}`); } catch {/* ignore */}
      const meals: DailyMeal[] = Array.from({ length: days }).map((_, i) => ({
        day: i+1, breakfast: [], lunch: [], dinner: [], morningSnack: [], afternoonSnack: [], eveningSnack: [],
        totalNutrition: { calories:0, protein:0, carbs:0, fat:0, fiber:0, sugar:0, sodium:0 }, notes: ''
      }));
      return { ...prev, meals };
    });
  }, [template.duration]);

  // --------- NUTRITION RE-CALCULATION ---------
  const recalcDayTotals = (dayIdx: number) => {
    setTemplate(prev => {
      const day = prev.meals[dayIdx];
      const sum = (items?: MealItem[]) => (items||[]).reduce((acc, item) => {
        if (item.type==='recipe' && item.recipe) {
          const s = item.servings || 1;
          acc.calories += item.recipe.nutrition.calories * s;
          acc.protein += item.recipe.nutrition.protein * s;
          acc.carbs += item.recipe.nutrition.carbs * s;
          acc.fat += item.recipe.nutrition.fat * s;
          acc.fiber += item.recipe.nutrition.fiber * s;
          acc.sugar += item.recipe.nutrition.sugar * s;
          acc.sodium += item.recipe.nutrition.sodium * s;
        }
        return acc;
      }, { calories:0, protein:0, carbs:0, fat:0, fiber:0, sugar:0, sodium:0 });
      const total = ['breakfast','morningSnack','lunch','afternoonSnack','dinner','eveningSnack']
        .map(k=>sum((day as any)[k]))
        .reduce((a,b)=>({ calories:a.calories+b.calories, protein:a.protein+b.protein, carbs:a.carbs+b.carbs, fat:a.fat+b.fat, fiber:a.fiber+b.fiber, sugar:a.sugar+b.sugar, sodium:a.sodium+b.sodium }), { calories:0, protein:0, carbs:0, fat:0, fiber:0, sugar:0, sodium:0 });
      const meals = [...prev.meals];
      meals[dayIdx] = { ...day, totalNutrition: total };
      return { ...prev, meals };
    });
  };

  // ----------------- ADD/REMOVE MEALS ------------
  const addRecipeTo = (dayIdx:number, slot:keyof DailyMeal, recipe:Recipe) => {
    setTemplate(prev => {
      const meals = [...prev.meals];
      const arr = ([...(meals[dayIdx] as any)[slot]] as MealItem[]);
      arr.push({ type:'recipe', recipeId: recipe._id, recipe, servings:1 });
      (meals[dayIdx] as any)[slot] = arr;
      return { ...prev, meals };
    });
    setTimeout(()=>recalcDayTotals(dayIdx),0);
  };

  const removeMealItem = (dayIdx:number, slot:keyof DailyMeal, index:number) => {
    setTemplate(prev => {
      const meals = [...prev.meals];
      const arr = ([...(meals[dayIdx] as any)[slot]] as MealItem[]).filter((_,i)=>i!==index);
      (meals[dayIdx] as any)[slot] = arr;
      return { ...prev, meals };
    });
    setTimeout(()=>recalcDayTotals(dayIdx),0);
  };

  const dayMeals = useMemo(()=>template.meals[selectedDay-1], [template.meals, selectedDay]);

  // -------------- SAVE/PUBLISH TEMPLATE -------------
  const saveTemplate = async () => {
    try {
      setLoading(true); setError('');
      const submitPayload = { ...template, templateType: 'diet' };
      try { if (typeof window !== 'undefined') localStorage.setItem('dietTemplatePayload_custom', JSON.stringify(submitPayload)); } catch { /* ignore */ }
      const res = await fetch('/api/meal-plan-templates', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(submitPayload) });
      if (res.ok) {
        const data = await res.json();
        try {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('dietTemplateDraft_custom');
            localStorage.setItem('lastCreatedDietTemplate_custom', JSON.stringify(data.template));
            const existingRaw = localStorage.getItem('dietTemplates_cache_custom');
            if (existingRaw) {
              const existing = JSON.parse(existingRaw);
              if (Array.isArray(existing)) {
                localStorage.setItem('dietTemplates_cache_custom', JSON.stringify([data.template, ...existing]));
              }
            }
          }
        } catch { /* ignore */ }
        router.push('/meal-plan-templates?success=created');
      } else {
        let errMsg = 'Failed to save template';
        try {
          const data = await res.json();
          if (data?.error) errMsg = data.error;
          if (data?.details && Array.isArray(data.details) && data.details.length) {
            errMsg = `${data.error || 'Validation failed'}: ${data.details[0].message || data.details[0].path?.join('.')}`;
          }
          try { if (typeof window !== 'undefined') localStorage.setItem('dietTemplateLastError_custom', JSON.stringify({ status: res.status, data })); } catch { /* ignore */ }
        } catch { /* ignore parse */ }
        setError(errMsg);
      }
    } catch { setError('Failed to save template'); } finally { setLoading(false); }
  };

  if (!session) return <LoadingSpinner />;

  // ------------------ RENDER -----------------------

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/meal-plan-templates">
                <ArrowLeft className="h-4 w-4 mr-2" />Back
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Diet Template</h1>
              <p className="text-gray-600 mt-1">Multi-step diet template builder</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {draftRestored && <span className="text-xs text-gray-500">Draft restored</span>}
            <Button variant="outline" size="sm" onClick={() => {
              if (typeof window !== 'undefined') localStorage.removeItem('dietTemplateDraft_custom');
              setTemplate({ name:'', description:'', category:'', duration:7, targetCalories:{min:1200,max:2500}, targetMacros:{ protein:{min:50,max:150}, carbs:{min:100,max:300}, fat:{min:30,max:100}}, dietaryRestrictions:[], tags:[], meals:[], isPublic:false, isPremium:false, difficulty:'intermediate', prepTime:{daily:30, weekly:210}, targetAudience:{ageGroup:[], activityLevel:[], healthConditions:[], goals:[]} });
              setCurrentStep(1); setSelectedDay(1); setDraftRestored(false);
            }}>Clear Draft</Button>
          </div>
        </div>
        {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
        {success && <Alert><AlertDescription>{success}</AlertDescription></Alert>}

        {/* Quick section buttons */}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" className="gap-1" onClick={()=>setShowBasicPanel(true)}>
            <LayoutGrid className="h-4 w-4" /> Basic
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={()=>setShowLifestylePanel(true)}>
            <Heart className="h-4 w-4" /> Lifestyle
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={()=>setShowDietaryPanel(true)}>
            <Leaf className="h-4 w-4" /> Dietary
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={()=>setShowMedicalPanel(true)}>
            <Stethoscope className="h-4 w-4" /> Medical
          </Button>
        </div>

        {/* Steps indicator (3 steps) */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              {[1,2,3].map(step => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep>=step?'bg-blue-600 text-white':'bg-gray-200 text-gray-600'}`}>{step}</div>
                  <div className="ml-2 text-xs font-medium {currentStep>=step?'text-blue-600':'text-gray-500'}">
                    {step===1 && 'Basic'}{step===2 && 'Targets'}{step===3 && 'Diet planner'}
                  </div>
                  {step<3 && <div className={`w-12 h-0.5 ml-2 ${currentStep>step?'bg-blue-600':'bg-gray-200'}`}></div>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Basic Info */}
        {currentStep===1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ChefHat className="h-5 w-5" />Basic Info</CardTitle>
              <CardDescription>Template basics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label>Name *</Label><Input value={template.name} onChange={e=>setTemplate({...template, name: e.target.value})} /></div>
                <div className="space-y-2"><Label>Category *</Label><Select value={template.category} onValueChange={v=>setTemplate({...template, category: v})}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select></div>
                <div className="space-y-2"><Label>Duration *</Label><Select value={template.duration.toString()} onValueChange={v=>setTemplate({...template, duration: parseInt(v)})}>
                  <SelectTrigger><SelectValue placeholder="Days" /></SelectTrigger>
                  <SelectContent>{['7','14','21','30'].map(d=> <SelectItem key={d} value={d}>{d} Days</SelectItem>)}</SelectContent>
                </Select></div>
                <div className="space-y-2"><Label>Difficulty</Label><Select value={template.difficulty} onValueChange={v=>setTemplate({...template, difficulty: v})}>
                  <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
                  <SelectContent>{difficultyLevels.map(dl=> <SelectItem key={dl.value} value={dl.value}>{dl.label}</SelectItem>)}</SelectContent>
                </Select></div>
              </div>
              <div className="space-y-2"><Label>Description</Label>
                <Textarea rows={3} value={template.description} onChange={e=>setTemplate({...template, description: e.target.value})} />
              </div>
              <div className="space-y-2"><Label>Dietary Restrictions</Label>
                <div className="flex flex-wrap gap-2">{dietaryRestrictions.map(r=>{
                  const sel = template.dietaryRestrictions.includes(r);
                  return <Button key={r} type="button" variant={sel?'default':'outline'} size="sm" className="text-xs capitalize" onClick={()=>setTemplate({...template, dietaryRestrictions: sel? template.dietaryRestrictions.filter(x=>x!==r): [...template.dietaryRestrictions,r]})}>{r.replace('-', ' ')}</Button>;
                })}</div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    if (!template.name.trim() || !template.category.trim()) {
                      setError('Name and category are required');
                      return;
                    }
                    setError('');
                    setCurrentStep(2);
                  }}
                >
                  Next <Target className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Nutrition Targets */}
        {currentStep===2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Nutrition Targets</CardTitle>
              <CardDescription>Define calorie & macros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-start mb-2">
                <Button variant="outline" onClick={()=>setCurrentStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />Back
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label>Calories Min</Label><Input type="number" value={template.targetCalories.min} onChange={e=>setTemplate({...template, targetCalories: {...template.targetCalories, min: parseInt(e.target.value)}})} /></div>
                <div className="space-y-2"><Label>Calories Max</Label><Input type="number" value={template.targetCalories.max} onChange={e=>setTemplate({...template, targetCalories: {...template.targetCalories, max: parseInt(e.target.value)}})} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2"><Label>Protein Min</Label><Input type="number" value={template.targetMacros.protein.min} onChange={e=>setTemplate({...template, targetMacros:{...template.targetMacros, protein:{...template.targetMacros.protein, min:parseInt(e.target.value)}}})} /></div>
                <div className="space-y-2"><Label>Carbs Min</Label><Input type="number" value={template.targetMacros.carbs.min} onChange={e=>setTemplate({...template, targetMacros:{...template.targetMacros, carbs:{...template.targetMacros.carbs, min:parseInt(e.target.value)}}})} /></div>
                <div className="space-y-2"><Label>Fat Min</Label><Input type="number" value={template.targetMacros.fat.min} onChange={e=>setTemplate({...template, targetMacros:{...template.targetMacros, fat:{...template.targetMacros.fat, min:parseInt(e.target.value)}}})} /></div>
                <div className="space-y-2"><Label>Protein Max</Label><Input type="number" value={template.targetMacros.protein.max} onChange={e=>setTemplate({...template, targetMacros:{...template.targetMacros, protein:{...template.targetMacros.protein, max:parseInt(e.target.value)}}})} /></div>
                <div className="space-y-2"><Label>Carbs Max</Label><Input type="number" value={template.targetMacros.carbs.max} onChange={e=>setTemplate({...template, targetMacros:{...template.targetMacros, carbs:{...template.targetMacros.carbs, max:parseInt(e.target.value)}}})} /></div>
                <div className="space-y-2"><Label>Fat Max</Label><Input type="number" value={template.targetMacros.fat.max} onChange={e=>setTemplate({...template, targetMacros:{...template.targetMacros, fat:{...template.targetMacros.fat, max:parseInt(e.target.value)}}})} /></div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={()=>setCurrentStep(3)}>
                  Next <Calendar className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Plan Dashboard */}
        {currentStep===3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Templates</CardTitle>
              <CardDescription>Use dashboard tools to finalize and publish</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <DietPlanDashboard 
                clientData={{
                  name: template.name || 'Untitled Template',
                  age: 0,
                  goal: template.description ? template.description.slice(0,30) : 'Goal not set',
                  planType: template.category || 'Uncategorized'
                }}
                duration={template.duration}
                onBack={() => setCurrentStep(2)}
                onSavePlan={saveTemplate}
              />
              <div className="flex justify-end">
                <Button variant="outline" onClick={()=>setCurrentStep(2)} className="mr-2">
                  <ArrowLeft className="h-4 w-4 mr-1" />Back
                </Button>
                <Button disabled={loading || !template.name || !template.category} onClick={saveTemplate}>{loading? 'Saving...' : 'Publish Template'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Basic Info Dialog */}
        <Dialog open={showBasicPanel} onOpenChange={setShowBasicPanel}>
          <DialogContent className="max-w-sm p-4 space-y-3 overflow-y-auto max-h-[70vh]">
            <CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" />Basic Info</CardTitle>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="border rounded p-2"><span className="text-gray-500">Name:</span> <span className="font-medium">{template.name || '—'}</span></div>
              <div className="border rounded p-2"><span className="text-gray-500">Category:</span> <span className="font-medium capitalize">{template.category || '—'}</span></div>
              <div className="border rounded p-2"><span className="text-gray-500">Duration:</span> <span className="font-medium">{template.duration} days</span></div>
              <div className="border rounded p-2"><span className="text-gray-500">Difficulty:</span> <span className="font-medium capitalize">{template.difficulty}</span></div>
              <div className="border rounded p-2"><span className="text-gray-500">Dietary Restrictions:</span> {template.dietaryRestrictions.length ? (
                <div className="flex flex-wrap gap-1 mt-1">{template.dietaryRestrictions.map(r => <Badge key={r} variant="outline" className="text-[10px] capitalize">{r.replace('-', ' ')}</Badge>)}</div>
              ) : <span className="font-medium">None</span>}
              </div>
              <div className="border rounded p-2"><span className="text-gray-500">Description:</span>
                <div className="text-[11px] mt-1 line-clamp-4">{template.description || 'No description'}</div>
              </div>
            </div>
            <div className="flex justify-end"><Button size="sm" onClick={()=>setShowBasicPanel(false)}>Close</Button></div>
          </DialogContent>
        </Dialog>
        {/* Lifestyle Dialog */}
        <Dialog open={showLifestylePanel} onOpenChange={setShowLifestylePanel}>
          <DialogContent className="max-w-sm p-4 space-y-3 overflow-y-auto max-h-[70vh]">
            <CardTitle className="text-sm flex items-center gap-2"><Heart className="h-4 w-4" />Lifestyle Info</CardTitle>
            <p className="text-xs text-gray-600 mt-2">Add lifestyle notes (placeholder).</p>
            <div className="flex justify-end mt-4"><Button size="sm" onClick={()=>setShowLifestylePanel(false)}>Close</Button></div>
          </DialogContent>
        </Dialog>
        {/* Dietary Dialog */}
        <Dialog open={showDietaryPanel} onOpenChange={setShowDietaryPanel}>
          <DialogContent className="max-w-sm p-4 space-y-3 overflow-y-auto max-h-[70vh]">
            <CardTitle className="text-sm flex items-center gap-2"><Leaf className="h-4 w-4" />Dietary Info</CardTitle>
            <p className="text-xs text-gray-600 mt-2">Dietary preferences and restrictions overview.</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {template.dietaryRestrictions.length ? template.dietaryRestrictions.map(r => (
                <Badge key={r} variant="outline" className="text-[10px] capitalize">{r.replace('-', ' ')}</Badge>
              )) : <span className="text-[11px] text-gray-400">No restrictions selected</span>}
            </div>
            <div className="flex justify-end mt-4"><Button size="sm" onClick={()=>setShowDietaryPanel(false)}>Close</Button></div>
          </DialogContent>
        </Dialog>
        {/* Medical Dialog */}
        <Dialog open={showMedicalPanel} onOpenChange={setShowMedicalPanel}>
          <DialogContent className="max-w-sm p-4 space-y-3 overflow-y-auto max-h-[70vh]">
            <CardTitle className="text-sm flex items-center gap-2"><Stethoscope className="h-4 w-4" />Medical Info</CardTitle>
            <p className="text-xs text-gray-600 mt-2">Add medical considerations (placeholder).</p>
            <div className="flex justify-end mt-4"><Button size="sm" onClick={()=>setShowMedicalPanel(false)}>Close</Button></div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
