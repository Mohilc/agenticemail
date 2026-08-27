import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Star, Trash2, Archive, Reply, Forward,
  Sparkles, MessageSquare, BarChart2, Briefcase, ShieldCheck, ShieldAlert, Calendar, ExternalLink
} from 'lucide-react';
import api from '../services/api';
import { emailService } from '../services/emailService';
import { aiService } from '../services/aiService';
import { Avatar, Badge, Button, Loader } from '../components/UI/UI';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './EmailView.css';

const EmailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [smartReplies, setSmartReplies] = useState([]);
  const [opportunity, setOpportunity] = useState(null);
  const [aiLoading, setAiLoading] = useState({});

  useEffect(() => {
    const fetchEmail = async () => {
      try {
        setLoading(true);
        const res = await emailService.getById(id);
        setEmail(res.data);
      } catch (err) {
        toast.error('Email not found');
        navigate('/inbox');
      } finally {
        setLoading(false);
      }
    };
    fetchEmail();
  }, [id, navigate]);

  const handleSummarize = async () => {
    setAiLoading((prev) => ({ ...prev, summary: true }));
    try {
      const res = await aiService.summarize({ emailContent: email.body });
      setSummary(res.data.summary);
    } catch {
      toast.error('Failed to summarize');
    } finally {
      setAiLoading((prev) => ({ ...prev, summary: false }));
    }
  };

  const handleSentiment = async () => {
    setAiLoading((prev) => ({ ...prev, sentiment: true }));
    try {
      const res = await aiService.sentiment({ emailContent: email.body });
      setSentiment(res.data);
    } catch {
      toast.error('Failed to analyze sentiment');
    } finally {
      setAiLoading((prev) => ({ ...prev, sentiment: false }));
    }
  };

  const handleSmartReply = async () => {
    setAiLoading((prev) => ({ ...prev, smartReply: true }));
    try {
      const res = await aiService.smartReply({
        emailContent: email.body,
        senderName: email.from?.name || 'Someone',
      });
      setSmartReplies(res.data.replies || []);
    } catch {
      toast.error('Failed to generate replies');
    } finally {
      setAiLoading((prev) => ({ ...prev, smartReply: false }));
    }
  };

  const handleAnalyzeOpportunity = async () => {
    setAiLoading((prev) => ({ ...prev, opportunity: true }));
    try {
      const res = await api.post(`/opportunities/analyze/${id}`);
      if (res.data.isOpportunity) {
        setOpportunity(res.data.data);
        toast.success(`Tracked: ${res.data.data.jobTitle} at ${res.data.data.companyName}!`);
      } else {
        toast('No career opportunity detected in this email', { icon: 'ℹ️' });
      }
    } catch {
      toast.error('Failed to scan opportunity');
    } finally {
      setAiLoading((prev) => ({ ...prev, opportunity: false }));
    }
  };

  const handleStar = async () => {
    try {
      await emailService.update(id, { isStarred: !email.isStarred });
      setEmail((prev) => ({ ...prev, isStarred: !prev.isStarred }));
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleTrash = async () => {
    try {
      await emailService.moveToTrash(id);
      toast.success('Moved to trash');
      navigate('/inbox');
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <Loader size="lg" text="Loading email..." />;
  if (!email) return null;

  const sentimentColors = { positive: '#10b981', neutral: '#6366f1', negative: '#ef4444' };
  const sentimentEmojis = { positive: '😊', neutral: '😐', negative: '😟' };

  return (
    <div className="email-view">
      <motion.div
        className="email-view-container"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Toolbar */}
        <div className="email-view-toolbar">
          <button className="email-view-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div className="email-view-toolbar-actions">
            <button className="email-view-tool-btn" onClick={handleStar}>
              <Star size={18} fill={email.isStarred ? '#f59e0b' : 'none'} color={email.isStarred ? '#f59e0b' : 'currentColor'} />
            </button>
            <button className="email-view-tool-btn" onClick={handleTrash}>
              <Trash2 size={18} />
            </button>
            <button className="email-view-tool-btn" onClick={() => {
              emailService.update(id, { isArchived: true, folder: 'archive' });
              toast.success('Archived');
              navigate('/inbox');
            }}>
              <Archive size={18} />
            </button>
          </div>
        </div>

        {/* Email Header */}
        <div className="email-view-header">
          <h1 className="email-view-subject">{email.subject}</h1>
          <div className="email-view-meta">
            {email.category && (
              <Badge variant="primary" size="sm">{email.category}</Badge>
            )}
            {email.sentiment && (
              <Badge variant={email.sentiment === 'positive' ? 'success' : email.sentiment === 'negative' ? 'danger' : 'info'} size="sm">
                {sentimentEmojis[email.sentiment]} {email.sentiment}
              </Badge>
            )}
          </div>
        </div>

        {/* Sender Info */}
        <div className="email-view-sender">
          <Avatar name={email.from?.name} size="lg" />
          <div className="email-view-sender-info">
            <span className="email-view-sender-name">{email.from?.name}</span>
            <span className="email-view-sender-email">{email.from?.email}</span>
          </div>
          <span className="email-view-date">
            {email.sentAt ? format(new Date(email.sentAt), 'MMM d, yyyy h:mm a') : ''}
          </span>
        </div>

        {email.to && (
          <div className="email-view-recipients">
            To: {email.to.map((r) => r.name || r.email).join(', ')}
            {email.cc?.length > 0 && (
              <span> | Cc: {email.cc.map((r) => r.name || r.email).join(', ')}</span>
            )}
          </div>
        )}

        {/* AI Features Bar */}
        <div className="email-view-ai-bar">
          <Button
            variant="ghost"
            size="sm"
            icon={<Sparkles size={14} />}
            loading={aiLoading.summary}
            onClick={handleSummarize}
          >
            Summarize
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<BarChart2 size={14} />}
            loading={aiLoading.sentiment}
            onClick={handleSentiment}
          >
            Sentiment
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<MessageSquare size={14} />}
            loading={aiLoading.smartReply}
            onClick={handleSmartReply}
          >
            Smart Reply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Briefcase size={14} />}
            loading={aiLoading.opportunity}
            onClick={handleAnalyzeOpportunity}
          >
            Scan Job Opportunity
          </Button>
        </div>

        {/* Career Opportunity Card */}
        {opportunity && (
          <motion.div
            className="email-view-ai-result"
            style={{ borderLeft: '4px solid #6366f1', background: 'rgba(99, 102, 241, 0.05)' }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <div className="email-view-ai-result-header" style={{ color: '#6366f1' }}>
              <Briefcase size={16} />
              Detected Opportunity: {opportunity.jobTitle} @ {opportunity.companyName} ({opportunity.roleType})
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px', fontSize: '13px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: opportunity.trustScore >= 75 ? '#22c55e' : '#f97316', fontWeight: 600 }}>
                {opportunity.trustScore >= 75 ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                {opportunity.trustScore}% Trust Score ({opportunity.trustScore >= 75 ? 'Verified Genuine' : 'Caution'})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                <Calendar size={14} />
                Deadline: {opportunity.deadline ? new Date(opportunity.deadline).toLocaleDateString() : 'Rolling'}
              </span>
              <Button size="sm" variant="primary" onClick={() => navigate('/opportunities')}>
                View in Opportunity Tracker →
              </Button>
            </div>
          </motion.div>
        )}

        {/* AI Results */}
        {summary && (
          <motion.div
            className="email-view-ai-result"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <div className="email-view-ai-result-header">
              <Sparkles size={14} />
              AI Summary
            </div>
            <p>{summary}</p>
          </motion.div>
        )}

        {sentiment && (
          <motion.div
            className="email-view-ai-result"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <div className="email-view-ai-result-header">
              <BarChart2 size={14} />
              Sentiment Analysis
            </div>
            <div className="email-view-sentiment">
              <span style={{ fontSize: '24px' }}>{sentimentEmojis[sentiment.sentiment]}</span>
              <div>
                <strong style={{ color: sentimentColors[sentiment.sentiment] }}>
                  {sentiment.sentiment?.toUpperCase()}
                </strong>
                <span className="email-view-sentiment-score"> (Score: {sentiment.score})</span>
                <p>{sentiment.explanation}</p>
              </div>
            </div>
          </motion.div>
        )}

        {smartReplies.length > 0 && (
          <motion.div
            className="email-view-ai-result"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <div className="email-view-ai-result-header">
              <MessageSquare size={14} />
              Smart Reply Suggestions
            </div>
            <div className="email-view-smart-replies">
              {smartReplies.map((reply, i) => (
                <button
                  key={i}
                  className="email-view-smart-reply"
                  onClick={() => navigate(`/compose?replyTo=${id}&body=${encodeURIComponent(reply)}`)}
                >
                  {reply}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Email Body */}
        <div className="email-view-body">
          <div dangerouslySetInnerHTML={{ __html: email.body }} />
        </div>

        {/* Reply Actions */}
        <div className="email-view-reply-bar">
          <Button
            variant="secondary"
            size="md"
            icon={<Reply size={16} />}
            onClick={() => navigate(`/compose?replyTo=${id}`)}
          >
            Reply
          </Button>
          <Button
            variant="ghost"
            size="md"
            icon={<Forward size={16} />}
            onClick={() => navigate(`/compose?forward=${id}`)}
          >
            Forward
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default EmailView;
