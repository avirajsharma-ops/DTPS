'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Edit, Trash2, Copy, ArrowLeft, ArrowRight, Utensils, Dumbbell, Eye, FileText, Image as ImageIcon, Video, Search, Loader2, Check, X, AlertTriangle, CreditCard, Clock, RefreshCw, MoreVertical, Repeat2, Pause, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { DietPlanDashboard } from '@/components/dietplandashboard/DietPlanDashboard';

// Client Purchase interface
interface ClientPurchase {
  _id: string;
  planName: string;
  planCategory: string;
  durationDays: number;
  durationLabel: string;
  startDate: string;
  endDate: string;
  mealPlanCreated: boolean;
  daysUsed: number;
}

interface PaymentCheckResult {
  hasPaidPlan: boolean;
  canCreateMealPlan: boolean;
  purchase?: ClientPurchase;
  remainingDays: number;
  maxDays: number;
  totalDaysUsed?: number;
  totalPurchasedDays?: number;
  message: string;
}

interface DietPlan {
  _id?: string;
  title: string;
  status: string;
  calories: string;
  type: string;
  notes: string;
  startDate: string;
  endDate: string;
  days: number;
  progress: string;
}

interface DietTemplate {
  _id: string;
  name: string;
  description?: string;
  category: string;
  duration: number;
  targetCalories?: { min: number; max: number };
  targetMacros?: {
    protein: { min: number; max: number };
    carbs: { min: number; max: number };
    fat: { min: number; max: number };
  };
  mealTypes?: { name: string; time: string }[];
  meals?: any[];
  tags?: string[];
  goals?: {
    primaryGoal?: string;
    secondaryGoals?: string[];
  };
  dietaryRestrictions?: string[];
}

interface ClientData {
  _id: string;
  firstName: string;
  lastName: string;
  dietPlans?: DietPlan[];
  // Medical/dietary info for filtering recipes (can be string or array)
  dietaryRestrictions?: string | string[];
  medicalConditions?: string | string[];
  allergies?: string | string[];
}

interface PlanningSectionProps {
  client: ClientData;
}

// Helper to convert array or string to comma-separated string
const toCommaString = (val?: string | string[]): string => {
  if (!val) return '';
  if (Array.isArray(val)) return val.join(', ');
  return val;
};

