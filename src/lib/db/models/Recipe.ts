import mongoose, { Schema } from 'mongoose';
import { IRecipe, INutrition } from '@/types';
import Counter from './Counter';

const nutritionSchema = new Schema<INutrition>({
  calories: {
    type: Number,
    required: true,
    min: 0
  },
  protein: {
    type: Number,
    required: true,
    min: 0
  },
  carbs: {
    type: Number,
    required: true,
    min: 0
  },
  fat: {
    type: Number,
    required: true,
    min: 0
  },
  fiber: {
    type: Number,
    min: 0
  },
  sugar: {
    type: Number,
    min: 0
  },
  sodium: {
    type: Number,
    min: 0
  }
});

const ingredientSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  remarks: {
    type: String,
    trim: true
  }
});

const recipeSchema = new Schema({
  uuid: {
    type: String,
    unique: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  ingredients: {
    type: [ingredientSchema],
    required: true,
    validate: {
      validator: function(ingredients: any[]) {
        return ingredients.length > 0;
      },
      message: 'Recipe must have at least one ingredient'
    }
  },
  instructions: {
    type: [String],
    required: true,
    validate: {
      validator: function(instructions: string[]) {
        return instructions.length > 0;
      },
      message: 'Recipe must have at least one instruction'
    }
  },
  prepTime: {
    type: Number,
    required: true,
    min: 0
  },
  cookTime: {
    type: Number,
    required: true,
    min: 0
  },
  servings: {
    type: mongoose.Schema.Types.Mixed, // Allow both string and number
    required: true,
    validate: {
      validator: function(value: any) {
        // Accept numbers >= 1 or non-empty strings
        return (typeof value === 'number' && value >= 1) ||
               (typeof value === 'string' && value.trim().length > 0);
      },
      message: 'Servings must be a positive number or a non-empty string'
    }
  },
  nutrition: {
    type: nutritionSchema,
    required: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  dietaryRestrictions: [{
    type: String,
    trim: true
  }],
  allergens: [{
    type: String,
    enum: ['nuts', 'dairy', 'eggs', 'soy', 'gluten', 'shellfish', 'fish', 'sesame']
  }],
  medicalContraindications: [{
    type: String,
    trim: true
  }],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  image: {
    type: String
  },
  images: [{
    url: String,
    caption: String,
    isMain: { type: Boolean, default: false }
  }],
  video: {
    url: String,
    thumbnail: String,
    duration: Number // in seconds
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  rating: {
    average: { type: Number, min: 0, max: 5, default: 0 },
    count: { type: Number, default: 0 }
  },
  reviews: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: String,
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    images: [String],
    helpful: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  }],

  usageCount: { type: Number, default: 0 },
  favorites: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  autoIndex: false
});

// Indexes for better search performance
recipeSchema.index({ name: 'text', description: 'text', tags: 'text', 'ingredients.name': 'text' });
recipeSchema.index({ tags: 1 });
recipeSchema.index({ category: 1, isPublic: 1 });
recipeSchema.index({ cuisine: 1, isPublic: 1 });
recipeSchema.index({ dietaryRestrictions: 1 });
recipeSchema.index({ difficulty: 1 });
recipeSchema.index({ createdBy: 1 });
recipeSchema.index({ 'nutrition.calories': 1 });
recipeSchema.index({ 'rating.average': -1 });
recipeSchema.index({ usageCount: -1 });
recipeSchema.index({ createdAt: -1 });
recipeSchema.index({ isPublic: 1, isPremium: 1 });

// Pre-save hook to generate auto-incrementing uuid starting from 10
recipeSchema.pre('save', async function(next) {
  if (this.isNew && !this.uuid) {
    const counter = await Counter.findByIdAndUpdate(
      'recipeId',
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    // Ensure uuid starts from 10 (add 9 offset if counter is below 10)
    const uuidNumber = counter.seq < 10 ? counter.seq + 9 : counter.seq;
    this.uuid = String(uuidNumber);
  }
  next();
});

// Virtual for total time
recipeSchema.virtual('totalTime').get(function() {
  return this.prepTime + this.cookTime;
});

// Virtual for nutrition per serving
recipeSchema.virtual('nutritionPerServing').get(function() {
  // Extract numeric value from servings (handle both number and string)
  let servingCount = 1;
  if (typeof this.servings === 'number') {
    servingCount = this.servings;
  } else if (typeof this.servings === 'string') {
    // Extract number from string like "2.5 TSP" -> 2.5
    const match = this.servings.match(/^(\d+(?:\.\d+)?)/);
    servingCount = match ? parseFloat(match[1]) : 1;
  }

  // Ensure we don't divide by zero
  servingCount = servingCount > 0 ? servingCount : 1;

  return {
    calories: Math.round(this.nutrition.calories / servingCount),
    protein: Math.round((this.nutrition.protein / servingCount) * 10) / 10,
    carbs: Math.round((this.nutrition.carbs / servingCount) * 10) / 10,
    fat: Math.round((this.nutrition.fat / servingCount) * 10) / 10,
    fiber: this.nutrition.fiber ? Math.round((this.nutrition.fiber / servingCount) * 10) / 10 : undefined,
    sugar: this.nutrition.sugar ? Math.round((this.nutrition.sugar / servingCount) * 10) / 10 : undefined,
    sodium: this.nutrition.sodium ? Math.round(this.nutrition.sodium / servingCount) : undefined
  };
});

// Static method to search recipes with advanced filters
recipeSchema.statics.searchRecipes = function(query: string, filters?: any) {
  const searchQuery: any = { isPublic: true };

  if (query) {
    searchQuery.$text = { $search: query };
  }

  if (filters) {
    if (filters.category) {
      searchQuery.category = filters.category;
    }

    if (filters.cuisine) {
      searchQuery.cuisine = filters.cuisine;
    }

    if (filters.difficulty) {
      searchQuery.difficulty = filters.difficulty;
    }

    if (filters.tags && filters.tags.length > 0) {
      searchQuery.tags = { $in: filters.tags };
    }

    if (filters.dietaryRestrictions && filters.dietaryRestrictions.length > 0) {
      searchQuery.dietaryRestrictions = { $in: filters.dietaryRestrictions };
    }

    if (filters.excludeAllergens && filters.excludeAllergens.length > 0) {
      searchQuery.allergens = { $nin: filters.excludeAllergens };
    }

    if (filters.maxCalories) {
      searchQuery['nutrition.calories'] = { $lte: filters.maxCalories };
    }

    if (filters.minCalories) {
      searchQuery['nutrition.calories'] = { ...searchQuery['nutrition.calories'], $gte: filters.minCalories };
    }

    if (filters.minProtein) {
      searchQuery['nutrition.protein'] = { $gte: filters.minProtein };
    }

    if (filters.maxPrepTime) {
      searchQuery.prepTime = { $lte: filters.maxPrepTime };
    }

    if (filters.maxCookTime) {
      searchQuery.cookTime = { $lte: filters.maxCookTime };
    }

    if (filters.minRating) {
      searchQuery['rating.average'] = { $gte: filters.minRating };
    }

    if (filters.isPremium !== undefined) {
      searchQuery.isPremium = filters.isPremium;
    }
  }

  const sortOptions: any = {};
  if (filters?.sortBy) {
    switch (filters.sortBy) {
      case 'rating':
        sortOptions['rating.average'] = -1;
        break;
      case 'popular':
        sortOptions.usageCount = -1;
        break;
      case 'newest':
        sortOptions.createdAt = -1;
        break;
      case 'prepTime':
        sortOptions.prepTime = 1;
        break;
      case 'calories':
        sortOptions['nutrition.calories'] = 1;
        break;
      default:
        sortOptions.createdAt = -1;
    }
  } else {
    sortOptions.createdAt = -1;
  }

  return this.find(searchQuery)
    .sort(sortOptions)
    .populate('createdBy', 'firstName lastName')
    .limit(filters?.limit || 20)
    .skip(filters?.skip || 0);
};

// Method to get similar recipes
recipeSchema.statics.getSimilarRecipes = function(recipeId: string, limit = 5) {
  return this.findById(recipeId).then((recipe: any) => {
    if (!recipe) return [];

    return this.find({
      _id: { $ne: recipeId },
      isPublic: true,
      $or: [
        { category: recipe.category },
        { cuisine: recipe.cuisine },
        { tags: { $in: recipe.tags } },
        { dietaryRestrictions: { $in: recipe.dietaryRestrictions } }
      ]
    })
    .sort({ 'rating.average': -1, usageCount: -1 })
    .limit(limit)
    .populate('createdBy', 'firstName lastName');
  });
};

// Method to get trending recipes
recipeSchema.statics.getTrendingRecipes = function(limit = 10) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  return this.find({
    isPublic: true,
    createdAt: { $gte: oneWeekAgo }
  })
  .sort({ usageCount: -1, 'rating.average': -1 })
  .limit(limit)
  .populate('createdBy', 'firstName lastName');
};

// Ensure virtual fields are serialized
recipeSchema.set('toJSON', {
  virtuals: true
});

const Recipe = mongoose.models.Recipe || mongoose.model<IRecipe>('Recipe', recipeSchema);

export default Recipe;
