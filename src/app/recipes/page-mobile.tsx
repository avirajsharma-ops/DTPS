'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, X } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface Recipe {
  _id: string;
  name: string;
  image?: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  prepTime: number;
  cookTime: number;
  servings: number;
  description?: string;
}

export default function RecipesListMobile() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes?limit=1000');
      if (response.ok) {
        const data = await response.json();
        setRecipes(data.recipes || []);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center flex-1">
            <button
              onClick={() => router.back()}
              className="h-10 w-10 flex items-center justify-center active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-6 w-6 text-gray-600" />
            </button>

            {showSearch ? (
              <div className="flex-1 flex items-center ml-2 bg-gray-100 rounded-lg px-3">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 ml-2 py-2 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
            ) : (
              <h1 className="text-lg font-medium text-gray-700 ml-3">
                Recipes
              </h1>
            )}
          </div>

          <button
            onClick={() => setShowSearch(!showSearch)}
            className="h-10 w-10 flex items-center justify-center active:scale-95 transition-transform ml-2"
          >
            <Search className="h-5 w-5 text-teal-600" />
          </button>
        </div>
      </div>

      {/* Recipes List */}
      <div className="p-4">
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No recipes found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecipes.map((recipe, index) => (
              <button
                key={recipe._id}
                onClick={() => router.push(`/recipes/${recipe._id}`)}
                className="w-full bg-white rounded-2xl overflow-hidden shadow-sm active:scale-[0.98] transition-all duration-200"
              >
                {/* First recipe - Large featured card */}
                {index === 0 ? (
                  <div className="relative">
                    <div className="relative h-56 w-full bg-gradient-to-br from-amber-100 to-orange-100">
                      {recipe.image ? (
                        <img
                          src={recipe.image}
                          alt={recipe.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-7xl">🍽️</div>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {recipe.name}
                      </h3>
                    </div>
                  </div>
                ) : (
                  /* Other recipes - Horizontal cards */
                  <div className="flex items-center p-3">
                    <div className="flex-1 pr-3">
                      <h3 className="text-base font-medium text-gray-900 text-left">
                        {recipe.name}
                      </h3>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="relative h-20 w-28 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden">
                        {recipe.image ? (
                          <img
                            src={recipe.image}
                            alt={recipe.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-3xl">🍽️</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom spacing for navigation */}
      <div className="h-20"></div>
    </div>
  );
}

