import { useState, useEffect } from 'react';
// Fixed imports to use existing UI component files
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MealGridTable } from './MealGridTable';
import { Save, User, Download } from 'lucide-react';
import { toast } from 'sonner';

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
};

type DietPlanDashboardProps = {
  clientData: ClientData;
  onBack: () => void;
  onSavePlan?: () => void; // trigger parent save
  duration?: number; // number of days to show
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
};

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function DietPlanDashboard({ clientData, onBack, onSavePlan, duration = 7 }: DietPlanDashboardProps) {
  const [mealTypes, setMealTypes] = useState<string[]>(['Breakfast', 'Mid Morning', 'Lunch', 'Evening Snack', 'Dinner', 'Bedtime']);
  const buildDays = (count: number): DayPlan[] => {
    return Array.from({ length: count }).map((_, index) => {
      const dow = daysOfWeek[index % 7];
      return {
        id: `day-${index}`,
        day: `Day ${index + 1} - ${dow.slice(0,3)}`,
        date: '',
        meals: {},
        note: ''
      };
    });
  };
  const [weekPlan, setWeekPlan] = useState<DayPlan[]>(buildDays(duration));
  // Rebuild when duration changes
  if (weekPlan.length !== duration) {
    // Preserve existing first days data if shrinking
    setWeekPlan(prev => {
      const newDays = buildDays(duration);
      return newDays.map((d, i) => ({ ...d, meals: prev[i]?.meals || {}, note: prev[i]?.note || '' }));
    });
  }

  // Load cached week plan
  useEffect(() => {
    try {
      const key = `dietPlan_week_${duration}`;
      const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (raw) {
        const parsed: DayPlan[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === duration) {
          setWeekPlan(parsed);
        }
      }
    } catch {/* ignore */}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  // Persist changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const key = `dietPlan_week_${duration}`;
        localStorage.setItem(key, JSON.stringify(weekPlan));
      }
    } catch {/* ignore */}
  }, [weekPlan, duration]);

  const handleAddMealType = (newMealType: string, position?: number) => {
    if (newMealType && !mealTypes.includes(newMealType)) {
      if (position !== undefined) {
        // Insert at specific position
        const newMealTypes = [...mealTypes];
        newMealTypes.splice(position, 0, newMealType);
        setMealTypes(newMealTypes);
      } else {
        // Add at the end
        setMealTypes([...mealTypes, newMealType]);
      }
    }
  };

  const handleSavePlan = () => {
    if (onSavePlan) {
      onSavePlan();
    } else {
      toast.success('Diet plan saved successfully!');
    }
  };

  const handleExport = () => {
    toast.success('Diet plan exported successfully!');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-gray-200 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Diet Plan Manager</h1>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={handleExport} className="border-gray-300 hover:bg-slate-50 font-medium">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button onClick={handleSavePlan} className="bg-slate-900 hover:bg-slate-800 shadow font-medium">
                <Save className="w-4 h-4 mr-2" />
                Save Plan
              </Button>
            </div>
          </div>
        </div>
      </div>


      <div className="max-w-[2400px] z-mx-auto px-2 sm:px-4 lg:px-6 py-10"> 
        <MealGridTable 
          weekPlan={weekPlan} 
          mealTypes={mealTypes}
          onUpdate={setWeekPlan}
          onAddMealType={handleAddMealType}
        />
      </div>
    </div>
  );
}