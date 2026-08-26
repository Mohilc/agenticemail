const aiService = require('../services/aiService');

// @desc    AI-assisted email composition
// @route   POST /api/ai/compose-assist
const composeAssist = async (req, res, next) => {
  try {
    const { prompt, tone, context } = req.body;
    const result = await aiService.composeAssist(prompt, tone, context);
    res.json({ success: true, data: { content: result } });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate smart reply suggestions
// @route   POST /api/ai/smart-reply
const smartReply = async (req, res, next) => {
  try {
    const { emailContent, senderName } = req.body;
    const replies = await aiService.generateSmartReplies(emailContent, senderName);
    res.json({ success: true, data: { replies } });
  } catch (error) {
    next(error);
  }
};

// @desc    Summarize an email
// @route   POST /api/ai/summarize
const summarize = async (req, res, next) => {
  try {
    const { emailContent } = req.body;
    const summary = await aiService.summarizeEmail(emailContent);
    res.json({ success: true, data: { summary } });
  } catch (error) {
    next(error);
  }
};

// @desc    Analyze email sentiment
// @route   POST /api/ai/sentiment
const sentiment = async (req, res, next) => {
  try {
    const { emailContent } = req.body;
    const result = await aiService.analyzeSentiment(emailContent);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Detect spam
// @route   POST /api/ai/detect-spam
const detectSpam = async (req, res, next) => {
  try {
    const { emailContent, subject } = req.body;
    const result = await aiService.detectSpam(emailContent, subject);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate email subject line
// @route   POST /api/ai/generate-subject
const generateSubject = async (req, res, next) => {
  try {
    const { emailBody } = req.body;
    const subject = await aiService.generateSubject(emailBody);
    res.json({ success: true, data: { subject } });
  } catch (error) {
    next(error);
  }
};

// @desc    Categorize an email
// @route   POST /api/ai/categorize
const categorize = async (req, res, next) => {
  try {
    const { emailContent, subject } = req.body;
    const result = await aiService.categorizeEmail(emailContent, subject);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate email template using AI
// @route   POST /api/ai/generate-template
const generateTemplate = async (req, res, next) => {
  try {
    const { description, category } = req.body;
    const template = await aiService.generateTemplate(description, category);
    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  composeAssist,
  smartReply,
  summarize,
  sentiment,
  detectSpam,
  generateSubject,
  categorize,
  generateTemplate,
};
