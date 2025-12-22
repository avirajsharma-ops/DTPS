'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  ChefHat,
  Clock,
  Users,
  Target,
  AlertCircle,
  ArrowLeft,
  Save,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  remarks?: string;
}

interface Recipe {
  _id: string;
  name: string;
  description: string;
  // category: string;
  prepTime: number;
  cookTime: number;
  servings: string | number;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  ingredients: Ingredient[];
  instructions: string[];
  dietaryRestrictions: string[];
  medicalContraindications?: string[];
  createdBy: {
    _id?: string;
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function EditRecipePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const recipeId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // const [category, setCategory] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', quantity: 0, unit: '', remarks: '' }]);

  const portionSizes = [
    '1 TSP',
    '1.5 TSP',
    '1/2 TSP',
    '2 TSP',
    '2.5 TSP',
    '1 TBSP',
    '1.5 TBSP',
    '2 TBSP',
    '1/2 SMALL BOWL',
    '1 SMALL BOWL',
    '1.5 SMALL BOWL',
    '2.5 SMALL BOWL',
    '1 LARGE BOWL',
    '1.5 LARGE BOWL',
    '2 LARGE BOWL',
    '1/2 GLASS',
    '1 GLASS',
    '1 LARGE GLASS',
    '1/2 CUP',
    '1 CUP'
  ];
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [medicalContraindications, setMedicalContraindications] = useState<string[]>([]);

  // const categories = [
  //   'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Appetizer', 'Dessert',
  //   'Beverage', 'Salad', 'Soup', 'Main Course', 'Side Dish'
  // ];

  const availableDietaryRestrictions = [
     'Vegetarian','Vegan','Gluten-Free','Non-Vegetarian','Dairy-Free','Keto','Low-Carb','Low-Fat','High-Protein','Paleo','Mediterranean'
  ];

  const availableMedicalContraindications = [
    'Diabetes',
    'High Blood Pressure',
    'Heart Disease',
    'Kidney Disease',
    'Liver Disease',
    'High Cholesterol',
    'Thyroid Disorders',
    'Gout',
    'Acid Reflux/GERD',
    'IBS (Irritable Bowel Syndrome)',
    'Celiac Disease',
    'Lactose Intolerance',
    'Gallbladder Disease',
    'Osteoporosis',
    'Anemia',
    'Food Allergies',
    'Pregnancy',
    'Breastfeeding'
  ];

  const units = [
    'grams', 'kg', 'ounces', 'pounds', 'ml', 'liters', 'cups',
    'tablespoons', 'teaspoons', 'pieces', 'slices', 'cloves', 'bunches'
  ];

  useEffect(() => {
    if (recipeId) {
      fetchRecipe();
    }
  }, [recipeId]);

  const fetchRecipe = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/recipes/${recipeId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Recipe not found');
        } else {
          setError('Failed to load recipe');
        }
        return;
      }

