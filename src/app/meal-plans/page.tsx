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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Plus,
  ChefHat,
  Calendar,
  Users,
  Target,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Filter,
  Star,
  TrendingUp,
  Heart,
  Zap,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { UserRole } from '@/types';

interface MealPlan {
  _id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  targetCalories: number;
  targetMacros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  isActive: boolean;
  client: {
    firstName: string;
    lastName: string;
  };
  dietitian: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

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

// Fixed meal plans page
function MealPlansPageContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  // Meal Plans State
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [mealPlansLoading, setMealPlansLoading] = useState(true);
  const [mealPlanSearch, setMealPlanSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Templates State
  const [templates, setTemplates] = useState<MealPlanTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('plans');

  useEffect(() => {
    fetchMealPlans();
    fetchTemplates();
  }, [searchParams]);

  useEffect(() => {
    fetchTemplates();
  }, [templateSearch, selectedCategory]);

  useEffect(() => {
    // Check for success message
    if (searchParams?.get('success') === 'created') {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const fetchMealPlans = async () => {
    try {
      setMealPlansLoading(true);

      // Check if there's a client parameter to filter by
      const clientId = searchParams.get('client');
      const url = clientId ? `/api/meals?client=${clientId}` : '/api/meals';

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setMealPlans(data.mealPlans);
      }
    } catch (error) {
      console.error('Error fetching meal plans:', error);
    } finally {
      setMealPlansLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true);

      const params = new URLSearchParams();
      if (templateSearch) params.append('search', templateSearch);
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);

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
      setTemplatesLoading(false);
    }
  };

  const filteredMealPlans = mealPlans.filter(plan => {
    const matchesSearch =
      plan.name.toLowerCase().includes(mealPlanSearch.toLowerCase()) ||
      plan.client.firstName.toLowerCase().includes(mealPlanSearch.toLowerCase()) ||
      plan.client.lastName.toLowerCase().includes(mealPlanSearch.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && plan.isActive) ||
      (statusFilter === 'inactive' && !plan.isActive);

    return matchesSearch && matchesStatus;
  });

  // Helper functions for templates
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

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-800';
  };

  const isPlanActive = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return now >= start && now <= end;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Diet Plans & Templates</h1>
            <p className="text-gray-600 mt-1">
              Manage Diet plans and templates for your clients
            </p>
          </div>

          {(session?.user?.role === UserRole.DIETITIAN || session?.user?.role === UserRole.ADMIN) && (
            <div className="flex gap-2">
              <Button variant="outline" className="cursor-pointer" asChild>
                <Link href="/meal-plans/templates/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Link>
              </Button>
              <Button className="cursor-pointer" asChild>
                <Link href="/meal-plans/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Diet Plan
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Success Message */}
        {showSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Diet plan template created successfully! 🎉
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plans">Active Diet Plans</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search Diet plans or clients..."
                      value={mealPlanSearch}
                      onChange={(e) => setMealPlanSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <ChefHat className="h-4 w-4" />
                    <span>{filteredMealPlans.length} Diet plans</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Meal Plans List */}
            {mealPlansLoading ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner />
          </div>
        ) : filteredMealPlans.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {mealPlanSearch || statusFilter !== 'all' ? 'No Diet plans found' : 'No Diet plans yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {mealPlanSearch || statusFilter !== 'all'
                  ? 'Try adjusting your search criteria'
                  : 'Start creating personalized meal plans for your clients'
                }
              </p>
              {!mealPlanSearch && statusFilter === 'all' && (
                <Button className="cursor-pointer" asChild>
                  <Link href="/meal-plans/create">Create Your First Diet Plan</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium text-gray-900">Plan Name</th>
                      <th className="text-left p-4 font-medium text-gray-900">Client</th>
                      <th className="text-left p-4 font-medium text-gray-900">Duration</th>
                      <th className="text-left p-4 font-medium text-gray-900">Calories</th>
                      <th className="text-left p-4 font-medium text-gray-900">Status</th>
                      <th className="text-left p-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMealPlans.map((plan) => (
                      <tr key={plan._id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div>
                            <p className="font-medium text-gray-900">{plan.name}</p>
                            <p className="text-sm text-gray-600 line-clamp-1">{plan.description}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{plan.client.firstName} {plan.client.lastName}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-gray-600">
                            <div>{format(new Date(plan.startDate), 'MMM d')}</div>
                            <div>to {format(new Date(plan.endDate), 'MMM d, yyyy')}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div className="font-medium">{plan.targetCalories} cal</div>
                            <div className="text-gray-500">
                              P:{plan.targetMacros.protein}g C:{plan.targetMacros.carbs}g F:{plan.targetMacros.fat}g
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col space-y-1">
                            <Badge className={getStatusColor(plan.isActive)}>
                              {plan.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            {isPlanActive(plan.startDate, plan.endDate) && (
                              <div className="flex items-center space-x-1 text-xs text-green-600">
                                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                                <span>Current</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="cursor-pointer" asChild>
                              <Link href={`/meal-plans/${plan._id}`}>
                                <Eye className="h-3 w-3" />
                              </Link>
                            </Button>
                            <Button size="sm" variant="outline" className="cursor-pointer" asChild>
                              <Link href={`/meal-plans/${plan._id}/edit`}>
                                <Edit className="h-3 w-3" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-600">
                  Diet plan templates will be displayed here. Visit{' '}
                  <Link href="/meal-plan-templates" className="text-blue-600 hover:underline">
                    Diet Plan Templates
                  </Link>{' '}
                  to manage templates.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default function MealPlansPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner /></div>}>
      <MealPlansPageContent />
    </Suspense>
  );
}
