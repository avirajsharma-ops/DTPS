'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  Search,
  Plus,
  CheckCircle,
  ChefHat
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Link from 'next/link';
import { UserRole } from '@/types';


interface MealPlanTemplate {
  _id: string;
  templateType?: 'plan' | 'diet';
  name: string;
  description: string;
  category: string;
  duration: number;
  targetCalories: { min: number; max: number; };
  targetMacros: {
    protein: { min: number; max: number; };
    carbs: { min: number; max: number; };
    fat: { min: number; max: number; };
  };
  dietaryRestrictions: string[];
  tags: string[];
  isPublic: boolean;
  createdBy: { firstName: string; lastName: string; };
  usageCount: number;
  averageRating?: number;
  averageDailyCalories: number;
  totalRecipes: number;
  createdAt: string;
}

function MealPlanTemplatesPageContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'plans' | 'diet'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('templates_activeTab');
      if (stored === 'plans' || stored === 'diet') return stored;
    }
    return 'plans';
  });

  // Plan templates state (no days filter)
  const [planTemplates, setPlanTemplates] = useState<MealPlanTemplate[]>([]);
  const [planSearch, setPlanSearch] = useState(() =>
    (typeof window !== 'undefined' ? localStorage.getItem('planSearch') || '' : '')
  );
  const [planLoading, setPlanLoading] = useState(false);

  // Diet templates state (no days filter)
  const [dietTemplates, setDietTemplates] = useState<MealPlanTemplate[]>([]);
  const [dietSearchTerm, setDietSearchTerm] = useState(() =>
    (typeof window !== 'undefined' ? localStorage.getItem('dietSearchTerm') || '' : '')
  );
  const [dietDietaryRestrictions, setDietDietaryRestrictions] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('dietDietaryRestrictions');
        if (raw && raw !== 'null' && raw !== '') {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) return arr;
        }
      } catch {/* ignore */}
    }
    return [];
  });
  const [dietLoading, setDietLoading] = useState(false);
  const dietaryRestrictionsList = [
    'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'egg-free', 'soy-free', 'keto', 'paleo', 'low-carb', 'low-fat', 'diabetic-friendly'
  ];

  // Initial load from localStorage (safe parse)
  useEffect(() => {
    try {
      const planRaw = typeof window !== 'undefined' ? localStorage.getItem('planTemplates_cache') : null;
      if (planRaw && planRaw !== 'null' && planRaw !== '') {
        const arr = JSON.parse(planRaw);
        if (Array.isArray(arr)) setPlanTemplates(arr.filter(t => t.templateType === 'plan' || t.templateType === undefined));
      }
    } catch { setPlanTemplates([]); }
    try {
      const dietRaw = typeof window !== 'undefined' ? localStorage.getItem('dietTemplates_cache') : null;
      if (dietRaw && dietRaw !== 'null' && dietRaw !== '') {
        const arr = JSON.parse(dietRaw);
        if (Array.isArray(arr)) setDietTemplates(arr.filter(t => t.templateType === 'diet'));
      }
    } catch { setDietTemplates([]); }
  }, []);

  useEffect(() => { if (activeTab === 'plans') fetchPlanTemplates(); }, [activeTab, planSearch]);
  useEffect(() => { if (activeTab === 'diet') fetchDietTemplates(); }, [activeTab, dietSearchTerm, dietDietaryRestrictions]);
  useEffect(() => { try { localStorage.setItem('templates_activeTab', activeTab); } catch {} }, [activeTab]);
  useEffect(() => { try { localStorage.setItem('planSearch', planSearch); } catch {} }, [planSearch]);
  useEffect(() => { try { localStorage.setItem('dietSearchTerm', dietSearchTerm); } catch {} }, [dietSearchTerm]);
  useEffect(() => { try { localStorage.setItem('dietDietaryRestrictions', JSON.stringify(dietDietaryRestrictions)); } catch {} }, [dietDietaryRestrictions]);

  useEffect(() => {
    if (searchParams?.get('success') === 'created') {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const fetchPlanTemplates = async () => {
    try {
      setPlanLoading(true);
      const params = new URLSearchParams();
      params.append('templateType', 'plan');
      if (planSearch) params.append('search', planSearch);
      const response = await fetch(`/api/meal-plan-templates?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setPlanTemplates((data.templates || []).filter((t: MealPlanTemplate) => t.templateType === 'plan' || t.templateType === undefined));
        try { localStorage.setItem('planTemplates_cache', JSON.stringify(data.templates || [])); } catch {}
      } else {
        setPlanTemplates([]);
      }
    } catch { setPlanTemplates([]); }
    finally { setPlanLoading(false); }
  };

  const fetchDietTemplates = async () => {
    try {
      setDietLoading(true);
      const params = new URLSearchParams();
      params.append('templateType', 'diet');
      if (dietSearchTerm) params.append('search', dietSearchTerm);
      if (dietDietaryRestrictions.length > 0)
        params.append('dietaryRestrictions', dietDietaryRestrictions.join(','));
      const response = await fetch(`/api/meal-plan-templates?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setDietTemplates((data.templates || []).filter((t: MealPlanTemplate) => t.templateType === 'diet'));
        try { localStorage.setItem('dietTemplates_cache', JSON.stringify(data.templates || [])); } catch {}
      } else {
        setDietTemplates([]);
      }
    } catch { setDietTemplates([]); }
    finally { setDietLoading(false); }
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

  const formatCategoryName = (category: string) => category.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  const filteredPlanTemplates = planTemplates
    .filter(t => (t.templateType === 'plan' || t.templateType === undefined))
    .filter(t => planSearch === '' || t.name.toLowerCase().includes(planSearch.toLowerCase()));

  const filteredDietTemplates = dietTemplates
    .filter(t => t.templateType === 'diet')
    .filter(t =>
      (dietSearchTerm === '' || t.name.toLowerCase().includes(dietSearchTerm.toLowerCase())) &&
      (dietDietaryRestrictions.length === 0 || dietDietaryRestrictions.every(r => t.dietaryRestrictions?.includes(r)))
    );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Templates</h1>
            <p className="text-gray-600 mt-1">
              Create plan templates and diet templates for your clients
            </p>
          </div>
        </div>
        {showSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              plan template created successfully! 🎉
            </AlertDescription>
          </Alert>
        )}
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'plans' | 'diet')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plans">Plan Templates</TabsTrigger>
            <TabsTrigger value="diet">Diet Templates</TabsTrigger>
          </TabsList>
          <TabsContent value="plans" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input placeholder="Search plan templates..." value={planSearch} onChange={e => setPlanSearch(e.target.value)} className="pl-10" />
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <ChefHat className="h-4 w-4" />
                    <span>{filteredPlanTemplates.length} Templates</span>
                  </div>
                  {(session?.user?.role === UserRole.DIETITIAN || session?.user?.role === UserRole.ADMIN) && (
                    <Button asChild>
                      <Link href="/meal-plan-templates/plans/create">
                        <Plus className="h-4 w-4 mr-2" />Create Plan Template
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            {planLoading ? (
              <div className="flex items-center justify-center h-32"><LoadingSpinner /></div>
            ) : filteredPlanTemplates.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No plan templates found</h3>
                  <p className="text-gray-600 mb-4">Create your first template to get started</p>
                  {(session?.user?.role === UserRole.DIETITIAN || session?.user?.role === UserRole.ADMIN) && (
                    <Button asChild>
                      <Link href="/meal-plan-templates/plans/create">
                        <Plus className="h-4 w-4 mr-2" />Create Plan Template
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              // Only show Name, Category, Cal Range, Actions (NO duration or description)
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-4 font-medium text-gray-900">Template Name</th>
                          <th className="text-left p-4 font-medium text-gray-900">Category</th>
                          <th className="text-left p-4 font-medium text-gray-900">Cal Range</th>
                          <th className="text-left p-4 font-medium text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPlanTemplates.map(t => (
                          <tr key={t._id} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                              <div>
                                <p className="font-medium text-gray-900">{t.name}</p>
                              </div>
                            </td>
                            <td className="p-4 text-sm">
                              <Badge className={getCategoryColor(t.category)}>{formatCategoryName(t.category)}</Badge>
                            </td>
                            <td className="p-4 text-sm text-gray-700">{t.targetCalories.min}-{t.targetCalories.max}</td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline" asChild>
                                  <Link href={`/meal-plan-templates/${t._id}`}>View</Link>
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
          <TabsContent value="diet" className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input placeholder="Search diet templates..." value={dietSearchTerm} onChange={e => setDietSearchTerm(e.target.value)} className="pl-10" />
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <ChefHat className="h-4 w-4" />
                    <span>{filteredDietTemplates.length} Templates</span>
                  </div>
                  {(session?.user?.role === UserRole.DIETITIAN || session?.user?.role === UserRole.ADMIN) && (
                    <Button asChild variant="outline">
                      <Link href="/meal-plan-templates/diet/create">
                        <Plus className="h-4 w-4 mr-2" />Create Diet Template
                      </Link>
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600">Dietary Restrictions</div>
                  <div className="flex flex-wrap gap-2">
                    {dietDietaryRestrictions.length > 0 && (
                      <Button variant="outline" onClick={() => setDietDietaryRestrictions([])} className="h-6 px-2 text-xs">Clear</Button>
                    )}
                    {dietDietaryRestrictions.length === 0 && <span className="text-[11px] text-gray-400">Select restrictions to filter</span>}
                    {dietaryRestrictionsList.map(r => {
                      const selected = dietDietaryRestrictions.includes(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setDietDietaryRestrictions(prev => selected ? prev.filter(x => x !== r) : [...prev, r])}
                          className={`px-2 py-1 rounded border text-xs capitalize transition ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          {r.replace('-', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
            {dietLoading ? (
              <div className="flex items-center justify-center h-32"><LoadingSpinner /></div>
            ) : filteredDietTemplates.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No diet templates found</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your search or restrictions</p>
                  {(session?.user?.role === UserRole.DIETITIAN || session?.user?.role === UserRole.ADMIN) && (
                    <Button asChild>
                      <Link href="/meal-plan-templates/diet/create">
                        <Plus className="h-4 w-4 mr-2" />Create Diet Template
                      </Link>
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
                          <th className="text-left p-4 font-medium text-gray-900">Template Name</th>
                          <th className="text-left p-4 font-medium text-gray-900">Category</th>
                          <th className="text-left p-4 font-medium text-gray-900">Duration</th>
                          <th className="text-left p-4 font-medium text-gray-900">Restrictions</th>
                          <th className="text-left p-4 font-medium text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDietTemplates.map(t => (
                          <tr key={t._id} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                              <div>
                                <p className="font-medium text-gray-900">{t.name}</p>
                                <p className="text-xs text-gray-600 line-clamp-1">{t.description}</p>
                              </div>
                            </td>
                            <td className="p-4 text-sm">
                              <Badge className={getCategoryColor(t.category)}>{formatCategoryName(t.category)}</Badge>
                            </td>
                            <td className="p-4 text-sm text-gray-700">{t.duration} days</td>
                            <td className="p-4 text-xs text-gray-700">
                              {t.dietaryRestrictions && t.dietaryRestrictions.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {t.dietaryRestrictions.slice(0, 4).map((r, i) => (
                                    <Badge key={i} variant="outline" className="text-[10px] capitalize">{r.replace('-', ' ')}</Badge>
                                  ))}
                                  {t.dietaryRestrictions.length > 4 && (
                                    <Badge variant="outline" className="text-[10px]">+{t.dietaryRestrictions.length - 4}</Badge>
                                  )}
                                </div>
                              ) : <span className="text-gray-400">None</span>}
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline" asChild>
                                  <Link href={`/meal-plan-templates/${t._id}`}>View</Link>
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
        </Tabs>
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
