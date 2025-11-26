"use client";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save } from 'lucide-react';

export interface LifestyleData {
  height: string; // legacy cm
  weight: string; // legacy kg
  activityLevel: string;
  healthGoals: string; // comma separated
  heightFeet: string;
  heightInch: string;
  heightCm: string;
  weightKg: string;
  targetWeightKg: string;
  bmi: string;
  idealWeightKg: string;
  foodPreference: string;
  preferredCuisine: string[];
  allergiesFood: string[]; // specific food allergies list (distinct from medical allergies)
  fastDays: string[];
  nonVegExemptDays: string[];
  foodLikes: string;
  foodDislikes: string;
  eatOutFrequency: string;
  smokingFrequency: string;
  alcoholFrequency: string;
  activityRate: string; // separate from activityLevel selection
  cookingOil: string[]; // multi-select oils used
  monthlyOilConsumption: string;
  cookingSalt: string;
  carbonatedBeverageFrequency: string;
  cravingType: string;
}

interface LifestyleFormProps extends LifestyleData {
  onChange: (field: keyof LifestyleData, value: string) => void;
  onSave: () => void;
  loading?: boolean;
}

export function LifestyleForm({ height, weight, activityLevel, healthGoals, heightFeet, heightInch, heightCm, weightKg, targetWeightKg, bmi, idealWeightKg, foodPreference, preferredCuisine, allergiesFood, fastDays, nonVegExemptDays, foodLikes, foodDislikes, eatOutFrequency, smokingFrequency, alcoholFrequency, activityRate, cookingOil, monthlyOilConsumption, cookingSalt, carbonatedBeverageFrequency, cravingType, onChange, onSave, loading }: LifestyleFormProps) {
  // derive heightCm if feet/inch change
  const feetNum = parseFloat(heightFeet || '0');
  const inchNum = parseFloat(heightInch || '0');
  const computedCm = feetNum > 0 || inchNum > 0 ? ((feetNum * 12 + inchNum) * 2.54).toFixed(2) : heightCm;
  // derive BMI if weight & heightCm
  const hMeters = parseFloat(computedCm || '0') / 100;
  const wKg = parseFloat(weightKg || '0');
  const computedBmi = hMeters > 0 && wKg > 0 ? (wKg / (hMeters * hMeters)).toFixed(1) : bmi;
  // simple ideal weight (Broca modified): heightCm - 100 (placeholder)
  const computedIdeal = hMeters > 0 ? (parseFloat(computedCm) - 100).toFixed(1) : idealWeightKg;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lifestyle Information</CardTitle>
        <CardDescription>Physical stats and activity level</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="height">Height (cm)</Label>
            <Input id="height" type="number" value={height} onChange={e => onChange('height', e.target.value)} placeholder="170" />
          </div>
          <div>
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input id="weight" type="number" value={weight} onChange={e => onChange('weight', e.target.value)} placeholder="70" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="heightFeet">Height (Ft)*</Label>
            <Input id="heightFeet" type="number" value={heightFeet} onChange={e => onChange('heightFeet', e.target.value)} placeholder="5" />
          </div>
          <div>
            <Label htmlFor="heightInch">Height (Inch)</Label>
            <Input id="heightInch" type="number" value={heightInch} onChange={e => onChange('heightInch', e.target.value)} placeholder="8" />
          </div>
          <div>
            <Label htmlFor="heightCm">Height (Cm)</Label>
            <Input id="heightCm" type="number" value={computedCm} onChange={e => onChange('heightCm', e.target.value)} placeholder="172.50" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="weightKg">Weight (Kg)*</Label>
            <Input id="weightKg" type="number" value={weightKg} onChange={e => onChange('weightKg', e.target.value)} placeholder="70" />
          </div>
          <div>
            <Label htmlFor="targetWeightKg">Target Weight (Kg)</Label>
            <Input id="targetWeightKg" type="number" value={targetWeightKg} onChange={e => onChange('targetWeightKg', e.target.value)} placeholder="65" />
          </div>
          <div>
            <Label htmlFor="bmi">BMI</Label>
            <Input id="bmi" value={computedBmi} readOnly className="bg-gray-50" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="idealWeightKg">Ideal Weight (Kg)</Label>
            <Input id="idealWeightKg" value={computedIdeal} readOnly className="bg-gray-50" />
          </div>
        </div>
        <div>
          <Label htmlFor="activityLevel">Activity Level</Label>
            <Select value={activityLevel} onValueChange={val => onChange('activityLevel', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select activity level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentary</SelectItem>
                <SelectItem value="lightly_active">Lightly Active</SelectItem>
                <SelectItem value="moderately_active">Moderately Active</SelectItem>
                <SelectItem value="very_active">Very Active</SelectItem>
                <SelectItem value="extremely_active">Extremely Active</SelectItem>
              </SelectContent>
            </Select>
        </div>
        <div>
          <Label htmlFor="healthGoals">Health Goals</Label>
          <Input id="healthGoals" value={healthGoals} onChange={e => onChange('healthGoals', e.target.value)} placeholder="Weight loss, muscle gain, etc. (comma separated)" />
        </div>
        {/* Food Specification & Preferences */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-semibold text-slate-700">Food Specification & Preferences</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="foodPreference">Food Preference</Label>
              <Select value={foodPreference} onValueChange={val => onChange('foodPreference', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="veg">Vegetarian</SelectItem>
                  <SelectItem value="non-veg">Non-Vegetarian</SelectItem>
                  <SelectItem value="eggetarian">Eggetarian</SelectItem>
                  <SelectItem value="vegan">Vegan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preferred Cuisine</Label>
              <div className="flex flex-wrap gap-2">
                {['North Indian','Continental','South Indian','Chinese','East Indian','West Indian'].map(c => {
                  const v = c.toLowerCase().replace(/\s+/g,'-');
                  const active = preferredCuisine.includes(v);
                  return (
                    <Button key={v} type="button" size="sm" variant={active? 'default':'outline'} onClick={() => {
                      const next = active ? preferredCuisine.filter(x=>x!==v) : [...preferredCuisine, v];
                      onChange('preferredCuisine', next.join(','));
                    }}>{c}</Button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Any Allergies</Label>
              <div className="flex flex-wrap gap-2">
                {['Dairy','Beef','Sea Food','Egg','Nuts','Lamb/Mutton','Wheat','Poultry'].map(a => {
                  const v = a.toLowerCase().replace(/\s+/g,'-');
                  const active = allergiesFood.includes(v);
                  return (
                    <Button key={v} type="button" size="sm" variant={active? 'default':'outline'} onClick={() => {
                      const next = active ? allergiesFood.filter(x=>x!==v) : [...allergiesFood, v];
                      onChange('allergiesFood', next.join(','));
                    }}>{a}</Button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Any Fast Days?</Label>
              <div className="flex flex-wrap gap-2">
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => {
                  const v = d.toLowerCase();
                  const active = fastDays.includes(v);
                  return (
                    <Button key={v} type="button" size="sm" variant={active? 'default':'outline'} onClick={() => {
                      const next = active ? fastDays.filter(x=>x!==v) : [...fastDays, v];
                      onChange('fastDays', next.join(','));
                    }}>{d}</Button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Non-Veg/Egg Exempted Days</Label>
              <div className="flex flex-wrap gap-2">
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => {
                  const v = d.toLowerCase();
                  const active = nonVegExemptDays.includes(v);
                  return (
                    <Button key={v} type="button" size="sm" variant={active? 'default':'outline'} onClick={() => {
                      const next = active ? nonVegExemptDays.filter(x=>x!==v) : [...nonVegExemptDays, v];
                      onChange('nonVegExemptDays', next.join(','));
                    }}>{d}</Button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="foodLikes">Food Likes</Label>
              <Input id="foodLikes" value={foodLikes} onChange={e=>onChange('foodLikes', e.target.value)} placeholder="Comma separated likes" />
              <Label htmlFor="foodDislikes" className="mt-2">Food Dislikes</Label>
              <Input id="foodDislikes" value={foodDislikes} onChange={e=>onChange('foodDislikes', e.target.value)} placeholder="Comma separated dislikes" />
            </div>
          </div>
        </div>
        {/* Lifestyle Specification */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-semibold text-slate-700">Lifestyle Specification</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="eatOutFrequency">Eat Out Frequency</Label>
              <Select value={eatOutFrequency} onValueChange={val=>onChange('eatOutFrequency', val)}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rare">Rare</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="multiple-week">Multiple/week</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="smokingFrequency">Smoking Frequency</Label>
              <Select value={smokingFrequency} onValueChange={val=>onChange('smokingFrequency', val)}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="occasional">Occasional</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="alcoholFrequency">Alcohol Frequency</Label>
              <Select value={alcoholFrequency} onValueChange={val=>onChange('alcoholFrequency', val)}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="occasional">Occasional</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="frequent">Frequent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="activityRate">Activity Rate *</Label>
              <Select value={activityRate} onValueChange={val=>onChange('activityRate', val)}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {/* Other Information */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-semibold text-slate-700">Other Information</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Which Oil Do You Use For Cooking? *</Label>
              <div className="flex flex-wrap gap-2">
                {['Olive Oil','Mustard Oil','Refined Oil','Peanut Oil','Coconut Oil','Other'].map(o => {
                  const v = o.toLowerCase().replace(/\s+/g,'-');
                  const active = cookingOil.includes(v);
                  return (
                    <Button key={v} type="button" size="sm" variant={active? 'default':'outline'} onClick={() => {
                      const next = active ? cookingOil.filter(x=>x!==v) : [...cookingOil, v];
                      onChange('cookingOil', next.join(','));
                    }}>{o}</Button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label htmlFor="monthlyOilConsumption">Monthly Oil Consumption *</Label>
              <Select value={monthlyOilConsumption} onValueChange={val=>onChange('monthlyOilConsumption', val)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="500ml">500 ml</SelectItem>
                  <SelectItem value="1l">1 litre</SelectItem>
                  <SelectItem value="2l">2 litre</SelectItem>
                  <SelectItem value="3l">3 litre</SelectItem>
                  <SelectItem value="more-3l">More Than 3 Litre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cookingSalt">Which Salt Do You Use For Cooking? *</Label>
              <Select value={cookingSalt} onValueChange={val=>onChange('cookingSalt', val)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tata-white">TATA Iodised White Salt</SelectItem>
                  <SelectItem value="rock-salt">Rock Salt</SelectItem>
                  <SelectItem value="black-salt">Black Salt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="carbonatedBeverageFrequency">Carbonated Beverages Frequency *</Label>
              <Select value={carbonatedBeverageFrequency} onValueChange={val=>onChange('carbonatedBeverageFrequency', val)}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="occasional">Occasional</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="frequent">Frequent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cravingType">Craving Type *</Label>
              <Select value={cravingType} onValueChange={val=>onChange('cravingType', val)}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
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
        <div className="flex justify-end">
          <Button type="button" onClick={onSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            Save Lifestyle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
export default LifestyleForm;
