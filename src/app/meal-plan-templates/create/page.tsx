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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Trash2, 
  ChefHat,
  Target,
  Calendar,
  AlertCircle,
  Save,
  ArrowLeft,
  Search,
  Filter,
  Star,
  Clock,
  Users,
  Utensils,
  Apple,
  Zap,
  Heart
} from 'lucide-react';
import Link from 'next/link';
import { UserRole } from '@/types';

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
  rating: {
    average: number;
    count: number;
  };
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
  prepTime: {
    daily: number;
    weekly: number;
  };
  targetAudience: {
    ageGroup: string[];
    activityLevel: string[];
    healthConditions: string[];
    goals: string[];
  };
}

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
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 
  'egg-free', 'soy-free', 'keto', 'paleo', 'low-carb', 'low-fat', 'diabetic-friendly'
];

const difficultyLevels = [
  { value: 'beginner', label: 'Beginner', description: 'Simple recipes, minimal prep' },
  { value: 'intermediate', label: 'Intermediate', description: 'Moderate complexity' },
  { value: 'advanced', label: 'Advanced', description: 'Complex recipes, extensive prep' }
];

const ageGroups = ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'];
const activityLevels = ['sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active'];
const healthConditions = ['diabetes', 'hypertension', 'heart-disease', 'obesity', 'pcos', 'thyroid', 'none'];
const goals = ['weight-loss', 'weight-gain', 'muscle-gain', 'maintenance', 'improved-health', 'better-energy'];

export default function CreateMealPlanTemplatePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<any>({});

  // Form state
  const [template, setTemplate] = useState<MealPlanTemplate>({
    name: '',
    description: '',
    category: '',
    duration: 7,
    targetCalories: { min: 1200, max: 2500 },
    targetMacros: {
      protein: { min: 50, max: 150 },
      carbs: { min: 100, max: 300 },
      fat: { min: 30, max: 100 }
    },
    dietaryRestrictions: [],
    tags: [],
    meals: [],
    isPublic: false,
    isPremium: false,
    difficulty: 'intermediate',
    prepTime: {
      daily: 30,
      weekly: 210
    },
    targetAudience: {
      ageGroup: [],
      activityLevel: [],
      healthConditions: [],
      goals: []
    }
  });

  // Check authentication and role
  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.DIETITIAN) {
      router.push('/dashboard');
      return;
    }
  }, [session, router]);

  // Fetch recipes for meal planning
  useEffect(() => {
    fetchRecipes();
  }, [searchQuery, selectedFilters]);

  const fetchRecipes = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedFilters.category) params.append('category', selectedFilters.category);
      if (selectedFilters.difficulty) params.append('difficulty', selectedFilters.difficulty);
      
      const response = await fetch(`/api/recipes?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRecipes(data.recipes || []);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  };

  if (!session) {
    return <LoadingSpinner />;
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/meal-plan-templates">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Templates
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Meal Plan Template</h1>
              <p className="text-gray-600 mt-1">
                Design a comprehensive meal plan template like DTPS
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      currentStep >= step ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step === 1 && 'Basic Info'}
                      {step === 2 && 'Nutrition Targets'}
                      {step === 3 && 'Meal Planning'}
                      {step === 4 && 'Review & Publish'}
                    </p>
                  </div>
                  {step < 4 && (
                    <div className={`w-16 h-0.5 ml-4 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ChefHat className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
              <CardDescription>
                Set up the basic details for your meal plan template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={template.name}
                    onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                    placeholder="e.g., 7-Day Weight Loss Plan"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={template.category} onValueChange={(value) => setTemplate({ ...template, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="flex items-center space-x-2">
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (days) *</Label>
                  <Select value={template.duration.toString()} onValueChange={(value) => setTemplate({ ...template, duration: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Days (1 Week)</SelectItem>
                      <SelectItem value="14">14 Days (2 Weeks)</SelectItem>
                      <SelectItem value="21">21 Days (3 Weeks)</SelectItem>
                      <SelectItem value="30">30 Days (1 Month)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select value={template.difficulty} onValueChange={(value) => setTemplate({ ...template, difficulty: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div>
                            <div className="font-medium">{level.label}</div>
                            <div className="text-sm text-gray-500">{level.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={template.description}
                  onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                  placeholder="Describe your meal plan template, its benefits, and target audience..."
                  rows={4}
                />
              </div>

              <div className="space-y-4">
                <Label>Dietary Restrictions</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {dietaryRestrictions.map((restriction) => (
                    <div key={restriction} className="flex items-center space-x-2">
                      <Checkbox
                        id={restriction}
                        checked={template.dietaryRestrictions.includes(restriction)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setTemplate({
                              ...template,
                              dietaryRestrictions: [...template.dietaryRestrictions, restriction]
                            });
                          } else {
                            setTemplate({
                              ...template,
                              dietaryRestrictions: template.dietaryRestrictions.filter(r => r !== restriction)
                            });
                          }
                        }}
                      />
                      <Label htmlFor={restriction} className="text-sm capitalize">
                        {restriction.replace('-', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setCurrentStep(2)}>
                  Next: Nutrition Targets
                  <Target className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Nutrition Targets</span>
              </CardTitle>
              <CardDescription>
                Define the nutritional goals for this meal plan template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Daily Calorie Range</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minCalories">Minimum Calories</Label>
                      <Input
                        id="minCalories"
                        type="number"
                        value={template.targetCalories.min}
                        onChange={(e) => setTemplate({
                          ...template,
                          targetCalories: { ...template.targetCalories, min: parseInt(e.target.value) }
                        })}
                        min="800"
                        max="5000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxCalories">Maximum Calories</Label>
                      <Input
                        id="maxCalories"
                        type="number"
                        value={template.targetCalories.max}
                        onChange={(e) => setTemplate({
                          ...template,
                          targetCalories: { ...template.targetCalories, max: parseInt(e.target.value) }
                        })}
                        min="800"
                        max="5000"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Macro Targets (grams)</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Protein Min</Label>
                        <Input
                          type="number"
                          value={template.targetMacros.protein.min}
                          onChange={(e) => setTemplate({
                            ...template,
                            targetMacros: {
                              ...template.targetMacros,
                              protein: { ...template.targetMacros.protein, min: parseInt(e.target.value) }
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Protein Max</Label>
                        <Input
                          type="number"
                          value={template.targetMacros.protein.max}
                          onChange={(e) => setTemplate({
                            ...template,
                            targetMacros: {
                              ...template.targetMacros,
                              protein: { ...template.targetMacros.protein, max: parseInt(e.target.value) }
                            }
                          })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Carbs Min</Label>
                        <Input
                          type="number"
                          value={template.targetMacros.carbs.min}
                          onChange={(e) => setTemplate({
                            ...template,
                            targetMacros: {
                              ...template.targetMacros,
                              carbs: { ...template.targetMacros.carbs, min: parseInt(e.target.value) }
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Carbs Max</Label>
                        <Input
                          type="number"
                          value={template.targetMacros.carbs.max}
                          onChange={(e) => setTemplate({
                            ...template,
                            targetMacros: {
                              ...template.targetMacros,
                              carbs: { ...template.targetMacros.carbs, max: parseInt(e.target.value) }
                            }
                          })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Fat Min</Label>
                        <Input
                          type="number"
                          value={template.targetMacros.fat.min}
                          onChange={(e) => setTemplate({
                            ...template,
                            targetMacros: {
                              ...template.targetMacros,
                              fat: { ...template.targetMacros.fat, min: parseInt(e.target.value) }
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fat Max</Label>
                        <Input
                          type="number"
                          value={template.targetMacros.fat.max}
                          onChange={(e) => setTemplate({
                            ...template,
                            targetMacros: {
                              ...template.targetMacros,
                              fat: { ...template.targetMacros.fat, max: parseInt(e.target.value) }
                            }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button onClick={() => setCurrentStep(3)}>
                  Next: Meal Planning
                  <Calendar className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Steps 3 and 4 will be added in the next part */}
      </div>
    </DashboardLayout>
  );
}
