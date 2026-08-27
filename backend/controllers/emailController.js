const { supabase } = require('../config/supabase');
const { getIO } = require('../config/socket');
const { getEmailThread } = require('../services/emailService');
const { analyzeJobOpportunity } = require('../services/aiService');

// Helper to format Email model to match MongoDB JSON structure for the frontend
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

// Helper to retrieve and populate emails in bulk
const fetchPopulatedEmails = async (emailIds) => {
  if (!emailIds || emailIds.length === 0) return [];

  // 1. Fetch main email records
  const { data: emails, error: err1 } = await supabase
    .from('emails')
    .select('*')
    .in('id', emailIds);
  if (err1) throw err1;

  // 2. Fetch recipients
  const { data: recipients, error: err2 } = await supabase
    .from('email_recipients')
    .select('email_id, type, users(id, name, email, avatar)')
    .in('email_id', emailIds);
  if (err2) throw err2;

  // 3. Fetch labels
  const { data: emailLabels, error: err3 } = await supabase
    .from('email_labels_junction')
    .select('email_id, labels(id, name, color)')
    .in('email_id', emailIds);
  if (err3) throw err3;

  // 4. Fetch all unique sender users
  const fromUserIds = [...new Set(emails.map(e => e.from_id).filter(Boolean))];
  let fromUsers = [];
  if (fromUserIds.length > 0) {
    const { data: users, error: err4 } = await supabase
      .from('users')
      .select('id, name, email, avatar')
      .in('id', fromUserIds);
    if (err4) throw err4;
    fromUsers = users;
  }

  // 5. Map and format everything
  return emails.map(email => {
    const fromUser = fromUsers.find(u => u.id === email.from_id);
    const emailRecipients = recipients.filter(r => r.email_id === email.id);
    const toUsers = emailRecipients.filter(r => r.type === 'to').map(r => r.users).filter(Boolean);
    const ccUsers = emailRecipients.filter(r => r.type === 'cc').map(r => r.users).filter(Boolean);
    const bccUsers = emailRecipients.filter(r => r.type === 'bcc').map(r => r.users).filter(Boolean);
    const labels = emailLabels.filter(el => el.email_id === email.id).map(el => el.labels).filter(Boolean);

    return formatEmail(email, fromUser, toUsers, ccUsers, bccUsers, labels);
  });
};

