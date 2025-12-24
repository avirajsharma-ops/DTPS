import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, X, Minus, Copy, ChevronLeft, ChevronRight, Check, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { DayPlan, Meal, FoodOption } from './DietPlanDashboard';
import { FoodDatabasePanel } from './FoodSheet';
// Define FoodItem shape to type foods parameter from FoodDatabasePanel selection
type FoodItem = {
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
import { useState, useRef } from 'react';
import React from 'react';

type MealGridTableProps = {
  weekPlan: DayPlan[];
  mealTypes: string[];
  onUpdate?: (weekPlan: DayPlan[]) => void;
  onAddMealType?: (mealType: string, position?: number) => void;
  onRemoveMealType?: (mealType: string) => void;
  onRemoveDay?: (dayIndex: number) => void;
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

export function MealGridTable({ weekPlan, mealTypes, onUpdate, onAddMealType, onRemoveMealType, onRemoveDay, readOnly = false, clientDietaryRestrictions = '', clientMedicalConditions = '', clientAllergies = '', holdDays = [], totalHeldDays = 0 }: MealGridTableProps) {
  // Debug logging
  console.log('MealGridTable render - weekPlan days:', weekPlan.length);
  console.log('MealGridTable render - first day meals:', weekPlan[0]?.meals ? Object.keys(weekPlan[0].meals) : 'none');
  console.log('MealGridTable render - holdDays:', holdDays?.length || 0, 'totalHeldDays:', totalHeldDays);
  if (weekPlan[0]?.meals) {
    const firstMealType = Object.keys(weekPlan[0].meals)[0];
    if (firstMealType) {
      console.log('MealGridTable render - first meal data:', JSON.stringify(weekPlan[0].meals[firstMealType]).slice(0, 200));
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

  const totalPages = Math.ceil(weekPlan.length / DAYS_PER_PAGE);
  const startIndex = currentPage * DAYS_PER_PAGE;
  const endIndex = Math.min(startIndex + DAYS_PER_PAGE, weekPlan.length);
  const paginatedDays = weekPlan.slice(startIndex, endIndex);

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
      console.log(`getMealForDay(${dayIndex}, ${mealType}):`, meal ? `found with ${meal.foodOptions?.length || 0} options` : 'null');
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
    field: keyof FoodOption,
    value: string
  ) => {
    if (readOnly || !onUpdate) return;
    const newWeekPlan = [...weekPlan];
    const meal = newWeekPlan[dayIndex].meals[mealType];
    if (meal && meal.foodOptions[optionIndex]) {
      meal.foodOptions[optionIndex][field] = value;
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
  const findValue = (findFoodTarget || manualFindFoodName).trim();
    const replaceValue = replaceFoodValue.trim();
    if (!findValue || !replaceValue || selectedDaysForReplace.length === 0 || selectedMealTypesForReplace.length === 0) return;
    const newWeekPlan = weekPlan.map((d, idx) => {
      if (!selectedDaysForReplace.includes(idx)) return d;
      const day = { ...d, meals: { ...d.meals } };
      Object.keys(day.meals).forEach(mt => {
        if (!selectedMealTypesForReplace.includes(mt)) return;
        const meal = day.meals[mt];
        meal.foodOptions = meal.foodOptions.map(opt =>
          opt.food.trim().toLowerCase() === findValue.toLowerCase()
            ? { ...opt, food: replaceValue }
            : opt
        );
      });
      return day;
    });
    onUpdate(newWeekPlan);
    setFindReplaceDialogOpen(false);
    setFindFoodTarget('');
    setReplaceFoodValue('');
    setSelectedDaysForReplace([]);
    setSelectedMealTypesForReplace([]);
  setManualFindFoodName('');
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
                      <Input
                        value={day.note}
                        onChange={(e) => updateDayInfo(actualDayIndex, 'note', e.target.value)}
                        className="h-9 text-xs bg-white border-gray-300 focus:border-slate-500 focus:ring-slate-500"
                        placeholder="Notes"
                      />
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
                                        onClick={() => removeFoodOption(actualDayIndex, mealType, optionIndex)}
                                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        title="Remove this food option"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  <div className='flex gap-1 items-center justify-between'>
                                    <Input
                                    value={option.food}
                                    onChange={(e) => updateFoodOption(actualDayIndex, mealType, optionIndex, 'food', e.target.value)}
                                    placeholder="Food item"
                                    className="h-9 text-xs bg-white border-gray-300 focus:border-slate-500 focus:ring-slate-500 font-medium"
                                  />
                                 <Plus  
                                    className="w-4 h-4 cursor-pointer hover:text-blue-600 transition-colors" 
                                    onClick={() => {
                                      setCurrentFoodContext({ dayIndex: actualDayIndex, mealType, optionIndex });
                                      setFoodDatabaseOpen(true);
                                    }}
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
      <Dialog open={findReplaceDialogOpen} onOpenChange={setFindReplaceDialogOpen}>
        <DialogContent className="sm:max-w-2xl border-gray-300 shadow-xl" style={{ zIndex: 210 }}>
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-semibold">Find & Replace Foods</DialogTitle>
            <DialogDescription className="text-slate-600">
              Replace a food across selected days. Matches are case-insensitive exact name matches.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-slate-900 font-semibold text-sm">Find Food</Label>
              <Select value={findFoodTarget} onValueChange={setFindFoodTarget}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select existing food" />
                </SelectTrigger>
                <SelectContent>
                  {availableFoods.length === 0 && <SelectItem value="" disabled>No foods present</SelectItem>}
                  {availableFoods.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-3 space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Or enter food name</Label>
                <Input
                  value={manualFindFoodName}
                  onChange={e => setManualFindFoodName(e.target.value)}
                  placeholder="Type food to find"
                  className="h-8 text-xs bg-white border-gray-300"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-900 font-semibold text-sm">Replace With</Label>
              <Input
                value={replaceFoodValue}
                onChange={e => setReplaceFoodValue(e.target.value)}
                placeholder="Enter new food name"
                className="h-9 text-xs bg-white border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-900 font-semibold text-sm">Meal Types</Label>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-slate-50">
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
            <div className="space-y-2">
              <Label className="text-slate-900 font-semibold text-sm">Select Days</Label>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-slate-50 max-h-48 overflow-y-auto">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFindReplaceDialogOpen(false); setFindFoodTarget(''); setReplaceFoodValue(''); setSelectedDaysForReplace([]); }} className="border-gray-300 hover:bg-slate-50 font-medium">Cancel</Button>
            <Button
              onClick={handleFindReplace}
              disabled={!(findFoodTarget || manualFindFoodName.trim()) || !replaceFoodValue.trim() || selectedDaysForReplace.length === 0 || selectedMealTypesForReplace.length === 0}
              style={{ backgroundColor: '#00A63E', color: 'white' }}
              className="hover:opacity-90 shadow font-medium"
            >
              Replace
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
  onSelectFood={(foods: FoodItem[]) => {
          if (currentFoodContext) {
            const { dayIndex, mealType, optionIndex } = currentFoodContext;
            
            // Update the first food in the current option
            if (foods.length > 0) {
              const firstFood = foods[0];
              updateFoodOption(dayIndex, mealType, optionIndex, 'food', firstFood.menu);
              updateFoodOption(dayIndex, mealType, optionIndex, 'unit', firstFood.amount);
              updateFoodOption(dayIndex, mealType, optionIndex, 'cal', firstFood.cals.toString());
              updateFoodOption(dayIndex, mealType, optionIndex, 'carbs', firstFood.carbs.toString());
              updateFoodOption(dayIndex, mealType, optionIndex, 'fats', firstFood.fats.toString());
              updateFoodOption(dayIndex, mealType, optionIndex, 'protein', firstFood.protein.toString());
              // Add recipeUuid if available
              if (firstFood.recipeUuid) {
                const newWeekPlan = [...weekPlan];
                const meal = newWeekPlan[dayIndex].meals[mealType];
                if (meal && meal.foodOptions[optionIndex]) {
                  meal.foodOptions[optionIndex].recipeUuid = firstFood.recipeUuid;
                  onUpdate?.(newWeekPlan);
                }
              }
            }
            
            // Create new boxes for additional selected foods
            if (foods.length > 1 && onUpdate && !readOnly) {
              const newWeekPlan = [...weekPlan];
              const meal = newWeekPlan[dayIndex].meals[mealType];
              
              if (meal) {
                for (let i = 1; i < foods.length; i++) {
                  const food = foods[i];
                  const nextLetter = String.fromCharCode(65 + meal.foodOptions.length);
                  meal.foodOptions.push({
                    id: Math.random().toString(36).substr(2, 9),
                    label: `${nextLetter} Food`,
                    food: food.menu,
                    unit: food.amount,
                    cal: food.cals.toString(),
                    carbs: food.carbs.toString(),
                    fats: food.fats.toString(),
                    protein: food.protein.toString(),
                    fiber: '',
                    recipeUuid: food.recipeUuid // Include recipe UUID
                  });
                }
                onUpdate(newWeekPlan);
              }
            }
          }
        }}
      />
      </div>
    </div>
  );
}