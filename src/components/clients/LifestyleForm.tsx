"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save } from 'lucide-react';

export interface LifestyleData {
  // Food preferences (physical measurements moved to BasicInfo)
  foodPreference: string;
  preferredCuisine: string[];       // FIXED → real array
  allergiesFood: string[];          // FIXED → real array
  fastDays: string[];               // FIXED → real array
  nonVegExemptDays: string[];       // FIXED → real array
  foodLikes: string;
  foodDislikes: string;
  eatOutFrequency: string;
  smokingFrequency: string;
  alcoholFrequency: string;
  activityRate: string;
  cookingOil: string[];             // FIXED → real array
  monthlyOilConsumption: string;
  cookingSalt: string;
  carbonatedBeverageFrequency: string;
  cravingType: string;
}

interface LifestyleFormProps extends LifestyleData {
  onChange: (field: keyof LifestyleData, value: any) => void; // FIXED
  onSave: () => void;
  loading?: boolean;
}

export function LifestyleForm(props: LifestyleFormProps) {
  const {
    foodPreference, preferredCuisine,
    allergiesFood, fastDays, nonVegExemptDays, foodLikes, foodDislikes,
    eatOutFrequency, smokingFrequency, alcoholFrequency, activityRate,
    cookingOil, monthlyOilConsumption, cookingSalt,
    carbonatedBeverageFrequency, cravingType, onChange, onSave, loading
  } = props;

  return (
    <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
      <CardHeader className="bg-linear-to-r from-emerald-500 to-emerald-600 py-4 px-4 sm:px-6">
        <CardTitle className="text-lg sm:text-xl font-bold text-white">Lifestyle Information</CardTitle>
        <CardDescription className="text-blue-100 text-sm">Food preferences and dietary habits</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-6 px-4 sm:px-6">

        {/* FOOD PREFERENCES */}
        <div className="space-y-6">
          <h4 className="font-semibold text-gray-900 text-base">Food Preferences</h4>

          {/* Food Preference */}
          <div className="space-y-2.5">
            <Label className="text-sm font-medium">Food Preference</Label>
            <Select value={foodPreference} onValueChange={val => onChange("foodPreference", val)}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="veg">Vegetarian</SelectItem>
                <SelectItem value="non-veg">Non-Vegetarian</SelectItem>
                <SelectItem value="eggetarian">Eggetarian</SelectItem>
                <SelectItem value="vegan">Vegan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preferred Cuisine (Array Fix) */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Preferred Cuisine</Label>
            <div className="flex flex-wrap gap-2.5">
              {["North Indian", "Continental", "South Indian", "Chinese", "East Indian", "West Indian"].map(c => {
                const v = c.toLowerCase().replace(/\s+/g, "-");
                const active = preferredCuisine.includes(v);

                return (
                  <Button
                    key={v}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => {
                      const next = active
                        ? preferredCuisine.filter(x => x !== v)
                        : [...preferredCuisine, v];
                      onChange("preferredCuisine", next);
                    }}
                    className="text-xs"
                  >
                    {c}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Allergies Food */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Any Food Allergies?</Label>
            <div className="flex flex-wrap gap-2.5">
              {["Dairy", "Beef", "Sea Food", "Egg", "Nuts", "Lamb/Mutton", "Wheat", "Poultry"].map(a => {
                const v = a.toLowerCase().replace(/\s+/g, "-");
                const active = allergiesFood.includes(v);

                return (
                  <Button
                    key={v}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => {
                      const next = active
                        ? allergiesFood.filter(x => x !== v)
                        : [...allergiesFood, v];
                      onChange("allergiesFood", next);
                    }}
                    className="text-xs"
                  >
                    {a}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Fast Days */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Fast Days</Label>
            <div className="flex flex-wrap gap-2.5">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => {
                const v = day.toLowerCase();
                const active = fastDays.includes(v);

                return (
                  <Button
                    key={v}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => {
                      const next = active
                        ? fastDays.filter(x => x !== v)
                        : [...fastDays, v];
                      onChange("fastDays", next);
                    }}
                    className="text-xs"
                  >
                    {day}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Non-Veg Exempt Days */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Non-Veg/Egg Exempt Days</Label>
            <div className="flex flex-wrap gap-2.5">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => {
                const v = day.toLowerCase();
                const active = nonVegExemptDays.includes(v);

                return (
                  <Button
                    key={v}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => {
                      const next = active
                        ? nonVegExemptDays.filter(x => x !== v)
                        : [...nonVegExemptDays, v];
                      onChange("nonVegExemptDays", next);
                    }}
                    className="text-xs"
                  >
                    {day}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Likes / Dislikes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2.5">
              <Label className="text-sm font-medium">Food Likes</Label>
              <Input value={foodLikes} onChange={e => onChange("foodLikes", e.target.value)} className="h-10" />
            </div>

            <div className="space-y-2.5">
              <Label className="text-sm font-medium">Food Dislikes</Label>
              <Input value={foodDislikes} onChange={e => onChange("foodDislikes", e.target.value)} className="h-10" />
            </div>
          </div>
        </div>

        {/* Lifestyle Specification */}
        <div className="space-y-6 border-t border-gray-200 pt-6">
          <h4 className="font-semibold text-gray-900 text-base">Lifestyle Habits</h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-2.5">
              <Label className="text-sm font-medium">Eat Out Frequency</Label>
              <Select value={eatOutFrequency} onValueChange={val => onChange("eatOutFrequency", val)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rare">Rare</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="multiple-week">Multiple/Week</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label className="text-sm font-medium">Smoking Frequency</Label>
              <Select value={smokingFrequency} onValueChange={val => onChange("smokingFrequency", val)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="occasional">Occasional</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label className="text-sm font-medium">Alcohol Frequency</Label>
              <Select value={alcoholFrequency} onValueChange={val => onChange("alcoholFrequency", val)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="occasional">Occasional</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="frequent">Frequent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2.5">
            <Label className="text-sm font-medium">Activity Rate *</Label>
            <Select value={activityRate} onValueChange={val => onChange("activityRate", val)}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Other Information */}
        <div className="space-y-6 border-t border-gray-200 pt-6">
          <h4 className="font-semibold text-gray-900 text-base">Cooking & Consumption</h4>
          
          {/* Cooking Oil */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Which Oil Do You Use?</Label>
            <div className="flex flex-wrap gap-2.5">
              {["Olive Oil", "Mustard Oil", "Refined Oil", "Peanut Oil", "Coconut Oil", "Other"].map(o => {
                const v = o.toLowerCase().replace(/\s+/g, "-");
                const active = cookingOil.includes(v);

                return (
                  <Button
                    key={v}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => {
                      const next = active
                        ? cookingOil.filter(x => x !== v)
                        : [...cookingOil, v];
                      onChange("cookingOil", next);
                    }}
                    className="text-xs"
                  >
                    {o}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Monthly Oil */}
            <div className="space-y-2.5">
              <Label className="text-sm font-medium">Monthly Oil Consumption *</Label>
              <Select
                value={monthlyOilConsumption}
                onValueChange={val => onChange("monthlyOilConsumption", val)}
              >
                <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="500ml">500 ml</SelectItem>
                  <SelectItem value="1l">1 Litre</SelectItem>
                  <SelectItem value="2l">2 Litre</SelectItem>
                  <SelectItem value="3l">3 Litre</SelectItem>
                  <SelectItem value="more-3l">More Than 3 Litre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Salt */}
            <div className="space-y-2.5">
              <Label className="text-sm font-medium">Which Salt?</Label>
              <Select
                value={cookingSalt}
                onValueChange={val => onChange("cookingSalt", val)}
              >
                <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tata-white">TATA Iodised White Salt</SelectItem>
                  <SelectItem value="rock-salt">Rock Salt</SelectItem>
                  <SelectItem value="black-salt">Black Salt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Carbonated Drinks */}
            <div className="space-y-2.5">
              <Label className="text-sm font-medium">Carbonated Beverages *</Label>
              <Select
                value={carbonatedBeverageFrequency}
                onValueChange={val => onChange("carbonatedBeverageFrequency", val)}
              >
                <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="occasional">Occasional</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="frequent">Frequent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Craving Type */}
            <div className="space-y-2.5">
              <Label className="text-sm font-medium">Craving Type *</Label>
              <Select
                value={cravingType}
                onValueChange={val => onChange("cravingType", val)}
              >
                <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sweet">Sweet</SelectItem>
                  <SelectItem value="salty">Salty</SelectItem>
                  <SelectItem value="fried">Fried</SelectItem>
                  <SelectItem value="spicy">Spicy</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
          <Button type="button" onClick={onSave} disabled={loading} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg transition-all">
            <Save className="mr-2 h-4 w-4" />
            Save Lifestyle
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}

export default LifestyleForm;
