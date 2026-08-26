const Email = require('../models/Email');

// @desc    Get email statistics
// @route   GET /api/analytics/stats
const getEmailStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [totalReceived, totalSent, totalDrafts, unread] = await Promise.all([
      Email.countDocuments({ to: userId, folder: 'inbox' }),
      Email.countDocuments({ from: userId, folder: 'sent' }),
      Email.countDocuments({ from: userId, isDraft: true }),
      Email.countDocuments({ to: userId, folder: 'inbox', isRead: false }),
    ]);

    // Emails per day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const emailsPerDay = await Email.aggregate([
      {
        $match: {
          $or: [{ to: userId }, { from: userId }],
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: {
              $cond: [{ $in: [userId, '$to'] }, 'received', 'sent'],
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    res.json({
      success: true,
      data: {
        totalReceived,
        totalSent,
        totalDrafts,
        unread,
        emailsPerDay,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sentiment breakdown
// @route   GET /api/analytics/sentiment
const getSentimentBreakdown = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const sentimentData = await Email.aggregate([
      {
        $match: {
          to: userId,
          sentiment: { $ne: null },
          isTrash: false,
        },
      },
      {
        $group: {
          _id: '$sentiment',
          count: { $sum: 1 },
        },
      },
    ]);

    const breakdown = { positive: 0, neutral: 0, negative: 0 };
    sentimentData.forEach((item) => {
      breakdown[item._id] = item.count;
    });

    res.json({ success: true, data: breakdown });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category breakdown
// @route   GET /api/analytics/categories
const getCategoryBreakdown = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const categoryData = await Email.aggregate([
      {
        $match: {
          to: userId,
          folder: 'inbox',
          isTrash: false,
        },
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({ success: true, data: categoryData });
  } catch (error) {
    next(error);
  }
};

// @desc    Get activity timeline (emails per hour)
// @route   GET /api/analytics/activity
const getActivityTimeline = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activityData = await Email.aggregate([
      {
        $match: {
          $or: [{ to: userId }, { from: userId }],
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$createdAt' },
            hour: { $hour: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } },
    ]);

    res.json({ success: true, data: activityData });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmailStats,
  getSentimentBreakdown,
  getCategoryBreakdown,
  getActivityTimeline,
};
