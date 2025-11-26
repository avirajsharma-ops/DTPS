'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ArrowLeft, Save, ChefHat, Target } from 'lucide-react';
import Link from 'next/link';
import { UserRole } from '@/types';

const categories = [
  { value: 'weight-loss', label: 'Weight Loss' },
  { value: 'weight-gain', label: 'Weight Gain' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'muscle-gain', label: 'Muscle Gain' },
  { value: 'diabetes', label: 'Diabetes Friendly' },
  { value: 'heart-healthy', label: 'Heart Healthy' },
  { value: 'keto', label: 'Keto' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'custom', label: 'Custom' }
];

export default function CreatePlanTemplateBasicPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Minimal required fields to pass API schema
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [duration, setDuration] = useState(7);
  const [calMin, setCalMin] = useState(1200);
  const [calMax, setCalMax] = useState(2500);
  const [proteinMin, setProteinMin] = useState(50);
  const [proteinMax, setProteinMax] = useState(150);
  const [carbMin, setCarbMin] = useState(100);
  const [carbMax, setCarbMax] = useState(300);
  const [fatMin, setFatMin] = useState(30);
  const [fatMax, setFatMax] = useState(100);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!session) return;
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.DIETITIAN) {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Restore draft
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('planTemplateDraft') : null;
      if (raw) {
        const d = JSON.parse(raw);
        if (d?.name) setName(d.name);
        if (d?.description) setDescription(d.description);
        if (d?.category) setCategory(d.category);
        if (d?.duration) setDuration(d.duration);
        if (d?.difficulty) setDifficulty(d.difficulty);
        if (d?.targets) {
          setCalMin(d.targets.calMin ?? calMin);
          setCalMax(d.targets.calMax ?? calMax);
          setProteinMin(d.targets.proteinMin ?? proteinMin);
          setProteinMax(d.targets.proteinMax ?? proteinMax);
          setCarbMin(d.targets.carbMin ?? carbMin);
          setCarbMax(d.targets.carbMax ?? carbMax);
          setFatMin(d.targets.fatMin ?? fatMin);
          setFatMax(d.targets.fatMax ?? fatMax);
        }
        setDraftRestored(true);
      }
    } catch (e) {
      console.warn('Failed to load plan template draft', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save draft
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('planTemplateDraft', JSON.stringify({
          name, description, category, duration, difficulty,
          targets: { calMin, calMax, proteinMin, proteinMax, carbMin, carbMax, fatMin, fatMax }
        }));
      }
    } catch (e) {
      console.warn('Failed to save plan template draft', e);
    }
  }, [name, description, category, duration, difficulty, calMin, calMax, proteinMin, proteinMax, carbMin, carbMax, fatMin, fatMax]);

  const handleSave = async () => {
    if (!session) {
      setError('Session not ready. Please wait a moment and try again.');
      return;
    }
    if (!name || !category || !duration) {
      setError('Please fill name, category, and duration');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Build full payload including defaults so validation issues are clearer
      const body = {
  templateType: 'plan',
        name: name.trim(),
        description: description?.trim() || '',
        category,
        duration: Number(duration),
        difficulty,
        targetCalories: { min: Number(calMin), max: Number(calMax) },
        targetMacros: {
          protein: { min: Number(proteinMin), max: Number(proteinMax) },
          carbs: { min: Number(carbMin), max: Number(carbMax) },
          fat: { min: Number(fatMin), max: Number(fatMax) }
        },
        dietaryRestrictions: [],
        tags: [],
        meals: [],
        isPublic: false,
        isPremium: false
      };
      // Persist outbound payload for recovery/debug
      try { if (typeof window !== 'undefined') localStorage.setItem('planTemplateSubmitPayload', JSON.stringify(body)); } catch(_) {}
      // Basic client-side sanity checks matching zod constraints
      if (body.targetCalories.min < 800 || body.targetCalories.max > 5000) {
        setError('Calories must be between 800 and 5000');
        setLoading(false);
        return;
      }
      console.log('Submitting meal plan template payload:', body);
      const res = await fetch('/api/meal-plan-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        try {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('planTemplateDraft');
            localStorage.setItem('lastCreatedPlanTemplate', JSON.stringify(data.template));
            // merge into cachedPlanTemplates if present
            const existingRaw = localStorage.getItem('cachedPlanTemplates');
            if (existingRaw) {
              const existing = JSON.parse(existingRaw);
              if (Array.isArray(existing)) {
                localStorage.setItem('cachedPlanTemplates', JSON.stringify([data.template, ...existing]));
              }
            }
          }
        } catch(_) {}
        router.push('/meal-plan-templates?success=created');
      } else {
        let errMsg = 'Failed to create plan template';
        try {
          const data = await res.json();
          if (data?.error) errMsg = data.error;
          // surface first validation issue if present
          if (data?.details && Array.isArray(data.details) && data.details.length) {
            errMsg = `${data.error || 'Validation failed'}: ${data.details[0].message || data.details[0].path?.join('.')}`;
          }
          if (res.status === 401) errMsg = 'Authentication required. Please sign in again.';
          if (res.status === 403) errMsg = 'Insufficient permissions to create templates.';
          // Persist last error for inspection
          try { if (typeof window !== 'undefined') localStorage.setItem('planTemplateLastError', JSON.stringify({ status: res.status, data })); } catch(_) {}
        } catch (_) {
          // ignore JSON parse errors
        }
        setError(errMsg);
      }
    } catch (e) {
      console.error('Create template unexpected error:', e);
      setError('Failed to create plan template (network or unexpected error)');
      try { if (typeof window !== 'undefined') localStorage.setItem('planTemplateLastError', JSON.stringify({ status: 'network', message: (e as any)?.message })); } catch(_) {}
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return <LoadingSpinner />;
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/meal-plan-templates">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            {draftRestored && <span className="text-xs text-gray-500">Draft restored</span>}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof window !== 'undefined') localStorage.removeItem('planTemplateDraft');
                setName(''); setDescription(''); setCategory(''); setDuration(7); setDifficulty('intermediate');
                setCalMin(1200); setCalMax(2500); setProteinMin(50); setProteinMax(150);
                setCarbMin(100); setCarbMax(300); setFatMin(30); setFatMax(100);
                setDraftRestored(false);
              }}
            >
              Clear draft
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ChefHat className="h-5 w-5" />Create Plan Template</CardTitle>
            <CardDescription>Enter basic info to create a plan template</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., 7-Day Weight Loss Plan" />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty Level</Label>
                <Select value={difficulty} onValueChange={(v)=>setDifficulty(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
           
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e)=>setDescription(e.target.value)} rows={3} placeholder="Short summary..." />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4" /> Nutrition Targets (basic)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Calories Min</Label>
                  <Input type="number" value={calMin} onChange={e=>setCalMin(parseInt(e.target.value||'0'))} />
                </div>
                <div className="space-y-1">
                  <Label>Calories Max</Label>
                  <Input type="number" value={calMax} onChange={e=>setCalMax(parseInt(e.target.value||'0'))} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Protein (g) Min</Label>
                  <Input type="number" value={proteinMin} onChange={e=>setProteinMin(parseInt(e.target.value||'0'))} />
                </div>
                <div className="space-y-1">
                  <Label>Carbs (g) Min</Label>
                  <Input type="number" value={carbMin} onChange={e=>setCarbMin(parseInt(e.target.value||'0'))} />
                </div>
                <div className="space-y-1">
                  <Label>Fat (g) Min</Label>
                  <Input type="number" value={fatMin} onChange={e=>setFatMin(parseInt(e.target.value||'0'))} />
                </div>
                <div className="space-y-1">
                  <Label>Protein (g) Max</Label>
                  <Input type="number" value={proteinMax} onChange={e=>setProteinMax(parseInt(e.target.value||'0'))} />
                </div>
                <div className="space-y-1">
                  <Label>Carbs (g) Max</Label>
                  <Input type="number" value={carbMax} onChange={e=>setCarbMax(parseInt(e.target.value||'0'))} />
                </div>
                <div className="space-y-1">
                  <Label>Fat (g) Max</Label>
                  <Input type="number" value={fatMax} onChange={e=>setFatMax(parseInt(e.target.value||'0'))} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>router.back()}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
              <Button onClick={handleSave} disabled={loading || !name || !category}><Save className="h-4 w-4 mr-2" />{loading ? 'Saving...' : 'Create Template'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