      const data = await response.json();
      if (data.success && data.recipe) {
        const recipeData = data.recipe;
        setRecipe(recipeData);
        
        // Populate form fields
        setName(recipeData.name || '');
        setDescription(recipeData.description || '');
        // setCategory(recipeData.category || '');
        setPrepTime(recipeData.prepTime?.toString() || '');
        setCookTime(recipeData.cookTime?.toString() || '');
        setServings(recipeData.servings?.toString() || '');
        setCalories(recipeData.nutrition?.calories?.toString() || '');
        setProtein(recipeData.nutrition?.protein?.toString() || '');
        setCarbs(recipeData.nutrition?.carbs?.toString() || '');
        setFat(recipeData.nutrition?.fat?.toString() || '');
        setIsActive(recipeData.isActive !== false); // Default to true if not set
        setIngredients(recipeData.ingredients?.length > 0 ? recipeData.ingredients : [{ name: '', quantity: 0, unit: '', remarks: '' }]);
        setInstructions(recipeData.instructions?.length > 0 ? recipeData.instructions : ['']);
        setDietaryRestrictions(recipeData.dietaryRestrictions || []);
        setMedicalContraindications(recipeData.medicalContraindications || []);
      } else {
        setError('Invalid recipe data received');
      }
    } catch (error) {
      console.error('Error fetching recipe:', error);
      setError('Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  const canEditRecipe = () => {
    if (!session?.user || !recipe) return false;

    const createdById = typeof recipe.createdBy === 'object'
      ? recipe.createdBy._id || recipe.createdBy.id
      : recipe.createdBy;

    return session.user.id === createdById || session.user.role === 'admin';
  };

  // Ingredient management
  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: 0, unit: '', remarks: '' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  // Instruction management
  const addInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const removeInstruction = (index: number) => {
    if (instructions.length > 1) {
      setInstructions(instructions.filter((_, i) => i !== index));
    }
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  };

  const toggleDietaryRestriction = (restriction: string) => {
    if (dietaryRestrictions.includes(restriction)) {
      setDietaryRestrictions(dietaryRestrictions.filter(r => r !== restriction));
    } else {
      setDietaryRestrictions([...dietaryRestrictions, restriction]);
    }
  };

  const toggleMedicalContraindication = (condition: string) => {
    if (medicalContraindications.includes(condition)) {
      setMedicalContraindications(medicalContraindications.filter(c => c !== condition));
    } else {
      setMedicalContraindications([...medicalContraindications, condition]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canEditRecipe()) {
      toast.error('You do not have permission to edit this recipe');
      return;
    }
    
    if (!name || !servings || ingredients.some(ing => !ing.name || !ing.unit)) {
      toast.error('Please fill in all required fields (name, portion size, and complete ingredient details)');
      return;
    }

    const validInstructions = instructions.filter(inst => inst.trim() !== '');
    if (validInstructions.length === 0) {
      toast.error('Please add at least one instruction');
      return;
    }

    // Validate required nutrition fields
    if (!calories || !protein || !carbs || !fat) {
      toast.error('Please fill in all nutrition fields (calories, protein, carbs, fat)');
      return;
    }

    // Validate required time fields
    if (!prepTime || !cookTime) {
      toast.error('Please fill in prep time and cook time');
      return;
    }

    setSaving(true);
    setError('');

    try {
      toast.loading('Updating recipe...', { id: 'update-recipe' });
      
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description,
          prepTime: prepTime ? parseInt(prepTime) : 0,
          cookTime: cookTime ? parseInt(cookTime) : 0,
          servings: servings,
          isActive,
          nutrition: {
            calories: calories ? parseInt(calories) : 0,
            protein: protein ? parseFloat(protein) : 0,
            carbs: carbs ? parseFloat(carbs) : 0,
            fat: fat ? parseFloat(fat) : 0
          },
          ingredients: ingredients.filter(ing => ing.name.trim() !== ''),
          instructions: validInstructions,
          dietaryRestrictions,
          medicalContraindications
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update recipe');
      }

      toast.success('Recipe updated successfully!', { id: 'update-recipe' });
      router.push(`/recipes/${recipeId}`);
    } catch (error) {
      console.error('Error updating recipe:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update recipe', { id: 'update-recipe' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !recipe) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || 'Recipe not found'}</AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => router.push('/recipes')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Recipes
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!canEditRecipe()) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>You do not have permission to edit this recipe.</AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => router.push(`/recipes/${recipeId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Recipe
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Recipe</h1>
            <p className="text-gray-600 mt-1">Update your recipe details</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => router.push(`/recipes/${recipeId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Recipe
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Basic Information</CardTitle>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <ToggleRight className="w-5 h-5" />
                        Active
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5" />
                        Inactive
                      </>
                    )}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Recipe Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Grilled Chicken Salad"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the recipe..."
                    rows={3}
                    
                  />
                </div>
{/* 
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                      <SelectItem value="dessert">Dessert</SelectItem>
                      <SelectItem value="beverage">Beverage</SelectItem>
                    </SelectContent>
                  </Select>
                </div> */}
              </CardContent>
            </Card>

            {/* Timing & Servings */}
            <Card>
              <CardHeader>
                <CardTitle>Timing & Servings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="prepTime">Prep Time (min) *</Label>
                    <Input
                      id="prepTime"
                      type="number"
                      value={prepTime}
                      onChange={(e) => setPrepTime(e.target.value)}
                      placeholder="30"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cookTime">Cook Time (min) *</Label>
                    <Input
                      id="cookTime"
                      type="number"
                      value={cookTime}
                      onChange={(e) => setCookTime(e.target.value)}
                      placeholder="45"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="servings">Portion Size *</Label>
                  <Select
                    value={servings}
                    onValueChange={(value) => setServings(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select portion size" />
                    </SelectTrigger>
                    <SelectContent>
                      {portionSizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Nutrition Information */}
          <Card>
            <CardHeader>
              <CardTitle>Nutrition Information (per serving) *</CardTitle>
              <CardDescription>Required - helps users track their nutritional goals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="calories">Calories *</Label>
                  <Input
                    id="calories"
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="350"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="protein">Protein (g) *</Label>
                  <Input
                    id="protein"
                    type="number"
                    step="0.1"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    placeholder="25.5"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="carbs">Carbs (g) *</Label>
                  <Input
                    id="carbs"
                    type="number"
                    step="0.1"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    placeholder="30.2"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="fat">Fat (g) *</Label>
                  <Input
                    id="fat"
                    type="number"
                    step="0.1"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    placeholder="12.8"
                    min="0"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ingredients */}
          <Card>
            <CardHeader>
              <CardTitle>Ingredients *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-end space-x-4">
                    <div className="flex-1">
                      <Label>Ingredient Name</Label>
                      <Input
                        placeholder="e.g., Chicken breast"
                        value={ingredient.name}
                        onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                        required
                      />
                    </div>
                    <div className="w-24">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="2"
                        value={ingredient.quantity || ''}
                        onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="w-24">
                      <Label>Unit</Label>
                      <Select
                        value={ingredient.unit}
                        onValueChange={(value) => updateIngredient(index, 'unit', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cups">cups</SelectItem>
                          <SelectItem value="tbsp">tbsp</SelectItem>
                          <SelectItem value="tsp">tsp</SelectItem>
                          <SelectItem value="oz">oz</SelectItem>
                          <SelectItem value="lbs">lbs</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="l">l</SelectItem>
                          <SelectItem value="pieces">pieces</SelectItem>
                          <SelectItem value="slices">slices</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32">
                      <Label>Remarks</Label>
                      <Input
                        placeholder="Optional notes"
                        value={ingredient.remarks || ''}
                        onChange={(e) => updateIngredient(index, 'remarks', e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeIngredient(index)}
                      disabled={ingredients.length === 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addIngredient}>
                <Plus className="h-4 w-4 mr-2" />
                Add Ingredient
              </Button>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {instructions.map((instruction, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <Textarea
                      placeholder={`Step ${index + 1} instructions...`}
                      value={instruction}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      rows={2}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeInstruction(index)}
                    disabled={instructions.length === 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addInstruction}>
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </CardContent>
          </Card>

          {/* Dietary Restrictions and Medical Contraindications */}
          <Card>
            <CardHeader>
              <CardTitle>Dietary Restrictions & Medical Contraindications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Dietary Restrictions</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableDietaryRestrictions.map((restriction) => (
                    <Badge
                      key={restriction}
                      variant={dietaryRestrictions.includes(restriction) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleDietaryRestriction(restriction)}
                    >
                      {restriction}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Medical Contraindications</Label>
                <p className="text-sm text-gray-600 mb-2">
                  Select medical conditions for which this recipe should NOT be recommended
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableMedicalContraindications.map((condition) => (
                    <div
                      key={condition}
                      className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                        medicalContraindications.includes(condition)
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => toggleMedicalContraindication(condition)}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          medicalContraindications.includes(condition)
                            ? 'bg-red-500 border-red-500'
                            : 'border-gray-300'
                        }`}>
                          {medicalContraindications.includes(condition) && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium">{condition}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/recipes/${recipeId}`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Recipe
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