export default function PlanningSection({ client }: PlanningSectionProps) {
  // Form states
  const [step, setStep] = useState<'list' | 'form' | 'meals' | 'view'>('list');
  const [planTitle, setPlanTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(7);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 6), 'yyyy-MM-dd'));
  const [primaryGoal, setPrimaryGoal] = useState<string>('weight-loss');
  
  // Template states
  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DietTemplate | null>(null);
  const [templateType, setTemplateType] = useState<'plan' | 'diet'>('diet'); // 'plan' for Plan Templates, 'diet' for Diet Templates
  const [templateSearch, setTemplateSearch] = useState('');
  const [templatePage, setTemplatePage] = useState(1);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const TEMPLATES_PER_PAGE = 20;
  
  // Meal plan states
  const [initialMeals, setInitialMeals] = useState<any[]>([]);
  const [initialMealTypes, setInitialMealTypes] = useState<{ name: string; time: string }[]>([
    { name: 'Breakfast', time: '8:00 AM' },
    { name: 'Mid Morning', time: '10:30 AM' },
    { name: 'Lunch', time: '1:00 PM' },
    { name: 'Evening Snack', time: '4:00 PM' },
    { name: 'Dinner', time: '7:00 PM' },
    { name: 'Bedtime', time: '9:30 PM' }
  ]);
  
  // Loading and saving states
  const [saving, setSaving] = useState(false);
  const [clientPlans, setClientPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  
  // Edit mode states
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<any | null>(null);
  const [planKey, setPlanKey] = useState(0); // Force re-mount of DietPlanDashboard

  // Payment check states
  const [paymentCheck, setPaymentCheck] = useState<PaymentCheckResult | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  // Success dialog state
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdPlanInfo, setCreatedPlanInfo] = useState<{ days: number; remainingDays: number } | null>(null);

  // Check client's payment status (also syncs with Razorpay)
  const checkPaymentStatus = async (showToast = false) => {
    setCheckingPayment(true);
    try {
      // The check API now automatically syncs pending payments with Razorpay
      const res = await fetch(`/api/client-purchases/check?clientId=${client._id}`);
      const data = await res.json();
      if (data.success) {
        setPaymentCheck(data);
        if (showToast) {
          if (data.hasPaidPlan) {
            toast.success(`Payment verified! ${data.remainingDays} days remaining`);
          } else {
            toast.info('No active paid plan found. Payment may still be processing.');
          }
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      if (showToast) {
        toast.error('Error checking payment status');
      }
    } finally {
      setCheckingPayment(false);
    }
  };

  // Check payment on mount
  useEffect(() => {
    checkPaymentStatus();
  }, [client._id]);

  // Calculate end date when duration or start date changes
  useEffect(() => {
    if (startDate && duration > 0) {
      const start = new Date(startDate);
      const end = addDays(start, duration - 1);
      setEndDate(format(end, 'yyyy-MM-dd'));
    }
  }, [startDate, duration]);

  // Fetch client's existing meal plans
  useEffect(() => {
    fetchClientPlans();
  }, [client._id]);

  const fetchClientPlans = async () => {
    try {
      setLoadingPlans(true);
      const res = await fetch(`/api/client-meal-plans?clientId=${client._id}`);
      const data = await res.json();
      if (data.success) {
        setClientPlans(data.mealPlans || []);
      }
    } catch (error) {
      console.error('Error fetching client plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  // Fetch templates based on templateType with pagination and search
  const fetchTemplates = async (type: 'plan' | 'diet' = templateType, page: number = 1, search: string = '') => {
    try {
      setLoadingTemplates(true);
      // Plan templates use /api/meal-plan-templates?templateType=plan
      // Diet templates use /api/diet-templates
      const params = new URLSearchParams({
        isActive: 'true',
        page: page.toString(),
        limit: TEMPLATES_PER_PAGE.toString(),
        ...(search && { search })
      });
      
      const url = type === 'plan' 
        ? `/api/meal-plan-templates?templateType=plan&${params.toString()}`
        : `/api/diet-templates?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
        setTotalTemplates(data.total || data.templates?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Debounced search for templates
  useEffect(() => {
    if (showTemplateDialog) {
      const timer = setTimeout(() => {
        fetchTemplates(templateType, 1, templateSearch);
        setTemplatePage(1);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [templateSearch]);

  // Load template data into form
  const loadTemplate = (template: DietTemplate) => {
    setPlanTitle(template.name);
    setDescription(template.description || '');
    setDuration(template.duration);
    setSelectedTemplate(template);
    
    if (template.mealTypes && template.mealTypes.length > 0) {
      setInitialMealTypes(template.mealTypes);
    }
    
    if (template.meals && template.meals.length > 0) {
      setInitialMeals(template.meals);
    }
    
    setShowTemplateDialog(false);
    toast.success(`Template "${template.name}" loaded successfully`);
  };

  // Fetch the latest meal plan's end date
  const getLatestMealPlanEndDate = async (): Promise<string | null> => {
    try {
      const res = await fetch(`/api/client-meal-plans?clientId=${client._id}`);
      const data = await res.json();

      if (data.success && data.mealPlans.length > 0) {
        console.log('Fetched meal plans:', data.mealPlans); // Debug log
        const sortedPlans = data.mealPlans.sort((a: any, b: any) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
        console.log('Sorted meal plans by endDate:', sortedPlans); // Debug log
        return sortedPlans[0].endDate;
      }
    } catch (error) {
      console.error('Error fetching latest meal plan end date:', error);
    }
    return null;
  };

  // Initialize start date based on latest plan's end date
  const initializeStartDate = async () => {
    const latestEndDate = await getLatestMealPlanEndDate();
    if (latestEndDate) {
      const nextStartDate = format(addDays(new Date(latestEndDate), 1), 'yyyy-MM-dd');
      console.log('Initializing start date to:', nextStartDate); // Debug log
      setStartDate(nextStartDate);
    }
  };

  // Handle form submission - move to meals step
  const handleFormSubmit = () => {
    if (!planTitle.trim()) {
      toast.error('Please enter a plan title');
      return;
    }
    if (duration < 1) {
      toast.error('Duration must be at least 1 day');
      return;
    }
    // Check if duration exceeds remaining days in paid plan
    if (paymentCheck?.hasPaidPlan && duration > paymentCheck.remainingDays) {
      toast.error(`Duration cannot exceed ${paymentCheck.remainingDays} days (remaining in client's plan)`);
      return;
    }
    // Warn if no paid plan (but allow for editing existing plans)
    if (!isEditMode && !paymentCheck?.hasPaidPlan) {
      toast.error('Client needs to purchase a plan first');
      return;
    }
    setStep('meals');
  };

  // Handle saving the complete meal plan
  const handleSavePlan = async (mealsData: any[]) => {
    try {
      setSaving(true);
      
      const payload: any = {
        clientId: client._id,
        name: planTitle,
        description,
        startDate,
        endDate,
        duration,
        meals: mealsData,
        mealTypes: initialMealTypes,
        customizations: {
          targetCalories: selectedTemplate?.targetCalories?.max || 2000,
          targetMacros: {
            protein: selectedTemplate?.targetMacros?.protein?.max || 150,
            carbs: selectedTemplate?.targetMacros?.carbs?.max || 250,
            fat: selectedTemplate?.targetMacros?.fat?.max || 65
          }
        },
        goals: {
          primaryGoal
        },
        status: 'active'
      };

      // Only include templateId if a template was selected
      if (selectedTemplate?._id) {
        payload.templateId = selectedTemplate._id;
      }

      const res = await fetch('/api/client-meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (data.success) {
        // Update client purchase - ADD days used (not replace)
        if (paymentCheck?.purchase?._id) {
          try {
            await fetch('/api/client-purchases', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                purchaseId: paymentCheck.purchase._id,
                mealPlanId: data.mealPlan?._id,
                mealPlanCreated: true,
                addDaysUsed: duration  // ADD to existing days used
              })
            });
          } catch (updateError) {
            console.error('Error updating purchase record:', updateError);
          }
        }
        
        // Calculate remaining days after this plan
        const remainingAfterPlan = Math.max(0, (paymentCheck?.remainingDays || 0) - duration);
        
        // Show success dialog
        setCreatedPlanInfo({
          days: duration,
          remainingDays: remainingAfterPlan
        });
        setShowSuccessDialog(true);
        
        resetForm();
        fetchClientPlans();
        checkPaymentStatus(); // Refresh payment status
      } else {
        toast.error(data.error || 'Failed to create diet plan');
      }
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save diet plan');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setStep('list');
    setPlanTitle('');
    setDescription('');
    setDuration(7);
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setPrimaryGoal('weight-loss');
    setSelectedTemplate(null);
    setInitialMeals([]);
    setInitialMealTypes([
      { name: 'Breakfast', time: '8:00 AM' },
      { name: 'Mid Morning', time: '10:30 AM' },
      { name: 'Lunch', time: '1:00 PM' },
      { name: 'Evening Snack', time: '4:00 PM' },
      { name: 'Dinner', time: '7:00 PM' },
      { name: 'Bedtime', time: '9:30 PM' }
    ]);
    setEditingPlan(null);
    setIsEditMode(false);
    setViewingPlan(null);
    setPlanKey(prev => prev + 1); // Reset key to force fresh component
  };

  // View plan details
  const handleViewPlan = (plan: any) => {
    console.log('handleViewPlan - plan:', plan);
    console.log('handleViewPlan - plan.meals:', plan.meals);
    console.log('handleViewPlan - plan.meals length:', plan.meals?.length);
    console.log('handleViewPlan - plan.mealTypes:', plan.mealTypes);
    
    // Log first day's meals for debugging
    if (plan.meals && plan.meals.length > 0) {
      console.log('handleViewPlan - first day meals:', JSON.stringify(plan.meals[0]));
    }
    
    // Set all state at once
    const planDuration = Math.ceil((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const planMeals = plan.meals || [];
    const planMealTypes = plan.mealTypes || [
      { name: 'Breakfast', time: '8:00 AM' },
      { name: 'Mid Morning', time: '10:30 AM' },
      { name: 'Lunch', time: '1:00 PM' },
      { name: 'Evening Snack', time: '4:00 PM' },
      { name: 'Dinner', time: '7:00 PM' },
      { name: 'Bedtime', time: '9:30 PM' }
    ];
    
    console.log('handleViewPlan - setting initialMeals with:', planMeals.length, 'days');
    
    setViewingPlan(plan);
    setPlanTitle(plan.name);
    setDescription(plan.description || '');
    setStartDate(format(new Date(plan.startDate), 'yyyy-MM-dd'));
    setEndDate(format(new Date(plan.endDate), 'yyyy-MM-dd'));
    setDuration(planDuration);
    setPrimaryGoal(plan.goals?.primaryGoal || 'health-improvement');
    setInitialMeals(planMeals);
    setInitialMealTypes(planMealTypes);
    setPlanKey(prev => prev + 1); // Force re-mount
    setStep('view');
  };

  // Edit plan
  const handleEditPlan = (plan: any) => {
    console.log('handleEditPlan - plan:', plan);
    console.log('handleEditPlan - plan.meals:', plan.meals);
    console.log('handleEditPlan - plan.meals length:', plan.meals?.length);
    console.log('handleEditPlan - plan.mealTypes:', plan.mealTypes);
    
    // Log first day's meals for debugging
    if (plan.meals && plan.meals.length > 0) {
      console.log('handleEditPlan - first day meals:', JSON.stringify(plan.meals[0]));
    }
    
    // Set all state at once
    const planDuration = Math.ceil((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const planMeals = plan.meals || [];
    const planMealTypes = plan.mealTypes || [
      { name: 'Breakfast', time: '8:00 AM' },
      { name: 'Mid Morning', time: '10:30 AM' },
      { name: 'Lunch', time: '1:00 PM' },
      { name: 'Evening Snack', time: '4:00 PM' },
      { name: 'Dinner', time: '7:00 PM' },
      { name: 'Bedtime', time: '9:30 PM' }
    ];
    
    console.log('handleEditPlan - setting initialMeals with:', planMeals.length, 'days');
    
    setEditingPlan(plan);
    setIsEditMode(true);
    setPlanTitle(plan.name);
    setDescription(plan.description || '');
    setStartDate(format(new Date(plan.startDate), 'yyyy-MM-dd'));
    setEndDate(format(new Date(plan.endDate), 'yyyy-MM-dd'));
    setDuration(planDuration);
    setPrimaryGoal(plan.goals?.primaryGoal || 'health-improvement');
    setInitialMeals(planMeals);
    setInitialMealTypes(planMealTypes);
    setPlanKey(prev => prev + 1); // Force re-mount
    setStep('meals');
  };

  // Update existing plan
  const handleUpdatePlan = async (mealsData: any[]) => {
    if (!editingPlan?._id) return;
    
    try {
      setSaving(true);
      
      const payload: any = {
        name: planTitle,
        description,
        startDate,
        endDate,
        meals: mealsData,
        mealTypes: initialMealTypes,
        customizations: {
          targetCalories: selectedTemplate?.targetCalories?.max || editingPlan.customizations?.targetCalories || 2000,
          targetMacros: {
            protein: selectedTemplate?.targetMacros?.protein?.max || editingPlan.customizations?.targetMacros?.protein || 150,
            carbs: selectedTemplate?.targetMacros?.carbs?.max || editingPlan.customizations?.targetMacros?.carbs || 250,
            fat: selectedTemplate?.targetMacros?.fat?.max || editingPlan.customizations?.targetMacros?.fat || 65
          }
        },
        goals: {
          primaryGoal
        }
      };

      const res = await fetch(`/api/client-meal-plans/${editingPlan._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (data.success) {
        toast.success('Diet plan updated successfully!');
        resetForm();
        fetchClientPlans();
      } else {
        toast.error(data.error || 'Failed to update diet plan');
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Failed to update diet plan');
    } finally {
      setSaving(false);
    }
  };

  // Duplicate plan
  const handleDuplicatePlan = (plan: any) => {
    // Check if client has active payment
    if (!paymentCheck?.hasPaidPlan) {
      toast.error('Client needs to purchase a plan first before duplicating meal plans');
      return;
    }
    
    // Check if client has remaining days
    if (paymentCheck.remainingDays <= 0) {
      toast.error('All plan days have been used. Client needs to purchase a new plan.');
      return;
    }

    setPlanTitle(`${plan.name} (Copy)`);
    setDescription(plan.description || '');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setDuration(Math.ceil((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
    setPrimaryGoal(plan.goals?.primaryGoal || 'health-improvement');
    setInitialMeals(plan.meals || []);
    setInitialMealTypes(plan.mealTypes || [
      { name: 'Breakfast', time: '8:00 AM' },
      { name: 'Mid Morning', time: '10:30 AM' },
      { name: 'Lunch', time: '1:00 PM' },
      { name: 'Evening Snack', time: '4:00 PM' },
      { name: 'Dinner', time: '7:00 PM' },
      { name: 'Bedtime', time: '9:30 PM' }
    ]);
    setIsEditMode(false);
    setEditingPlan(null);
    setStep('form');
    toast.info('Plan duplicated. Make changes and save as new.');
  };

  // Helper function to parse date string to Date object (handles timezone)
  const parseDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  // Extend plan with cascading date adjustments for ALL meal plans
  const handleExtendPlan = async (plan: any, newStartDate?: string, newEndDate?: string) => {
    if (!newStartDate || !newEndDate) {
      toast.error('Please select dates');
      return;
    }

    // Validate date range on frontend (using parseDate for consistent handling)
    if (parseDate(newStartDate) > parseDate(newEndDate)) {
      toast.error('Start date cannot be after end date');
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const planStartDate = parseDate(plan.startDate);
      const hasStarted = planStartDate <= today;

      // Check if plan has started - only allow extension if started
      if (!hasStarted) {
        toast.error('Can only extend plans that have already started');
        return;
      }

      // Calculate original duration - ALWAYS PRESERVE THIS
      const originalDuration = Math.ceil(
        (new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      let finalStartDate = newStartDate;
      let finalEndDate: string;

      // Always calculate end date based on new start date and ORIGINAL duration
      // This ensures duration NEVER changes
      finalEndDate = format(addDays(parseDate(newStartDate), Math.max(0, originalDuration - 1)), 'yyyy-MM-dd');

      // Final validation - make sure start is not after end
      const finalStart = parseDate(finalStartDate);
      const finalEnd = parseDate(finalEndDate);
      if (finalStart > finalEnd) {
        toast.error('Invalid date range calculated. Start date cannot be after end date.');
        return;
      }

      // Update current plan
      const payload = {
        startDate: finalStartDate,
        endDate: finalEndDate
      };

      const res = await fetch(`/api/client-meal-plans/${plan._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Plan dates extended successfully!');
        
        // AUTO-ADJUST ALL MEAL PLANS IN THE CHAIN
        try {
          const allPlansRes = await fetch(`/api/client-meal-plans?clientId=${client._id}`);
          const allPlansDataResponse = await allPlansRes.json();
          
          if (allPlansDataResponse.success && allPlansDataResponse.mealPlans) {
            // Sort all plans by start date
            const sortedPlans = allPlansDataResponse.mealPlans.sort((a: any, b: any) => 
              new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
            );
            
            const currentPlanIndex = sortedPlans.findIndex((p: any) => p._id === plan._id);
            
            if (currentPlanIndex !== -1) {
              // ADJUST ALL PLANS AFTER THE CURRENT PLAN (FORWARD CASCADE)
              for (let i = currentPlanIndex + 1; i < sortedPlans.length; i++) {
                const planToAdjust = sortedPlans[i];
                const prevPlan = sortedPlans[i - 1];
                
                // Calculate previous plan's duration
                let prevPlanDuration;
                if (i - 1 === currentPlanIndex) {
                  // For the immediate next plan, use the updated current plan
                  prevPlanDuration = Math.ceil(
                    (new Date(finalEndDate).getTime() - new Date(finalStartDate).getTime()) / (1000 * 60 * 60 * 24)
                  ) + 1;
                } else {
                  // For others, calculate from the previous plan in the sorted list
                  prevPlanDuration = Math.ceil(
                    (new Date(prevPlan.endDate).getTime() - new Date(prevPlan.startDate).getTime()) / (1000 * 60 * 60 * 24)
                  ) + 1;
                }
                
                // New plan starts the day after previous plan ends
                const newStartDate_adjusted = format(addDays(new Date(prevPlan.endDate), 1), 'yyyy-MM-dd');
                
                // Calculate plan's original duration
                const planOriginalDuration = Math.ceil(
                  (new Date(planToAdjust.endDate).getTime() - new Date(planToAdjust.startDate).getTime()) / (1000 * 60 * 60 * 24)
                ) + 1;
                
                // New end date = start + original duration
                // For 1 day: addDays(date, 0) = same date
                // For 7 days: addDays(date, 6) = date + 6 days
                const newEndDate_adjusted = format(addDays(new Date(newStartDate_adjusted), Math.max(0, planOriginalDuration - 1)), 'yyyy-MM-dd');
                
                // Update this plan in the chain
                await fetch(`/api/client-meal-plans/${planToAdjust._id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    startDate: newStartDate_adjusted,
                    endDate: newEndDate_adjusted
                  })
                });
                
                // Update the reference for next iteration
                sortedPlans[i].startDate = newStartDate_adjusted;
                sortedPlans[i].endDate = newEndDate_adjusted;
              }
            }
          }
        } catch (adjustError) {
          console.error('Error auto-adjusting meal plans:', adjustError);
        }
        
        fetchClientPlans();
      } else {
        toast.error(data.error || 'Failed to extend plan');
      }
    } catch (error) {
      console.error('Error extending plan:', error);
      toast.error('Failed to extend plan');
    }
  };

  // Pause/Hold plan
  const handlePausePlan = async (plan: any, pauseDays: number) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const planStartDate = parseDate(plan.startDate);

      // Check if plan has already started
      const hasStarted = planStartDate <= today;

      let endDateToUse = plan.endDate;

      // Only extend end date if plan has already started
      if (hasStarted) {
        const currentEndDate = new Date(plan.endDate);
        const newEndDate = addDays(currentEndDate, pauseDays);
        endDateToUse = format(newEndDate, 'yyyy-MM-dd');
      }

      const payload = {
        startDate: plan.startDate,
        endDate: endDateToUse,
        status: 'paused'
      };

      const res = await fetch(`/api/client-meal-plans/${plan._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        const message = hasStarted 
          ? `Plan paused for ${pauseDays} days. End date extended to ${endDateToUse}`
          : `Plan paused. (Plan hasn't started yet, so end date not extended)`;
        toast.success(message);
        fetchClientPlans();
      } else {
        toast.error(data.error || 'Failed to pause plan');
      }
    } catch (error) {
      console.error('Error pausing plan:', error);
      toast.error('Failed to pause plan');
    }
  };

  // Resume/Unfreeze plan
  const handleResumePlan = async (plan: any) => {
    try {
      const payload = {
        startDate: plan.startDate,
        endDate: plan.endDate,
        status: 'active'
      };

      const res = await fetch(`/api/client-meal-plans/${plan._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Plan resumed successfully');
        fetchClientPlans();
      } else {
        toast.error(data.error || 'Failed to resume plan');
      }
    } catch (error) {
      console.error('Error resuming plan:', error);
      toast.error('Failed to resume plan');
    }
  };

  // Pause Plan Dialog Component
  function PausePlanDialog({ plan, onPause, onResume, showAsText = false, showAsButton = false }: { plan: any; onPause: (plan: any, days: number) => void; onResume: (plan: any) => void; showAsText?: boolean; showAsButton?: boolean }) {
    const [pauseDays, setPauseDays] = useState(2);
    const [isLoading, setIsLoading] = useState(false);
    const [isPaused, setIsPaused] = useState(plan.status === 'paused');

    const handlePause = async () => {
      if (pauseDays < 1) {
        toast.error('Pause duration must be at least 1 day');
        return;
      }
      setIsLoading(true);
      await onPause(plan, pauseDays);
      setIsLoading(false);
      setIsPaused(true);
    };

    const handleResume = async () => {
      setIsLoading(true);
      await onResume(plan);
      setIsLoading(false);
      setIsPaused(false);
    };

    return (
      <Dialog>
        <DialogTrigger asChild>
          {showAsText ? (
            <span className="text-sm cursor-pointer">Hold</span>
          ) : showAsButton ? (
            <Button 
              size="sm" 
              variant="outline"
              title={isPaused ? 'Resume plan' : 'Hold plan'}
              className="flex items-center gap-1.5"
            >
              <Pause className="h-4 w-4" />
              <span className="text-xs">Hold</span>
            </Button>
          ) : (
            <Button 
              size="sm" 
              variant="outline"
              title={isPaused ? 'Resume plan' : 'Pause plan'}
              className={isPaused ? 'text-orange-600 hover:text-orange-700' : 'text-amber-600 hover:text-amber-700'}
            >
              {isPaused ? '▶️' : '⏸️'}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isPaused ? 'Resume Plan' : 'Pause Plan'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!isPaused ? (
              <>
                <div className="bg-amber-50 p-3 rounded border border-amber-200">
                  <p className="text-sm font-medium text-amber-900">
                    ⏸️ Pause your meal plan temporarily. The end date will be extended by the number of days you pause for.
                  </p>
                </div>

                <div>
                  <Label>Pause for how many days?</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={pauseDays === 1 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPauseDays(1)}
                    >
                      1 Day
                    </Button>
                    <Button
                      variant={pauseDays === 2 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPauseDays(2)}
                    >
                      2 Days
                    </Button>
                    <Button
                      variant={pauseDays === 3 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPauseDays(3)}
                    >
                      3 Days
                    </Button>
                    <Button
                      variant={pauseDays === 7 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPauseDays(7)}
                    >
                      1 Week
                    </Button>
                  </div>
                  
                  <div className="mt-3">
                    <Label className="text-xs">Or enter custom days:</Label>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={pauseDays}
                      onChange={(e) => setPauseDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-600">
                    <strong>Current End Date:</strong> {format(new Date(plan.endDate), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    <strong>New End Date:</strong> {format(addDays(new Date(plan.endDate), pauseDays), 'MMM dd, yyyy')}
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                    onClick={handlePause}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Pausing...
                      </>
                    ) : (
                      '⏸️ Pause Plan'
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <p className="text-sm font-medium text-green-900">
                    ✓ Plan is currently paused. Click below to resume and continue with your meal plan.
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-600">
                    <strong>Current Status:</strong> <span className="text-amber-600 font-medium">Paused</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    <strong>End Date:</strong> {format(new Date(plan.endDate), 'MMM dd, yyyy')}
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handleResume}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Resuming...
                      </>
                    ) : (
                      '▶️ Resume Plan'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Extend Plan Dialog Component
  function ExtendPlanDialog({ plan, onExtend, showAsText = false, showAsButton = false }: { plan: any; onExtend: (plan: any, startDate: string, endDate: string) => void; showAsText?: boolean; showAsButton?: boolean }) {
    const [newStartDate, setNewStartDate] = useState(format(new Date(plan.startDate), 'yyyy-MM-dd'));
    const [newEndDate, setNewEndDate] = useState(format(new Date(plan.endDate), 'yyyy-MM-dd'));
    const [isLoading, setIsLoading] = useState(false);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const planStartDate = parseDate(plan.startDate);
    const hasStarted = planStartDate <= today;

    // Calculate original duration
    const originalDuration = Math.ceil(
      (new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    const handleStartDateChange = (date: string) => {
      setNewStartDate(date);
      // Auto-calculate end date based on original duration
      // For 1 day: addDays(date, 0) = same date
      // For 7 days: addDays(date, 6) = date + 6 days
      const endDate = format(addDays(parseDate(date), Math.max(0, originalDuration - 1)), 'yyyy-MM-dd');
      setNewEndDate(endDate);
    };

    const handleEndDateChange = (date: string) => {
      setNewEndDate(date);
    };

    const handleSave = async () => {
      // Validate date range using parseDate for consistent handling
      if (parseDate(newStartDate) > parseDate(newEndDate)) {
        toast.error('Start date cannot be after end date');
        return;
      }
      setIsLoading(true);
      await onExtend(plan, newStartDate, newEndDate);
      setIsLoading(false);
    };

    return (
      <Dialog>
        <DialogTrigger asChild>
          {showAsText ? (
            <span className="text-sm cursor-pointer">Extend</span>
          ) : showAsButton ? (
            <Button 
              size="sm" 
              variant="outline"
              title="Extend plan dates"
              className="flex items-center gap-1.5"
            >
              <Repeat2 className="h-4 w-4" />
              <span className="text-xs">Extend</span>
            </Button>
          ) : (
            <Button 
              size="sm" 
              variant="outline"
              title="Extend plan dates"
              className="text-blue-600 hover:text-blue-700"
            >
              📅
            </Button>
          )}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Plan Dates</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {hasStarted ? (
              <>
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm font-medium text-blue-900">
                    📅 Adjust end date to extend the plan
                  </p>
                </div>

                <div>
                  <Label>Start Date (Fixed)</Label>
                  <Input
                    type="date"
                    value={newStartDate}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    min={newStartDate}
                  />
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-600">
                    <strong>Current End Date:</strong> {plan.endDate}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    <strong>New End Date:</strong> {newEndDate}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    ✨ <strong>Auto-adjust:</strong> All other meal plans will adjust automatically to maintain continuity
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm font-medium text-blue-900">
                    📅 Adjust start date - Duration will remain {originalDuration} days (auto-calculated)
                  </p>
                </div>

                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                  />
                </div>

                <div>
                  <Label>End Date (Auto-calculated)</Label>
                  <Input
                    type="date"
                    value={newEndDate}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-600">
                    <strong>Duration:</strong> {Math.ceil((parseDate(newEndDate).getTime() - parseDate(newStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days (Fixed)
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    ✨ <strong>Auto-adjust:</strong> All other meal plans will adjust automatically to maintain continuity
                  </p>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {}}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Dates & Adjust All Plans'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const dietPlans = client?.dietPlans || [];

  // Step 3: View Plan (Read-only)
  if (step === 'view' && viewingPlan) {
    // Debug logging
    console.log('Rendering VIEW mode:');
    console.log('  viewingPlan:', viewingPlan);
    console.log('  viewingPlan.meals:', viewingPlan.meals);
    console.log('  viewingPlan.meals?.length:', viewingPlan.meals?.length);
    console.log('  viewingPlan.mealTypes:', viewingPlan.mealTypes);
    
    return (
      <div className="mt-6">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to List
                </Button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{planTitle}</h2>
                    <Badge className={
                      viewingPlan.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : viewingPlan.status === 'completed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }>
                      {viewingPlan.status || 'draft'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {format(new Date(startDate), 'MMM d, yyyy')} - {format(new Date(endDate), 'MMM d, yyyy')} ({duration} days)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline"
                  onClick={() => handleEditPlan(viewingPlan)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Plan
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleDuplicatePlan(viewingPlan)}
                  disabled={!paymentCheck?.hasPaidPlan || paymentCheck.remainingDays <= 0}
                  title={!paymentCheck?.hasPaidPlan || paymentCheck.remainingDays <= 0 ? 'Client needs active payment to duplicate plans' : 'Duplicate'}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Plan Details Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Duration</h4>
                <p className="text-lg font-semibold">{duration} Days</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Primary Goal</h4>
                <p className="text-lg font-semibold capitalize">{primaryGoal.replace('-', ' ')}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Target Calories</h4>
                <p className="text-lg font-semibold">{viewingPlan.customizations?.targetCalories || 2000} kcal/day</p>
              </div>
            </div>

            {/* Description */}
            {description && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                <p className="text-gray-600 bg-gray-50 rounded-lg p-4">{description}</p>
              </div>
            )}

            {/* Macro Targets */}
            {viewingPlan.customizations?.targetMacros && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Target Macros</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{viewingPlan.customizations.targetMacros.protein}g</p>
                    <p className="text-sm text-gray-600">Protein</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{viewingPlan.customizations.targetMacros.carbs}g</p>
                    <p className="text-sm text-gray-600">Carbs</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600">{viewingPlan.customizations.targetMacros.fat}g</p>
                    <p className="text-sm text-gray-600">Fat</p>
                  </div>
                </div>
              </div>
            )}

            {/* Meal Types */}
            {initialMealTypes && initialMealTypes.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Meal Schedule</h4>
                <div className="flex flex-wrap gap-2">
                  {initialMealTypes.map((mealType, index) => (
                    <Badge key={index} variant="outline" className="py-2 px-3">
                      <span className="font-medium">{mealType.name}</span>
                      <span className="text-gray-500 ml-2">{mealType.time}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Meals Grid - Read Only View */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">
                Meal Plan ({duration} days) - {viewingPlan?.meals?.length || 0} days with meals
              </h4>
              <DietPlanDashboard
                key={`view-${viewingPlan._id}-${planKey}`}
                duration={duration}
                initialMeals={viewingPlan?.meals || []}
                initialMealTypes={viewingPlan?.mealTypes || initialMealTypes}
                clientId={client._id}
                clientName={`${client.firstName} ${client.lastName}`}
                readOnly={true}
                clientDietaryRestrictions={toCommaString(client.dietaryRestrictions)}
                clientMedicalConditions={toCommaString(client.medicalConditions)}
                clientAllergies={toCommaString(client.allergies)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Meals Editor
  if (step === 'meals') {
    return (
      <div className="mt-6">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('form')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Details
                </Button>
                <div>
                  <h2 className="text-xl font-semibold">{planTitle}</h2>
                  <p className="text-sm text-gray-500">
                    {format(new Date(startDate), 'MMM d, yyyy')} - {format(new Date(endDate), 'MMM d, yyyy')} ({duration} days)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Load Template Button - Also available in edit mode */}
                <Dialog open={showTemplateDialog} onOpenChange={(open) => {
                  setShowTemplateDialog(open);
                  if (open) {
                    setTemplateSearch('');
                    setTemplatePage(1);
                    fetchTemplates(templateType, 1, '');
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Load Templates
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Load {templateType === 'plan' ? 'Plan' : 'Diet'} Template</DialogTitle>
                    </DialogHeader>
                    {/* Template Type Selector */}
                    <div className="flex gap-2 mb-3">
                      <Button
                        variant={templateType === 'plan' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setTemplateType('plan');
                          setTemplatePage(1);
                          fetchTemplates('plan', 1, templateSearch);
                        }}
                      >
                        Plan Templates
                      </Button>
                      <Button
                        variant={templateType === 'diet' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setTemplateType('diet');
                          setTemplatePage(1);
                          fetchTemplates('diet', 1, templateSearch);
                        }}
                      >
                        Diet Templates
                      </Button>
                    </div>
                    {/* Search Input */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search templates by name..."
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {/* Total count */}
                    <p className="text-xs text-gray-500 mb-2">
                      {totalTemplates > 0 ? `Showing ${Math.min(TEMPLATES_PER_PAGE, templates.length)} of ${totalTemplates} templates` : ''}
                    </p>
                    {/* Templates List */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                      {loadingTemplates ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                      ) : templates.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No templates found</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {templates.map((template) => (
                            <div 
                              key={template._id} 
                              className="border rounded-lg p-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors"
                              onClick={() => loadTemplate(template)}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-900 truncate">{template.name}</h4>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-600">{template.duration} days</span>
                                    {template.goals?.primaryGoal && (
                                      <Badge variant="secondary" className="text-xs capitalize">
                                        {template.goals.primaryGoal.replace(/-/g, ' ')}
                                      </Badge>
                                    )}
                                    {template.dietaryRestrictions && template.dietaryRestrictions.length > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        {template.dietaryRestrictions.slice(0, 2).join(', ')}
                                        {template.dietaryRestrictions.length > 2 && ` +${template.dietaryRestrictions.length - 2}`}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <Check className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Pagination */}
                    {totalTemplates > TEMPLATES_PER_PAGE && (
                      <div className="flex items-center justify-between pt-3 border-t mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={templatePage === 1 || loadingTemplates}
                          onClick={() => {
                            const newPage = templatePage - 1;
                            setTemplatePage(newPage);
                            fetchTemplates(templateType, newPage, templateSearch);
                          }}
                        >
                          <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                        </Button>
                        <span className="text-sm text-gray-600">
                          Page {templatePage} of {Math.ceil(totalTemplates / TEMPLATES_PER_PAGE)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={templatePage >= Math.ceil(totalTemplates / TEMPLATES_PER_PAGE) || loadingTemplates}
                          onClick={() => {
                            const newPage = templatePage + 1;
                            setTemplatePage(newPage);
                            fetchTemplates(templateType, newPage, templateSearch);
                          }}
                        >
                          Next <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={() => setStep('form')}>
                  Edit Details
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    // Get meals from DietPlanDashboard and save
                    const mealsContainer = document.querySelector('[data-meals-container]');
                    // For now, we'll use a ref or callback approach
                    toast.info('Please use the Save button in the meal editor');
                  }}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Publish Plan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <DietPlanDashboard
              key={`edit-${editingPlan?._id || 'new'}-${planKey}`}
              duration={duration}
              initialMeals={isEditMode && editingPlan?.meals ? editingPlan.meals : initialMeals}
              initialMealTypes={isEditMode && editingPlan?.mealTypes ? editingPlan.mealTypes : initialMealTypes}
              onSave={isEditMode ? handleUpdatePlan : handleSavePlan}
              clientId={client._id}
              clientName={`${client.firstName} ${client.lastName}`}
              clientDietaryRestrictions={toCommaString(client.dietaryRestrictions)}
              clientMedicalConditions={toCommaString(client.medicalConditions)}
              clientAllergies={toCommaString(client.allergies)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 1: Form to create plan
  if (step === 'form') {
    return (
      <div className="mt-6">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <h2 className="text-xl font-semibold">
                  {isEditMode ? 'Edit' : 'Create'} Diet Plan for {client.firstName} {client.lastName}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <Dialog open={showTemplateDialog} onOpenChange={(open) => {
                  setShowTemplateDialog(open);
                  if (open) {
                    setTemplateSearch('');
                    setTemplatePage(1);
                    fetchTemplates(templateType, 1, '');
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Load Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Select {templateType === 'plan' ? 'Plan' : 'Diet'} Template</DialogTitle>
                    </DialogHeader>
                    {/* Template Type Selector */}
                    <div className="flex gap-2 mb-3">
                      <Button
                        variant={templateType === 'plan' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setTemplateType('plan');
                          setTemplatePage(1);
                          fetchTemplates('plan', 1, templateSearch);
                        }}
                      >
                        Plan Templates
                      </Button>
                      <Button
                        variant={templateType === 'diet' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setTemplateType('diet');
                          setTemplatePage(1);
                          fetchTemplates('diet', 1, templateSearch);
                        }}
                      >
                        Diet Templates
                      </Button>
                    </div>
                    {/* Search Input */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search templates by name..."
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {/* Total count */}
                    <p className="text-xs text-gray-500 mb-2">
                      {totalTemplates > 0 ? `Showing ${Math.min(TEMPLATES_PER_PAGE, templates.length)} of ${totalTemplates} templates` : ''}
                    </p>
                    {/* Templates List */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                      {loadingTemplates ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        </div>
                      ) : templates.length === 0 ? (
                        <div className="text-center py-12">
                          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-600">No templates found</p>
                          <p className="text-sm text-gray-500">Create templates in the Meal Plan Templates section</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {templates.map((template) => (
                            <div
                              key={template._id}
                              className="border rounded-lg p-3 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-colors"
                              onClick={() => loadTemplate(template)}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-900 truncate">{template.name}</h4>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-600">{template.duration} days</span>
                                    {template.goals?.primaryGoal && (
                                      <Badge variant="secondary" className="text-xs capitalize">
                                        {template.goals.primaryGoal.replace(/-/g, ' ')}
                                      </Badge>
                                    )}
                                    {template.dietaryRestrictions && template.dietaryRestrictions.length > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        {template.dietaryRestrictions.slice(0, 2).join(', ')}
                                        {template.dietaryRestrictions.length > 2 && ` +${template.dietaryRestrictions.length - 2}`}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <Check className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Pagination */}
                    {totalTemplates > TEMPLATES_PER_PAGE && (
                      <div className="flex items-center justify-between pt-3 border-t mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={templatePage === 1 || loadingTemplates}
                          onClick={() => {
                            const newPage = templatePage - 1;
                            setTemplatePage(newPage);
                            fetchTemplates(templateType, newPage, templateSearch);
                          }}
                        >
                          <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                        </Button>
                        <span className="text-sm text-gray-600">
                          Page {templatePage} of {Math.ceil(totalTemplates / TEMPLATES_PER_PAGE)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={templatePage >= Math.ceil(totalTemplates / TEMPLATES_PER_PAGE) || loadingTemplates}
                          onClick={() => {
                            const newPage = templatePage + 1;
                            setTemplatePage(newPage);
                            fetchTemplates(templateType, newPage, templateSearch);
                          }}
                        >
                          Next <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Selected Template Info */}
            {selectedTemplate && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Using Template: {selectedTemplate.name}</p>
                      <p className="text-xs text-blue-600">{selectedTemplate.duration} days • {selectedTemplate.category}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTemplate(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-6">
              {/* Plan Title */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Plan Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder="e.g., Weight Loss Plan for January"
                  className="max-w-xl"
                />
              </div>

              {/* Description */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Description
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter plan description and notes..."
                  className="max-w-xl resize-none"
                  rows={3}
                />
              </div>

              {/* Date Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Start Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Duration (Days) <span className="text-red-500">*</span>
                    {paymentCheck?.hasPaidPlan && (
                      <span className="text-gray-400 text-xs ml-1">(Max {paymentCheck.remainingDays})</span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={paymentCheck?.remainingDays || 365}
                    value={duration}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      const maxDays = paymentCheck?.remainingDays || 365;
                      if (val > maxDays) {
                        toast.error(`Maximum duration allowed is ${maxDays} days based on client's purchased plan`);
                        setDuration(maxDays);
                      } else {
                        setDuration(val);
                      }
                    }}
                  />
                  {paymentCheck?.hasPaidPlan && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Client has {paymentCheck.remainingDays} days remaining in their plan
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    End Date <span className="text-gray-400">(Auto-calculated)</span>
                  </Label>
                  <Input
                    type="date"
                    value={endDate}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>

              {/* Primary Goal */}
              <div className="max-w-xl">
                <Label className="text-sm font-medium mb-2 block">
                  Primary Goal
                </Label>
                <Select value={primaryGoal} onValueChange={setPrimaryGoal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight-loss">Weight Loss</SelectItem>
                    <SelectItem value="weight-gain">Weight Gain</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="muscle-gain">Muscle Gain</SelectItem>
                    <SelectItem value="health-improvement">Health Improvement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setStep('list')}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleFormSubmit}
                >
                  Continue to Add Meals
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // List View - Show existing plans
  return (
    <div className="mt-6 space-y-6">
      {/* Payment Status Alert */}
      {checkingPayment ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking payment status...
        </div>
      ) : paymentCheck && !paymentCheck.hasPaidPlan ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-amber-900">No Active Plan Purchased</h4>
                <p className="text-sm text-amber-700 mt-1">
                  This client hasn't purchased a service plan yet. Please create a payment link and complete the payment before creating a meal plan.
                </p>
                <div className="flex gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-amber-600 text-amber-700 hover:bg-amber-100"
                    onClick={() => {
                      // Navigate to payments section (scroll to it or switch tab)
                      const paymentsSection = document.querySelector('[data-section="payments"]');
                      if (paymentsSection) {
                        paymentsSection.scrollIntoView({ behavior: 'smooth' });
                      }
                      toast.info('Create a payment link for the client first');
                    }}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Go to Payments
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-amber-600 text-amber-700 hover:bg-amber-100"
                    onClick={() => checkPaymentStatus(true)}
                    disabled={checkingPayment}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${checkingPayment ? 'animate-spin' : ''}`} />
                    {checkingPayment ? 'Syncing...' : 'Sync & Refresh'}
                  </Button>
                </div>
              </div>
            </div>
                   </CardContent>
        </Card>
      ) : paymentCheck && paymentCheck.hasPaidPlan ? (
        paymentCheck.remainingDays > 0 ? (
          <Card className="border-green-300 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-900">Active Plan: {paymentCheck.purchase?.planName}</h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-green-700 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {paymentCheck.remainingDays} days remaining
                    </span>
                    <span>•</span>
                    <span>
                      {paymentCheck.totalDaysUsed || 0} / {paymentCheck.totalPurchasedDays || paymentCheck.purchase?.durationDays} days used
                    </span>
                  </div>
                  <div className="mt-2 bg-green-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-green-500 h-full transition-all"
                      style={{ width: `${((paymentCheck.totalDaysUsed || 0) / (paymentCheck.totalPurchasedDays || 1)) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    You can create multiple meal plans (e.g., 7+7 days)
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-green-700 hover:bg-green-100"
                  onClick={() => checkPaymentStatus(true)}
                  disabled={checkingPayment}
                  title="Sync payment status with Razorpay"
                >
                  <RefreshCw className={`h-4 w-4 ${checkingPayment ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* All days used - need to pay for more */
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-900">All Plan Days Used</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    {paymentCheck.totalDaysUsed || 0} / {paymentCheck.totalPurchasedDays || paymentCheck.purchase?.durationDays} days have been used for meal plans.
                  </p>
                  <div className="mt-2 bg-amber-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-amber-500 h-full w-full" />
                  </div>
                  <p className="text-sm text-amber-700 mt-2">
                    To create more meal plans, the client needs to purchase a new service plan.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-amber-600 text-amber-700 hover:bg-amber-100"
                      onClick={() => {
                        const paymentsSection = document.querySelector('[data-section="payments"]');
                        if (paymentsSection) {
                          paymentsSection.scrollIntoView({ behavior: 'smooth' });
                        }
                        toast.info('Create a payment link for more days');
                      }}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Go to Payments
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-amber-700 hover:bg-amber-100"
                      onClick={() => checkPaymentStatus(true)}
                      disabled={checkingPayment}
                      title="Sync payment status with Razorpay"
                    >
                      <RefreshCw className={`h-4 w-4 ${checkingPayment ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      ) : null}

      {/* Current Diet Plans */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Diet Plans for {client.firstName} {client.lastName}</CardTitle>
            <Button 
              className={`${
                paymentCheck?.hasPaidPlan && paymentCheck.remainingDays > 0
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              onClick={async () => {
                if (!paymentCheck?.hasPaidPlan) {
                  toast.error('Client needs to purchase a plan first before creating a meal plan');
                  return;
                }
                if (paymentCheck.remainingDays <= 0) {
                  toast.error('All plan days have been used. Client needs to purchase a new plan.');
                  return;
                }
                // Set duration based on remaining days
                if (paymentCheck.remainingDays > 0) {
                  setDuration(Math.min(paymentCheck.remainingDays, 30)); // Max 30 days at a time
                }
                // Initialize start date based on latest plan
                await initializeStartDate();
                setStep('form');
              }}
              disabled={!paymentCheck?.hasPaidPlan || paymentCheck.remainingDays <= 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Plan
            </Button>
          </div>
          {paymentCheck?.hasPaidPlan && paymentCheck.remainingDays > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {paymentCheck.remainingDays} days available • You can split into multiple plans (e.g., 7+7 days)
            </p>
          )}
          {paymentCheck?.hasPaidPlan && paymentCheck.remainingDays <= 0 && (
            <p className="text-sm text-amber-600 mt-1">
              All {paymentCheck.totalPurchasedDays} days used • Purchase new plan for more days
            </p>
          )}
        </CardHeader>

        <CardContent>
          {loadingPlans ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : clientPlans.length > 0 ? (
            <div className="space-y-4">
              {clientPlans.map((plan: any) => (
                <div
                  key={plan._id}
                  className={`border rounded-lg p-4 transition-colors ${
                    plan.status === 'active' 
                      ? 'border-green-300 bg-green-50/50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {plan.name}
                        </h3>
                        <Badge
                          className={
                            plan.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : plan.status === 'completed'
                              ? 'bg-blue-100 text-blue-800'
                              : plan.status === 'paused'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {plan.status}
                        </Badge>
                      </div>

                      {plan.templateId && (
                        <p className="text-sm text-gray-600 mb-2">
                          Template: {plan.templateId.name}
                        </p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Start Date:</span>
                          <p className="font-medium">
                            {format(new Date(plan.startDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">End Date:</span>
                          <p className="font-medium">
                            {format(new Date(plan.endDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Duration:</span>
                          <p className="font-medium">
                            {Math.ceil((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} Days
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Goal:</span>
                          <p className="font-medium capitalize">
                            {plan.goals?.primaryGoal?.replace('-', ' ') || 'Not specified'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4 items-center">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        title="View"
                        onClick={() => handleViewPlan(plan)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        title="Edit"
                        onClick={() => handleEditPlan(plan)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      {/* Three Dot Dropdown Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            title="More options"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="p-3 w-48">
                          <div className="flex flex-col gap-2">
                            <ExtendPlanDialog 
                              plan={plan}
                              onExtend={handleExtendPlan}
                              showAsText={false}
                              showAsButton={true}
                            />

                            <PausePlanDialog 
                              plan={plan}
                              onPause={handlePausePlan}
                              onResume={handleResumePlan}
                              showAsText={false}
                              showAsButton={true}
                            />

                            <Button 
                              size="sm" 
                              variant="outline"
                              title={!paymentCheck?.hasPaidPlan || paymentCheck.remainingDays <= 0 ? 'Client needs active payment to duplicate plans' : 'Duplicate'}
                              onClick={() => handleDuplicatePlan(plan)}
                              disabled={!paymentCheck?.hasPaidPlan || paymentCheck.remainingDays <= 0}
                              className="flex items-center gap-1.5"
                            >
                              <Copy className="h-4 w-4" />
                              <span className="text-xs">Duplicate</span>
                            </Button>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : dietPlans.length > 0 ? (
            /* Legacy diet plans from client data */
            <div className="space-y-4">
              {dietPlans.map((plan: DietPlan, index: number) => (
                <div
                  key={plan._id || index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {plan.title}
                        </h3>
                        <Badge
                          className={
                            plan.status === "Active"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }
                        >
                          {plan.status}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        {plan.calories} kcal/day • {plan.type} • {plan.notes}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Start Date:</span>
                          <p className="font-medium">{plan.startDate}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">End Date:</span>
                          <p className="font-medium">{plan.endDate}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Days:</span>
                          <p className="font-medium">{plan.days} Days</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Progress:</span>
                          <p className={
                            plan.status === "Active"
                              ? "font-medium text-green-600"
                              : "font-medium text-gray-600"
                          }>
                            {plan.progress}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* No diet plans */
            <div className="py-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-900 mb-2">No diet plans created yet</p>
              <p className="text-sm text-gray-600 mb-6">
                Create a personalized diet plan for {client.firstName} {client.lastName}
              </p>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setStep('form')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Diet Plan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Dialog - Plan Created */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <Check className="h-6 w-6 text-green-600" />
              Plan Created Successfully!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-10 w-10 text-green-600" />
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900">
                {createdPlanInfo?.days} Day Meal Plan Created
              </p>
              <p className="text-sm text-gray-600 mt-1">
                for {client.firstName} {client.lastName}
              </p>
            </div>

            {createdPlanInfo && createdPlanInfo.remainingDays > 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">{createdPlanInfo.remainingDays} days</span> remaining in the purchased plan
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  You can create more meal plans with the remaining days
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CreditCard className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-amber-800">All Plan Days Used</span>
                </div>
                <p className="text-sm text-amber-700">
                  To create more meal plans, the client needs to purchase a new plan first.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowSuccessDialog(false)}
              >
                Close
              </Button>
              {createdPlanInfo && createdPlanInfo.remainingDays <= 0 && (
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setShowSuccessDialog(false);
                    // Navigate to payments section
                    const paymentsSection = document.querySelector('[data-section="payments"]');
                    if (paymentsSection) {
                      paymentsSection.scrollIntoView({ behavior: 'smooth' });
                    }
                    toast.info('Create a new payment link for the client');
                  }}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Go to Payments
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
