const Email = require('../models/Email');
const User = require('../models/User');
const { getIO } = require('../config/socket');
const { getEmailThread } = require('../services/emailService');

// @desc    Compose and send email
// @route   POST /api/emails
const composeEmail = async (req, res, next) => {
  try {
    const { to, cc, bcc, subject, body, isDraft, scheduledAt, labels } = req.body;

    // Resolve recipient emails to user IDs
    const recipientIds = await User.find({ email: { $in: to } }).select('_id');
    if (recipientIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid recipients found',
      });
    }

    const ccIds = cc ? await User.find({ email: { $in: cc } }).select('_id') : [];
    const bccIds = bcc ? await User.find({ email: { $in: bcc } }).select('_id') : [];

    // Create the sent email for the sender
    const sentEmail = await Email.create({
      from: req.user._id,
      to: recipientIds.map((r) => r._id),
      cc: ccIds.map((r) => r._id),
      bcc: bccIds.map((r) => r._id),
      subject,
      body,
      labels: labels || [],
      isDraft: isDraft || false,
      scheduledAt: scheduledAt || null,
      folder: isDraft ? 'drafts' : scheduledAt ? 'drafts' : 'sent',
      sentAt: isDraft || scheduledAt ? null : new Date(),
    });

    // If not a draft and not scheduled, create inbox copies for recipients
    if (!isDraft && !scheduledAt) {
      const allRecipients = [
        ...recipientIds.map((r) => r._id),
        ...ccIds.map((r) => r._id),
        ...bccIds.map((r) => r._id),
      ];

      // Deduplicate
      const uniqueRecipients = [...new Set(allRecipients.map(String))];

      for (const recipientId of uniqueRecipients) {
        const inboxEmail = await Email.create({
          from: req.user._id,
          to: recipientIds.map((r) => r._id),
          cc: ccIds.map((r) => r._id),
          subject,
          body,
          folder: 'inbox',
          threadId: sentEmail._id,
          parentId: sentEmail._id,
          sentAt: new Date(),
        });

        // Real-time notification via Socket.io
        try {
          const io = getIO();
          const populatedEmail = await Email.findById(inboxEmail._id)
            .populate('from', 'name email avatar');
          io.to(recipientId.toString()).emit('newEmail', populatedEmail);
        } catch (socketErr) {
          // Socket not initialized, skip
        }
      }
    }

    const populatedEmail = await Email.findById(sentEmail._id)
      .populate('from', 'name email avatar')
      .populate('to', 'name email avatar');

    res.status(201).json({ success: true, data: populatedEmail });
  } catch (error) {
    next(error);
  }
};

