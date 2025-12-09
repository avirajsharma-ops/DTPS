import mongoose, { Schema } from 'mongoose';
import { IUser, UserRole, UserStatus } from '@/types';

const availabilitySchema = new Schema({
  day: {
    type: String,
    required: true,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  }
});

const fitnessDataSchema = new Schema({
  dailyRecords: [{
    date: String, // YYYY-MM-DD format
    steps: { type: Number, default: 0 },
    calories: { type: Number, default: 0 },
    distance: { type: Number, default: 0 }, // in meters
    heartRate: Number,
    activeMinutes: { type: Number, default: 0 },
    deviceType: String,
    lastSync: Date
  }],
  goals: {
    dailySteps: { type: Number, default: 10000 },
    dailyCalories: { type: Number, default: 500 },
    dailyDistance: { type: Number, default: 5000 }, // in meters
    dailyActiveMinutes: { type: Number, default: 60 }
  },
  preferences: {
    units: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
    notifications: { type: Boolean, default: true },
    autoSync: { type: Boolean, default: true }
  },
  connectedDevice: String,
  lastSync: Date
});

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: Object.values(UserRole),
    default: UserRole.CLIENT
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  // Dietitian specific fields
  credentials: [{
    type: String
  }],
  specializations: [{
    type: String
  }],
  experience: {
    type: Number,
    min: 0
  },
  bio: {
    type: String,
    maxlength: 1000
  },
  consultationFee: {
    type: Number,
    min: 0
  },
  availability: [availabilitySchema],
  timezone: {
    type: String,
    default: 'UTC'
  },

  // Client specific fields
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  // Additional basic info fields
  parentAccount: { type: String },
  alternativePhone: { type: String, trim: true },
  alternativeEmail: { type: String, trim: true },
  anniversary: { type: Date },
  source: { type: String },
  referralSource: { type: String },
  maritalStatus: { type: String },
  occupation: { type: String },
  targetWeightBucket: { type: String },
  sharePhotoConsent: { type: Boolean, default: false },
  height: {
    type: Number,
    min: 0
  },
  weight: {
    type: Number,
    min: 0
  },
  // Physical measurement fields (moved from lifestyle)
  heightFeet: { type: String },
  heightInch: { type: String },
  heightCm: { type: String },
  weightKg: { type: String },
  targetWeightKg: { type: String },
  idealWeightKg: { type: String },
  bmi: { type: String },
  activityLevel: {
    type: String,
    enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']
  },
healthGoals: [{
  type: String
}],

generalGoal: {
  type: String,
  enum: ['not-specified', 'weight-loss', 'weight-gain', 'disease-management'],
  default: 'not-specified'
},

  documents: [
  {
    type: {
      type: String,
      enum: ["meal-picture", "medical-report"],
      required: true,
    },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  }
],

  goals: {
    calories: { type: Number, default: 1800 },
    protein: { type: Number, default: 120 },
    carbs: { type: Number, default: 200 },
    fat: { type: Number, default: 60 },
    water: { type: Number, default: 8 },
    steps: { type: Number, default: 10000 },
    targetWeight: { type: Number },
    currentWeight: { type: Number }
  },
  medicalConditions: [{
    type: String
  }],
  allergies: [{
    type: String
  }],
  dietaryRestrictions: [{
    type: String
  }],
  assignedDietitian: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  // Support for multiple dietitians per client
  assignedDietitians: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Fitness tracking data
  fitnessData: fitnessDataSchema,

  // WooCommerce integration data
  wooCommerceData: {
    customerId: Number,
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    processingOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    processingAmount: { type: Number, default: 0 },
    completedAmount: { type: Number, default: 0 },
    firstOrderDate: Date,
    lastOrderDate: Date,
    lastSyncDate: Date,
    orders: [{
      orderId: Number,
      orderNumber: String,
      status: String,
      total: Number,
      currency: String,
      dateCreated: String,
      paymentMethod: String,
      paymentMethodTitle: String,
      transactionId: String
    }]
  }
}, {
  timestamps: true,
  autoIndex: false // Disable automatic index creation to prevent duplicate warnings
});

// Index for better query performance - define on schema before model creation

userSchema.index({ role: 1 });
userSchema.index({ assignedDietitian: 1 });
userSchema.index({ assignedDietitians: 1 });

// Password comparison method using bcrypt
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  const bcrypt = require('bcrypt');

  // If password is already hashed (starts with $2b$), use bcrypt compare
  if (this.password.startsWith('$2b$')) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  // Fallback for plain text passwords (should not happen in production)
  return this.password === candidatePassword;
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc: any, ret: any) {
    delete ret.password;
    return ret;
  }
});

const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;
