const { supabase } = require('../config/supabase');

// Helper to format templates
const formatTemplate = (t) => {
  if (!t) return null;
  return {
    _id: t.id,
    id: t.id,
    name: t.name,
    subject: t.subject || '',
    body: t.body,
    category: t.category || 'other',
    userId: t.user_id,
    isAIGenerated: t.is_ai_generated || false,
    createdAt: t.created_at,
    updatedAt: t.updated_at
  };
};

// @desc    Get all templates for user
// @route   GET /api/templates
const getTemplates = async (req, res, next) => {
  try {
    const { category } = req.query;
    let dbQuery = supabase
      .from('templates')
      .select('*')
      .eq('user_id', req.user._id);

    if (category) {
      dbQuery = dbQuery.eq('category', category);
    }

    const { data: templates, error } = await dbQuery.order('created_at', { ascending: false });
    if (error) throw error;

    res.json({ success: true, data: (templates || []).map(formatTemplate) });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single template
// @route   GET /api/templates/:id
const getTemplate = async (req, res, next) => {
  try {
    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .maybeSingle();

    if (error || !template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    res.json({ success: true, data: formatTemplate(template) });
  } catch (error) {
    next(error);
  }
};

// @desc    Create template
// @route   POST /api/templates
const createTemplate = async (req, res, next) => {
  try {
    const { name, subject, body, category, isAIGenerated } = req.body;
    const { data: template, error } = await supabase
      .from('templates')
      .insert({
        name,
        subject: subject || '',
        body,
        category: category || 'other',
        user_id: req.user._id,
        is_ai_generated: isAIGenerated || false
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data: formatTemplate(template) });
  } catch (error) {
    next(error);
  }
};

// @desc    Update template
// @route   PUT /api/templates/:id
const updateTemplate = async (req, res, next) => {
  try {
    const { name, subject, body, category, isAIGenerated } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (subject !== undefined) updates.subject = subject;
    if (body !== undefined) updates.body = body;
    if (category !== undefined) updates.category = category;
    if (isAIGenerated !== undefined) updates.is_ai_generated = isAIGenerated;

    const { data: template, error } = await supabase
      .from('templates')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .select()
      .single();

    if (error || !template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    res.json({ success: true, data: formatTemplate(template) });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete template
// @route   DELETE /api/templates/:id
const deleteTemplate = async (req, res, next) => {
  try {
    const { data: template, error } = await supabase
      .from('templates')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .select()
      .maybeSingle();

    if (error || !template) {
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