// @desc    Get emails by folder
// @route   GET /api/emails/:folder
const getEmailsByFolder = async (req, res, next) => {
  try {
    const { folder } = req.params;
    const { page = 1, limit = 20, category, label } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    switch (folder) {
      case 'inbox':
        query = { to: req.user._id, folder: 'inbox', isTrash: false, isSpam: false };
        break;
      case 'sent':
        query = { from: req.user._id, folder: 'sent', isTrash: false };
        break;
      case 'drafts':
        query = { from: req.user._id, folder: 'drafts', isDraft: true };
        break;
      case 'starred':
        query = {
          $or: [{ to: req.user._id }, { from: req.user._id }],
          isStarred: true,
          isTrash: false,
        };
        break;
      case 'trash':
        query = {
          $or: [{ to: req.user._id }, { from: req.user._id }],
          isTrash: true,
        };
        break;
      case 'spam':
        query = { to: req.user._id, isSpam: true, isTrash: false };
        break;
      case 'archive':
        query = {
          $or: [{ to: req.user._id }, { from: req.user._id }],
          isArchived: true,
          isTrash: false,
        };
        break;
      default:
        query = { to: req.user._id, folder: 'inbox', isTrash: false, isSpam: false };
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by label
    if (label) {
      query.labels = label;
    }

    const emails = await Email.find(query)
      .populate('from', 'name email avatar')
      .populate('to', 'name email avatar')
      .populate('labels', 'name color')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Email.countDocuments(query);

    res.json({
      success: true,
      data: emails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single email
// @route   GET /api/emails/detail/:id
const getEmail = async (req, res, next) => {
  try {
    const email = await Email.findById(req.params.id)
      .populate('from', 'name email avatar')
      .populate('to', 'name email avatar')
      .populate('cc', 'name email avatar')
      .populate('labels', 'name color');

    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found',
      });
    }

    // Mark as read if it's in the user's inbox
    if (
      email.to.some((u) => u._id.toString() === req.user._id.toString()) &&
      !email.isRead
    ) {
      email.isRead = true;
      await email.save();
    }

    res.json({ success: true, data: email });
  } catch (error) {
    next(error);
  }
};

// @desc    Get email thread
// @route   GET /api/emails/thread/:id
const getThread = async (req, res, next) => {
  try {
    const thread = await getEmailThread(req.params.id);
    res.json({ success: true, data: thread });
  } catch (error) {
    next(error);
  }
};

// @desc    Update email (labels, star, read, etc.)
// @route   PATCH /api/emails/:id
const updateEmail = async (req, res, next) => {
  try {
    const allowedUpdates = [
      'isRead',
      'isStarred',
      'isArchived',
      'isTrash',
      'isSpam',
      'labels',
      'category',
      'folder',
    ];
    const updates = {};

    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const email = await Email.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('from', 'name email avatar')
      .populate('to', 'name email avatar')
      .populate('labels', 'name color');

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

// @desc    Delete email permanently
// @route   DELETE /api/emails/:id
const deleteEmail = async (req, res, next) => {
  try {
    const email = await Email.findById(req.params.id);

    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found',
      });
    }

    await email.deleteOne();
    res.json({ success: true, message: 'Email deleted permanently' });
  } catch (error) {
    next(error);
  }
};

// @desc    Move email to trash
// @route   PATCH /api/emails/:id/trash
const moveToTrash = async (req, res, next) => {
  try {
    const email = await Email.findByIdAndUpdate(
      req.params.id,
      { isTrash: true, folder: 'trash' },
      { new: true }
    );

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

// @desc    Search emails
// @route   GET /api/emails/search
const searchEmails = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const emails = await Email.find({
      $and: [
        { $or: [{ to: req.user._id }, { from: req.user._id }] },
        { $text: { $search: q } },
        { isTrash: false },
      ],
    })
      .populate('from', 'name email avatar')
      .populate('to', 'name email avatar')
      .populate('labels', 'name color')
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Email.countDocuments({
      $and: [
        { $or: [{ to: req.user._id }, { from: req.user._id }] },
        { $text: { $search: q } },
        { isTrash: false },
      ],
    });

    res.json({
      success: true,
      data: emails,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get email counts per folder
// @route   GET /api/emails/counts
const getEmailCounts = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [inbox, sent, drafts, starred, trash, spam, unread] =
      await Promise.all([
        Email.countDocuments({ to: userId, folder: 'inbox', isTrash: false, isSpam: false }),
        Email.countDocuments({ from: userId, folder: 'sent', isTrash: false }),
        Email.countDocuments({ from: userId, folder: 'drafts', isDraft: true }),
        Email.countDocuments({
          $or: [{ to: userId }, { from: userId }],
          isStarred: true,
          isTrash: false,
        }),
        Email.countDocuments({
          $or: [{ to: userId }, { from: userId }],
          isTrash: true,
        }),
        Email.countDocuments({ to: userId, isSpam: true, isTrash: false }),
        Email.countDocuments({
          to: userId,
          folder: 'inbox',
          isRead: false,
          isTrash: false,
          isSpam: false,
        }),
      ]);

    res.json({
      success: true,
      data: { inbox, sent, drafts, starred, trash, spam, unread },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  composeEmail,
  getEmailsByFolder,
  getEmail,
  getThread,
  updateEmail,
  deleteEmail,
  moveToTrash,
  searchEmails,
  getEmailCounts,
};
