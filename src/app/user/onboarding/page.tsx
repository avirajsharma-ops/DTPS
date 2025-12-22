'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight,
  Armchair,
  PersonStanding,
  Dumbbell,
  Flame,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  Droplets,
  Check,
  Calendar,
  Heart,
  Stethoscope
} from 'lucide-react';
import { toast } from 'sonner';
import SpoonGifLoader from '@/components/ui/SpoonGifLoader';

// Step components
interface StepProps {
  onNext: () => void;
  onBack: () => void;
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
}

interface OnboardingData {
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  heightCm: string;
  heightFeet: string;
  heightInch: string;
  weightKg: string;
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
  primaryGoal: 'weight-loss' | 'weight-gain' | 'disease-management' | 'weight-loss-disease-management';
  dailyGoals: {
    calories: number;
    steps: number;
    water: number;
    sleep: number;
  };
  dietType: string;
  allergies: string[];
}

const defaultData: OnboardingData = {
  gender: 'male',
  dateOfBirth: '',
  heightCm: '',
  heightFeet: '',
  heightInch: '',
  weightKg: '',
  activityLevel: 'moderately_active',
  primaryGoal: 'weight-loss',
  dailyGoals: {
    calories: 2450,
    steps: 8000,
    water: 2500,
    sleep: 7.5,
  },
  dietType: '',
  allergies: [],
};

// Helper function to convert CM to feet/inches
const cmToFeetInches = (cm: string) => {
  const cmNum = parseFloat(cm);
  if (isNaN(cmNum) || cmNum <= 0) return { feet: '', inch: '' };
  const totalInches = cmNum / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet: feet.toString(), inch: inches.toString() };
};

// Helper function to convert feet/inches to CM
const feetInchesToCm = (feet: string, inches: string) => {
  const f = parseFloat(feet) || 0;
  const i = parseFloat(inches) || 0;
  const totalInches = (f * 12) + i;
  return Math.round(totalInches * 2.54).toString();
};

