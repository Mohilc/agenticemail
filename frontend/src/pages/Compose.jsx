import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Send, Save, Sparkles, Wand2, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { emailService } from '../services/emailService';
import { aiService } from '../services/aiService';
import { authService } from '../services/authService';
import { Button, Badge } from '../components/UI/UI';
import toast from 'react-hot-toast';
import './Compose.css';

const tones = ['professional', 'casual', 'friendly', 'formal', 'persuasive'];

const Compose = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    to: '', cc: '', bcc: '', subject: '', body: '',
  });
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('professional');
  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recipientSuggestions, setRecipientSuggestions] = useState([]);
  const bodyRef = useRef(null);

  // Load from query parameters (reply/forward/template)
  useEffect(() => {
    const replyTo = searchParams.get('replyTo');
    const forward = searchParams.get('forward');
    const initialBody = searchParams.get('body');
    const templateBody = searchParams.get('templateBody');
    const templateSubject = searchParams.get('templateSubject');

    const loadEmailContext = async () => {
      try {
        if (replyTo) {
          const res = await emailService.getById(replyTo);
          const emailData = res.data;
          setFormData({
            to: emailData.from?.email || '',
            cc: '',
            bcc: '',
            subject: emailData.subject.startsWith('Re:') ? emailData.subject : `Re: ${emailData.subject}`,
            body: initialBody ? decodeURIComponent(initialBody) : `\n\n--- On ${new Date(emailData.createdAt).toLocaleString()}, ${emailData.from?.name || emailData.from?.email} wrote:\n> ${emailData.body.replace(/<[^>]*>/g, '\n> ')}`,
          });
        } else if (forward) {
          const res = await emailService.getById(forward);
          const emailData = res.data;
          setFormData({
            to: '',
            cc: '',
            bcc: '',
            subject: emailData.subject.startsWith('Fwd:') ? emailData.subject : `Fwd: ${emailData.subject}`,
            body: `\n\n--- Forwarded message ---\nFrom: ${emailData.from?.name} <${emailData.from?.email}>\nDate: ${new Date(emailData.createdAt).toLocaleString()}\nSubject: ${emailData.subject}\nTo: ${emailData.to?.map(u => u.name ? `${u.name} <${u.email}>` : u.email).join(', ')}\n\n${emailData.body}`,
          });
        } else if (initialBody || templateBody) {
          setFormData({
            to: '',
            cc: '',
            bcc: '',
            subject: templateSubject ? decodeURIComponent(templateSubject) : '',
            body: decodeURIComponent(initialBody || templateBody),
          });
        }
      } catch {
        toast.error('Failed to load email context');
      }
    };

    loadEmailContext();
  }, [searchParams]);

  const searchRecipients = async (query) => {
    if (query.length < 2) {
      setRecipientSuggestions([]);
      return;
    }
    try {
      const res = await authService.searchUsers(query);
      setRecipientSuggestions(res.data);
    } catch {
      setRecipientSuggestions([]);
    }
  };

  const handleAICompose = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await aiService.composeAssist({
        prompt: aiPrompt,
        tone: aiTone,
        context: formData.body,
      });
      setFormData((prev) => ({ ...prev, body: res.data.content }));
      toast.success('AI generated content!');
    } catch (err) {
      const msg = err?.message || err?.errors?.[0] || 'AI compose failed';
      toast.error(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateSubject = async () => {
    if (!formData.body.trim()) {
      toast.error('Write some content first');
      return;
    }
    try {
      const res = await aiService.generateSubject({ emailBody: formData.body });
      setFormData((prev) => ({ ...prev, subject: res.data.subject }));
      toast.success('Subject generated!');
    } catch {
      toast.error('Failed to generate subject');
    }
  };

  const handleSend = async () => {
    if (!formData.to.trim()) {
      toast.error('Add at least one recipient');
      return;
    }
    if (!formData.subject.trim()) {
      toast.error('Add a subject');
      return;
    }
    setSending(true);
    try {
      const toEmails = formData.to.split(',').map((e) => e.trim()).filter(Boolean);
      const ccEmails = formData.cc ? formData.cc.split(',').map((e) => e.trim()).filter(Boolean) : [];
      const bccEmails = formData.bcc ? formData.bcc.split(',').map((e) => e.trim()).filter(Boolean) : [];

      await emailService.compose({
        to: toEmails,
        cc: ccEmails.length ? ccEmails : undefined,
        bcc: bccEmails.length ? bccEmails : undefined,
        subject: formData.subject,
        body: formData.body,
      });
      toast.success('Email sent!');
      navigate('/sent');
    } catch (err) {
      toast.error(err.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const toEmails = formData.to ? formData.to.split(',').map((e) => e.trim()).filter(Boolean) : ['draft@placeholder.com'];
      await emailService.compose({
        to: toEmails,
        subject: formData.subject || '(No subject)',
        body: formData.body || '',
        isDraft: true,
      });
      toast.success('Draft saved!');
      navigate('/drafts');
    } catch (err) {
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="compose-page">
      <motion.div
        className="compose-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="compose-header">
          <h2>New Email</h2>
          <div className="compose-header-actions">
            <Button
              variant="ghost"
              size="sm"
              icon={<Sparkles size={16} />}
              onClick={() => setShowAI(!showAI)}
            >
              AI Assist
            </Button>
            <button className="compose-close" onClick={() => navigate(-1)}>
              <X size={20} />
            </button>
          </div>
        </div>

        {showAI && (
          <motion.div
            className="compose-ai-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="compose-ai-header">
              <Sparkles size={18} className="compose-ai-icon" />
              <span>AI Writing Assistant</span>
            </div>
            <div className="compose-ai-body">
              <textarea
                className="compose-ai-input"
                placeholder="Describe what you want to write... e.g., 'Write a follow-up email about the project deadline'"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={3}
              />
              <div className="compose-ai-options">
                <div className="compose-ai-tones">
                  {tones.map((tone) => (
                    <button
                      key={tone}
                      className={`compose-ai-tone ${aiTone === tone ? 'compose-ai-tone-active' : ''}`}
                      onClick={() => setAiTone(tone)}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Wand2 size={14} />}
                  loading={aiLoading}
                  onClick={handleAICompose}
                >
                  Generate
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        <div className="compose-fields">
          <div className="compose-field">
            <label>To</label>
            <div className="compose-field-input-row">
              <input
                type="text"
                placeholder="recipient@email.com (comma separated)"
                value={formData.to}
                onChange={(e) => {
                  setFormData({ ...formData, to: e.target.value });
                  const lastEmail = e.target.value.split(',').pop().trim();
                  searchRecipients(lastEmail);
                }}
              />
              <button
                className="compose-cc-toggle"
                onClick={() => setShowCcBcc(!showCcBcc)}
              >
                {showCcBcc ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                Cc/Bcc
              </button>
            </div>
            {recipientSuggestions.length > 0 && (
              <div className="compose-suggestions">
                {recipientSuggestions.map((user) => (
                  <button
                    key={user._id}
                    className="compose-suggestion"
                    onClick={() => {
                      const parts = formData.to.split(',');
                      parts[parts.length - 1] = user.email;
                      setFormData({ ...formData, to: parts.join(', ') + ', ' });
                      setRecipientSuggestions([]);
                    }}
                  >
                    <span className="compose-suggestion-name">{user.name}</span>
                    <span className="compose-suggestion-email">{user.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {showCcBcc && (
            <>
              <div className="compose-field">
                <label>Cc</label>
                <input
                  type="text"
                  placeholder="cc@email.com"
                  value={formData.cc}
                  onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
                />
              </div>
              <div className="compose-field">
                <label>Bcc</label>
                <input
                  type="text"
                  placeholder="bcc@email.com"
                  value={formData.bcc}
                  onChange={(e) => setFormData({ ...formData, bcc: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="compose-field">
            <label>Subject</label>
            <div className="compose-field-input-row">
              <input
                type="text"
                placeholder="Email subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
              <button
                className="compose-ai-subject-btn"
                onClick={handleGenerateSubject}
                title="Generate subject with AI"
              >
                <Wand2 size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="compose-body-wrapper">
          <textarea
            ref={bodyRef}
            className="compose-body"
            placeholder="Write your email here..."
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          />
        </div>

        <div className="compose-footer">
          <div className="compose-footer-left">
            <Button
              variant="primary"
              size="md"
              icon={<Send size={16} />}
              loading={sending}
              onClick={handleSend}
            >
              Send
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={<Save size={16} />}
              loading={saving}
              onClick={handleSaveDraft}
            >
              Save Draft
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Compose;
