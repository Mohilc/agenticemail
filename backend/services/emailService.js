const { supabase } = require('../config/supabase');
const cron = require('node-cron');

// Helper to format email structure for the frontend
const formatEmail = (email, fromUser, toUsers, ccUsers, bccUsers, labels) => {
  return {
    _id: email.id,
    id: email.id,
    from: fromUser ? {
      _id: fromUser.id,
      id: fromUser.id,
      name: fromUser.name,
      email: fromUser.email,
      avatar: fromUser.avatar || ''
    } : null,
    to: toUsers.map(u => ({
      _id: u.id,
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar || ''
    })),
    cc: ccUsers.map(u => ({
      _id: u.id,
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar || ''
    })),
    bcc: bccUsers.map(u => ({
      _id: u.id,
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar || ''
    })),
    subject: email.subject,
    body: email.body,
    snippet: email.snippet || '',
    labels: labels.map(l => ({
      _id: l.id,
      id: l.id,
      name: l.name,
      color: l.color
    })),
    isRead: email.is_read,
    isStarred: email.is_starred,
    isArchived: email.is_archived,
    isTrash: email.is_trash,
    isSpam: email.is_spam,
    isDraft: email.is_draft,
    sentAt: email.sent_at,
    scheduledAt: email.scheduled_at,
    threadId: email.thread_id,
    parentId: email.parent_id,
    sentiment: email.sentiment,
    sentimentScore: email.sentiment_score,
    category: email.category,
    aiSummary: email.ai_summary,
    folder: email.folder,
    createdAt: email.created_at,
    updatedAt: email.updated_at
  };
};

// Helper to retrieve and populate emails in bulk (local version to prevent circular dependency)
const fetchPopulatedEmailsLocal = async (emailIds) => {
  if (!emailIds || emailIds.length === 0) return [];

  // Fetch emails
  const { data: emails } = await supabase.from('emails').select('*').in('id', emailIds);
  if (!emails || emails.length === 0) return [];

  // Fetch recipients
  const { data: recipients } = await supabase
    .from('email_recipients')
    .select('email_id, type, users(id, name, email, avatar)')
    .in('email_id', emailIds);

  // Fetch labels
  const { data: emailLabels } = await supabase
    .from('email_labels_junction')
    .select('email_id, labels(id, name, color)')
    .in('email_id', emailIds);

  // Fetch senders
  const fromUserIds = [...new Set(emails.map(e => e.from_id).filter(Boolean))];
  let fromUsers = [];
  if (fromUserIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id, name, email, avatar').in('id', fromUserIds);
    fromUsers = users || [];
  }

  const recs = recipients || [];
  const elabs = emailLabels || [];

  return emails.map(email => {
    const fromUser = fromUsers.find(u => u.id === email.from_id);
    const emailRecs = recs.filter(r => r.email_id === email.id);
    const toUsers = emailRecs.filter(r => r.type === 'to').map(r => r.users).filter(Boolean);
    const ccUsers = emailRecs.filter(r => r.type === 'cc').map(r => r.users).filter(Boolean);
    const bccUsers = emailRecs.filter(r => r.type === 'bcc').map(r => r.users).filter(Boolean);
    const labels = elabs.filter(el => el.email_id === email.id).map(el => el.labels).filter(Boolean);

    return formatEmail(email, fromUser, toUsers, ccUsers, bccUsers, labels);
  });
};

/**
 * Process scheduled emails - runs every minute
 */
const startScheduler = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const { data: scheduledEmails, error } = await supabase
        .from('emails')
        .select('*')
        .lte('scheduled_at', now.toISOString())
        .eq('is_draft', true)
        .eq('folder', 'drafts');

      if (error) throw error;
      if (!scheduledEmails || scheduledEmails.length === 0) return;

      for (const email of scheduledEmails) {
        // Fetch recipients for this email
        const { data: recs } = await supabase
          .from('email_recipients')
          .select('user_id, type')
          .eq('email_id', email.id);

        const recipients = recs || [];
        const toRecipientIds = recipients.filter(r => r.type === 'to').map(r => r.user_id);

        // Update email to sent state
        await supabase
          .from('emails')
          .update({
            is_draft: false,
            folder: 'sent',
            sent_at: now,
            scheduled_at: null,
          })
          .eq('id', email.id);

        // Create inbox copy for each recipient
        for (const recipientId of toRecipientIds) {
          const { data: inboxEmail, error: inboxErr } = await supabase
            .from('emails')
            .insert({
              from_id: email.from_id,
              subject: email.subject,
              body: email.body,
              snippet: email.snippet,
              folder: 'inbox',
              thread_id: email.thread_id || email.id,
              parent_id: email.id,
              sent_at: now,
            })
            .select()
            .single();

          if (inboxErr) throw inboxErr;

          // Insert recipients for this copy
          const copyRecs = recipients.map(r => ({
            email_id: inboxEmail.id,
            user_id: r.user_id,
            type: r.type,
          }));
          await supabase.from('email_recipients').insert(copyRecs);
        }

        console.log(`Scheduled email sent: ${email.id}`);
      }
    } catch (error) {
      console.error('Scheduler error:', error);
    }
  });

  console.log('Email scheduler started');
};

/**
 * Build email thread from a given email
 */
const getEmailThread = async (emailId) => {
  try {
    const { data: email } = await supabase
      .from('emails')
      .select('id, thread_id')
      .eq('id', emailId)
      .maybeSingle();

    if (!email) return [];

    const threadId = email.thread_id || email.id;

    // Find all emails in the thread
    const { data: threadEmails } = await supabase
      .from('emails')
      .select('id')
      .or(`thread_id.eq.${threadId},id.eq.${threadId}`);

    const emailIds = (threadEmails || []).map(e => e.id);
    const thread = await fetchPopulatedEmailsLocal(emailIds);

    thread.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return thread;
  } catch (err) {
    console.error('Thread retrieval error:', err);
    return [];
  }
};

module.exports = { startScheduler, getEmailThread };
