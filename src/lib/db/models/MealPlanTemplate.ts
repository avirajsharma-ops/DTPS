import mongoose, { Schema, Document } from 'mongoose';

// Meal item interface
interface IMealItem {
  recipeId?: mongoose.Types.ObjectId;
  customMeal?: {
    name: string;
    description?: string;
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
    };
  };
  servings: number;
  notes?: string;
}

// Daily meal plan interface
interface IDailyMeal {
  day: number; // 1-7 for days of week
  breakfast: IMealItem[];
  morningSnack?: IMealItem[];
  lunch: IMealItem[];
  afternoonSnack?: IMealItem[];
  dinner: IMealItem[];
  eveningSnack?: IMealItem[];
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
  notes?: string;
}

// Meal plan template interface
export interface IMealPlanTemplate extends Document {
  name: string;
  description?: string;
  category: 'weight-loss' | 'weight-gain' | 'maintenance' | 'muscle-gain' | 'diabetes' | 'heart-healthy' | 'keto' | 'vegan' | 'custom';
  duration: number; // Number of days (7, 14, 21, 30, etc.)
  targetCalories: {
    min: number;
    max: number;
  };
  targetMacros: {
    protein: { min: number; max: number }; // in grams
    carbs: { min: number; max: number };
    fat: { min: number; max: number };
  };
  dietaryRestrictions: string[];
  tags: string[];
  meals: IDailyMeal[];
  isPublic: boolean;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  averageRating?: number;
  reviews?: {
    userId: mongoose.Types.ObjectId;
    rating: number;
    comment?: string;
    createdAt: Date;
  }[];
}

// Meal item schema
const MealItemSchema = new Schema({
  recipeId: {
    type: Schema.Types.ObjectId,
    ref: 'Recipe',
    required: function(this: any) { return !this.customMeal; }
  },
  customMeal: {
    name: { type: String, required: function(this: any) { return !this.recipeId; } },
    description: String,
    nutrition: {
      calories: { type: Number, required: true, min: 0 },
      protein: { type: Number, required: true, min: 0 },
      carbs: { type: Number, required: true, min: 0 },
      fat: { type: Number, required: true, min: 0 },
      fiber: { type: Number, min: 0, default: 0 },
      sugar: { type: Number, min: 0, default: 0 },
      sodium: { type: Number, min: 0, default: 0 }
    }
  },
  servings: { type: Number, required: true, min: 0.1, default: 1 },
  notes: String
}, { _id: false });

// Daily meal schema
const DailyMealSchema = new Schema({
  day: { type: Number, required: true, min: 1, max: 7 },
  breakfast: [MealItemSchema],
  morningSnack: [MealItemSchema],
  lunch: [MealItemSchema],
  afternoonSnack: [MealItemSchema],
  dinner: [MealItemSchema],
  eveningSnack: [MealItemSchema],
  totalNutrition: {
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    fiber: { type: Number, min: 0, default: 0 },
    sugar: { type: Number, min: 0, default: 0 },
    sodium: { type: Number, min: 0, default: 0 }
  },
  notes: String
}, { _id: false });

// Main meal plan template schema
const MealPlanTemplateSchema = new Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 200,
    index: true
  },
  description: { 
    type: String, 
    maxlength: 1000 
  },
  category: {
    type: String,
    required: true,
    enum: ['weight-loss', 'weight-gain', 'maintenance', 'muscle-gain', 'diabetes', 'heart-healthy', 'keto', 'vegan', 'custom'],
    index: true
  },
  duration: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 365,
    index: true
  },
  targetCalories: {
    min: { type: Number, required: true, min: 800 },
    max: { type: Number, required: true, max: 5000 }
  },
  targetMacros: {
    protein: {
      min: { type: Number, required: true, min: 0 },
      max: { type: Number, required: true, min: 0 }
    },
    carbs: {
      min: { type: Number, required: true, min: 0 },
      max: { type: Number, required: true, min: 0 }
    },
    fat: {
      min: { type: Number, required: true, min: 0 },
      max: { type: Number, required: true, min: 0 }
    }
  },
  dietaryRestrictions: [{ 
    type: String, 
    trim: true,
    index: true
  }],
  tags: [{ 
    type: String, 
    trim: true,
    index: true
  }],
  meals: [DailyMealSchema],
  isPublic: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  usageCount: { type: Number, default: 0, min: 0 },
  averageRating: { type: Number, min: 1, max: 5 },
  reviews: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 500 },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
MealPlanTemplateSchema.index({ name: 'text', description: 'text', tags: 'text' });
MealPlanTemplateSchema.index({ category: 1, isPublic: 1, isActive: 1 });
MealPlanTemplateSchema.index({ createdBy: 1, isActive: 1 });
MealPlanTemplateSchema.index({ 'targetCalories.min': 1, 'targetCalories.max': 1 });

// Virtual for average daily calories
MealPlanTemplateSchema.virtual('averageDailyCalories').get(function() {
  if (!this.meals || this.meals.length === 0) return 0;
  const totalCalories = this.meals.reduce((sum, day) => sum + (day.totalNutrition?.calories || 0), 0);
  return Math.round(totalCalories / this.meals.length);
});

// Virtual for total recipes used
MealPlanTemplateSchema.virtual('totalRecipes').get(function() {
  if (!this.meals) return 0;
  let count = 0;
  this.meals.forEach((day: any) => {
    ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner', 'eveningSnack'].forEach(mealType => {
      if (day[mealType]) {
        count += day[mealType].filter((item: any) => item.recipeId).length;
      }
    });
  });
  return count;
});

// Pre-save middleware to calculate total nutrition
MealPlanTemplateSchema.pre('save', function(next) {
  if (this.isModified('meals')) {
    this.meals.forEach(day => {
      const nutrition = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0
      };

      ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner', 'eveningSnack'].forEach(mealType => {
        if ((day as any)[mealType]) {
          (day as any)[mealType].forEach((item: any) => {
            const itemNutrition = item.customMeal?.nutrition || item.recipeId?.nutrition || {};
            const servings = item.servings || 1;
            
            nutrition.calories += (itemNutrition.calories || 0) * servings;
            nutrition.protein += (itemNutrition.protein || 0) * servings;
            nutrition.carbs += (itemNutrition.carbs || 0) * servings;
            nutrition.fat += (itemNutrition.fat || 0) * servings;
            nutrition.fiber += (itemNutrition.fiber || 0) * servings;
            nutrition.sugar += (itemNutrition.sugar || 0) * servings;
            nutrition.sodium += (itemNutrition.sodium || 0) * servings;
          });
        }
      });

      day.totalNutrition = {
        calories: Math.round(nutrition.calories),
        protein: Math.round(nutrition.protein * 10) / 10,
        carbs: Math.round(nutrition.carbs * 10) / 10,
        fat: Math.round(nutrition.fat * 10) / 10,
        fiber: Math.round(nutrition.fiber * 10) / 10,
        sugar: Math.round(nutrition.sugar * 10) / 10,
        sodium: Math.round(nutrition.sodium * 10) / 10
      };
    });
  }
  next();
});

export default mongoose.models.MealPlanTemplate || mongoose.model<IMealPlanTemplate>('MealPlanTemplate', MealPlanTemplateSchema);
