import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Calendar, 
  ExternalLink, 
  Send, 
  Sparkles, 
  CheckCircle, 
  Bell, 
  BellOff, 
  Search, 
  Filter, 
  AlertCircle,
  Copy,
  Trash2,
  Check
} from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import './Opportunities.css';

const Opportunities = () => {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [drafting, setDrafting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const res = await api.get('/opportunities');
      if (res.data && res.data.data) {
        setOpportunities(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch career opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await api.patch(`/opportunities/${id}`, { status: newStatus });
      setOpportunities(prev =>
        prev.map(opp => (opp.id === id || opp._id === id ? { ...opp, status: newStatus } : opp))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleToggleReminder = async (opp) => {
    const nextState = !opp.reminderSet;
    try {
      await api.patch(`/opportunities/${opp.id || opp._id}`, { reminderSet: nextState });
      setOpportunities(prev =>
        prev.map(o => (o.id === opp.id || o._id === opp._id ? { ...o, reminderSet: nextState } : o))
      );
    } catch (err) {
      console.error('Failed to toggle reminder:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this opportunity?')) return;
    try {
      await api.delete(`/opportunities/${id}`);
      setOpportunities(prev => prev.filter(opp => opp.id !== id && opp._id !== id));
      if (selectedOpp && (selectedOpp.id === id || selectedOpp._id === id)) {
        setSelectedOpp(null);
      }
    } catch (err) {
      console.error('Failed to delete opportunity:', err);
    }
  };

  const handleGenerateCoverLetter = async (opp) => {
    setSelectedOpp(opp);
    if (opp.aiCoverLetter) return; // already generated
    try {
      setDrafting(true);
      const res = await api.post(`/opportunities/${opp.id || opp._id}/draft`);
      if (res.data && res.data.data) {
        const updatedLetter = res.data.data.coverLetter;
        setOpportunities(prev =>
          prev.map(o => (o.id === opp.id || o._id === opp._id ? { ...o, aiCoverLetter: updatedLetter } : o))
        );
        setSelectedOpp(prev => ({ ...prev, aiCoverLetter: updatedLetter }));
      }
    } catch (err) {
      console.error('Failed to generate cover letter:', err);
    } finally {
      setDrafting(false);
    }
  };

  const handleCopyCoverLetter = () => {
    if (!selectedOpp?.aiCoverLetter) return;
    navigator.clipboard.writeText(selectedOpp.aiCoverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenComposeWithDraft = () => {
    if (!selectedOpp) return;
    navigate('/compose', {
      state: {
        to: selectedOpp.applyEmail || '',
        subject: `Application for ${selectedOpp.jobTitle} - [Your Name]`,
        body: `<p>${selectedOpp.aiCoverLetter.replace(/\n/g, '<br/>')}</p>`
      }
    });
  };

  // Helper for deadline countdown
  const getDeadlineInfo = (deadlineDate) => {
    if (!deadlineDate) return { text: 'Rolling / Open', urgent: false, expired: false };
    const target = new Date(deadlineDate).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'Application Closed', urgent: false, expired: true };
    }
    if (diffDays === 0) {
      return { text: '🚨 Closes Today', urgent: true, expired: false };
    }
    if (diffDays === 1) {
      return { text: '⏳ Closes Tomorrow', urgent: true, expired: false };
    }
    if (diffDays <= 3) {
      return { text: `⏳ ${diffDays} days left`, urgent: true, expired: false };
    }
    return { text: `📅 ${diffDays} days left`, urgent: false, expired: false };
  };

  // Filtered list
  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = 
      (opp.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (opp.jobTitle || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === 'internship') return (opp.roleType || '').toLowerCase().includes('intern');
    if (filterType === 'fulltime') return (opp.roleType || '').toLowerCase().includes('full');
    if (filterType === 'genuine') return (opp.trustScore || 0) >= 80;
    if (filterType === 'applied') return opp.status === 'applied';
    return true;
  });

  const verifiedCount = opportunities.filter(o => (o.trustScore || 0) >= 80).length;
  const appliedCount = opportunities.filter(o => o.status === 'applied').length;
  const pendingUrgentCount = opportunities.filter(o => {
    const info = getDeadlineInfo(o.deadline);
    return info.urgent && o.status !== 'applied';
  }).length;

  return (
    <div className="opportunities-page">
      {/* Page Header */}
      <div className="opportunities-header">
        <div>
          <h1>💼 Career & Internship Opportunities</h1>
          <p className="subtitle">
            AI-powered opportunity scanner, legitimacy verifier, deadline tracker & 1-click application drafter.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="opportunities-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue">
            <Briefcase size={22} />
          </div>
          <div>
            <div className="kpi-value">{opportunities.length}</div>
            <div className="kpi-label">Detected Opportunities</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon green">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="kpi-value">{verifiedCount}</div>
            <div className="kpi-label">Verified Genuine (≥80%)</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon orange">
            <Clock size={22} />
          </div>
          <div>
            <div className="kpi-value">{pendingUrgentCount}</div>
            <div className="kpi-label">Urgent Deadlines (≤3 days)</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon purple">
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="kpi-value">{appliedCount}</div>
            <div className="kpi-label">Applications Submitted</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="opportunities-controls">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search company, job title, or role..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All Opportunities
          </button>
          <button 
            className={`filter-btn ${filterType === 'internship' ? 'active' : ''}`}
            onClick={() => setFilterType('internship')}
          >
            Internships
          </button>
          <button 
            className={`filter-btn ${filterType === 'fulltime' ? 'active' : ''}`}
            onClick={() => setFilterType('fulltime')}
          >
            Full-Time
          </button>
          <button 
            className={`filter-btn ${filterType === 'genuine' ? 'active' : ''}`}
            onClick={() => setFilterType('genuine')}
          >
            🛡️ High Trust
          </button>
          <button 
            className={`filter-btn ${filterType === 'applied' ? 'active' : ''}`}
            onClick={() => setFilterType('applied')}
          >
            ✅ Applied
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Scanning emails and verifying opportunities...</p>
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="empty-state">
          <Briefcase size={48} className="empty-icon" />
          <h3>No opportunities found</h3>
          <p>
            {opportunities.length === 0 
              ? 'When emails with job, internship, or career offers arrive, our AI agent will automatically verify their authenticity, extract deadlines, and track them here.'
              : 'No opportunities match your current search and filter settings.'}
          </p>
        </div>
      ) : (
        <div className="opportunities-grid">
          {filteredOpportunities.map((opp) => {
            const deadlineInfo = getDeadlineInfo(opp.deadline);
            const isHighTrust = (opp.trustScore || 0) >= 75;
            const isApplied = opp.status === 'applied';

            return (
              <div key={opp.id || opp._id} className={`opportunity-card ${isApplied ? 'applied' : ''}`}>
                {/* Header */}
                <div className="card-top">
                  <div className="role-meta">
                    <span className="company-badge">{opp.companyName}</span>
                    <span className="role-type-badge">{opp.roleType || 'Opportunity'}</span>
                  </div>
                  
                  <div className="top-actions">
                    <button 
                      className={`reminder-btn ${opp.reminderSet ? 'active' : ''}`}
                      title={opp.reminderSet ? 'Reminder Active' : 'Set Reminder'}
                      onClick={() => handleToggleReminder(opp)}
                    >
                      {opp.reminderSet ? <Bell size={16} /> : <BellOff size={16} />}
                    </button>
                    <button 
                      className="delete-card-btn"
                      title="Dismiss Opportunity"
                      onClick={() => handleDelete(opp.id || opp._id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Job Title */}
                <h3 className="job-title">{opp.jobTitle}</h3>

                {/* Trustworthiness Badge */}
                <div className={`trust-badge ${isHighTrust ? 'trusted' : 'warning'}`}>
                  {isHighTrust ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                  <span>{opp.trustScore}% Trust Score • {isHighTrust ? 'Verified Genuine' : 'Caution / Unverified'}</span>
                </div>

                {/* Trust reasons list */}
                {opp.trustReasons && opp.trustReasons.length > 0 && (
                  <ul className="trust-reasons">
                    {opp.trustReasons.slice(0, 2).map((reason, idx) => (
                      <li key={idx}>✓ {reason}</li>
                    ))}
                  </ul>
                )}

                {/* Deadline countdown */}
                <div className={`deadline-container ${deadlineInfo.urgent ? 'urgent' : ''} ${deadlineInfo.expired ? 'expired' : ''}`}>
                  <Calendar size={15} />
                  <span>
                    Deadline: {opp.deadline ? new Date(opp.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible'} 
                    <strong className="countdown-pill"> ({deadlineInfo.text})</strong>
                  </span>
                </div>

                {/* Card Action Buttons */}
                <div className="card-actions">
                  <button 
                    className="ai-draft-btn"
                    onClick={() => handleGenerateCoverLetter(opp)}
                  >
                    <Sparkles size={15} />
                    {opp.aiCoverLetter ? 'View AI Application' : '1-Click AI Cover Letter'}
                  </button>

                  <div className="right-action-group">
                    {opp.applyUrl && (
                      <a 
                        href={opp.applyUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="apply-link-btn"
                        title="Open external application link"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}

                    <button 
                      className={`mark-applied-btn ${isApplied ? 'applied' : ''}`}
                      onClick={() => handleStatusUpdate(opp.id || opp._id, isApplied ? 'detected' : 'applied')}
                    >
                      <CheckCircle size={15} />
                      {isApplied ? 'Applied' : 'Mark Applied'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Cover Letter / Application Drafter Modal */}
      {selectedOpp && (
        <div className="modal-backdrop" onClick={() => setSelectedOpp(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>✨ AI Application Drafter</h2>
                <p className="modal-sub">
                  Custom-tailored for <strong>{selectedOpp.jobTitle}</strong> at <strong>{selectedOpp.companyName}</strong>
                </p>
              </div>
              <button className="close-btn" onClick={() => setSelectedOpp(null)}>✕</button>
            </div>

            <div className="modal-body">
              {drafting ? (
                <div className="modal-loading">
                  <div className="spinner"></div>
                  <p>AI is analyzing the role and crafting a persuasive cover letter...</p>
                </div>
              ) : selectedOpp.aiCoverLetter ? (
                <div className="cover-letter-preview">
                  <textarea 
                    value={selectedOpp.aiCoverLetter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedOpp(prev => ({ ...prev, aiCoverLetter: val }));
                    }}
                    rows={12}
                    className="cover-letter-textarea"
                  />
                </div>
              ) : (
                <div className="modal-empty">
                  <p>Click below to generate an AI application letter tailored to this position.</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <div className="modal-footer-left">
                {selectedOpp.aiCoverLetter && (
                  <button className="btn-secondary" onClick={handleCopyCoverLetter}>
                    {copied ? <Check size={16} className="text-green" /> : <Copy size={16} />}
                    {copied ? 'Copied to Clipboard' : 'Copy Text'}
                  </button>
                )}
              </div>

              <div className="modal-footer-right">
                <button className="btn-secondary" onClick={() => setSelectedOpp(null)}>
                  Close
                </button>

                {selectedOpp.aiCoverLetter && (
                  <button className="btn-primary" onClick={handleOpenComposeWithDraft}>
                    <Send size={16} />
                    Open in Email Composer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Opportunities;
