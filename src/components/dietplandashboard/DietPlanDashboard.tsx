import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// Fixed imports to use existing UI component files
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MealGridTable } from './MealGridTable';
import { DietPlanExport } from './DietPlanExport';
import { Save, User, Download, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

// ClientInfoPanel component (inline)
function InfoCard({ label, value, variant = 'default' }: { label: string; value: string; variant?: 'default' | 'dark' | 'bordered' }) {
  const styles: Record<string, string> = {
    default: 'bg-slate-50 border border-slate-200 hover:border-slate-300',
    dark: 'bg-linear-to-br from-slate-900 to-slate-800 border border-slate-700 text-white shadow',
    bordered: 'bg-white border-2 border-slate-300 hover:border-slate-400',
  };
  return (
    <div className={`rounded-xl p-2.5 transition-colors ${styles[variant]}`}> 
      <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">{label}</p>
      <p className={`font-semibold text-sm ${variant === 'dark' ? 'text-white' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

type ClientData = {
  name: string;
  age: number;
  goal: string;
  planType: string;
  dietaryRestrictions?: string; // comma-separated
  medicalConditions?: string;   // comma-separated
  allergies?: string;           // comma-separated
};

export type MealTypeConfig = {
  name: string;
  time: string;
};

type DietPlanDashboardProps = {
  clientData?: ClientData;
  onBack?: () => void;
  onSavePlan?: (weekPlan: DayPlan[], mealTypes: MealTypeConfig[]) => void; // trigger parent save with meal data and meal types
  onSave?: (weekPlan: DayPlan[]) => void; // Simple save callback for PlanningSection
  duration?: number; // number of days to show
  startDate?: string; // Start date in YYYY-MM-DD format
  initialMeals?: DayPlan[]; // Load existing meals
  initialMealTypes?: MealTypeConfig[]; // Load existing meal types
  clientId?: string; // Client ID for saving
  clientName?: string; // Client name for display
  readOnly?: boolean; // View mode - hide save buttons and disable editing
  clientDietaryRestrictions?: string; // comma-separated dietary restrictions
  clientMedicalConditions?: string;   // comma-separated medical conditions
  clientAllergies?: string;           // comma-separated allergies
  holdDays?: { originalDate: Date; holdStartDate: Date; holdDays: number; reason?: string }[];
  totalHeldDays?: number;
};

export type FoodItem = {
  id: string;
  food: string;
  unit: string;
  cal: string;
  carbs: string;
  fats: string;
  protein: string;
  fiber: string;
  recipeUuid?: string;
};

export type FoodOption = {
  id: string;
  label: string;
  food: string;         // Primary food (for backwards compatibility)
  unit: string;
  cal: string;
  carbs: string;
  fats: string;
  protein: string;
  fiber: string;
  recipeUuid?: string;  // UUID of the recipe if added from recipe database
  foods?: FoodItem[];   // Multiple foods array for stacking foods in same meal slot
};

export type Meal = {
  id: string;
  time: string;
  name: string;
  foodOptions: FoodOption[];
  showAlternatives?: boolean;
};

export type DayPlan = {
  id: string;
  day: string;
  date: string;
  meals: { [mealType: string]: Meal };
  note: string;
  // Hold-related fields
  isHeld?: boolean;
  holdReason?: string;
  holdDate?: string;
  isCopiedFromHold?: boolean;
  originalDayIndex?: number;
  wasHeld?: boolean;
  resumedDate?: string;
};

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultMealTypes: MealTypeConfig[] = [
  { name: 'Breakfast', time: '07:00' },
  { name: 'Mid Morning', time: '09:00' },
  { name: 'Lunch', time: '13:00' },
  { name: 'Evening Snack', time: '17:00' },
  { name: 'Dinner', time: '21:00' },
  { name: 'Bedtime', time: '23:00' }
];

const to24HourTime = (value?: string): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const meridiem = match[3].toLowerCase();
  if (meridiem === 'pm' && hour !== 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minute}`;
};

export function DietPlanDashboard({ clientData, onBack, onSavePlan, onSave, duration = 7, startDate, initialMeals, initialMealTypes, clientId, clientName, readOnly = false, clientDietaryRestrictions, clientMedicalConditions, clientAllergies, holdDays = [], totalHeldDays = 0 }: DietPlanDashboardProps) {
  // Get session for role-based export visibility
  const { data: session } = useSession();
  const userRole = session?.user?.role as string | undefined;
  // Allow export for admin, health_counselor, and dietitian
  const canExport = userRole === 'admin' || userRole === 'health_counselor' || userRole === 'dietitian';
  
  // Combine props with clientData for restrictions
  const dietaryRestrictions = clientDietaryRestrictions || clientData?.dietaryRestrictions || '';
  const medicalConditions = clientMedicalConditions || clientData?.medicalConditions || '';
  const allergies = clientAllergies || clientData?.allergies || '';
  const [mealTypeConfigs, setMealTypeConfigs] = useState<MealTypeConfig[]>(initialMealTypes || defaultMealTypes);
  const mealTypes = mealTypeConfigs.map(m => m.name);
  
  // Helper to format date as YYYY-MM-DD
  const formatDateStr = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to add days to a date
  const addDaysToDate = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };
  
  const buildDays = (count: number): DayPlan[] => {
    const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const baseDate = startDate ? new Date(startDate) : new Date();
    
    return Array.from({ length: count }).map((_, index) => {
      const dayDate = addDaysToDate(baseDate, index);
      const dayOfMonth = dayDate.getDate();
      const dayName = fullDayNames[dayDate.getDay()];
      const dateStr = formatDateStr(dayDate);
      
      return {
        id: `day-${index}`,
        day: `${dayOfMonth} - Day ${index + 1} - ${dayName}`,
        date: dateStr,
        meals: {},
        note: ''
      };
    });
  };
  
  // Initialize weekPlan with the correct duration and initialMeals
  const [weekPlan, setWeekPlan] = useState<DayPlan[]>(() => {
    
    // Always start with correct number of days based on duration
    const newDays = buildDays(duration);
    
    // If we have initialMeals, merge it into the days
    if (initialMeals && Array.isArray(initialMeals) && initialMeals.length > 0) {
      // Log sample data
      if (initialMeals[0]) {
      }
      
      return newDays.map((d, i) => ({
        ...d,
        ...(initialMeals[i] || {}), // Preserve all fields from initialMeals including isHeld, isCopiedFromHold
        meals: initialMeals[i]?.meals || {},
        note: initialMeals[i]?.note || ''
      }));
    }
    
    return newDays;
  });
  
  // Rebuild when duration changes
  useEffect(() => {
    if (weekPlan.length !== duration) {
      const newDays = buildDays(duration);
      setWeekPlan(prev => {
        return newDays.map((d, i) => ({ 
          ...d,
          ...(prev[i] || {}), // Preserve all fields including isHeld, isCopiedFromHold
          meals: prev[i]?.meals || {}, 
          note: prev[i]?.note || '' 
        }));
      });
    }
  }, [duration]);

  // Rebuild when initialMeals changes (e.g., when viewing/editing a different plan)
  // Using JSON stringify for deep comparison since object reference may not change
  const initialMealsKey = JSON.stringify(initialMeals);
  useEffect(() => {
    
    const newDays = buildDays(duration);
    
    if (initialMeals && Array.isArray(initialMeals) && initialMeals.length > 0) {
      // Log what we're loading
      initialMeals.forEach((day, i) => {
        const mealCount = day?.meals ? Object.keys(day.meals).length : 0;
        const isHeld = (day as any)?.isHeld || false;
      });
      
      // Always set the weekPlan from initialMeals if provided
      // Use MAX of duration and initialMeals.length to ensure we show all days
      // (duration is what user wants, initialMeals.length may be less if old data, or more if hold days were added)
      const mealsLength = Math.max(duration, initialMeals.length);
      const adjustedDays = buildDays(mealsLength);
      
      setWeekPlan(adjustedDays.map((d, i) => ({
        ...d,
        ...(initialMeals[i] || {}), // Preserve all fields including isHeld, isCopiedFromHold
        meals: initialMeals[i]?.meals || {},
        note: initialMeals[i]?.note || ''
      })));
    }
    // Note: Don't reset to empty days here - let the draft restore handle empty state
    // This prevents overwriting draft data that may have been restored
  }, [initialMealsKey, duration]);

  // Update mealTypeConfigs when initialMealTypes changes
  useEffect(() => {
    if (initialMealTypes && initialMealTypes.length > 0) {
      const normalized = initialMealTypes.map((meal) => ({
        ...meal,
        time: to24HourTime(meal.time) || meal.time
      }));
      setMealTypeConfigs(normalized);
    }
  }, [initialMealTypes]);

  // ============ AUTO-SAVE FUNCTIONALITY ============
  // Draft key for this specific diet plan
  const draftKey = useMemo(() => {
    const identifier = clientId || 'new';
    return `dietPlan_draft_${identifier}_${duration}`;
  }, [clientId, duration]);
  
  // Auto-save state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false); // Export dialog state for MealGridTable
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<string>('');
  const isInitializedRef = useRef(false);
  
  const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
  const DEBOUNCE_MS = 2000; // 2 seconds
  
  // Memoized data for auto-save comparison
  const draftData = useMemo(() => ({
    weekPlan,
    mealTypeConfigs,
    lastSaved: Date.now(),
    expiresAt: Date.now() + DRAFT_EXPIRY_MS,
  }), [weekPlan, mealTypeConfigs]);
  
  // Save to localStorage (no server calls - zero DB load)
  const saveToStorage = useCallback(() => {
    if (typeof window === 'undefined' || readOnly) return;
    
    try {
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      setHasDraft(true);
      setLastSaved(new Date());
      setIsSaving(false);
    } catch (error) {
      console.error('Failed to save diet plan draft:', error);
      setIsSaving(false);
    }
  }, [draftKey, draftData, readOnly]);
  
  // Debounced auto-save effect (2 second delay)
  useEffect(() => {
    if (readOnly || !session?.user?.id) return;
    
    const currentDataStr = JSON.stringify({ weekPlan, mealTypeConfigs });
    
    // Skip if no changes
    if (previousDataRef.current === currentDataStr) return;
    
    // Skip initial state
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      previousDataRef.current = currentDataStr;
      return;
    }
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    setIsSaving(true);
    
    // Debounced save - only saves after 2 seconds of no changes
    saveTimeoutRef.current = setTimeout(() => {
      saveToStorage();
      previousDataRef.current = currentDataStr;
    }, DEBOUNCE_MS);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [weekPlan, mealTypeConfigs, readOnly, session?.user?.id, saveToStorage]);
  
  // Restore draft on mount
  useEffect(() => {
    if (draftRestored || readOnly || !session?.user?.id) return;
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(draftKey);
      if (!stored) {
        setDraftRestored(true);
        return;
      }
      
      const draft = JSON.parse(stored);
      
      // Check if expired
      if (draft.expiresAt && Date.now() > draft.expiresAt) {
        localStorage.removeItem(draftKey);
        setDraftRestored(true);
        return;
      }
      
      // Always restore draft if it exists and has data, regardless of initialMeals
      // This allows users to recover work in progress even when editing existing meals
      if (draft.weekPlan && draft.weekPlan.length > 0) {
        const hasData = draft.weekPlan.some((day: DayPlan) => 
          Object.keys(day.meals).length > 0 || day.note
        );
        
        if (hasData) {
          const normalizedMealTypes = (draft.mealTypeConfigs || defaultMealTypes).map((meal: MealTypeConfig) => ({
            ...meal,
            time: to24HourTime(meal.time) || meal.time
          }));

          const mealTimeMap = new Map(normalizedMealTypes.map((meal: MealTypeConfig) => [meal.name, meal.time]));
          const normalizedWeekPlan = draft.weekPlan.map((day: DayPlan) => {
            const meals = { ...day.meals } as Record<string, Meal>;
            Object.keys(meals).forEach((mealName) => {
              const current = meals[mealName];
              if (!current) return;
              const normalizedTime = to24HourTime(current.time) ?? current.time;
              const fallbackTime = mealTimeMap.get(mealName) || '12:00';
              const resolvedTime = (normalizedTime || fallbackTime) as string;
              meals[mealName] = {
                ...current,
                time: resolvedTime
              };
            });
            return { ...day, meals };
          });

          setWeekPlan(normalizedWeekPlan);
          setMealTypeConfigs(normalizedMealTypes);
          setHasDraft(true);
          setLastSaved(draft.lastSaved ? new Date(draft.lastSaved) : null);
          
          toast.success('Draft restored', {
            description: 'Your previous diet plan work has been restored. Draft expires in 24 hours.',
            duration: 4000
          });
        }
      }
      
      setDraftRestored(true);
    } catch (error) {
      console.error('Failed to restore diet plan draft:', error);
      setDraftRestored(true);
    }
  }, [draftKey, draftRestored, readOnly, session?.user?.id]);
  
  // Clear draft function
  const handleClearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      setLastSaved(null);
      previousDataRef.current = '';
      isInitializedRef.current = false;
      
      // Reset to initial state
      const newDays = buildDays(duration);
      if (initialMeals && initialMeals.length > 0) {
        setWeekPlan(newDays.map((d, i) => ({
          ...d,
          ...(initialMeals[i] || {}),
          meals: initialMeals[i]?.meals || {},
          note: initialMeals[i]?.note || ''
        })));
      } else {
        setWeekPlan(newDays);
      }
      setMealTypeConfigs(initialMealTypes || defaultMealTypes);
      
      toast.success('Draft cleared', { description: 'Starting fresh.' });
    } catch (error) {
      console.error('Failed to clear diet plan draft:', error);
    }
  }, [draftKey, duration, initialMeals, initialMealTypes]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
  // ============ END AUTO-SAVE FUNCTIONALITY ============

  const handleAddMealType = (newMealType: string, position?: number) => {
    if (newMealType && !mealTypes.includes(newMealType)) {
      const newConfig: MealTypeConfig = { name: newMealType, time: '12:00' };
      if (position !== undefined) {
        // Insert at specific position
        setMealTypeConfigs(prev => {
          const updated = [...prev];
          updated.splice(position, 0, newConfig);
          return updated;
        });
      } else {
        // Add at the end
        setMealTypeConfigs(prev => [...prev, newConfig]);
      }
    }
  };

  const handleSavePlan = () => {
    // Clear draft after save (draft will be deleted from localStorage)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(draftKey);
        setHasDraft(false);
        setLastSaved(null);
        previousDataRef.current = '';
      } catch {/* ignore */}
    }
    
    if (onSave) {
      // New simple callback for PlanningSection
      onSave(weekPlan);
    } else if (onSavePlan) {
      onSavePlan(weekPlan, mealTypeConfigs);
    } else {
      toast.success('Diet plan saved successfully!');
    }
  };

  const handleUpdateMealType = (index: number, field: 'name' | 'time', value: string) => {
    setMealTypeConfigs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveMealType = (mealTypeName: string) => {
    // Remove from mealTypeConfigs
    setMealTypeConfigs(prev => prev.filter(config => config.name !== mealTypeName));
    
    // Also remove from weekPlan meals
    setWeekPlan(prev => prev.map(day => {
      const { [mealTypeName]: removed, ...remainingMeals } = day.meals;
      return { ...day, meals: remainingMeals };
    }));
  };

  const handleRemoveDay = (dayIndex: number) => {
    // Remove the day at the given index
    setWeekPlan(prev => {
      if (prev.length <= 1) return prev; // Keep at least 1 day
      const updated = prev.filter((_, i) => i !== dayIndex);
      // Re-number days if needed
      return updated.map((day, i) => ({
        ...day,
        day: `Day ${i + 1}`
      }));
    });
    toast.success(`Day ${dayIndex + 1} deleted`);
  };

  const handleExport = () => {
    toast.success('Diet plan exported successfully!');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b-2 border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-450 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                {clientName ? `Diet Plan for ${clientName}` : 'Diet Plan Manager'}
              </h1>
              {clientId && (
                <span className="text-sm text-slate-500 dark:text-slate-400">({duration} days)</span>
              )}
              {readOnly && (
                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded font-medium">View Only</span>
              )}
            </div>
            
            {/* Right side - Auto-save indicator + Actions */}
            <div className="flex items-center space-x-3">
              {/* Auto-save indicator */}
              {!readOnly && (
                <>
                  {isSaving && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Saving...
                    </span>
                  )}
                  {!isSaving && lastSaved && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Saved {lastSaved.toLocaleTimeString()}
                    </span>
                  )}
                  {hasDraft && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearDraft}
                      className="border-gray-300 dark:border-gray-600"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear Draft
                    </Button>
                  )}
                </>
              )}
              
              {/* Action buttons */}
              {!readOnly && (
                <>
                  {canExport && (
                    <DietPlanExport
                      weekPlan={weekPlan}
                      mealTypes={mealTypes}
                      clientName={clientName}
                      clientInfo={{
                        dietaryRestrictions,
                        medicalConditions,
                        allergies
                      }}
                      duration={duration}
                      startDate={startDate}
                    />
                  )}
                  <Button onClick={handleSavePlan} className="bg-green-600 hover:bg-green-700 shadow font-medium">
                    <Save className="w-4 h-4 mr-2" />
                    Save Plan
                  </Button>
                </>
              )}
              {readOnly && canExport && (
                <DietPlanExport
                  weekPlan={weekPlan}
                  mealTypes={mealTypes}
                  clientName={clientName}
                  clientInfo={{
                    dietaryRestrictions,
                    medicalConditions,
                    allergies
                  }}
                  duration={duration}
                  startDate={startDate}
                />
              )}
            </div>
          </div>
        </div>
      </div>


      <div className="max-w-600 z-mx-auto px-2 sm:px-4 lg:px-6 py-10"> 
        <MealGridTable 
          weekPlan={weekPlan} 
          mealTypes={mealTypes}
          onUpdate={readOnly ? undefined : setWeekPlan}
          onAddMealType={readOnly ? undefined : handleAddMealType}
          onRemoveMealType={readOnly ? undefined : handleRemoveMealType}
          onRemoveDay={readOnly ? undefined : handleRemoveDay}
          onExport={canExport ? () => setExportDialogOpen(true) : undefined}
          readOnly={readOnly}
          clientName={clientName}
          clientDietaryRestrictions={dietaryRestrictions}
          clientMedicalConditions={medicalConditions}
          clientAllergies={allergies}
          holdDays={holdDays}
          totalHeldDays={totalHeldDays}
        />
        {/* Export dialog triggered from MealGridTable */}
        {canExport && (
          <DietPlanExport
            weekPlan={weekPlan}
            mealTypes={mealTypes}
            clientName={clientName}
            clientInfo={{
              dietaryRestrictions,
              medicalConditions,
              allergies
            }}
            duration={duration}
            startDate={startDate}
            externalOpen={exportDialogOpen}
            onExternalOpenChange={setExportDialogOpen}
          />
        )}
      </div>
    </div>
  );
}