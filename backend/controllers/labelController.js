const Label = require('../models/Label');
const Email = require('../models/Email');

// @desc    Get all labels for user
// @route   GET /api/labels
const getLabels = async (req, res, next) => {
  try {
    const labels = await Label.find({ userId: req.user._id }).sort({ name: 1 });
    res.json({ success: true, data: labels });
  } catch (error) {
    next(error);
  }
};

// @desc    Create label
// @route   POST /api/labels
const createLabel = async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const label = await Label.create({
      name,
      color,
      userId: req.user._id,
    });
    res.status(201).json({ success: true, data: label });
  } catch (error) {
    next(error);
  }
};

// @desc    Update label
// @route   PUT /api/labels/:id
const updateLabel = async (req, res, next) => {
  try {
    const label = await Label.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!label) {
      return res.status(404).json({
        success: false,
        message: 'Label not found',
      });
    }

    res.json({ success: true, data: label });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete label
// @route   DELETE /api/labels/:id
const deleteLabel = async (req, res, next) => {
  try {
    const label = await Label.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!label) {
      return res.status(404).json({
        success: false,
        message: 'Label not found',
      });
    }

    // Remove label from all emails
    await Email.updateMany(
      { labels: req.params.id },
      { $pull: { labels: req.params.id } }
    );

    res.json({ success: true, message: 'Label deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Add label to email
// @route   POST /api/labels/:labelId/emails/:emailId
const addLabelToEmail = async (req, res, next) => {
  try {
    const email = await Email.findByIdAndUpdate(
      req.params.emailId,
      { $addToSet: { labels: req.params.labelId } },
      { new: true }
    ).populate('labels', 'name color');

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
    const email = await Email.findByIdAndUpdate(
      req.params.emailId,
      { $pull: { labels: req.params.labelId } },
      { new: true }
    ).populate('labels', 'name color');

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
