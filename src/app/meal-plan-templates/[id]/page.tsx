'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, ChefHat, Target, Calendar } from 'lucide-react';
import Link from 'next/link';

interface TemplateResp {
  _id: string;
  templateType?: 'plan' | 'diet';
  name: string;
  description?: string;
  category: string;
  duration: number;
  targetCalories: { min: number; max: number };
  targetMacros: {
    protein: { min: number; max: number };
    carbs: { min: number; max: number };
    fat: { min: number; max: number };
  };
  dietaryRestrictions: string[];
  tags: string[];
  meals: any[];
  difficulty?: string;
  isPublic?: boolean;
  isPremium?: boolean;
  createdBy?: { firstName?: string; lastName?: string };
}

export default function MealPlanTemplateViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [template, setTemplate] = useState<TemplateResp | null>(null);
  const [relatedDietTemplates, setRelatedDietTemplates] = useState<TemplateResp[]>([]);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/meal-plan-templates/${id}`);
        if (res.ok) {
          const data = await res.json();
          setTemplate(data.template);
          // If it's a diet template, fetch others by same creator
          if (data.template?.templateType === 'diet' && data.template?.createdBy?._id) {
            try {
              const listRes = await fetch(`/api/meal-plan-templates?templateType=diet&createdBy=${data.template.createdBy._id}&limit=5`);
              if (listRes.ok) {
                const listData = await listRes.json();
                setRelatedDietTemplates(listData.templates.filter((t: any) => t._id !== data.template._id));
              }
            } catch {/* ignore */}
          }
        } else {
          const data = await res.json();
          setError(data.error || 'Failed to load template');
        }
      } catch (e) {
        setError('Failed to load template');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTemplate();
  }, [id]);

  if (loading) return <LoadingSpinner />;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/meal-plan-templates">
              <ArrowLeft className="h-4 w-4 mr-2" />Back to Templates
            </Link>
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {template && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ChefHat className="h-5 w-5" />{template.name}</CardTitle>
              <CardDescription>{template.description || 'No description'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded"><div className="text-gray-600">Category</div><div className="font-medium capitalize">{template.category}</div></div>
                <div className="bg-gray-50 p-3 rounded"><div className="text-gray-600">Duration</div><div className="font-medium">{template.duration} days</div></div>
                <div className="bg-gray-50 p-3 rounded"><div className="text-gray-600">Difficulty</div><div className="font-medium capitalize">{template.difficulty || '—'}</div></div>
                <div className="bg-gray-50 p-3 rounded"><div className="text-gray-600">Public</div><div className="font-medium">{template.isPublic ? 'Yes' : 'No'}</div></div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2"><Target className="h-4 w-4" />Nutrition Targets</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="border rounded p-2">Calories: {template.targetCalories.min}-{template.targetCalories.max}</div>
                  <div className="border rounded p-2">Protein: {template.targetMacros.protein.min}-{template.targetMacros.protein.max}g</div>
                  <div className="border rounded p-2">Carbs: {template.targetMacros.carbs.min}-{template.targetMacros.carbs.max}g</div>
                  <div className="border rounded p-2">Fat: {template.targetMacros.fat.min}-{template.targetMacros.fat.max}g</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2"><Calendar className="h-4 w-4" />Meals (Summary)</div>
                <div className="text-xs text-gray-600">Days Planned: {template.meals?.length || 0}</div>
                <div className="max-h-64 overflow-y-auto border rounded divide-y">
                  {(template.meals || []).map((day: any, idx: number) => (
                    <div key={idx} className="p-2 text-xs">
                      <div className="font-medium mb-1">Day {day.day}</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <div>Breakfast: {(day.breakfast||[]).length} items</div>
                        <div>Lunch: {(day.lunch||[]).length} items</div>
                        <div>Dinner: {(day.dinner||[]).length} items</div>
                        <div className="text-gray-500">Snacks: {((day.morningSnack||[]).length + (day.afternoonSnack||[]).length + (day.eveningSnack||[]).length)}</div>
                        <div className="text-gray-500">Calories: {day.totalNutrition?.calories || 0}</div>
                      </div>
                    </div>
                  ))}
                  {(!template.meals || template.meals.length === 0) && (
                    <div className="p-2 text-xs text-gray-500">No meals added</div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Dietary Restrictions</div>
                <div className="flex flex-wrap gap-1">
                  {template.dietaryRestrictions?.length ? template.dietaryRestrictions.map((r,i)=>(
                    <span key={i} className="px-2 py-1 bg-gray-100 rounded text-[10px] capitalize">{r.replace('-', ' ')}</span>
                  )) : <span className="text-xs text-gray-500">None</span>}
                </div>
              </div>

              <div className="text-xs text-gray-500">Created By: {template.createdBy ? `${template.createdBy.firstName || ''} ${template.createdBy.lastName || ''}`.trim() : 'Unknown'}</div>
              {template.templateType === 'diet' && relatedDietTemplates.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Other Diet Templates by Creator</div>
                  <div className="grid gap-2">
                    {relatedDietTemplates.map(rt => (
                      <Link key={rt._id} href={`/meal-plan-templates/${rt._id}`} className="block border rounded p-2 hover:bg-gray-50">
                        <div className="text-xs font-medium line-clamp-1">{rt.name}</div>
                        <div className="text-[10px] text-gray-500 line-clamp-1">{rt.description || 'No description'}</div>
                        <div className="text-[10px] text-gray-400">{rt.duration} days • {rt.dietaryRestrictions?.length || 0} restrictions</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
