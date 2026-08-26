const Email = require('../models/Email');
const cron = require('node-cron');

/**
 * Process scheduled emails - runs every minute
 */
const startScheduler = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const scheduledEmails = await Email.find({
        scheduledAt: { $lte: now },
        isDraft: true,
        folder: 'drafts',
      });

      for (const email of scheduledEmails) {
        email.isDraft = false;
        email.folder = 'sent';
        email.sentAt = now;
        email.scheduledAt = null;
        await email.save();

        // Create inbox copy for each recipient
        for (const recipientId of email.to) {
          await Email.create({
            from: email.from,
            to: email.to,
            cc: email.cc,
            bcc: email.bcc,
            subject: email.subject,
            body: email.body,
            snippet: email.snippet,
            folder: 'inbox',
            threadId: email.threadId || email._id,
            parentId: email._id,
            sentAt: now,
          });
        }

        console.log(`Scheduled email sent: ${email._id}`);
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
  const email = await Email.findById(emailId);
  if (!email) return [];

  const threadId = email.threadId || email._id;
  const thread = await Email.find({ 
    $or: [{ threadId }, { _id: threadId }] 
  })
    .populate('from', 'name email avatar')
    .populate('to', 'name email avatar')
    .sort({ createdAt: 1 });

  return thread;
};

module.exports = { startScheduler, getEmailThread };
