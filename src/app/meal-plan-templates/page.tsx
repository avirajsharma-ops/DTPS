'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
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
  Calendar,
  Target,
  Users,
  Clock,
  CheckCircle,
  Filter,
  Star,
  TrendingUp,
  Heart,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { UserRole } from '@/types';

interface MealPlanTemplate {
  _id: string;
  name: string;
  description: string;
  category: string;
  duration: number;
  targetCalories: {
    min: number;
    max: number;
  };
  targetMacros: {
    protein: { min: number; max: number };
    carbs: { min: number; max: number };
    fat: { min: number; max: number };
  };
  dietaryRestrictions: string[];
  tags: string[];
  isPublic: boolean;
  createdBy: {
    firstName: string;
    lastName: string;
  };
  usageCount: number;
  averageRating?: number;
  averageDailyCalories: number;
  totalRecipes: number;
  createdAt: string;
}

function MealPlanTemplatesPageContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [templates, setTemplates] = useState<MealPlanTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [showPublicOnly, setShowPublicOnly] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [searchTerm, selectedCategory, selectedTag, showPublicOnly]);

  useEffect(() => {
    // Check for success message
    if (searchParams?.get('success') === 'created') {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedTag && selectedTag !== 'all') params.append('tag', selectedTag);
      if (showPublicOnly) params.append('public', 'true');
      
      const response = await fetch(`/api/meal-plan-templates?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        setCategories(data.filters?.categories || []);
        setTags(data.filters?.tags || []);
      } else {
        console.error('Failed to fetch meal plan templates:', response.status);
        setTemplates([]);
        setCategories([]);
        setTags([]);
      }
    } catch (error) {
      console.error('Error fetching meal plan templates:', error);
      setTemplates([]);
      setCategories([]);
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: any } = {
      'weight-loss': TrendingUp,
      'weight-gain': Target,
      'maintenance': Heart,
      'muscle-gain': Zap,
      'diabetes': Heart,
      'heart-healthy': Heart,
      'keto': Zap,
      'vegan': Heart,
      'custom': Star
    };
    return icons[category] || Star;
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'weight-loss': 'bg-red-100 text-red-800',
      'weight-gain': 'bg-green-100 text-green-800',
      'maintenance': 'bg-blue-100 text-blue-800',
      'muscle-gain': 'bg-purple-100 text-purple-800',
      'diabetes': 'bg-orange-100 text-orange-800',
      'heart-healthy': 'bg-pink-100 text-pink-800',
      'keto': 'bg-yellow-100 text-yellow-800',
      'vegan': 'bg-emerald-100 text-emerald-800',
      'custom': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const formatCategoryName = (category: string) => {
    return category.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Meal Plan Templates</h1>
            <p className="text-gray-600 mt-1">
              Create and manage Diet plan templates for your clients
            </p>
          </div>
          
          {(session?.user?.role === UserRole.DIETITIAN || session?.user?.role === UserRole.ADMIN) && (
            <Button asChild>
              <Link href="/meal-plan-templates/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Link>
            </Button>
          )}
        </div>

        {/* Success Message */}
        {showSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Meal plan template created successfully! 🎉
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories && categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {formatCategoryName(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Tag Filter */}
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger>
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
                  {tags && tags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Public Only Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="publicOnly"
                  checked={showPublicOnly}
                  onChange={(e) => setShowPublicOnly(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="publicOnly" className="text-sm font-medium">
                  Public templates only
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        )}

        {/* Templates Grid */}
        {!loading && templates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Diet plan templates found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedCategory !== 'all' || selectedTag !== 'all'
                  ? 'Try adjusting your search criteria'
                  : 'Start building your meal plan template library by creating your first template'
                }
              </p>
              {!searchTerm && selectedCategory === 'all' && selectedTag === 'all' && 
               (session?.user?.role === UserRole.DIETITIAN || session?.user?.role === UserRole.ADMIN) && (
                <Button asChild>
                  <Link href="/meal-plan-templates/create">Create Your First Template</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates && templates.map((template) => {
              const CategoryIcon = getCategoryIcon(template.category);
              return (
                <Card key={template._id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2 flex items-center gap-2">
                          <CategoryIcon className="h-5 w-5" />
                          {template.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                          {template.description}
                        </CardDescription>
                      </div>
                      <Badge className={getCategoryColor(template.category)}>
                        {formatCategoryName(template.category)}
                      </Badge>
                    </div>
                  </CardHeader>
                
                  <CardContent className="space-y-4">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="font-semibold text-lg">{template.duration}</p>
                        <p className="text-gray-600">Days</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="font-semibold text-lg">{template.averageDailyCalories}</p>
                        <p className="text-gray-600">Avg Calories</p>
                      </div>
                    </div>

                    {/* Calorie Range */}
                    <div className="text-sm">
                      <p className="font-medium text-gray-700">Target Calories</p>
                      <p className="text-gray-600">
                        {template.targetCalories.min} - {template.targetCalories.max} kcal/day
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>{template.usageCount} uses</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{template.totalRecipes} recipes</span>
                      </div>
                      {template.averageRating && (
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{template.averageRating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {template.tags && template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {template.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.tags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Creator */}
                    <div className="text-xs text-gray-500">
                      Created by Dr. {template.createdBy.firstName} {template.createdBy.lastName}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" asChild>
                        <Link href={`/meal-plan-templates/${template._id}`}>
                          View Details
                        </Link>
                      </Button>
                      {(session?.user?.role === UserRole.DIETITIAN || session?.user?.role === UserRole.ADMIN) && (
                        <Button className="flex-1" asChild>
                          <Link href={`/meal-plan-templates/${template._id}/assign`}>
                            Assign to Client
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function MealPlanTemplatesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner /></div>}>
      <MealPlanTemplatesPageContent />
    </Suspense>
  );
}
