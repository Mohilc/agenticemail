const { supabase } = require('../config/supabase');
const { analyzeJobOpportunity, draftJobApplication } = require('../services/aiService');

// Helper to format opportunity output
const formatOpportunity = (opp) => {
  if (!opp) return null;
  return {
    _id: opp.id,
    id: opp.id,
    emailId: opp.email_id,
    userId: opp.user_id,
    companyName: opp.company_name,
    jobTitle: opp.job_title,
    roleType: opp.role_type,
    deadline: opp.deadline,
    isGenuine: opp.is_genuine,
    trustScore: opp.trust_score,
    trustReasons: opp.trust_reasons || [],
    applyUrl: opp.apply_url,
    applyEmail: opp.apply_email,
    status: opp.status || 'detected',
    reminderSet: opp.reminder_set !== false,
    aiCoverLetter: opp.ai_cover_letter,
    createdAt: opp.created_at,
    updatedAt: opp.updated_at,
  };
};

// @desc    Get all job/internship opportunities for user
// @route   GET /api/opportunities
const getOpportunities = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('job_opportunities')
      .select('*')
      .eq('user_id', req.user._id);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: opps, error } = await query.order('created_at', { ascending: false });
    if (error) {
      // Table might not exist yet if user hasn't run the SQL script
      console.warn('Opportunities fetch warning (table might be initializing):', error.message);
      return res.json({ success: true, data: [] });
    }

    res.json({ success: true, data: (opps || []).map(formatOpportunity) });
  } catch (error) {
    next(error);
  }
};

// @desc    Analyze an email for job opportunities and store if detected
// @route   POST /api/opportunities/analyze/:emailId
const analyzeEmailOpportunity = async (req, res, next) => {
  try {
    const { emailId } = req.params;

    // Fetch email content
    const { data: email, error: emailErr } = await supabase
      .from('emails')
      .select('*')
      .eq('id', emailId)
      .single();

    if (emailErr || !email) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    // Run AI analysis
    const analysis = await analyzeJobOpportunity(email.subject, email.body);

    if (!analysis.isJobOpportunity) {
      return res.json({
        success: true,
        isOpportunity: false,
        message: 'No job or internship opportunity detected in this email.',
      });
    }

    // Check if already stored
    const { data: existing } = await supabase
      .from('job_opportunities')
      .select('*')
      .eq('email_id', emailId)
      .eq('user_id', req.user._id)
      .maybeSingle();

    if (existing) {
      return res.json({
        success: true,
        isOpportunity: true,
        data: formatOpportunity(existing),
      });
    }

    // Insert opportunity record
    const { data: opp, error: insErr } = await supabase
      .from('job_opportunities')
      .insert({
        email_id: emailId,
        user_id: req.user._id,
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
      })
      .select()
      .single();

    if (insErr) throw insErr;

    res.status(201).json({
      success: true,
      isOpportunity: true,
      data: formatOpportunity(opp),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update opportunity status or reminder
// @route   PATCH /api/opportunities/:id
const updateOpportunity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const allowed = ['status', 'reminderSet', 'aiCoverLetter', 'deadline'];
    const updates = {};

    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.reminderSet !== undefined) updates.reminder_set = req.body.reminderSet;
    if (req.body.aiCoverLetter !== undefined) updates.ai_cover_letter = req.body.aiCoverLetter;
    if (req.body.deadline !== undefined) updates.deadline = req.body.deadline;

    const { data: opp, error } = await supabase
      .from('job_opportunities')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user._id)
      .select()
      .single();

    if (error || !opp) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    res.json({ success: true, data: formatOpportunity(opp) });
  } catch (error) {
    next(error);
  }
};

// @desc    Draft an AI job application / cover letter
// @route   POST /api/opportunities/:id/draft
const generateCoverLetter = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: opp, error } = await supabase
      .from('job_opportunities')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user._id)
      .single();

    if (error || !opp) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    const coverLetter = await draftJobApplication({
      companyName: opp.company_name,
      jobTitle: opp.job_title,
      roleType: opp.role_type,
      summary: opp.trust_reasons ? opp.trust_reasons.join(', ') : '',
    }, req.user.name || 'Candidate');

    // Save generated cover letter
    await supabase
      .from('job_opportunities')
      .update({ ai_cover_letter: coverLetter })
      .eq('id', id);

    res.json({ success: true, data: { coverLetter } });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an opportunity
// @route   DELETE /api/opportunities/:id
const deleteOpportunity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('job_opportunities')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user._id);

    if (error) throw error;

    res.json({ success: true, message: 'Opportunity deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOpportunities,
  analyzeEmailOpportunity,
  updateOpportunity,
  generateCoverLetter,
  deleteOpportunity,
};
