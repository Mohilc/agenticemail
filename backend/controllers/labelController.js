const { supabase } = require('../config/supabase');

// Helper to format labels
const formatLabel = (l) => {
  if (!l) return null;
  return {
    _id: l.id,
    id: l.id,
    name: l.name,
    color: l.color,
    userId: l.user_id,
    createdAt: l.created_at,
    updatedAt: l.updated_at
  };
};

// Helper to format emails with labels
const fetchEmailWithLabels = async (emailId) => {
  const { data: email, error: err1 } = await supabase
    .from('emails')
    .select('*')
    .eq('id', emailId)
    .single();

  if (err1) return null;

  const { data: emailLabels, error: err2 } = await supabase
    .from('email_labels_junction')
    .select('labels(id, name, color)')
    .eq('email_id', emailId);

  const labels = (emailLabels || []).map(el => el.labels).filter(Boolean);

  return {
    _id: email.id,
    id: email.id,
    subject: email.subject,
    body: email.body,
    labels: labels.map(l => ({
      _id: l.id,
      id: l.id,
      name: l.name,
      color: l.color
    }))
  };
};

// @desc    Get all labels for user
// @route   GET /api/labels
const getLabels = async (req, res, next) => {
  try {
    const { data: labels, error } = await supabase
      .from('labels')
      .select('*')
      .eq('user_id', req.user._id)
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data: (labels || []).map(formatLabel) });
  } catch (error) {
    next(error);
  }
};

// @desc    Create label
// @route   POST /api/labels
const createLabel = async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const { data: label, error } = await supabase
      .from('labels')
      .insert({
        name,
        color,
        user_id: req.user._id,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data: formatLabel(label) });
  } catch (error) {
    next(error);
  }
};

// @desc    Update label
// @route   PUT /api/labels/:id
const updateLabel = async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const { data: label, error } = await supabase
      .from('labels')
      .update({ name, color })
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .select()
      .single();

    if (error || !label) {
      return res.status(404).json({
        success: false,
        message: 'Label not found',
      });
    }

    res.json({ success: true, data: formatLabel(label) });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete label
// @route   DELETE /api/labels/:id
const deleteLabel = async (req, res, next) => {
  try {
    const { data: label, error } = await supabase
      .from('labels')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .select()
      .maybeSingle();

    if (error || !label) {
      return res.status(404).json({
        success: false,
        message: 'Label not found',
      });
    }

    // Junction deletions are handled automatically by PostgreSQL cascade deletes

    res.json({ success: true, message: 'Label deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Add label to email
// @route   POST /api/labels/:labelId/emails/:emailId
const addLabelToEmail = async (req, res, next) => {
  try {
    const { labelId, emailId } = req.params;

    // Insert label junction
    await supabase
      .from('email_labels_junction')
      .upsert({ email_id: emailId, label_id: labelId });

    const email = await fetchEmailWithLabels(emailId);
    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found',
      });
    }

    res.json({ success: true, data: email });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove label from email
// @route   DELETE /api/labels/:labelId/emails/:emailId
const removeLabelFromEmail = async (req, res, next) => {
  try {
    const { labelId, emailId } = req.params;

    await supabase
      .from('email_labels_junction')
      .delete()
      .eq('email_id', emailId)
      .eq('label_id', labelId);

    const email = await fetchEmailWithLabels(emailId);
    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found',
      });
    }

    res.json({ success: true, data: email });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  addLabelToEmail,
  removeLabelFromEmail,
};
