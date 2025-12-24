'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Users, Flame, ChefHat, Bookmark, Lightbulb } from 'lucide-react';
import SpoonGifLoader from '@/components/ui/SpoonGifLoader';

interface Recipe {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  servings?: number;
  cookTime?: string;
  prepTime?: string;
  calories?: number;
  difficulty?: string;
  image?: string;
  ingredients?: Array<{ name: string; quantity: string; unit: string }>;
  instructions?: string[];
  tips?: string[];
  nutrition?: {
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  };
}

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [servingMultiplier, setServingMultiplier] = useState(1);

  useEffect(() => {
    fetchRecipeDetail();
  }, [params.id]);

  const fetchRecipeDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/recipes/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setRecipe(data.recipe);
      }
    } catch (error) {
      console.error('Error fetching recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <SpoonGifLoader size="lg" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Recipe not found</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-[#3AB1A0] text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-4 max-w-4xl mx-auto w-full">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#3AB1A0]/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#3AB1A0]" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Recipe Details</h1>
          <button
            onClick={() => setIsSaved(!isSaved)}
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
              isSaved ? 'bg-[#E06A26]/10' : 'hover:bg-gray-100'
            }`}
          >
            <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-[#E06A26] text-[#E06A26]' : 'text-gray-400'}`} />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto">
        {/* Recipe Hero Image */}
        {recipe.image && (
          <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden mb-6 shadow-md">
            <img
              src={recipe.image}
              alt={recipe.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            {recipe.difficulty && (
              <div className="absolute top-4 right-4 px-3 py-1 rounded-lg bg-white/95 text-[#E06A26] font-semibold text-xs">
                {recipe.difficulty.toUpperCase()}
              </div>
            )}
          </div>
        )}

        {/* Recipe Title & Description */}
        <div className="mb-6">
          <div className="mb-3">
            <span className="inline-block px-3 py-1 rounded-full bg-[#3AB1A0]/10 text-[#3AB1A0] text-xs font-bold">
              {recipe.category || 'Recipe'}
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{recipe.name}</h2>
          <p className="text-gray-600 text-base leading-relaxed">{recipe.description}</p>
        </div>

        {/* Meta Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {recipe.prepTime && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <Clock className="w-5 h-5 text-[#3AB1A0] mx-auto mb-2" />
              <p className="text-xs text-gray-500 mb-1">Prep Time</p>
              <p className="font-bold text-gray-900 text-sm">{recipe.prepTime}</p>
            </div>
          )}
          {recipe.cookTime && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <ChefHat className="w-5 h-5 text-[#DB9C6E] mx-auto mb-2" />
              <p className="text-xs text-gray-500 mb-1">Cook Time</p>
              <p className="font-bold text-gray-900 text-sm">{recipe.cookTime}</p>
            </div>
          )}
          {recipe.servings && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <Users className="w-5 h-5 text-[#3AB1A0] mx-auto mb-2" />
              <p className="text-xs text-gray-500 mb-1">Servings</p>
              <p className="font-bold text-gray-900 text-sm">{recipe.servings}</p>
            </div>
          )}
          {recipe.calories && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <Flame className="w-5 h-5 text-[#E06A26] mx-auto mb-2" />
              <p className="text-xs text-gray-500 mb-1">Calories</p>
              <p className="font-bold text-gray-900 text-sm">{recipe.calories}</p>
            </div>
          )}
        </div>

        {/* Serving Multiplier */}
        {recipe.servings && (
          <div className="mb-8 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm font-bold text-gray-900 mb-4">Adjust Servings</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setServingMultiplier(Math.max(0.5, servingMultiplier - 0.5))}
                className="w-12 h-12 rounded-lg bg-[#3AB1A0]/10 text-[#3AB1A0] font-bold hover:bg-[#3AB1A0] hover:text-white transition-colors text-xl"
              >
                −
              </button>
              <span className="flex-1 text-center">
                <p className="font-bold text-gray-900 text-lg">{servingMultiplier}×</p>
                <p className="text-sm text-gray-500">{Math.round(recipe.servings * servingMultiplier)} servings</p>
              </span>
              <button
                onClick={() => setServingMultiplier(servingMultiplier + 0.5)}
                className="w-12 h-12 rounded-lg bg-[#3AB1A0]/10 text-[#3AB1A0] font-bold hover:bg-[#3AB1A0] hover:text-white transition-colors text-xl"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Ingredients */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-5">Ingredients</h3>
            <ul className="space-y-3">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-center gap-3 p-3 bg-linear-to-r from-[#3AB1A0]/5 to-transparent rounded-lg border border-[#3AB1A0]/10">
                  <input type="checkbox" className="w-5 h-5 text-[#3AB1A0] rounded cursor-pointer accent-[#3AB1A0]" />
                  <span className="flex-1">
                    <span className="font-medium text-gray-900">{ingredient.name}</span>
                    <span className="text-gray-500 text-sm ml-1">
                      {Math.round(parseFloat(ingredient.quantity) * servingMultiplier * 100) / 100} {ingredient.unit}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instructions */}
        {recipe.instructions && recipe.instructions.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-5">Instructions</h3>
            <ol className="space-y-4">
              {recipe.instructions.map((instruction, index) => (
                <li key={index} className="flex gap-4">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-[#3AB1A0] text-white flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </span>
                  <span className="text-gray-700 pt-0.5 text-sm leading-relaxed">{instruction}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Tips */}
        {recipe.tips && recipe.tips.length > 0 && (
          <div className="bg-[#DB9C6E]/10 rounded-2xl p-6 shadow-sm border border-[#DB9C6E]/20 mb-8">
            <div className="flex items-start gap-3 mb-4">
              <Lightbulb className="w-5 h-5 text-[#DB9C6E] shrink-0 mt-0.5" />
              <h3 className="text-lg font-bold text-gray-900">Cooking Tips</h3>
            </div>
            <ul className="space-y-2">
              {recipe.tips.map((tip, index) => (
                <li key={index} className="text-gray-700 text-sm">
                  • {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Nutrition Info */}
        {recipe.nutrition && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-5">Nutrition Information</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {recipe.nutrition.protein && (
                <div className="p-4 bg-[#3AB1A0]/10 rounded-xl border border-[#3AB1A0]">
                  <p className="text-xs font-bold text-gray-700 mb-1">PROTEIN</p>
                  <p className="text-2xl font-bold text-gray-700">{recipe.nutrition.protein}g</p>
                </div>
              )}
              {recipe.nutrition.carbs && (
                <div className="p-4 bg-[#3AB1A0]/10 rounded-xl border border-[#3AB1A0]">
                  <p className="text-xs font-bold text-gray-700 mb-1">CARBS</p>
                  <p className="text-2xl font-bold text-gray-700">{recipe.nutrition.carbs}g</p>
                </div>
              )}
              {recipe.nutrition.fat && (
                <div className="p-4 bg-[#3AB1A0]/10 rounded-xl border border-[#3AB1A0]">
                  <p className="text-xs font-bold text-gray-700 mb-1">FAT</p>
                  <p className="text-2xl font-bold text-gray-700">{recipe.nutrition.fat}g</p>
                </div>
              )}
              {recipe.nutrition.fiber && (
                <div className="p-4 bg-[#3AB1A0]/10 rounded-xl border border-[#3AB1A0]">
                  <p className="text-xs font-bold text-gray-700 mb-1">FIBER</p>
                  <p className="text-2xl font-bold text-gray-700">{recipe.nutrition.fiber}g</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