// Helper to resolve or automatically create recipient users
const resolveOrUpsertUsers = async (emailList) => {
  if (!emailList || emailList.length === 0) return [];
  const normalized = (Array.isArray(emailList) ? emailList : [emailList])
    .map(e => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
    .filter(Boolean);

  const resolved = [];
  for (const emailStr of normalized) {
    let { data: existingUser } = await supabase
      .from('users')
      .select('id, name, email, avatar')
      .eq('email', emailStr)
      .maybeSingle();

    if (!existingUser) {
      const namePart = emailStr.split('@')[0];
      const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      const { data: createdUser } = await supabase
        .from('users')
        .insert({
          name: displayName,
          email: emailStr,
          password: 'external_contact_user',
          avatar: '',
        })
        .select('id, name, email, avatar')
        .single();
      existingUser = createdUser;
    }
    if (existingUser) {
      resolved.push(existingUser);
    }
  }
  return resolved;
};

// @desc    Compose and send email
// @route   POST /api/emails
const composeEmail = async (req, res, next) => {
  try {
    const { to, cc, bcc, subject, body, isDraft, scheduledAt, labels } = req.body;

    // Resolve or automatically create recipient users
    const recipientUsers = await resolveOrUpsertUsers(to);

    if (recipientUsers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid recipients found',
      });
    }

    const ccUsers = await resolveOrUpsertUsers(cc);
    const bccUsers = await resolveOrUpsertUsers(bcc);

    // Create the main email record
    const { data: sentEmail, error: composeErr } = await supabase
      .from('emails')
      .insert({
        from_id: req.user._id,
        subject: subject || '(No Subject)',
        body: body || '',
        snippet: body ? body.replace(/<[^>]*>/g, '').trim().substring(0, 150) : '',
        is_draft: isDraft || false,
        scheduled_at: scheduledAt || null,
        folder: isDraft ? 'drafts' : scheduledAt ? 'drafts' : 'sent',
        sent_at: isDraft || scheduledAt ? null : new Date()
      })
      .select()
      .single();

    if (composeErr) throw composeErr;

    // Insert recipients
    const recipientInserts = [];
    recipientUsers.forEach(u => recipientInserts.push({ email_id: sentEmail.id, user_id: u.id, type: 'to' }));
    ccUsers.forEach(u => recipientInserts.push({ email_id: sentEmail.id, user_id: u.id, type: 'cc' }));
    bccUsers.forEach(u => recipientInserts.push({ email_id: sentEmail.id, user_id: u.id, type: 'bcc' }));
    
    if (recipientInserts.length > 0) {
      const { error: recErr } = await supabase.from('email_recipients').insert(recipientInserts);
      if (recErr) throw recErr;
    }

    // Insert label junctions
    if (labels && labels.length > 0) {
      const labelInserts = labels.map(labelId => ({ email_id: sentEmail.id, label_id: labelId }));
      const { error: labErr } = await supabase.from('email_labels_junction').insert(labelInserts);
      if (labErr) throw labErr;
    }

    // If not a draft and not scheduled, create inbox copies for all recipients
    if (!isDraft && !scheduledAt) {
      const allRecipients = [
        ...recipientUsers.map(u => u.id),
        ...ccUsers.map(u => u.id),
        ...bccUsers.map(u => u.id)
      ];
      const uniqueRecipients = [...new Set(allRecipients)];

      for (const recipientId of uniqueRecipients) {
        const { data: inboxEmail, error: inboxErr } = await supabase
          .from('emails')
          .insert({
            from_id: req.user._id,
            subject: subject || '(No Subject)',
            body: body || '',
            snippet: body ? body.replace(/<[^>]*>/g, '').trim().substring(0, 150) : '',
            folder: 'inbox',
            thread_id: sentEmail.id,
            parent_id: sentEmail.id,
            sent_at: new Date()
          })
          .select()
          .single();

        if (inboxErr) throw inboxErr;

        // Populate recipients for this inbox copy
        const copyRecipients = [];
        recipientUsers.forEach(u => copyRecipients.push({ email_id: inboxEmail.id, user_id: u.id, type: 'to' }));
        ccUsers.forEach(u => copyRecipients.push({ email_id: inboxEmail.id, user_id: u.id, type: 'cc' }));
        
        if (copyRecipients.length > 0) {
          await supabase.from('email_recipients').insert(copyRecipients);
        }

        // Real-time socket notification
        try {
          const io = getIO();
          const [populated] = await fetchPopulatedEmails([inboxEmail.id]);
          io.to(recipientId).emit('newEmail', populated);
        } catch (socketErr) {
          // Socket not initialized, skip
        }

        // Automatic career / internship opportunity detection
        const jobKeywords = /(job|internship|hiring|career|fellowship|vacancy|opening|role|position|apply|application|stipend|salary|developer|engineer)/i;
        if (jobKeywords.test(subject || '') || jobKeywords.test(body || '')) {
          (async () => {
            try {
              const analysis = await analyzeJobOpportunity(subject, body);
              if (analysis.isJobOpportunity) {
                await supabase.from('job_opportunities').insert({
                  email_id: inboxEmail.id,
                  user_id: recipientId,
                  company_name: analysis.companyName,
                  job_title: analysis.jobTitle,
                  role_type: analysis.roleType,
                  deadline: analysis.deadline,
                  is_genuine: analysis.isGenuine,
                  trust_score: analysis.trustScore,
                  trust_reasons: analysis.trustReasons,
                  apply_url: analysis.applyUrl,
                  apply_email: analysis.applyEmail,
                  status: 'detected',
                  reminder_set: true,
                });
              }
            } catch (autoErr) {
              console.warn('Auto-opportunity extraction warning:', autoErr.message);
            }
          })();
        }
      }
    }

    const [populatedSent] = await fetchPopulatedEmails([sentEmail.id]);
    res.status(201).json({ success: true, data: populatedSent });
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

    let dbQuery;
    const userId = req.user._id;

    if (folder === 'inbox') {
      const { data: recs } = await supabase.from('email_recipients').select('email_id').eq('user_id', userId).eq('type', 'to');
      const emailIds = (recs || []).map(r => r.email_id);
      dbQuery = supabase.from('emails').select('id', { count: 'exact' })
        .in('id', emailIds)
        .eq('folder', 'inbox')
        .eq('is_trash', false)
        .eq('is_spam', false);

    } else if (folder === 'sent') {
      dbQuery = supabase.from('emails').select('id', { count: 'exact' })
        .eq('from_id', userId)
        .eq('folder', 'sent')
        .eq('is_trash', false);

    } else if (folder === 'drafts') {
      dbQuery = supabase.from('emails').select('id', { count: 'exact' })
        .eq('from_id', userId)
        .eq('folder', 'drafts')
        .eq('is_draft', true);

    } else if (folder === 'starred') {
      const { data: recs } = await supabase.from('email_recipients').select('email_id').eq('user_id', userId);
      const emailIds = (recs || []).map(r => r.email_id);
      const formattedIds = emailIds.length > 0 ? `(${emailIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)';
      dbQuery = supabase.from('emails').select('id', { count: 'exact' })
        .or(`from_id.eq.${userId},id.in.${formattedIds}`)
        .eq('is_starred', true)
        .eq('is_trash', false);

    } else if (folder === 'trash') {
      const { data: recs } = await supabase.from('email_recipients').select('email_id').eq('user_id', userId);
      const emailIds = (recs || []).map(r => r.email_id);
      const formattedIds = emailIds.length > 0 ? `(${emailIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)';
      dbQuery = supabase.from('emails').select('id', { count: 'exact' })
        .or(`from_id.eq.${userId},id.in.${formattedIds}`)
        .eq('is_trash', true);

    } else if (folder === 'spam') {
      const { data: recs } = await supabase.from('email_recipients').select('email_id').eq('user_id', userId).eq('type', 'to');
      const emailIds = (recs || []).map(r => r.email_id);
      dbQuery = supabase.from('emails').select('id', { count: 'exact' })
        .in('id', emailIds)
        .eq('is_spam', true)
        .eq('is_trash', false);

    } else if (folder === 'archive') {
      const { data: recs } = await supabase.from('email_recipients').select('email_id').eq('user_id', userId);
      const emailIds = (recs || []).map(r => r.email_id);
      const formattedIds = emailIds.length > 0 ? `(${emailIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)';
      dbQuery = supabase.from('emails').select('id', { count: 'exact' })
        .or(`from_id.eq.${userId},id.in.${formattedIds}`)
        .eq('is_archived', true)
        .eq('is_trash', false);

    } else {
      const { data: recs } = await supabase.from('email_recipients').select('email_id').eq('user_id', userId).eq('type', 'to');
      const emailIds = (recs || []).map(r => r.email_id);
      dbQuery = supabase.from('emails').select('id', { count: 'exact' })
        .in('id', emailIds)
        .eq('folder', 'inbox')
        .eq('is_trash', false)
        .eq('is_spam', false);
    }

    if (category) {
      dbQuery = dbQuery.eq('category', category);
    }

    if (label) {
      const { data: labelRows } = await supabase.from('email_labels_junction').select('email_id').eq('label_id', label);
      const labeledEmailIds = (labelRows || []).map(r => r.email_id);
      dbQuery = dbQuery.in('id', labeledEmailIds);
    }

    const { data: idRows, count, error } = await dbQuery
      .order('created_at', { ascending: false })
      .range(skip, skip + parseInt(limit) - 1);

    if (error) throw error;

    const emails = await fetchPopulatedEmails((idRows || []).map(r => r.id));
    emails.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: emails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
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
    const { id } = req.params;
    const [email] = await fetchPopulatedEmails([id]);

    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found',
      });
    }

    // Mark as read if it's in the user's inbox
    const isToUser = email.to.some((u) => u.id === req.user._id);
    if (isToUser && !email.isRead) {
      await supabase
        .from('emails')
        .update({ is_read: true })
        .eq('id', id);
      email.isRead = true;
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
    const { id } = req.params;
    const allowedUpdates = [
      'isRead',
      'isStarred',
      'isArchived',
      'isTrash',
      'isSpam',
      'category',
      'folder',
    ];
    
    const updates = {};
    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        // Map camelCase parameters to snake_case table columns
        const col = field
          .replace('isRead', 'is_read')
          .replace('isStarred', 'is_starred')
          .replace('isArchived', 'is_archived')
          .replace('isTrash', 'is_trash')
          .replace('isSpam', 'is_spam');
        updates[col] = req.body[field];
      }
    }

    const { error: updateErr } = await supabase
      .from('emails')
      .update(updates)
      .eq('id', id);
    if (updateErr) throw updateErr;

    // Handle updates to labels
    if (req.body.labels !== undefined) {
      // Clear existing labels
      await supabase.from('email_labels_junction').delete().eq('email_id', id);
      // Insert new labels
      if (req.body.labels.length > 0) {
        const labelInserts = req.body.labels.map(lId => ({ email_id: id, label_id: lId }));
        await supabase.from('email_labels_junction').insert(labelInserts);
      }
    }

    const [populated] = await fetchPopulatedEmails([id]);
    if (!populated) {
      return res.status(404).json({
        success: false,
        message: 'Email not found',
      });
    }

    res.json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete email permanently
// @route   DELETE /api/emails/:id
const deleteEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('emails').delete().eq('id', id);
    if (error) throw error;

    res.json({ success: true, message: 'Email deleted permanently' });
  } catch (error) {
    next(error);
  }
};

// @desc    Move email to trash
// @route   PATCH /api/emails/:id/trash
const moveToTrash = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('emails')
      .update({ is_trash: true, folder: 'trash' })
      .eq('id', id);
    if (error) throw error;

    const [populated] = await fetchPopulatedEmails([id]);
    res.json({ success: true, data: populated });
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
    const userId = req.user._id;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    // Get all email IDs where the user is a participant
    const { data: recs } = await supabase.from('email_recipients').select('email_id').eq('user_id', userId);
    const emailIds = (recs || []).map(r => r.email_id);
    const formattedIds = emailIds.length > 0 ? `(${emailIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)';

    // Search subject or body for the query
    const { data: idRows, error } = await supabase
      .from('emails')
      .select('id')
      .or(`from_id.eq.${userId},id.in.${formattedIds}`)
      .eq('is_trash', false)
      .or(`subject.ilike.%${q}%,body.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .range(skip, skip + parseInt(limit) - 1);

    if (error) throw error;

    const emails = await fetchPopulatedEmails((idRows || []).map(r => r.id));
    emails.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: emails,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: emails.length },
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

    // Get email IDs where the user is a recipient
    const { data: inboxRecs } = await supabase.from('email_recipients').select('email_id').eq('user_id', userId).eq('type', 'to');
    const inboxEmailIds = (inboxRecs || []).map(r => r.email_id);

    // Get email IDs where the user is a participant in general (starred, trash)
    const { data: allRecs } = await supabase.from('email_recipients').select('email_id').eq('user_id', userId);
    const allEmailIds = (allRecs || []).map(r => r.email_id);
    const formattedAllIds = allEmailIds.length > 0 ? `(${allEmailIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)';

    // 1. Inbox Count
    const { count: inbox } = await supabase.from('emails').select('*', { count: 'exact', head: true })
      .in('id', inboxEmailIds)
      .eq('folder', 'inbox')
      .eq('is_trash', false)
      .eq('is_spam', false);

    // 2. Sent Count
    const { count: sent } = await supabase.from('emails').select('*', { count: 'exact', head: true })
      .eq('from_id', userId)
      .eq('folder', 'sent')
      .eq('is_trash', false);

    // 3. Drafts Count
    const { count: drafts } = await supabase.from('emails').select('*', { count: 'exact', head: true })
      .eq('from_id', userId)
      .eq('folder', 'drafts')
      .eq('is_draft', true);

    // 4. Starred Count
    const { count: starred } = await supabase.from('emails').select('*', { count: 'exact', head: true })
      .or(`from_id.eq.${userId},id.in.${formattedAllIds}`)
      .eq('is_starred', true)
      .eq('is_trash', false);

    // 5. Trash Count
    const { count: trash } = await supabase.from('emails').select('*', { count: 'exact', head: true })
      .or(`from_id.eq.${userId},id.in.${formattedAllIds}`)
      .eq('is_trash', true);

    // 6. Spam Count
    const { count: spam } = await supabase.from('emails').select('*', { count: 'exact', head: true })
      .in('id', inboxEmailIds)
      .eq('is_spam', true)
      .eq('is_trash', false);

    // 7. Unread Count
    const { count: unread } = await supabase.from('emails').select('*', { count: 'exact', head: true })
      .in('id', inboxEmailIds)
      .eq('folder', 'inbox')
      .eq('is_read', false)
      .eq('is_trash', false)
      .eq('is_spam', false);

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
