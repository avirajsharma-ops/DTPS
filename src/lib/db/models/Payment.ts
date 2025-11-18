import mongoose, { Schema } from 'mongoose';
import { IPayment, PaymentStatus, PaymentType } from '@/types';

const paymentSchema = new Schema({
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
  type: {
    type: String,
    required: true,
    enum: Object.values(PaymentType)
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING
  },
  paymentMethod: {
    type: String,
    required: true
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  description: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes for better query performance (transactionId index is automatic due to unique: true)
paymentSchema.index({ client: 1, createdAt: -1 });
paymentSchema.index({ dietitian: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ type: 1 });

// Static method to get payment history for a client
paymentSchema.statics.getClientPaymentHistory = function(clientId: string, limit = 20, skip = 0) {
  return this.find({ client: clientId })
    .populate('dietitian', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get revenue for a dietitian
paymentSchema.statics.getDietitianRevenue = function(dietitianId: string, startDate?: Date, endDate?: Date) {
  const matchQuery: any = {
    dietitian: dietitianId,
    status: PaymentStatus.COMPLETED
  };
  
  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = startDate;
    if (endDate) matchQuery.createdAt.$lte = endDate;
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
        averageTransaction: { $avg: '$amount' }
      }
    }
  ]);
};

// Static method to get monthly revenue breakdown
paymentSchema.statics.getMonthlyRevenue = function(dietitianId: string, year: number) {
  return this.aggregate([
    {
      $match: {
        dietitian: new mongoose.Types.ObjectId(dietitianId),
        status: PaymentStatus.COMPLETED,
        createdAt: {
          $gte: new Date(year, 0, 1),
          $lt: new Date(year + 1, 0, 1)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        revenue: { $sum: '$amount' },
        transactions: { $sum: 1 }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);
};

// Static method to get payment statistics
paymentSchema.statics.getPaymentStats = function(dietitianId: string) {
  return this.aggregate([
    {
      $match: {
        dietitian: new mongoose.Types.ObjectId(dietitianId)
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
};

// Method to mark payment as completed
paymentSchema.methods.markAsCompleted = function(transactionId: string) {
  this.status = PaymentStatus.COMPLETED;
  this.transactionId = transactionId;
  return this.save();
};

// Method to mark payment as failed
paymentSchema.methods.markAsFailed = function() {
  this.status = PaymentStatus.FAILED;
  return this.save();
};

// Method to refund payment
paymentSchema.methods.refund = function() {
  this.status = PaymentStatus.REFUNDED;
  return this.save();
};

const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', paymentSchema);

export default Payment;
