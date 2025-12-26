import mongoose from 'mongoose';

// Delete cached model if it exists to ensure schema updates are applied
if (mongoose.models.File) {
  delete mongoose.models.File;
}

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
    required: false // Make optional for ImageKit uploads
  },
  type: {
    type: String,
    enum: ['avatar', 'document', 'recipe-image', 'message', 'progress-photo', 'progress', 'note-attachment', 'medical-report'],
    required: true
  },
  localPath: {
    type: String,
    default: null
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

export const File = mongoose.model('File', FileSchema);
