const Joi = require('joi');

// Generic validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      });
    }

    next();
  };
};

// Auth validation schemas
const signupSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 50 characters',
    'any.required': 'Name is required',
  }),
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Please enter a valid email',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Please enter a valid email',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

// Email validation schemas
const composeEmailSchema = Joi.object({
  to: Joi.array().items(Joi.string()).min(1).required().messages({
    'array.min': 'At least one recipient is required',
    'any.required': 'Recipient is required',
  }),
  cc: Joi.array().items(Joi.string()).optional(),
  bcc: Joi.array().items(Joi.string()).optional(),
  subject: Joi.string().trim().max(200).required().messages({
    'string.max': 'Subject cannot exceed 200 characters',
    'any.required': 'Subject is required',
  }),
  body: Joi.string().required().messages({
    'any.required': 'Email body is required',
  }),
  isDraft: Joi.boolean().optional(),
  scheduledAt: Joi.date().greater('now').optional().messages({
    'date.greater': 'Scheduled time must be in the future',
  }),
  labels: Joi.array().items(Joi.string()).optional(),
});

// AI validation schemas
const aiComposeSchema = Joi.object({
  prompt: Joi.string().trim().min(1).max(2000).required().messages({
    'string.min': 'Prompt cannot be empty',
    'string.max': 'Prompt cannot exceed 2000 characters',
    'any.required': 'Prompt is required',
  }),
  tone: Joi.string()
    .valid('professional', 'casual', 'friendly', 'formal', 'persuasive')
    .optional(),
  context: Joi.string().max(5000).optional(),
});

// Label validation schema
const labelSchema = Joi.object({
  name: Joi.string().trim().min(1).max(30).required().messages({
    'string.max': 'Label name cannot exceed 30 characters',
    'any.required': 'Label name is required',
  }),
  color: Joi.string()
    .pattern(/^#([0-9A-Fa-f]{6})$/)
    .optional()
    .messages({
      'string.pattern.base': 'Color must be a valid hex color (e.g., #6366f1)',
    }),
});

// Template validation schema
const templateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  subject: Joi.string().trim().max(200).optional().allow(''),
  body: Joi.string().required(),
  category: Joi.string()
    .valid('business', 'personal', 'marketing', 'support', 'other')
    .optional(),
});

module.exports = {
  validate,
  signupSchema,
  loginSchema,
  composeEmailSchema,
  aiComposeSchema,
  labelSchema,
  templateSchema,
};
