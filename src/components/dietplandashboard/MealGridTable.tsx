import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, X, Minus, Copy, ChevronLeft, ChevronRight, Check, Maximize2, Minimize2, Trash2, Download } from 'lucide-react';
import { DayPlan, Meal, FoodOption, FoodItem as MealFoodItem } from './DietPlanDashboard';
import { FoodDatabasePanel } from './FoodSheet';
// Define FoodDatabaseItem shape to type foods parameter from FoodDatabasePanel selection
type FoodDatabaseItem = {
  id: string;
  date: string;
  time: string;
  menu: string;
  amount: string;
  cals: number;
  carbs: number;
  protein: number;
  fats: number;
  selected: boolean;
  recipeUuid?: string; // UUID of the recipe
};
import { DatePicker } from './DatePicker';
import { useState, useRef, useEffect } from 'react';
import React from 'react';

type MealGridTableProps = {
  weekPlan: DayPlan[];
  mealTypes: string[];
  onUpdate?: (weekPlan: DayPlan[]) => void;
  onAddMealType?: (mealType: string, position?: number) => void;
  onRemoveMealType?: (mealType: string) => void;
  onRemoveDay?: (dayIndex: number) => void;
  onExport?: () => void; // Callback to trigger export dialog
  readOnly?: boolean;
  clientDietaryRestrictions?: string;
  clientMedicalConditions?: string;
  clientAllergies?: string;
  holdDays?: { originalDate: Date; holdStartDate: Date; holdDays: number; reason?: string }[];
  totalHeldDays?: number;
};

const mealTimeSuggestions: { [key: string]: string } = {
  'Breakfast': '07:00',
  'Mid Morning': '10:00',
  'Lunch': '13:00',
  'Evening Snack': '16:00',
  'Dinner': '19:00',
  'Bedtime': '21:00'
};

const DAYS_PER_PAGE = 14;

// Helper function to calculate daily macro totals
function calculateDayMacros(day: DayPlan): { cal: number; carbs: number; fats: number; protein: number; fiber: number } {
  const totals = { cal: 0, carbs: 0, fats: 0, protein: 0, fiber: 0 };
  
  Object.values(day.meals).forEach(meal => {
    if (meal && meal.foodOptions) {
      // Only count the first food option (A option) for totals
      const primaryOption = meal.foodOptions[0];
      if (primaryOption) {
        // If option has multiple foods array, use those values (already summed)
        // Otherwise use the primary fields
        totals.cal += parseFloat(primaryOption.cal) || 0;
        totals.carbs += parseFloat(primaryOption.carbs) || 0;
        totals.fats += parseFloat(primaryOption.fats) || 0;
        totals.protein += parseFloat(primaryOption.protein) || 0;
        totals.fiber += parseFloat(primaryOption.fiber) || 0;
      }
    }
  });
  
  return totals;
}

// Helper function to format notes with period as line break
function formatNotesDisplay(note: string): string[] {
  if (!note) return [];
  // Split by period and filter out empty strings
  return note.split('.').map(s => s.trim()).filter(s => s.length > 0);
}