// Step 1: Basic Info
function Step1BasicInfo({ onNext, data, updateData }: StepProps) {
  const activityLevels = [
    { 
      value: 'sedentary', 
      label: 'Sedentary', 
      description: 'Little or no exercise, desk job',
      icon: Armchair
    },
    { 
      value: 'lightly_active', 
      label: 'Lightly Active', 
      description: 'Exercise 1-3 times/week',
      icon: PersonStanding
    },
    { 
      value: 'moderately_active', 
      label: 'Active', 
      description: 'Daily exercise or intense job',
      icon: Dumbbell
    },
    { 
      value: 'very_active', 
      label: 'Very Active', 
      description: 'Heavy exercise 6-7 days/week',
      icon: Flame
    },
  ];

  const handleHeightCmChange = (cm: string) => {
    const { feet, inch } = cmToFeetInches(cm);
    updateData({ heightCm: cm, heightFeet: feet, heightInch: inch });
  };

  const isValid = data.dateOfBirth && data.heightCm && data.weightKg;

  // Calculate max date (must be at least 10 years old)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 10);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  // Calculate min date (max 120 years old)
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 120);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8 pb-32">
      {/* Progress Bar */}
      <div className="flex gap-1.5 mb-8">
        <div className="h-1 flex-1 bg-[#E06A26] rounded-full" />
        <div className="h-1 flex-1 bg-gray-200 rounded-full" />
        <div className="h-1 flex-1 bg-gray-200 rounded-full" />
        <div className="h-1 flex-1 bg-gray-200 rounded-full" />
        <div className="h-1 flex-1 bg-gray-200 rounded-full" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Let&apos;s get to know you</h1>
      <p className="text-gray-500 mb-8">This helps us calculate your personalized calorie needs accurately.</p>

      {/* Gender Selection */}
      <div className="mb-6">
        <label className="text-sm font-semibold text-gray-700 mb-3 block">Gender</label>
        <div className="flex bg-gray-100 rounded-full p-1">
          {(['male', 'female', 'other'] as const).map((gender) => (
            <button
              key={gender}
              onClick={() => updateData({ gender })}
              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${
                data.gender === gender
                  ? 'bg-[#3AB1A0] text-white'
                  : 'text-gray-600'
              }`}
            >
              {gender.charAt(0).toUpperCase() + gender.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Date of Birth with Calendar */}
      <div className="mb-6">
        <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Date of Birth
        </label>
        <input
          type="date"
          value={data.dateOfBirth}
          onChange={(e) => updateData({ dateOfBirth: e.target.value })}
          max={maxDateStr}
          min={minDateStr}
          className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-lg focus:ring-2 focus:ring-[#3AB1A0] focus:border-[#3AB1A0]"
        />
        {data.dateOfBirth && (
          <p className="text-sm text-gray-500 mt-1">
            Age: {Math.floor((new Date().getTime() - new Date(data.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years
          </p>
        )}
      </div>

      {/* Height */}
      <div className="mb-6">
        <label className="text-sm font-semibold text-gray-700 mb-2 block">Height</label>
        <div className="space-y-3">
          {/* CM Input */}
          <div className="relative">
            <input
              type="number"
              value={data.heightCm}
              onChange={(e) => handleHeightCmChange(e.target.value)}
              placeholder="Height in CM"
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-lg focus:ring-2 focus:ring-[#3AB1A0] focus:border-[#3AB1A0] pr-14"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">cm</span>
          </div>
          {/* Feet/Inches Display (read-only) */}
          {data.heightCm && (
            <div className="flex gap-3">
              <div className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <span className="text-gray-500 text-sm">Feet</span>
                <span className="font-semibold text-gray-900">{data.heightFeet || '0'} ft</span>
              </div>
              <div className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <span className="text-gray-500 text-sm">Inches</span>
                <span className="font-semibold text-gray-900">{data.heightInch || '0'} in</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Weight */}
      <div className="mb-8">
        <label className="text-sm font-semibold text-gray-700 mb-2 block">Weight</label>
        <div className="relative">
          <input
            type="number"
            value={data.weightKg}
            onChange={(e) => updateData({ weightKg: e.target.value })}
            placeholder="Weight in KG"
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-lg focus:ring-2 focus:ring-[#3AB1A0] focus:border-[#3AB1A0] pr-14"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">kg</span>
        </div>
        {data.weightKg && (
          <p className="text-sm text-gray-500 mt-1">
            {(parseFloat(data.weightKg) * 2.205).toFixed(1)} lbs
          </p>
        )}
      </div>

      {/* Activity Level */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-gray-700">Activity Level</label>
        </div>
        <div className="space-y-3">
          {activityLevels.map((level) => {
            const Icon = level.icon;
            return (
              <button
                key={level.value}
                onClick={() => updateData({ activityLevel: level.value as OnboardingData['activityLevel'] })}
                className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${
                  data.activityLevel === level.value
                    ? 'border-[#3AB1A0] bg-[#3AB1A0]/10'
                    : 'border-gray-100 bg-white'
                }`}
              >
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                  data.activityLevel === level.value ? 'bg-[#3AB1A0]/20' : 'bg-gray-100'
                }`}>
                  <Icon className={`h-6 w-6 ${data.activityLevel === level.value ? 'text-[#3AB1A0]' : 'text-gray-500'}`} />
                </div>
                <div className="text-left flex-1">
                  <p className={`font-semibold ${data.activityLevel === level.value ? 'text-[#3AB1A0]' : 'text-gray-900'}`}>
                    {level.label}
                  </p>
                  <p className="text-sm text-gray-500">{level.description}</p>
                </div>
                {data.activityLevel === level.value && (
                  <div className="h-6 w-6 rounded-full bg-[#3AB1A0] flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100">
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`w-full py-4 rounded-full font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
            isValid
              ? 'bg-[#E06A26] text-white hover:bg-[#c55a1f]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// Step 2: Goal Selection
function Step2Goals({ onNext, onBack, data, updateData }: StepProps) {
  const goals = [
    { 
      value: 'weight-loss', 
      label: 'Weight Loss', 
      description: 'Burn fat and get lean',
      icon: TrendingDown,
    },
    { 
      value: 'weight-gain', 
      label: 'Weight Gain', 
      description: 'Build muscle and mass',
      icon: TrendingUp,
    },
    { 
      value: 'disease-management', 
      label: 'Disease Management', 
      description: 'Manage health conditions through diet',
      icon: Stethoscope,
    },
    { 
      value: 'weight-loss-disease-management', 
      label: 'Weight Loss + Disease Management', 
      description: 'Combined approach for weight and health',
      icon: Heart,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="p-2 -ml-2">
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </button>
        <div className="flex gap-1.5">
          <div className="h-2 w-2 rounded-full bg-gray-300" />
          <div className="h-2 w-6 rounded-full bg-[#E06A26]" />
          <div className="h-2 w-2 rounded-full bg-gray-300" />
          <div className="h-2 w-2 rounded-full bg-gray-300" />
          <div className="h-2 w-2 rounded-full bg-gray-300" />
        </div>
        <div className="w-10" />
      </div>

      <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">What&apos;s your goal?</h1>
      <p className="text-gray-500 text-center mb-10">We will customize your profile based on this.</p>

      {/* Goal Options */}
      <div className="space-y-4">
        {goals.map((goal) => {
          const Icon = goal.icon;
          return (
            <button
              key={goal.value}
              onClick={() => updateData({ primaryGoal: goal.value as OnboardingData['primaryGoal'] })}
              className={`w-full p-5 rounded-2xl border-2 flex items-center gap-4 transition-all ${
                data.primaryGoal === goal.value
                  ? 'border-[#3AB1A0] bg-[#3AB1A0]/10'
                  : 'border-gray-100 bg-white'
              }`}
            >
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                data.primaryGoal === goal.value ? 'bg-[#3AB1A0]/20' : 'bg-gray-100'
              }`}>
                <Icon className={`h-7 w-7 ${data.primaryGoal === goal.value ? 'text-[#3AB1A0]' : 'text-gray-400'}`} />
              </div>
              <div className="text-left flex-1">
                <p className={`font-semibold text-lg ${data.primaryGoal === goal.value ? 'text-gray-900' : 'text-gray-700'}`}>
                  {goal.label}
                </p>
                <p className="text-sm text-gray-500">{goal.description}</p>
              </div>
              <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                data.primaryGoal === goal.value
                  ? 'border-[#3AB1A0] bg-white'
                  : 'border-gray-300'
              }`}>
                {data.primaryGoal === goal.value && (
                  <div className="h-2.5 w-2.5 rounded-full bg-[#3AB1A0]" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100">
        <button
          onClick={onNext}
          className="w-full py-4 rounded-full bg-[#E06A26] text-white font-semibold text-lg hover:bg-[#c55a1f] transition-all"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// Step 3: Daily Goals
function Step3DailyGoals({ onNext, onBack, data, updateData }: StepProps) {
  const updateGoal = (key: keyof typeof data.dailyGoals, value: number) => {
    updateData({
      dailyGoals: {
        ...data.dailyGoals,
        [key]: value,
      },
    });
  };

  const goals = [
    {
      key: 'calories' as const,
      label: 'Calories',
      value: data.dailyGoals.calories,
      unit: 'kcal',
      min: 1200,
      max: 4000,
      icon: '🔥',
      iconBg: 'bg-orange-100',
    },
    {
      key: 'steps' as const,
      label: 'Steps',
      value: data.dailyGoals.steps,
      unit: 'steps',
      min: 1000,
      max: 20000,
      icon: '👣',
      iconBg: 'bg-blue-100',
    },
    {
      key: 'water' as const,
      label: 'Water',
      value: data.dailyGoals.water,
      unit: 'ml',
      min: 500,
      max: 4000,
      icon: '💧',
      iconBg: 'bg-cyan-100',
    },
    {
      key: 'sleep' as const,
      label: 'Sleep',
      value: data.dailyGoals.sleep,
      unit: 'hrs',
      min: 4,
      max: 12,
      step: 0.5,
      icon: '🌙',
      iconBg: 'bg-indigo-100',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="h-10 w-10 rounded-full border border-gray-200 flex items-center justify-center">
          <ChevronLeft className="h-5 w-5 text-gray-700" />
        </button>
        <div className="flex gap-1.5">
          <div className="h-2 w-2 rounded-full bg-gray-300" />
          <div className="h-2 w-2 rounded-full bg-gray-300" />
          <div className="h-2 w-6 rounded-full bg-[#E06A26]" />
          <div className="h-2 w-2 rounded-full bg-gray-300" />
          <div className="h-2 w-2 rounded-full bg-gray-300" />
        </div>
        <div className="w-10" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Set Daily Goals</h1>
      <p className="text-gray-500 mb-8">Let&apos;s tailor your experience to match your lifestyle.</p>

      {/* Goal Sliders */}
      <div className="space-y-6">
        {goals.map((goal) => (
          <div key={goal.key} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${goal.iconBg} flex items-center justify-center text-xl`}>
                  {goal.icon}
                </div>
                <span className="font-medium text-gray-700">{goal.label}</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-gray-900">{goal.value.toLocaleString()}</span>
                <span className="text-gray-500 ml-1">{goal.unit}</span>
              </div>
            </div>
            <div className="relative">
              <input
                type="range"
                min={goal.min}
                max={goal.max}
                step={goal.step || 100}
                value={goal.value}
                onChange={(e) => updateGoal(goal.key, parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#3AB1A0]"
                style={{
                  background: `linear-gradient(to right, #3AB1A0 0%, #3AB1A0 ${((goal.value - goal.min) / (goal.max - goal.min)) * 100}%, #e5e7eb ${((goal.value - goal.min) / (goal.max - goal.min)) * 100}%, #e5e7eb 100%)`
                }}
              />
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>{goal.key === 'steps' ? '1k' : goal.key === 'sleep' ? '4h' : goal.min + (goal.key === 'water' ? 'ml' : '')}</span>
                <span>{goal.key === 'steps' ? '20k' : goal.key === 'sleep' ? '12h' : goal.max + (goal.key === 'water' ? 'ml' : '+')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100">
        <button
          onClick={onNext}
          className="w-full py-4 rounded-full bg-[#E06A26] text-white font-semibold text-lg hover:bg-[#c55a1f] transition-all"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// Step 4: Dietary Preferences
function Step4DietaryPreferences({ onNext, onBack, data, updateData }: StepProps) {
  const dietTypes = [
    { value: 'Vegetarian', label: 'Vegetarian', description: 'No meat, poultry, or seafood', icon: '🥬' },
    { value: 'Vegan', label: 'Vegan', description: 'Plant-based only, no animal products', icon: '🌱' },
    { value: 'Gluten-Free', label: 'Gluten-Free', description: 'No wheat, barley, or rye', icon: '🌾' },
    { value: 'Non-Vegetarian', label: 'Non-Vegetarian', description: 'Includes meat and seafood', icon: '🍖' },
    { value: 'Dairy-Free', label: 'Dairy-Free', description: 'No milk, cheese, or dairy', icon: '🥛' },
    { value: 'Keto', label: 'Keto', description: 'High fat, very low carb', icon: '🥑' },
    { value: 'Low-Carb', label: 'Low-Carb', description: 'Reduced carbohydrate intake', icon: '🥗' },
    { value: 'Low-Fat', label: 'Low-Fat', description: 'Reduced fat intake', icon: '🍃' },
    { value: 'High-Protein', label: 'High-Protein', description: 'Protein-focused diet', icon: '💪' },
    { value: 'Paleo', label: 'Paleo', description: 'Based on prehistoric diet', icon: '🦴' },
    { value: 'Mediterranean', label: 'Mediterranean', description: 'Heart-healthy eating pattern', icon: '🫒' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8 pb-32">
      {/* Header */}
      <div className="flex items-center border-b border-gray-100 pb-4 mb-6">
        <button onClick={onBack} className="p-2 -ml-2">
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </button>
        <h1 className="flex-1 text-center font-semibold text-gray-900">Dietary Preferences</h1>
        <div className="w-10" />
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-1">Choose Your Diet Type</h2>
      <p className="text-gray-500 text-sm mb-6">Select the diet plan that best fits your lifestyle.</p>

      {/* Diet Type Grid */}
      <div className="grid grid-cols-2 gap-3">
        {dietTypes.map((diet) => (
          <button
            key={diet.value}
            onClick={() => updateData({ dietType: diet.value })}
            className={`p-4 rounded-2xl border-2 flex flex-col items-center text-center transition-all ${
              data.dietType === diet.value
                ? 'border-[#3AB1A0] bg-[#3AB1A0]/10'
                : 'border-gray-100 bg-white'
            }`}
          >
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl mb-2 ${
              data.dietType === diet.value ? 'bg-[#3AB1A0]/20' : 'bg-gray-100'
            }`}>
              {diet.icon}
            </div>
            <p className={`font-semibold text-sm ${data.dietType === diet.value ? 'text-gray-900' : 'text-gray-700'}`}>
              {diet.label}
            </p>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{diet.description}</p>
            {data.dietType === diet.value && (
              <div className="mt-2">
                <Check className="h-5 w-5 text-[#3AB1A0]" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100">
        <button
          onClick={onNext}
          disabled={!data.dietType}
          className={`w-full py-4 rounded-full font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
            data.dietType
              ? 'bg-[#E06A26] text-white hover:bg-[#c55a1f]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// Step 5: Summary
function Step5Summary({ onNext, onBack, data }: StepProps) {
  // Calculate macros based on calories
  const protein = Math.round((data.dailyGoals.calories * 0.3) / 4); // 30% protein
  const carbs = Math.round((data.dailyGoals.calories * 0.4) / 4); // 40% carbs
  const fats = Math.round((data.dailyGoals.calories * 0.3) / 9); // 30% fats

  // Calculate age from DOB
  const age = data.dateOfBirth 
    ? Math.floor((new Date().getTime() - new Date(data.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0;

  const goalLabels: Record<string, string> = {
    'weight-loss': 'Weight Loss',
    'weight-gain': 'Weight Gain',
    'disease-management': 'Disease Management',
    'weight-loss-disease-management': 'Weight Loss + Disease Management'
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8 pb-32">
      {/* Header */}
      <div className="flex items-center border-b border-gray-100 pb-4 mb-6">
        <button onClick={onBack} className="p-2 -ml-2">
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </button>
        <h1 className="flex-1 text-center font-semibold text-gray-900">Your Profile Summary</h1>
        <div className="w-10" />
      </div>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Profile </h2>
        <p className="text-gray-500">Review your information before we get started.</p>
      </div>

      {/* Personal Info Card */}
      <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-3">Personal Information</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-gray-500 text-xs">Age</p>
            <p className="font-semibold text-gray-900">{age} years</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-gray-500 text-xs">Gender</p>
            <p className="font-semibold text-gray-900 capitalize">{data.gender}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-gray-500 text-xs">Height</p>
            <p className="font-semibold text-gray-900">{data.heightCm} cm ({data.heightFeet}&apos;{data.heightInch}&quot;)</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-gray-500 text-xs">Weight</p>
            <p className="font-semibold text-gray-900">{data.weightKg} kg</p>
          </div>
        </div>
      </div>

      {/* Goal & Diet Card */}
      <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-3">Goal & Diet</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
            <span className="text-gray-500 text-sm">Primary Goal</span>
            <span className="font-semibold text-gray-900">{goalLabels[data.primaryGoal]}</span>
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
            <span className="text-gray-500 text-sm">Diet Type</span>
            <span className="font-semibold text-gray-900">{data.dietType}</span>
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
            <span className="text-gray-500 text-sm">Activity Level</span>
            <span className="font-semibold text-gray-900 capitalize">{data.activityLevel.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {/* Daily Target Card */}
      <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-4 right-4 opacity-10">
          <Flame className="h-24 w-24 text-[#E06A26]" />
        </div>
        <p className="text-sm text-gray-500 uppercase tracking-wider text-center mb-2">DAILY CALORIE TARGET</p>
        <p className="text-5xl font-bold text-gray-900 text-center">
          {data.dailyGoals.calories.toLocaleString()}
          <span className="text-xl font-normal text-gray-400 ml-2">kcal</span>
        </p>
      </div>

      {/* Macros */}
      <div className="mb-4">
        <h3 className="font-bold text-gray-900 mb-3">Daily Macros</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <div className="h-2 w-2 rounded-full bg-[#3AB1A0] mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{protein}g</p>
            <p className="text-xs text-gray-500 uppercase">Protein</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <div className="h-2 w-2 rounded-full bg-[#E06A26] mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{carbs}g</p>
            <p className="text-xs text-gray-500 uppercase">Carbs</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <div className="h-2 w-2 rounded-full bg-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{fats}g</p>
            <p className="text-xs text-gray-500 uppercase">Fats</p>
          </div>
        </div>
      </div>

      {/* Other Targets */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3">Other Targets</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <Droplets className="h-5 w-5 text-cyan-500" />
            <div>
              <p className="font-semibold text-gray-900">{data.dailyGoals.water} ml</p>
              <p className="text-xs text-gray-500">Water</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <span className="text-xl">👣</span>
            <div>
              <p className="font-semibold text-gray-900">{data.dailyGoals.steps.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Steps</p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100">
        <button
          onClick={onNext}
          className="w-full py-4 rounded-full bg-[#E06A26] text-white font-semibold text-lg hover:bg-[#c55a1f] transition-all flex items-center justify-center gap-2"
        >
          Confirm & Start
          <Check className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// Main Onboarding Component
export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [saving, setSaving] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      checkOnboardingStatus();
    } else if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, session, router]);

  const checkOnboardingStatus = async () => {
    try {
      const response = await fetch('/api/client/onboarding');
      if (response.ok) {
        const result = await response.json();
        if (result.onboardingCompleted) {
          // Already completed onboarding, redirect to user dashboard
          router.replace('/user');
          return;
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const updateData = (newData: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      setSaving(true);

      const response = await fetch('/api/client/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender: data.gender,
          dateOfBirth: data.dateOfBirth,
          heightCm: data.heightCm,
          heightFeet: data.heightFeet,
          heightInch: data.heightInch,
          weightKg: data.weightKg,
          activityLevel: data.activityLevel,
          generalGoal: data.primaryGoal,
          dailyGoals: data.dailyGoals,
          dietType: data.dietType,
          allergies: data.allergies,
          onboardingCompleted: true,
        }),
      });

      if (response.ok) {
        toast.success('Welcome! Your profile has been set up.');
        router.replace('/user');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || saving || checkingStatus) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <SpoonGifLoader size="lg" />
      </div>
    );
  }

  const stepProps: StepProps = {
    onNext: handleNext,
    onBack: handleBack,
    data,
    updateData,
  };

  switch (currentStep) {
    case 1:
      return <Step1BasicInfo {...stepProps} />;
    case 2:
      return <Step2Goals {...stepProps} />;
    case 3:
      return <Step3DailyGoals {...stepProps} />;
    case 4:
      return <Step4DietaryPreferences {...stepProps} />;
    case 5:
      return <Step5Summary {...stepProps} />;
    default:
      return <Step1BasicInfo {...stepProps} />;
  }
}
