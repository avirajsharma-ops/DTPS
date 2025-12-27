import { useState, useEffect } from 'react';
// Fixed imports to use existing UI component files
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MealGridTable } from './MealGridTable';
import { Save, User, Download } from 'lucide-react';
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

export type FoodOption = {
  id: string;
  label: string;
  food: string;
  unit: string;
  cal: string;
  carbs: string;
  fats: string;
  protein: string;
  fiber: string;
  recipeUuid?: string; // UUID of the recipe if added from recipe database
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
  { name: 'Breakfast', time: '08:00' },
  { name: 'Mid Morning', time: '10:30' },
  { name: 'Lunch', time: '13:00' },
  { name: 'Evening Snack', time: '16:00' },
  { name: 'Dinner', time: '19:30' },
  { name: 'Bedtime', time: '21:30' }
];

export function DietPlanDashboard({ clientData, onBack, onSavePlan, onSave, duration = 7, startDate, initialMeals, initialMealTypes, clientId, clientName, readOnly = false, clientDietaryRestrictions, clientMedicalConditions, clientAllergies, holdDays = [], totalHeldDays = 0 }: DietPlanDashboardProps) {
  // Get session for role-based export visibility
  const { data: session } = useSession();
  const userRole = session?.user?.role as string | undefined;
  // Only show export for admin and health_counselor
  const canExport = userRole === 'admin' || userRole === 'health_counselor';
  
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
    } else {
      // Reset to empty days
      setWeekPlan(newDays);
    }
  }, [initialMealsKey, duration]);

  // Update mealTypeConfigs when initialMealTypes changes
  useEffect(() => {
    if (initialMealTypes && initialMealTypes.length > 0) {
      setMealTypeConfigs(initialMealTypes);
    }
  }, [initialMealTypes]);

  // Persist changes to localStorage (only in edit mode)
  useEffect(() => {
    if (readOnly) return; // Don't persist in view mode
    try {
      if (typeof window !== 'undefined') {
        const key = `dietPlan_week_${duration}`;
        localStorage.setItem(key, JSON.stringify(weekPlan));
      }
    } catch {/* ignore */}
  }, [weekPlan, duration, readOnly]);

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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-gray-200 shadow-sm">
        <div className="max-w-450 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                {clientName ? `Diet Plan for ${clientName}` : 'Diet Plan Manager'}
              </h1>
              {clientId && (
                <span className="text-sm text-slate-500">({duration} days)</span>
              )}
              {readOnly && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">View Only</span>
              )}
            </div>
            {!readOnly && (
              <div className="flex items-center space-x-3">
                {canExport && (
                  <Button variant="outline" onClick={handleExport} className="border-gray-300 hover:bg-slate-50 font-medium">
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                )}
                <Button onClick={handleSavePlan} className="bg-green-600 hover:bg-green-700 shadow font-medium">
                  <Save className="w-4 h-4 mr-2" />
                  Save Plan
                </Button>
              </div>
            )}
            {readOnly && canExport && (
              <Button variant="outline" onClick={handleExport} className="border-gray-300 hover:bg-slate-50 font-medium">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            )}
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
          readOnly={readOnly}
          clientDietaryRestrictions={dietaryRestrictions}
          clientMedicalConditions={medicalConditions}
          clientAllergies={allergies}
          holdDays={holdDays}
          totalHeldDays={totalHeldDays}
        />
      </div>
    </div>
  );
}