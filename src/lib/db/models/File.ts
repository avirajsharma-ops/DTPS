import mongoose from 'mongoose';

const FileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  data: {
    type: String, // Base64 encoded file data
    required: true
  },
  type: {
    type: String,
    enum: ['avatar', 'document', 'recipe-image', 'message', 'progress-photo'],
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
FileSchema.index({ uploadedBy: 1, type: 1 });
FileSchema.index({ filename: 1 });

export const File = mongoose.models.File || mongoose.model('File', FileSchema);
