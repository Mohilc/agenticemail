const mongoose = require('mongoose');

const labelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Label name is required'],
      trim: true,
      maxlength: [30, 'Label name cannot exceed 30 characters'],
    },
    color: {
      type: String,
      default: '#6366f1', // Default indigo
      match: [/^#([0-9A-Fa-f]{6})$/, 'Please enter a valid hex color'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique label name per user
labelSchema.index({ name: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Label', labelSchema);
