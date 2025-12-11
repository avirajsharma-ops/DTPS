import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ITag extends Document {
  _id: string;
  name: string;
  description?: string;
  color?: string; // Hex color code for UI display
  icon?: string; // Icon name for UI
  createdAt: Date;
  updatedAt: Date;
}

const tagSchema = new Schema<ITag>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 50,
      minlength: 1
    },
    description: {
      type: String,
      maxlength: 200,
      default: ''
    },
    color: {
      type: String,
      default: '#3B82F6', // Default blue
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/ // Validate hex color
    },
    icon: {
      type: String,
      default: 'tag' // Default icon name
    }
  },
  { timestamps: true }
);

// Unique constraint on name creates index automatically, so we don't need to call schema.index()
// The unique: true constraint handles the indexing

const Tag: Model<ITag> = mongoose.models.Tag || mongoose.model('Tag', tagSchema);

export default Tag;
