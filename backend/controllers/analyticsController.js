const { supabase } = require('../config/supabase');

// @desc    Get email statistics
// @route   GET /api/analytics/stats
const getEmailStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get email IDs where the user is a recipient
    const { data: inboxRecs } = await supabase.from('email_recipients').select('email_id').eq('user_id', userId).eq('type', 'to');
    const inboxEmailIds = (inboxRecs || []).map(r => r.email_id);

    // 1. Total Received
    const { count: totalReceived } = await supabase.from('emails').select('*', { count: 'exact', head: true })
      .in('id', inboxEmailIds)
      .eq('folder', 'inbox');

    // 2. Total Sent
    const { count: totalSent } = await supabase.from('emails').select('*', { count: 'exact', head: true })
      .eq('from_id', userId)
      .eq('folder', 'sent');

    // 3. Total Drafts
    const { count: totalDrafts } = await supabase.from('emails').select('*', { count: 'exact', head: true })
      .eq('from_id', userId)
      .eq('is_draft', true);

    // 4. Unread Received
    const { count: unread } = await supabase.from('emails').select('*', { count: 'exact', head: true })
      .in('id', inboxEmailIds)
      .eq('folder', 'inbox')
      .eq('is_read', false);

    // Emails per day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: allRecs } = await supabase.from('email_recipients').select('email_id').eq('user_id', userId);
    const allEmailIds = (allRecs || []).map(r => r.email_id);
    const formattedAllIds = allEmailIds.length > 0 ? `(${allEmailIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)';

    const { data: recentEmails } = await supabase.from('emails')
      .select('id, from_id, created_at')
      .or(`from_id.eq.${userId},id.in.${formattedAllIds}`)
      .gte('created_at', sevenDaysAgo.toISOString());

    const groups = {};
    (recentEmails || []).forEach(e => {
      const dateStr = new Date(e.created_at).toISOString().split('T')[0];
      const type = e.from_id === userId ? 'sent' : 'received';
      const key = `${dateStr}_${type}`;
      if (!groups[key]) {
        groups[key] = { date: dateStr, type, count: 0 };
      }
      groups[key].count++;
    });

    const emailsPerDay = Object.values(groups).map(g => ({
      _id: { date: g.date, type: g.type },
      count: g.count
    })).sort((a, b) => a._id.date.localeCompare(b._id.date));

    res.json({
      success: true,
      data: {
        totalReceived: totalReceived || 0,
        totalSent: totalSent || 0,
        totalDrafts: totalDrafts || 0,
        unread: unread || 0,
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

    const { data: inboxRecs } = await supabase.from('email_recipients').select('email_id').eq('user_id', userId).eq('type', 'to');
    const inboxEmailIds = (inboxRecs || []).map(r => r.email_id);

    const { data: emails, error } = await supabase.from('emails')
      .select('sentiment')
      .in('id', inboxEmailIds)
      .not('sentiment', 'is', null)
      .eq('is_trash', false);

    if (error) throw error;

    const breakdown = { positive: 0, neutral: 0, negative: 0 };
    (emails || []).forEach((item) => {
      if (breakdown[item.sentiment] !== undefined) {
        breakdown[item.sentiment]++;
      }
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

    const { data: inboxRecs } = await supabase.from('email_recipients').select('email_id').eq('user_id', userId).eq('type', 'to');
    const inboxEmailIds = (inboxRecs || []).map(r => r.email_id);

    const { data: emails, error } = await supabase.from('emails')
      .select('category')
      .in('id', inboxEmailIds)
      .eq('folder', 'inbox')
      .eq('is_trash', false);

    if (error) throw error;

    const catGroups = {};
    (emails || []).forEach(e => {
      catGroups[e.category] = (catGroups[e.category] || 0) + 1;
    });

    const categoryData = Object.entries(catGroups).map(([cat, count]) => ({
      _id: cat,
      count
    }));

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

    const { data: allRecs } = await supabase.from('email_recipients').select('email_id').eq('user_id', userId);
    const allEmailIds = (allRecs || []).map(r => r.email_id);
    const formattedAllIds = allEmailIds.length > 0 ? `(${allEmailIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)';

    const { data: emails, error } = await supabase.from('emails')
      .select('created_at')
      .or(`from_id.eq.${userId},id.in.${formattedAllIds}`)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) throw error;

    const actGroups = {};
    (emails || []).forEach(e => {
      const date = new Date(e.created_at);
      const dayOfWeek = date.getDay() + 1; // 1-indexed (Sunday = 1, Saturday = 7)
      const hour = date.getHours();
      const key = `${dayOfWeek}_${hour}`;
      if (!actGroups[key]) {
        actGroups[key] = { dayOfWeek, hour, count: 0 };
      }
      actGroups[key].count++;
    });

    const activityData = Object.values(actGroups).map(g => ({
      _id: { dayOfWeek: g.dayOfWeek, hour: g.hour },
      count: g.count
    })).sort((a, b) => {
      if (a._id.dayOfWeek !== b._id.dayOfWeek) {
        return a._id.dayOfWeek - b._id.dayOfWeek;
      }
      return a._id.hour - b._id.hour;
    });

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
