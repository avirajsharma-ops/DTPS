'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
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
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Loader2,
  X
} from 'lucide-react';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Recipe {
  _id: string;
  uuid?: string;
  name: string;
  description: string;
  flatNutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  // Flat nutrition values from API
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  prepTime: number;
  cookTime: number;
  servings: number;
  servingSize?: string;
  tags: string[];
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    remarks?: string;
  }>;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecipes, setTotalRecipes] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedDietaryRestrictions, setSelectedDietaryRestrictions] = useState<string[]>([]);
  const [maxCalories, setMaxCalories] = useState('');
  const [minProtein, setMinProtein] = useState('');
  const [maxPrepTime, setMaxPrepTime] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showSuccess, setShowSuccess] = useState(false);

  // Bulk AI add state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRecipeNames, setBulkRecipeNames] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ name: string; status: 'success' | 'error' | 'skipped' | 'merged'; message?: string }[] | null>(null);
  const [bulkProgress, setBulkProgress] = useState('');

  const RECIPES_PER_PAGE = 50;

  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
    fetchRecipes(1);
  }, [searchTerm, selectedCategory, selectedCuisine, selectedDifficulty, selectedDietaryRestrictions, maxCalories, minProtein, maxPrepTime, sortBy]);

  useEffect(() => {
    // Check for success message
    if (searchParams?.get('success') === 'created') {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const fetchRecipes = async (pageNum: number) => {
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
      params.append('limit', String(RECIPES_PER_PAGE));
      params.append('page', String(pageNum));

      const response = await fetch(`/api/recipes?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const fetchedRecipes: Recipe[] = data.recipes || [];
        const total = data.pagination?.total || 0;
        
        // Remove duplicates based on _id
        const seenIds = new Set<string>();
        const uniqueRecipes = fetchedRecipes.filter(recipe => {
          if (seenIds.has(recipe._id)) {
            return false;
          }
          seenIds.add(recipe._id);
          return true;
        });
        
        setRecipes(uniqueRecipes);
        setCategories(data.categories || data.tags || []);
        setTotalRecipes(total);
        setTotalPages(Math.ceil(total / RECIPES_PER_PAGE));
      } else {
        console.error('Failed to fetch recipes:', response.status, response.statusText);
        setRecipes([]);
        setCategories([]);
        setTotalRecipes(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setRecipes([]);
      setCategories([]);
      setTotalRecipes(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages && pageNum !== currentPage) {
      setCurrentPage(pageNum);
      fetchRecipes(pageNum);
      // Scroll to top of the page
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Generate page numbers to display
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage <= 3) {
        // Near start
        for (let i = 2; i <= Math.min(4, totalPages - 1); i++) {
          pages.push(i);
        }
        if (totalPages > 5) pages.push('...');
      } else if (currentPage >= totalPages - 2) {
        // Near end
        if (totalPages > 5) pages.push('...');
        for (let i = Math.max(totalPages - 3, 2); i <= totalPages - 1; i++) {
          pages.push(i);
        }
      } else {
        // In middle
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
      }
      
      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Bulk AI add handler (SSE streaming)
  const handleBulkAIAdd = async () => {
    if (!bulkRecipeNames.trim()) return;
    
    const names = bulkRecipeNames.split(',').map(n => n.trim()).filter(n => n.length >= 2);
    if (names.length === 0) {
      toast.error('Please enter at least one valid recipe name');
      return;
    }
    if (names.length > 500) {
      toast.error('Maximum 500 recipes can be added at once');
      return;
    }

    setBulkLoading(true);
    setBulkResults([]);
    setBulkProgress(`Starting AI generation for ${names.length} recipe${names.length > 1 ? 's' : ''}...`);

    try {
      const response = await fetch('/api/recipes/ai-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeNames: bulkRecipeNames.trim() }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to start bulk generation');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream not available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // keep incomplete line in buffer

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const data = JSON.parse(jsonStr);
              
              if (currentEvent === 'init') {
                const skipMsg = data.skipped > 0 ? ` (${data.skipped} duplicates skipped)` : '';
                setBulkProgress(`Generating 0/${data.total} recipes${skipMsg}...`);
              } else if (currentEvent === 'recipe') {
                setBulkResults(prev => [
                  ...(prev || []),
                  { name: data.name, status: data.status, message: data.message }
                ]);
                setBulkProgress(`Processing ${data.progress}/${data.total} recipes...`);
              } else if (currentEvent === 'done') {
                setBulkProgress('');
                if (data.successCount > 0 || data.mergedCount > 0) {
                  toast.success(data.message);
                  fetchRecipes(currentPage);
                } else {
                  toast.error('No new recipes were created');
                }
              } else if (currentEvent === 'error') {
                toast.error(data.message || 'Stream error');
                setBulkProgress('');
              }
            } catch {
              // skip malformed JSON
            }
            currentEvent = '';
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to bulk add recipes');
      setBulkProgress('');
    } finally {
      setBulkLoading(false);
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
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkModal(true);
                setBulkResults(null);
                setBulkProgress('');
              }}
              className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 hover:from-purple-100 hover:to-blue-100 text-purple-700 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Bulk Add
            </Button>
            <Button asChild>
              <Link href="/recipes/create">
                <Plus className="h-4 w-4 mr-2" />
                Add Recipe
              </Link>
            </Button>
          </div>
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
                  {categories && categories.filter((category): category is string => Boolean(category) && category.trim() !== '').map((category) => (
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
                <span>
                  {totalRecipes > 0 
                    ? `Showing ${((currentPage - 1) * RECIPES_PER_PAGE) + 1}-${Math.min(currentPage * RECIPES_PER_PAGE, totalRecipes)} of ${totalRecipes} recipes`
                    : '0 recipes'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="flex items-center gap-2">
              {/* First Page */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="hidden sm:flex"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              
              {/* Previous Page */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Previous</span>
              </Button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((pageNum, index) => (
                  pageNum === '...' ? (
                    <span key={`top-ellipsis-${index}`} className="px-2 text-gray-400">...</span>
                  ) : (
                    <Button
                      key={`top-page-${pageNum}`}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageNum as number)}
                      className="min-w-10"
                    >
                      {pageNum}
                    </Button>
                  )
                ))}
              </div>
              
              {/* Next Page */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <span className="hidden sm:inline mr-1">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              {/* Last Page */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="hidden sm:flex"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4  ">
            {recipes && recipes.map((recipe) => (
              <Card key={recipe._id} className="hover:shadow-md transition-shadow border border-gray-200 flex flex-col h-full  ">
                {/* Recipe Image - Fixed size */}
                <div className="relative w-full h-38 bg-gray-100 overflow-hidden shrink-0">
                  {recipe.image ? (
                    <Image
                      src={recipe.image}
                      alt={recipe.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover w-full h-full"
                      loading="lazy"
                      onError={(e) => {
                        // Fallback to placeholder if image fails
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-green-50 to-emerald-100">
                      <ChefHat className="h-14 w-14 text-green-300" />
                    </div>
                  )}
                </div>

                <CardHeader className="pb-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-1 mb-1">
                        <CardTitle className="text-base line-clamp-2 font-semibold text-gray-900">{recipe.name}</CardTitle>
                      </div>
                      {recipe.uuid && (
                        <Badge variant="secondary" className="mb-1 text-xs font-mono">
                          ID: {recipe.uuid}
                        </Badge>
                      )}
                      
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 grow flex flex-col">
                  {/* Nutrition Info */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900">{recipe.calories || recipe.flatNutrition?.calories || 0}</p>
                      <p className="text-xs text-gray-500">Calories</p>
                    </div>
                    <div className="text-center border-x border-gray-200">
                      <p className="text-sm font-bold text-gray-900">{recipe.protein || recipe.flatNutrition?.protein || 0}g</p>
                      <p className="text-xs text-gray-500">Protein</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900 truncate" title={recipe.servingSize || `${recipe.servings || 1}`}>{recipe.servingSize || recipe.servings || 1}</p>
                      <p className="text-xs text-gray-500">Serving Size</p>
                    </div>
                  </div>

                  {/* Time and Macros */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{(recipe.prepTime || 0) + (recipe.cookTime || 0)} min</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">C: {recipe.carbs || recipe.flatNutrition?.carbs || 0}g</span>
                      <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded">F: {recipe.fat || recipe.flatNutrition?.fat || 0}g</span>
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
                    className="w-full mt-auto"
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

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex items-center gap-2">
              {/* First Page */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="hidden sm:flex"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              
              {/* Previous Page */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Previous</span>
              </Button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((pageNum, index) => (
                  pageNum === '...' ? (
                    <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>
                  ) : (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageNum as number)}
                      className="min-w-10"
                    >
                      {pageNum}
                    </Button>
                  )
                ))}
              </div>
              
              {/* Next Page */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <span className="hidden sm:inline mr-1">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              {/* Last Page */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="hidden sm:flex"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-sm text-gray-500">
              Page {currentPage} of {totalPages} ({totalRecipes} total recipes)
            </p>
          </div>
        )}

        {/* Bulk AI Add Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">AI Bulk Add Recipes</h2>
                </div>
                <button
                  onClick={() => { setShowBulkModal(false); setBulkRecipeNames(''); setBulkResults(null); }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Recipe Names (comma-separated)
                  </label>
                  <Textarea
                    value={bulkRecipeNames}
                    onChange={(e) => setBulkRecipeNames(e.target.value)}
                    placeholder="e.g., Paneer Butter Masala, Dal Makhani, Palak Paneer, Chole Bhature, Rajma Chawal"
                    rows={4}
                    disabled={bulkLoading}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter up to 500 recipe names separated by commas. AI will generate full details for each with real-time progress.
                  </p>
                </div>

                {bulkRecipeNames.trim() && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">
                      {bulkRecipeNames.split(',').map(n => n.trim()).filter(n => n.length >= 2).length}
                    </span> recipe(s) will be created
                  </div>
                )}

                {bulkProgress && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                      <p className="text-sm text-purple-700 dark:text-purple-300">{bulkProgress}</p>
                    </div>
                    {bulkResults && bulkResults.length > 0 && (
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.round((bulkResults.length / Math.max(bulkRecipeNames.split(',').map(n => n.trim()).filter(n => n.length >= 2).length, 1)) * 100)}%`
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {bulkResults && bulkResults.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Results:</h3>
                      <span className="text-xs text-gray-500">
                        {bulkResults.filter(r => r.status === 'success').length} created
                        {bulkResults.filter(r => r.status === 'merged').length > 0 && `, ${bulkResults.filter(r => r.status === 'merged').length} merged`}
                        {bulkResults.filter(r => r.status === 'skipped').length > 0 && `, ${bulkResults.filter(r => r.status === 'skipped').length} skipped`}
                        {bulkResults.filter(r => r.status === 'error').length > 0 && `, ${bulkResults.filter(r => r.status === 'error').length} failed`}
                      </span>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {bulkResults.map((result, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-2 rounded text-sm ${
                            result.status === 'success'
                              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                              : result.status === 'merged'
                              ? 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                              : result.status === 'skipped'
                              ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
                              : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                          }`}
                        >
                          <span className="font-medium">{result.name}</span>
                          <span>
                            {result.status === 'success' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : result.status === 'merged' ? (
                              <span className="text-xs">Merged</span>
                            ) : result.status === 'skipped' ? (
                              <span className="text-xs">{result.message}</span>
                            ) : (
                              <span className="text-xs">{result.message}</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => { setShowBulkModal(false); setBulkRecipeNames(''); setBulkResults(null); }}
                    disabled={bulkLoading}
                  >
                    {bulkResults && bulkResults.length > 0 && !bulkLoading ? 'Close' : 'Cancel'}
                  </Button>
                  {(!bulkResults || bulkResults.length === 0) && !bulkLoading && (
                    <Button
                      onClick={handleBulkAIAdd}
                      disabled={bulkLoading || !bulkRecipeNames.trim()}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    >
                      {bulkLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate & Add
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
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