export function MealGridTable({ weekPlan, mealTypes, onUpdate, onAddMealType, onRemoveMealType, onRemoveDay, onExport, readOnly = false, clientDietaryRestrictions = '', clientMedicalConditions = '', clientAllergies = '', holdDays = [], totalHeldDays = 0 }: MealGridTableProps) {
  // Debug logging
  if (weekPlan[0]?.meals) {
    const firstMealType = Object.keys(weekPlan[0].meals)[0];
    if (firstMealType) {
    }
  }
  
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySource, setCopySource] = useState<{ dayIndex: number; mealType: string } | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [customMealTimes, setCustomMealTimes] = useState<{ [key: string]: string }>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [addMealTypeDialogOpen, setAddMealTypeDialogOpen] = useState(false);
  const [newMealTypeName, setNewMealTypeName] = useState('');
  const [newMealTime, setNewMealTime] = useState('');
  // Removed per-day selection for new meal type
  const [activeFoodDetail, setActiveFoodDetail] = useState<{ dayIndex: number; mealType: string; optionIndex: number } | null>(null);
  const [foodDatabaseOpen, setFoodDatabaseOpen] = useState(false);
  const [currentFoodContext, setCurrentFoodContext] = useState<{ dayIndex: number; mealType: string; optionIndex: number } | null>(null);
  // Find & Replace feature state
  const [findReplaceDialogOpen, setFindReplaceDialogOpen] = useState(false);
  const [findFoodTarget, setFindFoodTarget] = useState<string>('');
  const [replaceFoodValue, setReplaceFoodValue] = useState<string>('');
  const [selectedDaysForReplace, setSelectedDaysForReplace] = useState<number[]>([]);
  const [selectedMealTypesForReplace, setSelectedMealTypesForReplace] = useState<string[]>([]);
  const [manualFindFoodName, setManualFindFoodName] = useState<string>('');
  // Drag & Drop state
  const [dragOverTarget, setDragOverTarget] = useState<{ dayIndex: number; mealType: string } | null>(null);
  const [dragSource, setDragSource] = useState<{ dayIndex: number; mealType: string; optionIndex: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  // Notes dialog state
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesDialogDayIndex, setNotesDialogDayIndex] = useState<number | null>(null);
  const [notesDialogValue, setNotesDialogValue] = useState('');
  // Recipe search state for Find & Replace
  const [recipes, setRecipes] = useState<{ _id: string; name: string }[]>([]);
  const [findRecipeSearch, setFindRecipeSearch] = useState('');
  const [replaceRecipeSearch, setReplaceRecipeSearch] = useState('');
  const [replaceAction, setReplaceAction] = useState<'replace' | 'delete'>('replace');
  // Search filter for dropdowns
  const [findSearchFilter, setFindSearchFilter] = useState('');
  const [replaceSearchFilter, setReplaceSearchFilter] = useState('');
  const [showFindDropdown, setShowFindDropdown] = useState(false);
  const [showReplaceDropdown, setShowReplaceDropdown] = useState(false);

  const totalPages = Math.ceil(weekPlan.length / DAYS_PER_PAGE);
  const startIndex = currentPage * DAYS_PER_PAGE;
  const endIndex = Math.min(startIndex + DAYS_PER_PAGE, weekPlan.length);
  const paginatedDays = weekPlan.slice(startIndex, endIndex);

  // Fetch recipes when Find & Replace dialog opens
  useEffect(() => {
    if (findReplaceDialogOpen && recipes.length === 0) {
      fetch('/api/recipes?limit=500')
        .then(res => res.json())
        .then(data => {
          if (data.recipes) {
            setRecipes(data.recipes.map((r: any) => ({ _id: r._id, name: r.name })));
          }
        })
        .catch(err => console.error('Failed to fetch recipes:', err));
    }
  }, [findReplaceDialogOpen, recipes.length]);

  const createNewMeal = (mealType: string): Meal => ({
    id: Math.random().toString(36).substr(2, 9),
    time: customMealTimes[mealType] || mealTimeSuggestions[mealType] || '12:00',
    name: mealType,
    showAlternatives: true,
    foodOptions: [
      {
        id: Math.random().toString(36).substr(2, 9),
        label: 'A Food',
        food: '',
        unit: '',
        cal: '',
        carbs: '',
        fats: '',
  protein: '',
        fiber: ''
      }
    ]
  });

  const getMealForDay = (dayIndex: number, mealType: string): Meal | null => {
    const meal = weekPlan[dayIndex]?.meals[mealType] || null;
    // Debug logging only for first day
    if (dayIndex === 0) {
    }
    return meal;
  };

  const addMealToCell = (dayIndex: number, mealType: string) => {
    if (readOnly || !onUpdate) return;
    const newWeekPlan = [...weekPlan];
    const existingMeal = newWeekPlan[dayIndex].meals[mealType];
    if (!existingMeal) {
      // Create brand new meal with initial A option
      newWeekPlan[dayIndex].meals[mealType] = createNewMeal(mealType);
      onUpdate(newWeekPlan);
    } else if (existingMeal.foodOptions.length === 0) {
      // Re-initialize empty meal with first option
      existingMeal.foodOptions.push({
        id: Math.random().toString(36).substr(2, 9),
        label: 'A Food',
        food: '',
        unit: '',
        cal: '',
        carbs: '',
        fats: '',
        protein: '',
        fiber: ''
      });
      onUpdate(newWeekPlan);
    }
  };

  const updateMealTime = (dayIndex: number, mealType: string, time: string) => {
    if (readOnly || !onUpdate) return;
    const newWeekPlan = [...weekPlan];
    if (newWeekPlan[dayIndex].meals[mealType]) {
      newWeekPlan[dayIndex].meals[mealType].time = time;
      onUpdate(newWeekPlan);
    }
  };

  const toggleAlternatives = (dayIndex: number, mealType: string) => {
    if (readOnly || !onUpdate) return;
    const newWeekPlan = [...weekPlan];
    if (newWeekPlan[dayIndex].meals[mealType]) {
      newWeekPlan[dayIndex].meals[mealType].showAlternatives = 
        !newWeekPlan[dayIndex].meals[mealType].showAlternatives;
      onUpdate(newWeekPlan);
    }
  };

  const addFoodOption = (dayIndex: number, mealType: string) => {
    if (readOnly || !onUpdate) return;
    const newWeekPlan = [...weekPlan];
    const meal = newWeekPlan[dayIndex].meals[mealType];
    if (meal) {
      const nextLetter = String.fromCharCode(65 + meal.foodOptions.length);
      meal.foodOptions.push({
        id: Math.random().toString(36).substr(2, 9),
        label: `${nextLetter} Food`,
        food: '',
        unit: '',
        cal: '',
        carbs: '',
        fats: '',
        protein: '',
        fiber: ''
      });
      onUpdate(newWeekPlan);
    }
  };

  const removeFoodOption = (dayIndex: number, mealType: string, optionIndex: number) => {
    if (readOnly || !onUpdate) return;
    const newWeekPlan = [...weekPlan];
    const meal = newWeekPlan[dayIndex].meals[mealType];
    if (meal) {
      meal.foodOptions.splice(optionIndex, 1);
      onUpdate(newWeekPlan);
    }
  };

  const updateFoodOption = (
    dayIndex: number,
    mealType: string,
    optionIndex: number,
    field: keyof Omit<FoodOption, 'foods'>,
    value: string
  ) => {
    if (readOnly || !onUpdate) return;
    const newWeekPlan = [...weekPlan];
    const meal = newWeekPlan[dayIndex].meals[mealType];
    if (meal && meal.foodOptions[optionIndex]) {
      (meal.foodOptions[optionIndex] as Record<string, unknown>)[field] = value;
      onUpdate(newWeekPlan);
    }
  };

  const updateDayInfo = (dayIndex: number, field: 'date' | 'note', value: string) => {
    if (readOnly || !onUpdate) return;
    const newWeekPlan = [...weekPlan];
    newWeekPlan[dayIndex][field] = value;
    onUpdate(newWeekPlan);
  };

  const openCopyDialog = (dayIndex: number, mealType: string) => {
    setCopySource({ dayIndex, mealType });
    setSelectedDays([]);
    setSelectedMeals([]);
    setCopyDialogOpen(true);
  };

  const handleCopyMeal = () => {
    if (!copySource || selectedDays.length === 0 || selectedMeals.length === 0) return;
    if (readOnly || !onUpdate) return;

    const sourceMeal = weekPlan[copySource.dayIndex].meals[copySource.mealType];
    if (!sourceMeal) return;

    const newWeekPlan = [...weekPlan];
    
    // Copy to all selected day and meal combinations
    selectedDays.forEach(targetDayIndex => {
      selectedMeals.forEach(targetMealType => {
        // Deep copy the meal
        newWeekPlan[targetDayIndex].meals[targetMealType] = {
          ...sourceMeal,
          id: Math.random().toString(36).substr(2, 9),
          name: targetMealType,
          foodOptions: sourceMeal.foodOptions.map(option => ({
            ...option,
            id: Math.random().toString(36).substr(2, 9)
          }))
        };
      });
    });

    onUpdate(newWeekPlan);
    setCopyDialogOpen(false);
  };

  const toggleDaySelection = (dayIndex: number) => {
    setSelectedDays(prev => 
      prev.includes(dayIndex) 
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const toggleMealSelection = (mealType: string) => {
    setSelectedMeals(prev => 
      prev.includes(mealType) 
        ? prev.filter(m => m !== mealType)
        : [...prev, mealType]
    );
  };

  const selectAllDays = () => {
    if (selectedDays.length === weekPlan.length) {
      setSelectedDays([]);
    } else {
      setSelectedDays(weekPlan.map((_, index) => index));
    }
  };

  const selectAllMeals = () => {
    if (selectedMeals.length === mealTypes.length) {
      setSelectedMeals([]);
    } else {
      setSelectedMeals([...mealTypes]);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const addNewDay = () => {
    if (readOnly || !onUpdate) return;
    const newDayIndex = weekPlan.length + 1;
    const newDay: DayPlan = {
      id: `day-${Date.now()}`,
      day: `Day ${newDayIndex}`,
      date: '',
      meals: {},
      note: ''
    };
    onUpdate([...weekPlan, newDay]);
  };

  const updateMealTypeTime = (mealType: string, time: string) => {
    setCustomMealTimes(prev => ({
      ...prev,
      [mealType]: time
    }));
  };

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleAddMealType = () => {
    if (readOnly || !onUpdate || !onAddMealType) return;
    const name = newMealTypeName.trim();
    if (!name) return;
    const time = newMealTime || '12:00';

    // Create meal in all days if missing
    const newWeekPlan = weekPlan.map(d => {
      const day = { ...d, meals: { ...d.meals } };
      if (!day.meals[name]) {
        day.meals[name] = {
          id: Math.random().toString(36).substr(2, 9),
          time,
          name,
          showAlternatives: true,
          foodOptions: [
            {
              id: Math.random().toString(36).substr(2, 9),
              label: 'A Food',
              food: '',
              unit: '',
              cal: '',
              carbs: '',
              fats: '',
              protein: '',
              fiber: ''
            }
          ]
        };
      }
      return day;
    });
    onUpdate(newWeekPlan);

    // Store custom time and compute position based on time ordering
    setCustomMealTimes(prev => ({ ...prev, [name]: time }));
    const timeFor = (mt: string) => (mt === name ? time : (customMealTimes[mt] || mealTimeSuggestions[mt] || '12:00'));
    const sorted = [...mealTypes, name].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=> timeFor(a).localeCompare(timeFor(b)));
    const position = sorted.indexOf(name);
    onAddMealType(name, position);

    setAddMealTypeDialogOpen(false);
    setNewMealTypeName('');
    setNewMealTime('');
  };

  const openFoodDetailPanel = (dayIndex: number, mealType: string, optionIndex: number) => {
    setActiveFoodDetail({ dayIndex, mealType, optionIndex });
  };

  const closeFoodDetailPanel = () => {
    setActiveFoodDetail(null);
  };

  const selectedFoodDetail = activeFoodDetail
    ? weekPlan[activeFoodDetail.dayIndex]?.meals[activeFoodDetail.mealType]?.foodOptions[activeFoodDetail.optionIndex]
    : null;
  const selectedMeal = activeFoodDetail
    ? weekPlan[activeFoodDetail.dayIndex]?.meals[activeFoodDetail.mealType]
    : null;
  const selectedDay = activeFoodDetail ? weekPlan[activeFoodDetail.dayIndex] : null;

  // Sort header meal types by time
  const timeForHeader = (mt: string) => customMealTimes[mt] || mealTimeSuggestions[mt] || '12:00';
  const displayMealTypes = [...mealTypes].sort((a,b)=> timeForHeader(a).localeCompare(timeForHeader(b)));

  // Collect unique food names across plan for find options
  const availableFoods: string[] = Array.from(new Set(
    weekPlan.flatMap(day =>
      Object.values(day.meals).flatMap(meal => meal.foodOptions.map(opt => opt.food.trim()).filter(f => f))
    )
  ));

  const toggleReplaceDay = (dayIndex: number) => {
    setSelectedDaysForReplace(prev => prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]);
  };

  const toggleReplaceMealType = (mealType: string) => {
    setSelectedMealTypesForReplace(prev => prev.includes(mealType) ? prev.filter(m => m !== mealType) : [...prev, mealType]);
  };

  const handleFindReplace = () => {
    if (readOnly || !onUpdate) return;
    const findValue = (findFoodTarget || manualFindFoodName || findRecipeSearch).trim();
    const replaceValue = (replaceFoodValue || replaceRecipeSearch).trim();
    
    if (!findValue || selectedDaysForReplace.length === 0 || selectedMealTypesForReplace.length === 0) return;
    
    // For replace action, require a replace value
    if (replaceAction === 'replace' && !replaceValue) return;
    
    const newWeekPlan = weekPlan.map((d, idx) => {
      if (!selectedDaysForReplace.includes(idx)) return d;
      const day = { ...d, meals: { ...d.meals } };
      Object.keys(day.meals).forEach(mt => {
        if (!selectedMealTypesForReplace.includes(mt)) return;
        const meal = day.meals[mt];
        
        if (replaceAction === 'delete') {
          // Delete matching food options
          meal.foodOptions = meal.foodOptions.filter(opt =>
            opt.food.trim().toLowerCase() !== findValue.toLowerCase()
          );
          // Relabel remaining options
          meal.foodOptions.forEach((opt, i) => {
            opt.label = `${String.fromCharCode(65 + i)} Food`;
          });
        } else {
          // Replace matching food options
          meal.foodOptions = meal.foodOptions.map(opt =>
            opt.food.trim().toLowerCase() === findValue.toLowerCase()
              ? { ...opt, food: replaceValue }
              : opt
          );
        }
      });
      return day;
    });
    onUpdate(newWeekPlan);
    resetFindReplaceDialog();
  };

  const resetFindReplaceDialog = () => {
    setFindReplaceDialogOpen(false);
    setFindFoodTarget('');
    setReplaceFoodValue('');
    setSelectedDaysForReplace([]);
    setSelectedMealTypesForReplace([]);
    setManualFindFoodName('');
    setFindRecipeSearch('');
    setReplaceRecipeSearch('');
    setReplaceAction('replace');
    setFindSearchFilter('');
    setReplaceSearchFilter('');
    setShowFindDropdown(false);
    setShowReplaceDropdown(false);
  };

  // Helper to relabel options sequentially A, B, C ...
  const relabelOptions = (meal: Meal) => {
    meal.foodOptions.forEach((opt, idx) => {
      opt.label = `${String.fromCharCode(65 + idx)} Food`;
    });
  };

  // Determine insertion index within target meal based on cursor Y position
  const getInsertionIndex = (e: React.DragEvent<HTMLTableCellElement>, targetMeal: Meal): number => {
    const cell = e.currentTarget as HTMLTableCellElement;
    const boxes = Array.from(cell.querySelectorAll<HTMLDivElement>('.food-box'));
    if (boxes.length === 0) return 0;
    const y = e.clientY;
    for (let i = 0; i < boxes.length; i++) {
      const rect = boxes[i].getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (y < mid) return i; // insert before this box
    }
    return boxes.length; // append at end
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, dayIndex: number, mealType: string, optionIndex: number, foodFilled: boolean) => {
    if (!foodFilled) {
      e.preventDefault();
      return;
    }
    setDragSource({ dayIndex, mealType, optionIndex });
    e.dataTransfer.setData('text/plain', JSON.stringify({ dayIndex, mealType, optionIndex }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableCellElement>, dayIndex: number, mealType: string) => {
    // Allow drop only if drag source exists
    if (dragSource) {
      e.preventDefault();
      setDragOverTarget({ dayIndex, mealType });
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTableCellElement>, dayIndex: number, mealType: string) => {
    if (dragOverTarget && dragOverTarget.dayIndex === dayIndex && dragOverTarget.mealType === mealType) {
      setDragOverTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTableCellElement>, targetDayIndex: number, targetMealType: string) => {
    e.preventDefault();
    const source = dragSource;
    setDragOverTarget(null);
    setDragSource(null);
    if (!source) return;
    if (readOnly || !onUpdate) return;

    const newWeekPlan = [...weekPlan].map(d => ({ ...d, meals: { ...d.meals } }));
    const sourceMeal = newWeekPlan[source.dayIndex].meals[source.mealType];
    if (!sourceMeal) return;
    const movedOption = sourceMeal.foodOptions[source.optionIndex];
    if (!movedOption) return;

    // Ensure target meal exists
    let targetMeal = newWeekPlan[targetDayIndex].meals[targetMealType];
    if (!targetMeal) {
      newWeekPlan[targetDayIndex].meals[targetMealType] = createNewMeal(targetMealType);
      targetMeal = newWeekPlan[targetDayIndex].meals[targetMealType];
    }

    const sameCell = source.dayIndex === targetDayIndex && source.mealType === targetMealType;

    if (sameCell) {
      // Reorder within same meal (move option)
      const extracted = sourceMeal.foodOptions.splice(source.optionIndex, 1)[0];
      // Compute insertion index after removal
      let insertionIndex = getInsertionIndex(e, targetMeal);
      if (source.optionIndex < insertionIndex) insertionIndex -= 1;
      targetMeal.foodOptions.splice(insertionIndex, 0, extracted);
      relabelOptions(targetMeal);
    } else {
      // Copy (duplicate) to target meal without removing from source
      // Compute insertion index relative to target meal
      let insertionIndex = getInsertionIndex(e, targetMeal);
      const duplicate = { ...movedOption, id: Math.random().toString(36).substr(2, 9) };
      // If target has a single blank option, replace
      if (
        targetMeal.foodOptions.length === 1 &&
        !targetMeal.foodOptions[0].food &&
        targetMeal.foodOptions[0].unit === '' &&
        targetMeal.foodOptions[0].cal === ''
      ) {
        targetMeal.foodOptions[0] = duplicate;
      } else {
        targetMeal.foodOptions.splice(insertionIndex, 0, duplicate);
      }
      relabelOptions(targetMeal);
      // Relabel source (unchanged positions) for consistency
      relabelOptions(sourceMeal);
    }

    onUpdate(newWeekPlan);
  };

  return (
    <div className={`space-y-1 ${isFullScreen ? 'fixed inset-0 z-50 bg-white p-4 overflow-auto' : ''}`}>
      {/* Pagination Controls - Moved to top */}
      <div className="flex justify-between items-center gap-3 py-2">
        <div>
          {!readOnly && (
            <>
              <Button
                variant="outline"
                onClick={() => setAddMealTypeDialogOpen(true)}
                style={{ backgroundColor: '#00A63E', color: 'white', borderColor: '#00A63E' }}
                className="h-10 px-4 hover:opacity-90 font-medium shadow-md"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Meal Type
              </Button>
              <Button
                variant="outline"
                onClick={() => setFindReplaceDialogOpen(true)}
                className="h-10 px-4 ml-2 border-gray-300 bg-white hover:bg-slate-100 font-medium shadow-md"
              >
                Find & Replace
              </Button>
            </>
          )}
          {readOnly && (
            <span className="text-sm text-gray-500 font-medium px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
              📋 View Mode - Read Only
            </span>
          )}
        </div>
    <div className='flex items-center gap-4'  >
          <div className="bg-white shadow-md rounded-full px-4 py-2 border border-gray-300">
          <span className="text-xs font-semibold text-slate-700">
            Page {currentPage + 1} of {totalPages} 
            <span className="text-slate-500 ml-2">
              (Days {startIndex + 1}-{endIndex})
            </span>
          </span>
        </div>
   <div className='flex gap-1'>
         <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousPage}
          disabled={currentPage === 0}
          className="h-9 w-9 p-0 rounded-full bg-white shadow-md border-gray-300 hover:bg-slate-100 disabled:opacity-50"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextPage}
          disabled={currentPage >= totalPages - 1}
          className="h-9 w-9 p-0 rounded-full bg-white shadow-md border-gray-300 hover:bg-slate-100 disabled:opacity-50"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={scrollLeft}
          className="h-9 w-9 p-0 rounded-full bg-white shadow-md border-gray-300 hover:bg-slate-100"
          title="Scroll left"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={scrollRight}
          className="h-9 w-9 p-0 rounded-full bg-white shadow-md border-gray-300 hover:bg-slate-100"
          title="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        {/* Full Screen Toggle Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsFullScreen(!isFullScreen)}
          className={`h-9 w-9 p-0 rounded-full shadow-md border-gray-300 hover:bg-slate-100 ${isFullScreen ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white'}`}
          title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
        >
          {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
        {/* Download/Export Button */}
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="h-9 w-9 p-0 rounded-full shadow-md border-gray-300 hover:bg-emerald-100 hover:border-emerald-500 hover:text-emerald-700 bg-white"
            title="Download Diet Plan"
          >
            <Download className="w-4 h-4" />
          </Button>
        )}
   </div>
    </div>
      </div>

      {/* Table Container */}
      <div className="relative border border-gray-300 rounded-lg bg-white overflow-hidden shadow">
        <div 
        ref={scrollContainerRef} 
        className={`w-full overflow-auto ${isFullScreen ? 'h-[calc(100vh-120px)]' : 'h-[calc(100vh-250px)]'}`}
        style={{ scrollbarWidth: 'thin' }}
      >
        <table className="w-full border-collapse relative">
          <thead className="sticky top-0 bg-white shadow-sm" style={{ zIndex: 10 }}>
            <tr>
              <th className="border-r border-b-2 border-gray-300 p-6 bg-slate-100 w-48 min-w-48">
                <div className="text-slate-800 font-semibold tracking-wide uppercase text-sm">Day</div>
              </th>
              {displayMealTypes.map((mealType, index) => (
                <React.Fragment key={mealType}>
                  <th className="border-r border-b-2 border-gray-300 p-5 bg-slate-50 min-w-70">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="text-slate-800 font-semibold tracking-wide uppercase text-xs">{mealType}</div>
                        {!readOnly && onRemoveMealType && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveMealType(mealType)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title={`Delete ${mealType}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <Input
                        type="time"
                        value={customMealTimes[mealType] || mealTimeSuggestions[mealType] || '12:00'}
                        onChange={(e) => updateMealTypeTime(mealType, e.target.value)}
                        className="h-9 text-xs bg-white border-gray-300 focus:border-slate-500 focus:ring-slate-500 font-mono"
                        title="Default time for this meal type"
                      />
                    </div>
                  </th>
                </React.Fragment>
              ))}
              {/* Add Meal Type Column at the end */}
              <th className="border-b-2 border-gray-300 p-5 bg-slate-100/50 min-w-70">
                <div className="space-y-2.5">
                  <div className="text-slate-800 font-semibold tracking-wide uppercase text-xs flex items-center justify-center gap-2">
                    <Plus className="w-3.5 h-3.5" />
                    Add Meal Type
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setAddMealTypeDialogOpen(true)}
                    className="w-full h-9 text-xs bg-white border-2 border-dashed border-slate-400 hover:border-slate-600 hover:bg-slate-50
                     text-slate-700 hover:text-slate-900 font-medium"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Meal Type
                  </Button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedDays.map((day, paginatedIndex) => {
              const actualDayIndex = startIndex + paginatedIndex;
              // Use same green color for all rows
              const rowColor = '#BCEBCB';
              // Get all meal types for this day (standard ones + any custom ones)
              const dayMealTypes = [...displayMealTypes];
              const customMeals = Object.keys(day.meals).filter(mt => !displayMealTypes.includes(mt));
              const allMealTypesForDay = [...dayMealTypes, ...customMeals];
              
              // Format day label to show date + day number + day name
              const formatDayLabel = () => {
                if (day.date) {
                  const dateObj = new Date(day.date);
                  const dayOfMonth = dateObj.getDate();
                  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  const dayName = dayNames[dateObj.getDay()];
                  const dayNum = actualDayIndex + 1;
                  return `${dayOfMonth} - Day ${dayNum} - ${dayName}`;
                }
                return day.day;
              };

              // Check if this is a freeze recovery day (copied meal at the end)
              const isFreezeRecovery = (day as any).isFreezeRecovery === true;
              const originalFreezeDateLabel = (day as any).originalFreezeDateLabel;
              
              // Check if this day is a frozen day (original day that was frozen - should be blurred)
              const isFrozenDay = (day as any).isFrozen === true;

              return (
                <tr key={day.id} className={`hover:opacity-90 transition-opacity ${isFrozenDay ? 'opacity-40 blur-[1px]' : ''}`}>
                  <td className="border-r border-b border-gray-300 p-5 align-top" style={{ backgroundColor: rowColor }}>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="text-slate-900 font-semibold text-base">{formatDayLabel()}</div>
                        {!readOnly && onRemoveDay && weekPlan.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveDay(actualDayIndex)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title={`Delete Day ${actualDayIndex + 1}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {isFreezeRecovery && originalFreezeDateLabel && (
                        <div className="text-xs text-gray-500 italic">
                          (Freeze Recovery from {originalFreezeDateLabel})
                        </div>
                      )}
                      {isFrozenDay && (
                        <div className="text-xs text-red-500 font-medium">
                          ❄️ Frozen Day
                        </div>
                      )}
                      <DatePicker
                        value={day.date}
                        onChange={(date) => updateDayInfo(actualDayIndex, 'date', date)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs bg-white border-gray-300 hover:border-slate-500 justify-start font-normal text-left"
                        onClick={() => {
                          setNotesDialogDayIndex(actualDayIndex);
                          setNotesDialogValue(day.note || '');
                          setNotesDialogOpen(true);
                        }}
                      >
                        {day.note ? (
                          <span className="truncate">{day.note.substring(0, 20)}{day.note.length > 20 ? '...' : ''}</span>
                        ) : (
                          <span className="text-gray-400">Add notes...</span>
                        )}
                      </Button>
                      {/* Daily Macro Totals */}
                      {(() => {
                        const macros = calculateDayMacros(day);
                        const hasAnyMacros = macros.cal > 0 || macros.carbs > 0 || macros.protein > 0 || macros.fats > 0 || macros.fiber > 0;
                        if (!hasAnyMacros) return null;
                        return (
                          <div className="mt-2 p-2 bg-emerald-50 rounded border border-emerald-200">
                            <div className="text-[10px] font-semibold text-emerald-700 mb-1 uppercase tracking-wide">Daily Totals</div>
                            <div className="grid grid-cols-2 gap-1 text-[10px]">
                              <div className="text-emerald-900"><span className="font-medium">Cal:</span> {macros.cal.toFixed(0)}</div>
                              <div className="text-emerald-900"><span className="font-medium">Carbs:</span> {macros.carbs.toFixed(1)}g</div>
                              <div className="text-emerald-900"><span className="font-medium">Protein:</span> {macros.protein.toFixed(1)}g</div>
                              <div className="text-emerald-900"><span className="font-medium">Fats:</span> {macros.fats.toFixed(1)}g</div>
                              <div className="text-emerald-900 col-span-2"><span className="font-medium">Fiber:</span> {macros.fiber.toFixed(1)}g</div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                  {allMealTypesForDay.map((mealType, index) => {
                    const meal = getMealForDay(actualDayIndex, mealType);
                    const isCustomMeal = !mealTypes.includes(mealType);
                    return (
                      <React.Fragment key={`${day.id}-${mealType}`}>
                        <td
                          className={`border-r border-b border-gray-300 p-4 align-top relative ${dragOverTarget && dragOverTarget.dayIndex === actualDayIndex && dragOverTarget.mealType === mealType ? 'ring-2 ring-green-500 ring-offset-1' : ''}`}
                          style={{ backgroundColor: rowColor }}
                          onDragOver={(e) => handleDragOver(e, actualDayIndex, mealType)}
                          onDragLeave={(e) => handleDragLeave(e, actualDayIndex, mealType)}
                          onDrop={(e) => handleDrop(e, actualDayIndex, mealType)}
                        >
                          {meal && meal.foodOptions.length > 0 ? (
                            <div className="space-y-3">
                              {/* Show meal name for custom meals */}
                              {isCustomMeal && (
                                <div className="text-xs font-semibold text-slate-800 bg-white px-2 py-1 rounded border border-slate-300 mb-1">
                                  {mealType}
                                </div>
                              )}
                              {/* Time Input and Action Buttons */}
                              <div className="flex items-center gap-2">
                                <Input
                                  type="time"
                                  value={meal.time}
                                  onChange={(e) => updateMealTime(actualDayIndex, mealType, e.target.value)}
                                  className="h-9 text-xs flex-1 bg-white border-gray-300 focus:border-slate-500 focus:ring-slate-500 font-mono"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addFoodOption(actualDayIndex, mealType)}
                                  style={{ backgroundColor: '#00A63E', color: 'white', borderColor: '#00A63E' }}
                                  className="h-9 px-3 hover:opacity-90 font-medium"
                                  title="Add alternative food option"
                                >
                                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                                  <span className="text-xs">Alt</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openCopyDialog(actualDayIndex, mealType)}
                                  style={{ backgroundColor: '#00A63E', color: 'white', borderColor: '#00A63E' }}
                                  className="h-9 px-2.5 hover:opacity-90"
                                  title="Copy meal to another day"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                              </div>

                              {/* Food Options */}
                              {meal.foodOptions.map((option, optionIndex) => (
                                <div 
                                  key={option.id} 
                                  className={`food-box border border-gray-300 rounded-md p-3.5 bg-slate-50/50 space-y-2.5 ${option.food ? 'cursor-move' : ''}`}
                                  draggable={!!option.food}
                                  onDragStart={(e) => handleDragStart(e, actualDayIndex, mealType, optionIndex, !!option.food)}
                                  style={{ display: !meal.showAlternatives && optionIndex > 0 ? 'none' : 'block' }}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-slate-700 px-2.5 py-1 bg-white rounded border border-slate-300 uppercase tracking-wider">{option.label}</span>
                                    <div className="flex space-x-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setCurrentFoodContext({ dayIndex: actualDayIndex, mealType, optionIndex });
                                          setFoodDatabaseOpen(true);
                                        }}
                                        className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        title="Add more foods to this meal"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeFoodOption(actualDayIndex, mealType, optionIndex)}
                                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        title="Remove this food option"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Multiple Foods Display */}
                                  {option.foods && option.foods.length > 0 ? (
                                    <div className="space-y-3">
                                      {option.foods.map((foodItem, foodIndex) => (
                                        <div key={foodItem.id} className="bg-white border border-gray-300 rounded-lg p-3 space-y-2 shadow-sm">
                                          {/* Food Name Row */}
                                          <div className="flex items-center justify-between gap-2">
                                            <Input
                                              value={foodItem.food}
                                              onChange={(e) => {
                                                if (readOnly || !onUpdate) return;
                                                const newWeekPlan = [...weekPlan];
                                                const meal = newWeekPlan[actualDayIndex].meals[mealType];
                                                if (meal?.foodOptions[optionIndex]?.foods?.[foodIndex]) {
                                                  meal.foodOptions[optionIndex].foods![foodIndex].food = e.target.value;
                                                  // Update combined food name
                                                  meal.foodOptions[optionIndex].food = meal.foodOptions[optionIndex].foods!.map(f => f.food).join(' + ');
                                                  onUpdate(newWeekPlan);
                                                }
                                              }}
                                              placeholder="Food item"
                                              className="h-9 text-sm bg-white border-gray-300 focus:border-slate-500 focus:ring-slate-500 font-medium flex-1"
                                            />
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                if (readOnly || !onUpdate) return;
                                                const newWeekPlan = [...weekPlan];
                                                const meal = newWeekPlan[actualDayIndex].meals[mealType];
                                                if (meal?.foodOptions[optionIndex]?.foods) {
                                                  meal.foodOptions[optionIndex].foods!.splice(foodIndex, 1);
                                                  const allFoods = meal.foodOptions[optionIndex].foods!;
                                                  if (allFoods.length === 0) {
                                                    // Clear all fields if no foods left
                                                    meal.foodOptions[optionIndex].food = '';
                                                    meal.foodOptions[optionIndex].unit = '';
                                                    meal.foodOptions[optionIndex].cal = '';
                                                    meal.foodOptions[optionIndex].carbs = '';
                                                    meal.foodOptions[optionIndex].fats = '';
                                                    meal.foodOptions[optionIndex].protein = '';
                                                    meal.foodOptions[optionIndex].fiber = '';
                                                    meal.foodOptions[optionIndex].foods = undefined;
                                                  } else {
                                                    // Recalculate totals
                                                    meal.foodOptions[optionIndex].food = allFoods.map(f => f.food).join(' + ');
                                                    meal.foodOptions[optionIndex].unit = allFoods.length > 1 ? 'Multiple' : allFoods[0]?.unit || '';
                                                    meal.foodOptions[optionIndex].cal = allFoods.reduce((sum, f) => sum + (parseFloat(f.cal) || 0), 0).toString();
                                                    meal.foodOptions[optionIndex].carbs = allFoods.reduce((sum, f) => sum + (parseFloat(f.carbs) || 0), 0).toString();
                                                    meal.foodOptions[optionIndex].fats = allFoods.reduce((sum, f) => sum + (parseFloat(f.fats) || 0), 0).toString();
                                                    meal.foodOptions[optionIndex].protein = allFoods.reduce((sum, f) => sum + (parseFloat(f.protein) || 0), 0).toString();
                                                    meal.foodOptions[optionIndex].fiber = allFoods.reduce((sum, f) => sum + (parseFloat(f.fiber) || 0), 0).toString();
                                                  }
                                                  onUpdate(newWeekPlan);
                                                }
                                              }}
                                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                              title="Remove this food"
                                            >
                                              <Minus className="w-4 h-4" />
                                            </Button>
                                          </div>
                                          
                                          {/* Unit and Calories Row */}
                                          <div className="grid grid-cols-2 gap-2">
                                            <Input
                                              value={foodItem.unit}
                                              onChange={(e) => {
                                                if (readOnly || !onUpdate) return;
                                                const newWeekPlan = [...weekPlan];
                                                const meal = newWeekPlan[actualDayIndex].meals[mealType];
                                                if (meal?.foodOptions[optionIndex]?.foods?.[foodIndex]) {
                                                  meal.foodOptions[optionIndex].foods![foodIndex].unit = e.target.value;
                                                  onUpdate(newWeekPlan);
                                                }
                                              }}
                                              placeholder="Unit (e.g., 100g)"
                                              className="h-9 text-xs bg-gray-50 border-gray-300"
                                            />
                                            <Input
                                              value={foodItem.cal}
                                              onChange={(e) => {
                                                if (readOnly || !onUpdate) return;
                                                const newWeekPlan = [...weekPlan];
                                                const meal = newWeekPlan[actualDayIndex].meals[mealType];
                                                if (meal?.foodOptions[optionIndex]?.foods?.[foodIndex]) {
                                                  meal.foodOptions[optionIndex].foods![foodIndex].cal = e.target.value;
                                                  const allFoods = meal.foodOptions[optionIndex].foods!;
                                                  meal.foodOptions[optionIndex].cal = allFoods.reduce((sum, f) => sum + (parseFloat(f.cal) || 0), 0).toString();
                                                  onUpdate(newWeekPlan);
                                                }
                                              }}
                                              placeholder="Calories"
                                              type="number"
                                              className="h-9 text-xs bg-gray-50 border-gray-300 font-mono"
                                            />
                                          </div>
                                          
                                          {/* Carbs and Fats Row */}
                                          <div className="grid grid-cols-2 gap-2">
                                            <Input
                                              value={foodItem.carbs}
                                              onChange={(e) => {
                                                if (readOnly || !onUpdate) return;
                                                const newWeekPlan = [...weekPlan];
                                                const meal = newWeekPlan[actualDayIndex].meals[mealType];
                                                if (meal?.foodOptions[optionIndex]?.foods?.[foodIndex]) {
                                                  meal.foodOptions[optionIndex].foods![foodIndex].carbs = e.target.value;
                                                  const allFoods = meal.foodOptions[optionIndex].foods!;
                                                  meal.foodOptions[optionIndex].carbs = allFoods.reduce((sum, f) => sum + (parseFloat(f.carbs) || 0), 0).toString();
                                                  onUpdate(newWeekPlan);
                                                }
                                              }}
                                              placeholder="Carbs (g)"
                                              type="number"
                                              className="h-9 text-xs bg-gray-50 border-gray-300 font-mono"
                                            />
                                            <Input
                                              value={foodItem.fats}
                                              onChange={(e) => {
                                                if (readOnly || !onUpdate) return;
                                                const newWeekPlan = [...weekPlan];
                                                const meal = newWeekPlan[actualDayIndex].meals[mealType];
                                                if (meal?.foodOptions[optionIndex]?.foods?.[foodIndex]) {
                                                  meal.foodOptions[optionIndex].foods![foodIndex].fats = e.target.value;
                                                  const allFoods = meal.foodOptions[optionIndex].foods!;
                                                  meal.foodOptions[optionIndex].fats = allFoods.reduce((sum, f) => sum + (parseFloat(f.fats) || 0), 0).toString();
                                                  onUpdate(newWeekPlan);
                                                }
                                              }}
                                              placeholder="Fats (g)"
                                              type="number"
                                              className="h-9 text-xs bg-gray-50 border-gray-300 font-mono"
                                            />
                                          </div>
                                          
                                          {/* Protein and Fiber Row */}
                                          <div className="grid grid-cols-2 gap-2">
                                            <Input
                                              value={foodItem.protein}
                                              onChange={(e) => {
                                                if (readOnly || !onUpdate) return;
                                                const newWeekPlan = [...weekPlan];
                                                const meal = newWeekPlan[actualDayIndex].meals[mealType];
                                                if (meal?.foodOptions[optionIndex]?.foods?.[foodIndex]) {
                                                  meal.foodOptions[optionIndex].foods![foodIndex].protein = e.target.value;
                                                  const allFoods = meal.foodOptions[optionIndex].foods!;
                                                  meal.foodOptions[optionIndex].protein = allFoods.reduce((sum, f) => sum + (parseFloat(f.protein) || 0), 0).toString();
                                                  onUpdate(newWeekPlan);
                                                }
                                              }}
                                              placeholder="Protein (g)"
                                              type="number"
                                              className="h-9 text-xs bg-gray-50 border-gray-300 font-mono"
                                            />
                                            <Input
                                              value={foodItem.fiber}
                                              onChange={(e) => {
                                                if (readOnly || !onUpdate) return;
                                                const newWeekPlan = [...weekPlan];
                                                const meal = newWeekPlan[actualDayIndex].meals[mealType];
                                                if (meal?.foodOptions[optionIndex]?.foods?.[foodIndex]) {
                                                  meal.foodOptions[optionIndex].foods![foodIndex].fiber = e.target.value;
                                                  const allFoods = meal.foodOptions[optionIndex].foods!;
                                                  meal.foodOptions[optionIndex].fiber = allFoods.reduce((sum, f) => sum + (parseFloat(f.fiber) || 0), 0).toString();
                                                  onUpdate(newWeekPlan);
                                                }
                                              }}
                                              placeholder="Fiber (g)"
                                              type="number"
                                              className="h-9 text-xs bg-gray-50 border-gray-300 font-mono"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    /* Single Food Display (backward compatible) */
                                    <>
                                      <div className='flex gap-1 items-center justify-between'>
                                        <Input
                                        value={option.food}
                                        onChange={(e) => updateFoodOption(actualDayIndex, mealType, optionIndex, 'food', e.target.value)}
                                        placeholder="Food item"
                                        className="h-9 text-xs bg-white border-gray-300 focus:border-slate-500 focus:ring-slate-500 font-medium"
                                      />
                                      </div>

                                      
                                      <div className="grid grid-cols-2 gap-2">
                                        <Input
                                          value={option.unit}
                                          onChange={(e) => updateFoodOption(actualDayIndex, mealType, optionIndex, 'unit', e.target.value)}
                                          placeholder="Unit (e.g., 100g)"
                                          className="h-9 text-xs bg-white border-gray-300 focus:border-slate-500 focus:ring-slate-500"
                                        />
                                        <Input
                                          value={option.cal}
                                          onChange={(e) => updateFoodOption(actualDayIndex, mealType, optionIndex, 'cal', e.target.value)}
                                          placeholder="Calories"
                                          type="number"
                                          className="h-9 text-xs bg-white border-gray-300 focus:border-slate-500 focus:ring-slate-500 font-mono"
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <Input
                                          value={option.carbs}
                                          onChange={(e) => updateFoodOption(actualDayIndex, mealType, optionIndex, 'carbs', e.target.value)}
                                          placeholder="Carbs (g)"
                                          type="number"
                                          className="h-9 text-xs bg-white border-gray-300 focus:border-slate-500 focus:ring-slate-500 font-mono"
                                        />
                                        <Input
                                          value={option.fats}
                                          onChange={(e) => updateFoodOption(actualDayIndex, mealType, optionIndex, 'fats', e.target.value)}
                                          placeholder="Fats (g)"
                                          type="number"
                                          className="h-9 text-xs bg-white border-gray-300 focus:border-slate-500 focus:ring-slate-500 font-mono"
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <Input
                                          value={option.protein}
                                          onChange={(e) => updateFoodOption(actualDayIndex, mealType, optionIndex, 'protein', e.target.value)}
                                          placeholder="Protein (g)"
                                          type="number"
                                          className="h-9 text-xs bg-white border-gray-300 focus:border-slate-500 focus:ring-slate-500 font-mono"
                                        />
                                        <Input
                                          value={option.fiber}
                                          onChange={(e) => updateFoodOption(actualDayIndex, mealType, optionIndex, 'fiber', e.target.value)}
                                          placeholder="Fiber (g)"
                                          type="number"
                                          className="h-9 text-xs bg-white border-gray-300 focus:border-slate-500 focus:ring-slate-500 font-mono"
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addMealToCell(actualDayIndex, mealType)}
                                className="w-full h-20 border-2 border-dashed border-gray-400 hover:border-slate-600 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all font-medium"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add {mealType}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Ensure base option exists
                                  addMealToCell(actualDayIndex, mealType);
                                  // Add second alternative if only one currently
                                  setTimeout(() => {
                                    const mealObj = weekPlan[actualDayIndex].meals[mealType];
                                    if (mealObj && mealObj.foodOptions.length === 1) {
                                      addFoodOption(actualDayIndex, mealType);
                                    } else if (mealObj && mealObj.foodOptions.length === 0) {
                                      // Safety: if still zero, add two
                                      addFoodOption(actualDayIndex, mealType);
                                      addFoodOption(actualDayIndex, mealType);
                                    }
                                  }, 0);
                                }}
                                style={{ backgroundColor: '#C2E66E', borderColor: '#00A63E' }}
                                className="w-full h-12 border-2 border-dashed hover:opacity-90 text-slate-900 font-medium"
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Add with Alternatives
                              </Button>
                            </div>
                          )}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  {/* Empty cell for Add Meal Type column (match row background) */}
                  <td className="border-b border-gray-300" style={{ backgroundColor: rowColor }}></td>
                </tr>
              );
            })}
            {/* Add Day Row */}
            <tr className="bg-slate-100/50">
              <td className="border-r border-b border-gray-300 p-5 align-top">
                <div className="space-y-2.5">
                  <div className="text-slate-800 font-semibold tracking-wide uppercase text-xs flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5" />
                    Add Day
                  </div>
                  <Button
                    variant="outline"
                    onClick={addNewDay}
                    className="w-full h-10 text-xs bg-white border-2 border-dashed border-slate-400 hover:border-slate-600 hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-medium"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Day
                  </Button>
                </div>
              </td>
              {displayMealTypes.map((mealType, index) => (
                <React.Fragment key={`add-${mealType}`}>
                  <td className="border-r border-b border-gray-300 bg-slate-100/30"></td>
                </React.Fragment>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Bottom Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-4 bg-white border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage === 0}
            className="h-9 px-4 border-gray-300 hover:bg-slate-100 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i}
                variant={currentPage === i ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(i)}
                className={`h-9 w-9 p-0 ${
                  currentPage === i 
                    ? 'bg-slate-900 text-white hover:bg-slate-800' 
                    : 'border-gray-300 hover:bg-slate-100'
                }`}
              >
                {i + 1}
              </Button>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage >= totalPages - 1}
            className="h-9 px-4 border-gray-300 hover:bg-slate-100 disabled:opacity-50"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          
          <span className="text-sm text-slate-600 ml-4">
            Days {startIndex + 1}-{endIndex} of {weekPlan.length}
          </span>
        </div>
      )}

      {/* Copy Meal Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="sm:max-w-2xl border-gray-300 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-semibold">Copy Meal Plan</DialogTitle>
            <DialogDescription className="text-slate-600">
              Select the days and meal types where you want to copy this meal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-slate-900 font-semibold text-sm">Target Days</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={selectAllDays}
                  className="h-8 text-xs border-gray-300 hover:bg-slate-50 font-medium"
                >
                  {selectedDays.length === weekPlan.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 border-2 border-gray-300 rounded-md bg-slate-50 max-h-60 overflow-y-auto">
                {weekPlan.map((day, index) => (
                  <div key={day.id} className="flex items-center space-x-2.5">
                    <Checkbox
                      id={`day-${index}`}
                      checked={selectedDays.includes(index)}
                      onCheckedChange={() => toggleDaySelection(index)}
                      className="border-gray-400"
                    />
                    <label
                      htmlFor={`day-${index}`}
                      className="text-sm cursor-pointer text-slate-700 font-medium"
                    >
                      {day.day}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-slate-900 font-semibold text-sm">Target Meal Types</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={selectAllMeals}
                  className="h-8 text-xs border-gray-300 hover:bg-slate-50 font-medium"
                >
                  {selectedMeals.length === mealTypes.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 border-2 border-gray-300 rounded-md bg-slate-50">
                {mealTypes.map((mealType) => (
                  <div key={mealType} className="flex items-center space-x-2.5">
                    <Checkbox
                      id={`meal-${mealType}`}
                      checked={selectedMeals.includes(mealType)}
                      onCheckedChange={() => toggleMealSelection(mealType)}
                      className="border-gray-400"
                    />
                    <label
                      htmlFor={`meal-${mealType}`}
                      className="text-sm cursor-pointer text-slate-700 font-medium"
                    >
                      {mealType}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {selectedDays.length > 0 && selectedMeals.length > 0 && (
              <div className="p-4 bg-slate-100 border-2 border-slate-300 rounded-md">
                <p className="text-sm text-slate-900 font-medium">
                  This meal will be copied to <span className="font-bold">{selectedDays.length} day(s)</span> × <span className="font-bold">{selectedMeals.length} meal type(s)</span> = <span className="font-bold">{selectedDays.length * selectedMeals.length} total meal(s)</span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)} className="border-gray-300 hover:bg-slate-50 font-medium">
              Cancel
            </Button>
            <Button 
              onClick={handleCopyMeal}
              disabled={selectedDays.length === 0 || selectedMeals.length === 0}
              style={{ backgroundColor: '#00A63E', color: 'white' }}
              className="hover:opacity-90 shadow font-medium"
            >
              Copy to {selectedDays.length * selectedMeals.length} Meal{selectedDays.length * selectedMeals.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Meal Type Dialog */}
      <Dialog open={addMealTypeDialogOpen} onOpenChange={setAddMealTypeDialogOpen}>
        <DialogContent className="sm:max-w-2xl border-gray-300 shadow-xl" style={{ zIndex: 200 }}>
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-semibold">Add New Meal</DialogTitle>
            <DialogDescription className="text-slate-600">
              Enter the meal name and time. This meal will be added to all days and ordered by time in the header.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-3">
              <Label className="text-slate-900 font-semibold text-sm">Meal Name</Label>
              <Input
                value={newMealTypeName}
                onChange={(e) => setNewMealTypeName(e.target.value)}
                placeholder="e.g., Pre-Workout Snack"
                className="h-9 text-xs bg-white border-gray-300 focus:border-slate-500 focus:ring-slate-500 font-medium"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-slate-900 font-semibold text-sm">Meal Time</Label>
              <Input
                type="time"
                value={newMealTime}
                onChange={(e) => setNewMealTime(e.target.value)}
                className="h-9 text-xs bg-white border-gray-300 focus:border-slate-500 focus:ring-slate-500 font-medium"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddMealTypeDialogOpen(false); setNewMealTypeName(''); setNewMealTime(''); }} className="border-gray-300 hover:bg-slate-50 font-medium">
              Cancel
            </Button>
            <Button 
              onClick={handleAddMealType}
              disabled={!newMealTypeName.trim()}
              style={{ backgroundColor: '#00A63E', color: 'white' }}
              className="hover:opacity-90 shadow font-medium"
            >
              Add Meal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Find & Replace Dialog */}
      <Dialog open={findReplaceDialogOpen} onOpenChange={(open) => { if (!open) resetFindReplaceDialog(); else setFindReplaceDialogOpen(true); }}>
        <DialogContent className="sm:max-w-2xl border-gray-300 shadow-xl max-h-[90vh] overflow-y-auto" style={{ zIndex: 210 }}>
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-semibold">Find & Replace/Delete Foods</DialogTitle>
            <DialogDescription className="text-slate-600">
              Find a food by name or recipe and replace or delete it across selected days and meal types.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Find Section */}
            <div className="space-y-3 p-3 border rounded-lg bg-slate-50">
              <Label className="text-slate-900 font-semibold text-sm">🔍 Find Food / Recipe</Label>
              
              {/* Searchable input with dropdown */}
              <div className="relative">
                <Input
                  value={findSearchFilter}
                  onChange={e => {
                    setFindSearchFilter(e.target.value);
                    setShowFindDropdown(true);
                    // Clear selected value when typing
                    if (findFoodTarget || findRecipeSearch) {
                      setFindFoodTarget('');
                      setFindRecipeSearch('');
                    }
                  }}
                  onFocus={() => setShowFindDropdown(true)}
                  placeholder="Search recipe or food name..."
                  className="h-10 text-sm bg-white border-gray-300"
                />
                
                {/* Dropdown with filtered results */}
                {showFindDropdown && findSearchFilter && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {/* Existing foods in plan */}
                    {availableFoods.filter(f => f.toLowerCase().includes(findSearchFilter.toLowerCase())).length > 0 && (
                      <div className="p-2 bg-gray-50 border-b">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase">Foods in Current Plan</span>
                      </div>
                    )}
                    {availableFoods
                      .filter(f => f.toLowerCase().includes(findSearchFilter.toLowerCase()))
                      .slice(0, 5)
                      .map(f => (
                        <div
                          key={`find-food-${f}`}
                          className="px-3 py-2 hover:bg-emerald-50 cursor-pointer text-sm border-b border-gray-100"
                          onClick={() => {
                            setFindFoodTarget(f);
                            setFindSearchFilter(f);
                            setFindRecipeSearch('');
                            setManualFindFoodName('');
                            setShowFindDropdown(false);
                          }}
                        >
                          <span className="text-emerald-700">📋</span> {f}
                        </div>
                      ))
                    }
                    
                    {/* Recipes from database */}
                    {recipes.filter(r => r.name.toLowerCase().includes(findSearchFilter.toLowerCase())).length > 0 && (
                      <div className="p-2 bg-gray-50 border-b">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase">Recipes Database</span>
                      </div>
                    )}
                    {recipes
                      .filter(r => r.name.toLowerCase().includes(findSearchFilter.toLowerCase()))
                      .slice(0, 10)
                      .map(r => (
                        <div
                          key={`find-recipe-${r._id}`}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100"
                          onClick={() => {
                            setFindRecipeSearch(r.name);
                            setFindSearchFilter(r.name);
                            setFindFoodTarget('');
                            setManualFindFoodName('');
                            setShowFindDropdown(false);
                          }}
                        >
                          <span className="text-blue-600">🍽️</span> {r.name}
                        </div>
                      ))
                    }
                    
                    {/* No results */}
                    {availableFoods.filter(f => f.toLowerCase().includes(findSearchFilter.toLowerCase())).length === 0 &&
                     recipes.filter(r => r.name.toLowerCase().includes(findSearchFilter.toLowerCase())).length === 0 && (
                      <div className="px-3 py-3 text-sm text-gray-500 text-center">
                        No matching foods or recipes found
                      </div>
                    )}
                    
                    {/* Use as manual entry option */}
                    <div
                      className="px-3 py-2 hover:bg-yellow-50 cursor-pointer text-sm bg-yellow-25 border-t"
                      onClick={() => {
                        setManualFindFoodName(findSearchFilter);
                        setFindFoodTarget('');
                        setFindRecipeSearch('');
                        setShowFindDropdown(false);
                      }}
                    >
                      <span className="text-yellow-600">✏️</span> Use "{findSearchFilter}" as search term
                    </div>
                  </div>
                )}
              </div>

              {/* Show selected find value */}
              {(findFoodTarget || findRecipeSearch || manualFindFoodName) && (
                <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200 flex items-center justify-between">
                  <span><strong>Finding:</strong> {findFoodTarget || findRecipeSearch || manualFindFoodName}</span>
                  <button
                    onClick={() => {
                      setFindFoodTarget('');
                      setFindRecipeSearch('');
                      setManualFindFoodName('');
                      setFindSearchFilter('');
                    }}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Action Selection */}
            <div className="space-y-2">
              <Label className="text-slate-900 font-semibold text-sm">Action</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="replaceAction"
                    checked={replaceAction === 'replace'}
                    onChange={() => setReplaceAction('replace')}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span className="text-sm font-medium">Replace with another food</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="replaceAction"
                    checked={replaceAction === 'delete'}
                    onChange={() => setReplaceAction('delete')}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm font-medium text-red-600">Delete found items</span>
                </label>
              </div>
            </div>

            {/* Replace Section - Only show if action is replace */}
            {replaceAction === 'replace' && (
              <div className="space-y-3 p-3 border rounded-lg bg-blue-50">
                <Label className="text-slate-900 font-semibold text-sm">🔄 Replace With</Label>
                
                {/* Searchable input with dropdown */}
                <div className="relative">
                  <Input
                    value={replaceSearchFilter}
                    onChange={e => {
                      setReplaceSearchFilter(e.target.value);
                      setShowReplaceDropdown(true);
                      // Clear selected value when typing
                      if (replaceRecipeSearch || replaceFoodValue) {
                        setReplaceRecipeSearch('');
                        setReplaceFoodValue('');
                      }
                    }}
                    onFocus={() => setShowReplaceDropdown(true)}
                    placeholder="Search recipe to replace with..."
                    className="h-10 text-sm bg-white border-gray-300"
                  />
                  
                  {/* Dropdown with filtered results */}
                  {showReplaceDropdown && replaceSearchFilter && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {/* Recipes from database */}
                      {recipes.filter(r => r.name.toLowerCase().includes(replaceSearchFilter.toLowerCase())).length > 0 && (
                        <div className="p-2 bg-gray-50 border-b">
                          <span className="text-[10px] font-semibold text-gray-500 uppercase">Recipes Database</span>
                        </div>
                      )}
                      {recipes
                        .filter(r => r.name.toLowerCase().includes(replaceSearchFilter.toLowerCase()))
                        .slice(0, 15)
                        .map(r => (
                          <div
                            key={`replace-recipe-${r._id}`}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100"
                            onClick={() => {
                              setReplaceRecipeSearch(r.name);
                              setReplaceSearchFilter(r.name);
                              setReplaceFoodValue('');
                              setShowReplaceDropdown(false);
                            }}
                          >
                            <span className="text-blue-600">🍽️</span> {r.name}
                          </div>
                        ))
                      }
                      
                      {/* No results */}
                      {recipes.filter(r => r.name.toLowerCase().includes(replaceSearchFilter.toLowerCase())).length === 0 && (
                        <div className="px-3 py-3 text-sm text-gray-500 text-center">
                          No matching recipes found
                        </div>
                      )}
                      
                      {/* Use as manual entry option */}
                      <div
                        className="px-3 py-2 hover:bg-yellow-50 cursor-pointer text-sm bg-yellow-25 border-t"
                        onClick={() => {
                          setReplaceFoodValue(replaceSearchFilter);
                          setReplaceRecipeSearch('');
                          setShowReplaceDropdown(false);
                        }}
                      >
                        <span className="text-yellow-600">✏️</span> Use "{replaceSearchFilter}" as replacement
                      </div>
                    </div>
                  )}
                </div>

                {/* Show selected replace value */}
                {(replaceRecipeSearch || replaceFoodValue) && (
                  <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded border border-blue-200 flex items-center justify-between">
                    <span><strong>Replacing with:</strong> {replaceRecipeSearch || replaceFoodValue}</span>
                    <button
                      onClick={() => {
                        setReplaceRecipeSearch('');
                        setReplaceFoodValue('');
                        setReplaceSearchFilter('');
                      }}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Delete Warning */}
            {replaceAction === 'delete' && (
              <div className="p-3 border border-red-300 rounded-lg bg-red-50">
                <p className="text-sm text-red-700 font-medium">⚠️ Delete Mode</p>
                <p className="text-xs text-red-600">Found items will be permanently removed from the selected days and meal types.</p>
              </div>
            )}

            {/* Meal Types Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-900 font-semibold text-sm">Meal Types</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMealTypesForReplace(selectedMealTypesForReplace.length === displayMealTypes.length ? [] : [...displayMealTypes])}
                  className="h-6 text-xs"
                >
                  {selectedMealTypesForReplace.length === displayMealTypes.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 p-3 border rounded-md bg-slate-50">
                {displayMealTypes.map(mt => (
                  <div key={`fr-mt-${mt}`} className="flex items-center space-x-2">
                    <Checkbox
                      id={`fr-mt-${mt}`}
                      checked={selectedMealTypesForReplace.includes(mt)}
                      onCheckedChange={() => toggleReplaceMealType(mt)}
                    />
                    <Label htmlFor={`fr-mt-${mt}`} className="text-xs font-medium cursor-pointer">{mt}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Days Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-900 font-semibold text-sm">Select Days</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDaysForReplace(selectedDaysForReplace.length === weekPlan.length ? [] : weekPlan.map((_, i) => i))}
                  className="h-6 text-xs"
                >
                  {selectedDaysForReplace.length === weekPlan.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 p-3 border rounded-md bg-slate-50 max-h-40 overflow-y-auto">
                {weekPlan.map((day, idx) => (
                  <div key={day.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`fr-day-${idx}`}
                      checked={selectedDaysForReplace.includes(idx)}
                      onCheckedChange={() => toggleReplaceDay(idx)}
                    />
                    <Label htmlFor={`fr-day-${idx}`} className="text-xs font-medium cursor-pointer">{day.day}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            {selectedDaysForReplace.length > 0 && selectedMealTypesForReplace.length > 0 && (findFoodTarget || findRecipeSearch || manualFindFoodName) && (
              <div className="p-3 bg-slate-100 border rounded-md">
                <p className="text-sm text-slate-800">
                  Will {replaceAction === 'delete' ? <span className="text-red-600 font-semibold">DELETE</span> : <span className="text-emerald-600 font-semibold">REPLACE</span>}{' '}
                  "<strong>{findFoodTarget || findRecipeSearch || manualFindFoodName}</strong>" 
                  {replaceAction === 'replace' && (replaceRecipeSearch || replaceFoodValue) && (
                    <> with "<strong>{replaceRecipeSearch || replaceFoodValue}</strong>"</>
                  )}
                  {' '}in <strong>{selectedDaysForReplace.length}</strong> day(s) × <strong>{selectedMealTypesForReplace.length}</strong> meal type(s)
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetFindReplaceDialog} className="border-gray-300 hover:bg-slate-50 font-medium">
              Cancel
            </Button>
            <Button
              onClick={handleFindReplace}
              disabled={
                !(findFoodTarget || manualFindFoodName.trim() || findRecipeSearch) || 
                (replaceAction === 'replace' && !(replaceFoodValue.trim() || replaceRecipeSearch)) || 
                selectedDaysForReplace.length === 0 || 
                selectedMealTypesForReplace.length === 0
              }
              style={{ backgroundColor: replaceAction === 'delete' ? '#dc2626' : '#00A63E', color: 'white' }}
              className="hover:opacity-90 shadow font-medium"
            >
              {replaceAction === 'delete' ? '🗑️ Delete' : '🔄 Replace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Food Database Panel */}
      <FoodDatabasePanel
        isOpen={foodDatabaseOpen}
        onClose={() => setFoodDatabaseOpen(false)}
        clientDietaryRestrictions={clientDietaryRestrictions}
        clientMedicalConditions={clientMedicalConditions}
        clientAllergies={clientAllergies}
  onSelectFood={(foods: FoodDatabaseItem[]) => {
          if (currentFoodContext && foods.length > 0) {
            const { dayIndex, mealType, optionIndex } = currentFoodContext;
            
            if (readOnly || !onUpdate) return;
            
            const newWeekPlan = [...weekPlan];
            const meal = newWeekPlan[dayIndex].meals[mealType];
            
            if (meal && meal.foodOptions[optionIndex]) {
              const option = meal.foodOptions[optionIndex];
              
              // Initialize foods array if not present
              if (!option.foods) {
                option.foods = [];
                // If there's existing primary food, add it to the array first
                if (option.food && option.food.trim()) {
                  option.foods.push({
                    id: Math.random().toString(36).substr(2, 9),
                    food: option.food,
                    unit: option.unit,
                    cal: option.cal,
                    carbs: option.carbs,
                    fats: option.fats,
                    protein: option.protein,
                    fiber: option.fiber,
                    recipeUuid: option.recipeUuid
                  });
                }
              }
              
              // Add all selected foods to the foods array
              foods.forEach((food) => {
                option.foods!.push({
                  id: Math.random().toString(36).substr(2, 9),
                  food: food.menu,
                  unit: food.amount,
                  cal: food.cals.toString(),
                  carbs: food.carbs.toString(),
                  fats: food.fats.toString(),
                  protein: food.protein.toString(),
                  fiber: '',
                  recipeUuid: food.recipeUuid
                });
              });
              
              // Update the primary fields to show combined info
              const allFoods = option.foods!;
              option.food = allFoods.map(f => f.food).join(' + ');
              option.unit = allFoods.length > 1 ? 'Multiple' : allFoods[0]?.unit || '';
              option.cal = allFoods.reduce((sum, f) => sum + (parseFloat(f.cal) || 0), 0).toString();
              option.carbs = allFoods.reduce((sum, f) => sum + (parseFloat(f.carbs) || 0), 0).toString();
              option.fats = allFoods.reduce((sum, f) => sum + (parseFloat(f.fats) || 0), 0).toString();
              option.protein = allFoods.reduce((sum, f) => sum + (parseFloat(f.protein) || 0), 0).toString();
              option.fiber = allFoods.reduce((sum, f) => sum + (parseFloat(f.fiber) || 0), 0).toString();
              
              onUpdate(newWeekPlan);
            }
          }
        }}
      />

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Day Notes</DialogTitle>
            <DialogDescription>
              Add notes for this day. Press Enter to go to the next line.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={notesDialogValue}
              onChange={(e) => setNotesDialogValue(e.target.value)}
              placeholder="Enter notes here..."
              className="min-h-37.5 resize-y"
              autoFocus
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setNotesDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (notesDialogDayIndex !== null) {
                  updateDayInfo(notesDialogDayIndex, 'note', notesDialogValue);
                }
                setNotesDialogOpen(false);
              }}
            >
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}