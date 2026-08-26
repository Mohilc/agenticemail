const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    to: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    cc: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    bcc: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    body: {
      type: String,
      required: [true, 'Email body is required'],
    },
    snippet: {
      type: String,
      default: '',
    },
    labels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Label',
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
    isStarred: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    isTrash: {
      type: Boolean,
      default: false,
    },
    isSpam: {
      type: Boolean,
      default: false,
    },
    isDraft: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    attachments: [
      {
        filename: String,
        url: String,
        size: Number,
        mimetype: String,
      },
    ],
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email',
      default: null,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email',
      default: null,
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', null],
      default: null,
    },
    sentimentScore: {
      type: Number,
      default: null,
    },
    category: {
      type: String,
      enum: ['primary', 'social', 'promotions', 'updates', 'forums'],
      default: 'primary',
    },
    aiSummary: {
      type: String,
      default: null,
    },
    folder: {
      type: String,
      enum: ['inbox', 'sent', 'drafts', 'trash', 'spam', 'archive'],
      default: 'inbox',
    },
  },
  {
    timestamps: true,
  }
);

// Create snippet from body before saving
emailSchema.pre('save', function (next) {
  if (this.isModified('body') && this.body) {
    // Strip HTML tags and take first 150 chars
    const plainText = this.body.replace(/<[^>]*>/g, '').trim();
    this.snippet = plainText.substring(0, 150);
  }
  next();
});

// Indexes for common queries
emailSchema.index({ from: 1, createdAt: -1 });
emailSchema.index({ to: 1, createdAt: -1 });
emailSchema.index({ folder: 1, createdAt: -1 });
emailSchema.index({ subject: 'text', body: 'text' });
emailSchema.index({ threadId: 1 });
emailSchema.index({ scheduledAt: 1, isDraft: 1 });

module.exports = mongoose.model('Email', emailSchema);
