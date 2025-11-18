import mongoose, { Schema } from 'mongoose';

export interface ISystemAlert {
  _id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  createdBy?: Schema.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const systemAlertSchema = new Schema<ISystemAlert>({
  type: { type: String, enum: ['info', 'warning', 'error', 'success'], default: 'info' },
  message: { type: String, required: true, maxlength: 500 },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  category: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default (mongoose.models.SystemAlert as mongoose.Model<ISystemAlert>) ||
  mongoose.model<ISystemAlert>('SystemAlert', systemAlertSchema);

