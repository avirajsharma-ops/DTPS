'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Clock, Users, Flame, Search } from 'lucide-react';
import SpoonGifLoader from '@/components/ui/SpoonGifLoader';
import { useRouter } from 'next/navigation';

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
  ingredients?: string[];
  instructions?: string[];
}

export default function RecipesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      // Fetch from your recipes API
      const response = await fetch('/api/recipes');
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

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || recipe.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(recipes.map(r => r.category).filter(Boolean))];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <SpoonGifLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-4 max-w-5xl mx-auto w-full">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#3AB1A0]/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#3AB1A0]" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Recipes</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-5xl mx-auto">
        {/* Search Bar */}
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#3AB1A0] focus:ring-1 focus:ring-[#3AB1A0]/20 transition-all"
          />
        </div>

        {/* Category Filter - Horizontal Scroll */}
        {categories.length > 0 && (
          <div className="mb-8 flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                !selectedCategory
                  ? 'bg-[#3AB1A0] text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-[#3AB1A0] hover:bg-[#3AB1A0]/5'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat!)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#3AB1A0] text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-[#3AB1A0] hover:bg-[#3AB1A0]/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Recipes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRecipes.map((recipe) => (
            <Link
              key={recipe._id}
              href={`/user/recipes/${recipe._id}`}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all hover:scale-105 border border-gray-100"
            >
              {/* Recipe Image */}
              {recipe.image && (
                <div className="relative h-44 bg-linear-to-br from-gray-200 to-gray-300">
                  <img
                    src={recipe.image}
                    alt={recipe.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  {recipe.difficulty && (
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-bold bg-white/95 text-[#E06A26]">
                      {recipe.difficulty}
                    </div>
                  )}
                </div>
              )}

              {/* Recipe Info */}
              <div className="p-4">
                <div className="mb-2">
                  <span className="inline-block px-2 py-1 rounded-md text-xs font-bold bg-[#3AB1A0]/10 text-[#3AB1A0]">
                    {recipe.category || 'Recipe'}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 text-sm">{recipe.name}</h3>
                <p className="text-xs text-gray-600 mb-4 line-clamp-2">{recipe.description}</p>

                {/* Meta Info */}
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 border-t border-gray-100 pt-3">
                  {recipe.prepTime && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#3AB1A0]" />
                      <span>{recipe.prepTime}</span>
                    </div>
                  )}
                  {recipe.servings && (
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#3AB1A0]" />
                      <span>{recipe.servings} servings</span>
                    </div>
                  )}
                  {recipe.calories && (
                    <div className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-[#E06A26]" />
                      <span>{recipe.calories} kcal</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredRecipes.length === 0 && (
          <div className="py-20 text-center">
            <Flame className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No recipes found</p>
          </div>
        )}
      </div>
    </div>
  );
}
