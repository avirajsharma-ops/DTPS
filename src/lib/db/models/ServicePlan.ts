import mongoose, { Schema, Document } from 'mongoose';

// Interface for pricing tier based on duration
export interface IPricingTier {
  durationDays: number;
  durationLabel: string; // e.g., "7 Days", "1 Month", "3 Months"
  amount: number;
  isActive: boolean;
}

// Interface for the service plan
export interface IServicePlan extends Document {
  _id: string;
  name: string;
  category: 'weight-loss' | 'weight-gain' | 'muscle-gain' | 'diabetes' | 'pcos' | 'thyroid' | 'general-wellness' | 'detox' | 'sports-nutrition' | 'custom';
  description?: string;
  pricingTiers: IPricingTier[];
  features: string[];
  isActive: boolean;
  maxDiscountPercent: number; // Max 40%
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for client's purchased plan
export interface IClientPurchase extends Document {
  _id: string;
  client: mongoose.Types.ObjectId;
  dietitian: mongoose.Types.ObjectId;
  servicePlan?: mongoose.Types.ObjectId;
  paymentLink?: mongoose.Types.ObjectId;
  otherPlatformPayment?: mongoose.Types.ObjectId;
  
  // Plan details at time of purchase
  planName: string;
  planCategory: string;
  durationDays: number;
  durationLabel: string;
  baseAmount: number;
  discountPercent: number;
  taxPercent: number;
  finalAmount: number;
  
  // Dates
  purchaseDate: Date;
  startDate: Date;
  endDate: Date;
  
  // Status
  status: 'active' | 'expired' | 'cancelled';
  
  // Meal plan tracking
  mealPlanCreated: boolean;
  mealPlanId?: mongoose.Types.ObjectId;
  daysUsed: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// Pricing tier schema
const pricingTierSchema = new Schema({
  durationDays: {
    type: Number,
    required: true,
    min: 1
  },
  durationLabel: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: true });

// Service plan schema
const servicePlanSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  category: {
    type: String,
    required: true,
    enum: ['weight-loss', 'weight-gain', 'muscle-gain', 'diabetes', 'pcos', 'thyroid', 'general-wellness', 'detox', 'sports-nutrition', 'custom']
  },
  description: {
    type: String,
    maxlength: 10000 // Increased to support rich text HTML content
  },
  pricingTiers: [pricingTierSchema],
  features: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  maxDiscountPercent: {
    type: Number,
    default: 40,
    min: 0,
    max: 40
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  autoIndex: false
});

// Client purchase schema
const clientPurchaseSchema = new Schema({
  client: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dietitian: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  servicePlan: {
    type: Schema.Types.ObjectId,
    ref: 'ServicePlan',
    required: false
  },
  paymentLink: {
    type: Schema.Types.ObjectId,
    ref: 'PaymentLink',
    required: false
  },
  
  // Reference to other platform payment (if payment was made via other platform)
  otherPlatformPayment: {
    type: Schema.Types.ObjectId,
    ref: 'OtherPlatformPayment',
  },
  
  // Plan details at time of purchase
  planName: {
    type: String,
    required: true
  },
  planCategory: {
    type: String,
    required: true
  },
  durationDays: {
    type: Number,
    required: true,
    min: 1
  },
  durationLabel: {
    type: String,
    required: true
  },
  baseAmount: {
    type: Number,
    required: true,
    min: 0
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 40
  },
  taxPercent: {
    type: Number,
    default: 0,
    min: 0
  },
  finalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Dates
  purchaseDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  
  // Status
  status: {
    type: String,
    required: true,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active'
  },
  
  // Meal plan tracking
  mealPlanCreated: {
    type: Boolean,
    default: false
  },
  mealPlanId: {
    type: Schema.Types.ObjectId,
    ref: 'ClientMealPlan'
  },
  daysUsed: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  autoIndex: false
});

// Indexes
servicePlanSchema.index({ name: 1, category: 1 });
servicePlanSchema.index({ isActive: 1, category: 1 });
clientPurchaseSchema.index({ client: 1, status: 1 });
clientPurchaseSchema.index({ client: 1, endDate: -1 });

// Static method to get active pricing for a plan
servicePlanSchema.statics.getActivePricingTiers = function(planId: string) {
  return this.findById(planId).select('name category pricingTiers maxDiscountPercent').lean();
};

// Static method to get client's active purchase
clientPurchaseSchema.statics.getClientActivePurchase = function(clientId: string) {
  return this.findOne({
    client: clientId,
    status: 'active',
    endDate: { $gte: new Date() }
  })
  .populate('servicePlan', 'name category')
  .sort({ endDate: -1 });
};

// Method to check remaining days
clientPurchaseSchema.methods.getRemainingDays = function() {
  const now = new Date();
  const endDate = new Date(this.endDate);
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// Method to check if can create meal plan
clientPurchaseSchema.methods.canCreateMealPlan = function(requestedDays: number) {
  const remainingDays = this.getRemainingDays();
  return {
    canCreate: this.status === 'active' && remainingDays >= requestedDays,
    remainingDays,
    maxDays: remainingDays,
    message: this.status !== 'active' 
      ? 'Purchase is not active' 
      : remainingDays < requestedDays 
        ? `Only ${remainingDays} days remaining in plan`
        : 'OK'
  };
};

// Clear cached models to prevent schema conflicts
delete mongoose.models.ServicePlan;
delete mongoose.models.ClientPurchase;

const ServicePlan = mongoose.model<IServicePlan>('ServicePlan', servicePlanSchema);
const ClientPurchase = mongoose.model<IClientPurchase>('ClientPurchase', clientPurchaseSchema);

export { ServicePlan, ClientPurchase };
export default ServicePlan;
