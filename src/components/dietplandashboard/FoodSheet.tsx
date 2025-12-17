"use client";

import { useState, useEffect } from "react";
import {
  X,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FoodItem = {
  id: string;
  date: string;
  time: string;
  menu: string;
  amount: string;
  cals: number;
  carbs: number;
  protein: number;
  fats: number;
  fiber?: number;
  selected: boolean;
};

type FoodDatabasePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectFood: (foods: FoodItem[]) => void;
  clientDietaryRestrictions?: string; // comma-separated e.g. "Vegetarian, Gluten-Free"
  clientMedicalConditions?: string;   // comma-separated e.g. "Diabetes, hypertension"
  clientAllergies?: string;           // comma-separated e.g. "nuts, dairy"
};

export function FoodDatabasePanel({
  isOpen,
  onClose,
  onSelectFood,
  clientDietaryRestrictions = '',
  clientMedicalConditions = '',
  clientAllergies = '',
}: FoodDatabasePanelProps) {
  // Parse client restrictions into arrays for filtering
  const clientDietaryArr = clientDietaryRestrictions.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const clientMedicalArr = clientMedicalConditions.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const clientAllergyArr = clientAllergies.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const [foodData, setFoodData] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch recipes from the database
  useEffect(() => {
    const fetchRecipes = async () => {
      if (!isOpen) return;
      
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append('limit', '100');
        if (searchQuery) params.append('search', searchQuery);
        if (categoryFilter && categoryFilter !== 'all') {
          params.append('category', categoryFilter);
        }
        
        const response = await fetch(`/api/recipes?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          const recipes = data.recipes || [];
          
          // Debug: Log client restrictions
          console.log('🔍 Client Filtering:', {
            dietary: clientDietaryArr,
            medical: clientMedicalArr,
            allergies: clientAllergyArr
          });
          
          // Filter recipes based on client restrictions
          const filteredRecipes = recipes.filter((recipe: any) => {
            const recipeAllergens: string[] = (recipe.allergens || []).map((a: string) => a.toLowerCase().trim());
            const recipeDietary: string[] = (recipe.dietaryRestrictions || []).map((d: string) => d.toLowerCase().trim());
            const recipeMedical: string[] = (recipe.medicalContraindications || []).map((m: string) => m.toLowerCase().trim());
            const recipeIngredients: string[] = (recipe.ingredients || []).map((ing: any) => (ing.name || '').toLowerCase().trim());
            
            // ===== ALLERGEN CHECKS =====
            // Exclude if recipe contains any allergen the client is allergic to
            const hasClientAllergen = clientAllergyArr.some(allergy => 
              recipeAllergens.some((ra: string) => ra.includes(allergy) || allergy.includes(ra)) || 
              recipe.name?.toLowerCase().includes(allergy) ||
              recipeIngredients.some((ing: string) => ing.includes(allergy))
            );
            if (hasClientAllergen) {
              console.log(`❌ Recipe "${recipe.name}" excluded - allergen match`);
              return false;
            }
            
            // ===== DIETARY RESTRICTION CHECKS =====
            // Check if client's dietary restriction matches recipe's dietary restriction
            // If client has a restriction (e.g., "Non-Vegetarian") and recipe also has it, EXCLUDE the recipe
            const hasDietaryConflict = clientDietaryArr.some((clientRestriction: string) => 
              recipeDietary.some((recipeRestriction: string) => 
                clientRestriction === recipeRestriction || 
                recipeRestriction.includes(clientRestriction) || 
                clientRestriction.includes(recipeRestriction)
              )
            );
            
            if (hasDietaryConflict) {
              console.log(`❌ Recipe "${recipe.name}" excluded - dietary restriction match. Client: [${clientDietaryArr.join(', ')}], Recipe: [${recipeDietary.join(', ')}]`);
              return false;
            }
            
            // If client is Gluten-Free, exclude recipes with gluten
            if (clientDietaryArr.includes('gluten-free') && 
                (recipeAllergens.includes('gluten') || recipeDietary.some((d: string) => d.includes('gluten') && !d.includes('gluten-free')))) {
              console.log(`❌ Recipe "${recipe.name}" excluded - client is gluten-free`);
              return false;
            }
            
            // If client is Dairy-Free, exclude recipes with dairy
            if (clientDietaryArr.includes('dairy-free') && recipeAllergens.includes('dairy')) {
              console.log(`❌ Recipe "${recipe.name}" excluded - client is dairy-free`);
              return false;
            }
            
            // If client has Lactose Intolerance (from medical), exclude dairy recipes
            if (clientMedicalArr.includes('lactose intolerance') && recipeAllergens.includes('dairy')) {
              console.log(`❌ Recipe "${recipe.name}" excluded - client has lactose intolerance`);
              return false;
            }
            
            // If client has Celiac Disease (from medical), exclude gluten recipes
            if (clientMedicalArr.includes('celiac disease') && recipeAllergens.includes('gluten')) {
              console.log(`❌ Recipe "${recipe.name}" excluded - client has celiac disease`);
              return false;
            }
            
            // ===== MEDICAL CONTRAINDICATIONS CHECK =====
            // Exclude recipes that have medical contraindications matching client's conditions
            const hasMedicalConflict = clientMedicalArr.some(clientCondition => 
              recipeMedical.some((recipeContra: string) => {
                // Case-insensitive partial matching
                const match = recipeContra.includes(clientCondition) || clientCondition.includes(recipeContra);
                return match;
              })
            );
            
            if (hasMedicalConflict) {
              console.log(`❌ Recipe "${recipe.name}" excluded - medical contraindication match. Client: [${clientMedicalArr.join(', ')}], Recipe: [${recipeMedical.join(', ')}]`);
              return false;
            }
            
            // All checks passed - recipe is suitable for client
            return true;
          });
          
          // Log filtering results
          console.log(`📊 Recipe Filtering: ${recipes.length} total → ${filteredRecipes.length} suitable (${recipes.length - filteredRecipes.length} filtered out)`);
          
          // Transform filtered recipes to FoodItem format
          const transformedData: FoodItem[] = filteredRecipes.map((recipe: any) => ({
            id: recipe._id,
            date: new Date().toISOString().split('T')[0],
            time: '12:00',
            menu: recipe.name,
            amount: `${recipe.servings || 1} serving${(recipe.servings || 1) > 1 ? 's' : ''}`,
            cals: recipe.nutrition?.calories || 0,
            carbs: recipe.nutrition?.carbs || 0,
            protein: recipe.nutrition?.protein || 0,
            fats: recipe.nutrition?.fat || 0,
            fiber: recipe.nutrition?.fiber || 0,
            selected: false,
          }));
          
          setFoodData(transformedData);
        }
      } catch (error) {
        console.error('Error fetching recipes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, [isOpen, searchQuery, categoryFilter, clientDietaryArr.join(','), clientMedicalArr.join(','), clientAllergyArr.join(','), refreshKey]);

  const handleRefresh = () => {
    setCurrentPage(1);
    setRefreshKey(prev => prev + 1);
  };
  
  const itemsPerPage = 12;

  const totalPages = Math.ceil(foodData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = foodData.slice(startIndex, startIndex + itemsPerPage);

  const toggleSelection = (id: string) => {
    setFoodData((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateFoodItem = (id: string, field: keyof FoodItem, value: any) => {
    setFoodData((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleAddSelected = () => {
    const selectedItems = foodData.filter((item) => item.selected);
    if (selectedItems.length > 0) {
      onSelectFood(selectedItems);
      setFoodData(prev => prev.map(item => ({ ...item, selected: false })));
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>

      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-lg z-70 transition-all duration-300"
        onClick={onClose}
      />
      

      {/* Slide-in Panel - LEFT SIDE */}
<div className="fixed left-0 top-0 h-full w-1/2 bg-white shadow-2xl z-120 flex flex-col animate-slide-in">

        {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white flex-shrink-0">
      <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="hover:bg-gray-200"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back
            </Button>
            <h2 className="text-xl font-semibold text-slate-900">
              Food Database
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-gray-200"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipes..."
                className="h-10 bg-gray-50 border-gray-300 flex-1"
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            >
              <SelectTrigger className="w-40 h-10 border-gray-300">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent style={{ zIndex: 130 }}>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
                <SelectItem value="dessert">Dessert</SelectItem>
                <SelectItem value="beverage">Beverage</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 bg-white hover:bg-slate-50"
              asChild
            >
              <Link href="/recipes/create" target="_blank" rel="noopener noreferrer">
                <Plus className="w-4 h-4 mr-2" />
                Create Recipe
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 bg-white hover:bg-slate-50"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleAddSelected}
              style={{ backgroundColor: '#00A63E', color: 'white' }}
              className="hover:opacity-90 font-medium h-10"
              disabled={!foodData.some((item) => item.selected)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-gray-500">Loading recipes from database...</p>
            </div>
          ) : foodData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-gray-500">No recipes found</p>
              <Button variant="outline" asChild>
             <Link href="/recipes/create" target="_blank" rel="noopener noreferrer">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Recipe
                </Link>
              </Button>
            </div>
          ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-8"></th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Menu
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cals
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Carbs
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Protein
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fats
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => toggleSelection(item.id)}
                    style={item.selected ? { backgroundColor: '#BCEBCB' } : {}}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${
                      item.selected 
                        ? "hover:brightness-95" 
                        : "hover:bg-slate-50"
                    }`}
                    onMouseEnter={(e) => {
                      if (item.selected) {
                        e.currentTarget.style.backgroundColor = '#C2E66E';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (item.selected) {
                        e.currentTarget.style.backgroundColor = '#BCEBCB';
                      }
                    }}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={() => toggleSelection(item.id)}
                        className="border-gray-300"
                      />
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-slate-900">{item.menu}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700">{item.amount}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-slate-900">{item.cals} <span className="text-xs text-slate-500">kcal</span></div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700">{item.carbs} <span className="text-xs text-slate-500">gr</span></div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700">{item.protein} <span className="text-xs text-slate-500">gr</span></div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700">{item.fats} <span className="text-xs text-slate-500">gr</span></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {/* Footer with Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, foodData.length)} of {foodData.length} recipes
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              if (totalPages <= 7) {
                return i + 1;
              } else if (i === 3) {
                return "...";
              } else if (i < 3) {
                return i + 1;
              } else {
                return totalPages - (6 - i);
              }
            }).map((page, i) => (
              <Button
                key={i}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  typeof page === "number" && setCurrentPage(page)
                }
                disabled={page === "..."}
                style={currentPage === page ? { backgroundColor: '#00A63E', color: 'white', borderColor: '#00A63E' } : {}}
                className={`w-9 h-9 p-0 ${
                  currentPage === page
                    ? "hover:opacity-90"
                    : "border-gray-300"
                }`}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) =>
                  Math.min(prev + 1, totalPages)
                )
              }
              disabled={currentPage === totalPages}
              className="w-9 h-9 p-0 border-gray-300"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <style>{`
       @keyframes slide-in {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

      `}</style>
    </>
  );
}