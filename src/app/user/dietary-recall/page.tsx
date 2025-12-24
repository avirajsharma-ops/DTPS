"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Save, 
  Clock, 
  Utensils,
  Plus,
  Trash2,
  Loader2,
  Sun,
  Coffee,
  Apple,
  Sandwich,
  Moon,
  Sunrise
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import SpoonGifLoader from '@/components/ui/SpoonGifLoader';

interface MealEntry {
  mealType: string;
  hour: string;
  minute: string;
  meridian: "AM" | "PM";
  food: string;
}

const mealTypes = [
  { value: "Early Morning", label: "Early Morning", icon: Sunrise },
  { value: "BreakFast", label: "Breakfast", icon: Coffee },
  { value: "Lunch", label: "Lunch", icon: Sandwich },
  { value: "Evening Snack", label: "Evening Snack", icon: Apple },
  { value: "Dinner", label: "Dinner", icon: Utensils },
  { value: "Post Dinner", label: "Post Dinner", icon: Moon }
];

const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

export default function DietaryRecallPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meals, setMeals] = useState<MealEntry[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/client/dietary-recall");
        if (res.ok) {
          const result = await res.json();
          if (result.recalls && result.recalls.length > 0) {
            const latestRecall = result.recalls[0];
            if (latestRecall.meals && latestRecall.meals.length > 0) {
              setMeals(latestRecall.meals);
            } else {
              setMeals(mealTypes.map(type => ({
                mealType: type.value,
                hour: "",
                minute: "",
                meridian: "AM" as "AM" | "PM",
                food: ""
              })));
            }
          } else {
            setMeals(mealTypes.map(type => ({
              mealType: type.value,
              hour: "",
              minute: "",
              meridian: "AM" as "AM" | "PM",
              food: ""
            })));
          }
        }
      } catch (error) {
        console.error("Error fetching dietary recall:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchData();
    }
  }, [session]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/client/dietary-recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meals: meals.filter(m => m.food.trim() !== "")
        })
      });

      if (res.ok) {
        toast.success("Dietary recall saved successfully");
        router.push("/user/profile");
      } else {
        toast.error("Failed to save dietary recall");
      }
    } catch (error) {
      console.error("Error saving dietary recall:", error);
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const updateMeal = (index: number, field: keyof MealEntry, value: string) => {
    const newMeals = [...meals];
    newMeals[index] = { ...newMeals[index], [field]: value };
    setMeals(newMeals);
  };

  const addCustomMeal = () => {
    setMeals([...meals, {
      mealType: "Other",
      hour: "12",
      minute: "00",
      meridian: "PM",
      food: ""
    }]);
  };

  const removeMeal = (index: number) => {
    setMeals(meals.filter((_, i) => i !== index));
  };

  const getMealInfo = (mealType: string) => {
    return mealTypes.find(t => t.value === mealType) || { 
      value: mealType, 
      label: mealType, 
      icon: Utensils
    };
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <SpoonGifLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 via-white to-green-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/user/profile" className="p-2 -ml-2 rounded-xl hover:bg-green-50 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Dietary Recall</h1>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 shadow-lg shadow-green-500/25"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      <div className="px-4 py-6 pb-24 space-y-4">
        {/* Meal Cards */}
        {meals.map((meal, index) => {
          const mealInfo = getMealInfo(meal.mealType);
          const MealIcon = mealInfo.icon;
          
          return (
            <div 
              key={index}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
            >
              {/* Meal Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
                    <MealIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{mealInfo.label}</h3>
                    {meal.hour && meal.minute && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {meal.hour}:{meal.minute} {meal.meridian}
                      </p>
                    )}
                  </div>
                </div>
                {!mealTypes.find(t => t.value === meal.mealType) && (
                  <button
                    onClick={() => removeMeal(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Time Selector */}
              <div className="flex gap-2 mb-3">
                <select
                  value={meal.hour}
                  onChange={(e) => updateMeal(index, "hour", e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Hour</option>
                  {hours.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <select
                  value={meal.minute}
                  onChange={(e) => updateMeal(index, "minute", e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Min</option>
                  {minutes.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  value={meal.meridian}
                  onChange={(e) => updateMeal(index, "meridian", e.target.value)}
                  className="w-20 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>

              {/* Food Input */}
              <textarea
                value={meal.food}
                onChange={(e) => updateMeal(index, "food", e.target.value)}
                placeholder={`What did you have for ${mealInfo.label.toLowerCase()}?`}
                rows={2}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
          );
        })}

        {/* Add Custom Meal */}
        <button
          onClick={addCustomMeal}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Another Meal
        </button>

        {/* Tips */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <h4 className="text-green-700 font-semibold text-sm mb-2">💡 Tips for Accurate Recall</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Include portion sizes (e.g., 1 cup, 2 chapatis)</li>
            <li>• Mention cooking method (fried, boiled, grilled)</li>
            <li>• Don&apos;t forget beverages and snacks</li>
            <li>• Note any condiments or sauces used</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
