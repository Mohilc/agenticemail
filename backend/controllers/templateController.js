const Template = require('../models/Template');

// @desc    Get all templates for user
// @route   GET /api/templates
const getTemplates = async (req, res, next) => {
  try {
    const { category } = req.query;
    const query = { userId: req.user._id };
    if (category) query.category = category;

    const templates = await Template.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single template
// @route   GET /api/templates/:id
const getTemplate = async (req, res, next) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

// @desc    Create template
// @route   POST /api/templates
const createTemplate = async (req, res, next) => {
  try {
    const template = await Template.create({
      ...req.body,
      userId: req.user._id,
    });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

// @desc    Update template
// @route   PUT /api/templates/:id
const updateTemplate = async (req, res, next) => {
  try {
    const template = await Template.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete template
// @route   DELETE /api/templates/:id
const deleteTemplate = async (req, res, next) => {
  try {
    const template = await Template.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
