const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [100, 'Template name cannot exceed 100 characters'],
    },
    subject: {
      type: String,
      default: '',
      trim: true,
    },
    body: {
      type: String,
      required: [true, 'Template body is required'],
    },
    category: {
      type: String,
      enum: ['business', 'personal', 'marketing', 'support', 'other'],
      default: 'other',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isAIGenerated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

templateSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Template', templateSchema);
