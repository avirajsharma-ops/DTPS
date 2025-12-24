'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RecipesListMobile from './page-mobile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Plus,
  ChefHat,
  Clock,
  Filter,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';

interface Recipe {
  _id: string;
  name: string;
  description: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  prepTime: number;
  cookTime: number;
  servings: number;
  tags: string[];
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
  }[];
  instructions: string[];
  image?: string;
  createdBy: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

function RecipesPageContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedDietaryRestrictions, setSelectedDietaryRestrictions] = useState<string[]>([]);
  const [maxCalories, setMaxCalories] = useState('');
  const [minProtein, setMinProtein] = useState('');
  const [maxPrepTime, setMaxPrepTime] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const recipesPerPage = 12;

  useEffect(() => {
    fetchRecipes();
  }, [searchTerm, selectedCategory, selectedCuisine, selectedDifficulty, selectedDietaryRestrictions, maxCalories, minProtein, maxPrepTime, sortBy, currentPage]);

  useEffect(() => {
    // Check for success message
    if (searchParams?.get('success') === 'created') {
      setShowSuccess(true);
      // Hide success message after 5 seconds
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const fetchRecipes = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedCuisine && selectedCuisine !== 'all') params.append('cuisine', selectedCuisine);
      if (selectedDifficulty && selectedDifficulty !== 'all') params.append('difficulty', selectedDifficulty);
      if (selectedDietaryRestrictions.length > 0) params.append('dietaryRestrictions', selectedDietaryRestrictions.join(','));
      if (maxCalories) params.append('maxCalories', maxCalories);
      if (minProtein) params.append('minProtein', minProtein);
      if (maxPrepTime) params.append('maxPrepTime', maxPrepTime);
      if (sortBy) params.append('sortBy', sortBy);
      params.append('page', currentPage.toString());
      params.append('limit', recipesPerPage.toString());

      const response = await fetch(`/api/recipes?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRecipes(data.recipes || []);
        setCategories(data.categories || []);
        setTotalPages(Math.ceil((data.total || 0) / recipesPerPage));
      } else {
        console.error('Failed to fetch recipes:', response.status, response.statusText);
        setRecipes([]);
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setRecipes([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recipe Database</h1>
            <p className="text-gray-600 mt-1">
              Manage your collection of healthy recipes
            </p>
          </div>
          
          <Button asChild>
            <Link href="/recipes/create">
              <Plus className="h-4 w-4 mr-2" />
              Add Recipe
            </Link>
          </Button>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Recipe created successfully! 🎉
            </AlertDescription>
          </Alert>
        )}

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search recipes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
                  {categories && categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                type="number"
                placeholder="Max calories"
                value={maxCalories}
                onChange={(e) => setMaxCalories(e.target.value)}
              />
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <ChefHat className="h-4 w-4" />
                <span>{recipes.length} recipes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipes Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner />
          </div>
        ) : recipes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || (selectedCategory && selectedCategory !== 'all') || maxCalories ? 'No recipes found' : 'No recipes yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || (selectedCategory && selectedCategory !== 'all') || maxCalories
                  ? 'Try adjusting your search criteria'
                  : 'Start building your recipe database by adding your first recipe'
                }
              </p>
              {!searchTerm && (!selectedCategory || selectedCategory === 'all') && !maxCalories && (
                <Button asChild>
                  <Link href="/recipes/create">Add Your First Recipe</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes && recipes.map((recipe) => (
              <Card key={recipe._id} className="hover:shadow-md transition-shadow border border-gray-200">
                {/* Recipe Image */}
                {recipe.image ? (
                  <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                    <img
                      src={recipe.image}
                      alt={recipe.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to gradient background if image fails to load
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="relative h-48 w-full flex items-center justify-center bg-linear-to-br from-green-50 to-emerald-100">
                    <ChefHat className="h-16 w-16 text-green-300" />
                  </div>
                )}

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2 font-semibold text-gray-900">{recipe.name}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1 text-gray-500">
                        {recipe.description || 'No description available'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Nutrition Info */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{recipe.nutrition.calories}</p>
                      <p className="text-xs text-gray-500">Calories</p>
                    </div>
                    <div className="text-center border-x border-gray-200">
                      <p className="text-lg font-bold text-gray-900">{recipe.nutrition.protein}g</p>
                      <p className="text-xs text-gray-500">Protein</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{recipe.servings}</p>
                      <p className="text-xs text-gray-500">Servings</p>
                    </div>
                  </div>

                  {/* Time and Macros */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{recipe.prepTime + recipe.cookTime} min</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">C: {recipe.nutrition.carbs}g</span>
                      <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded">F: {recipe.nutrition.fat}g</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recipe.tags.slice(0, 3).map((tag, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {recipe.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{recipe.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Action Button */}
                  <Button
                    className="w-full"
                    asChild
                  >
                    <Link href={`/recipes/${recipe._id}`}>
                      View Recipe
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function RecipesPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSPWA = (window.navigator as any).standalone === true;
      setIsPWA(isStandalone || isIOSPWA);
    };

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkPWA();
    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Always show mobile UI in PWA or on mobile devices
  if (isPWA || isMobile) {
    return <RecipesListMobile />;
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner /></div>}>
      <RecipesPageContent />
    </Suspense>
  );
}
