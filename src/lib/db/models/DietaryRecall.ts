import mongoose, { Schema, Document } from 'mongoose';

export interface IMealEntry {
  mealType: string;
  hour: string;
  minute: string;
  meridian: 'AM' | 'PM';
  food: string;
}

export interface IDietaryRecall extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  meals: IMealEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const mealEntrySchema = new Schema({
  mealType: {
    type: String,
    required: false,
    enum: ['Early Morning', 'BreakFast', 'Lunch', 'Evening Snack', 'Dinner', 'Post Dinner'],
  },
  hour: {
    type: String,
    required: false,
  },
  minute: {
    type: String,
    required: false,
  },
  meridian: {
    type: String,
    required: false,
    enum: ['AM', 'PM'],
  },
  food: {
    type: String,
    default: '',
  },
}, { _id: false });

const dietaryRecallSchema = new Schema<IDietaryRecall>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  meals: [mealEntrySchema],
}, {
  timestamps: true,
  autoIndex: false
});

// Compound index for efficient querying by user and date
dietaryRecallSchema.index({ userId: 1, date: -1 });

// Delete existing model to ensure schema updates are applied
if (mongoose.models.DietaryRecall) {
  delete mongoose.models.DietaryRecall;
}

const DietaryRecall = mongoose.model<IDietaryRecall>('DietaryRecall', dietaryRecallSchema);

export default DietaryRecall;
