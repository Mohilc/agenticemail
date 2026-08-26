import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Trash2, Archive, MailOpen, Mail as MailIcon,
  RefreshCw, ChevronLeft, ChevronRight, Inbox,
} from 'lucide-react';
import { emailService } from '../services/emailService';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Avatar, Badge, SkeletonLoader, EmptyState, Button } from '../components/UI/UI';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import './Dashboard.css';

const folderTitles = {
  inbox: 'Inbox', sent: 'Sent', drafts: 'Drafts', starred: 'Starred',
  trash: 'Trash', spam: 'Spam', archive: 'Archive',
};

const categoryColors = {
  primary: 'var(--cat-primary)', social: 'var(--cat-social)',
  promotions: 'var(--cat-promotions)', updates: 'var(--cat-updates)',
  forums: 'var(--cat-forums)',
};

const sentimentIcons = {
  positive: '😊', neutral: '😐', negative: '😟',
};

const Dashboard = () => {
  const { folder = 'inbox' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      const label = searchParams.get('label');
      if (label) params.label = label;

      const response = await emailService.getByFolder(folder, params);
      setEmails(response.data);
      setPagination(response.pagination);
    } catch (err) {
      toast.error('Failed to load emails');
    } finally {
      setLoading(false);
    }
  }, [folder, page, searchParams]);

  useEffect(() => {
    setPage(1);
    setSelectedEmails(new Set());
  }, [folder]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Real-time new email listener
  useEffect(() => {
    if (socket) {
      socket.on('newEmail', (newEmail) => {
        if (folder === 'inbox') {
          setEmails((prev) => [newEmail, ...prev]);
          toast('New email received!', { icon: '📧' });
        }
      });
      return () => socket.off('newEmail');
    }
  }, [socket, folder]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEmails();
    setRefreshing(false);
  };

  const handleToggleStar = async (e, emailId) => {
    e.stopPropagation();
    try {
      const email = emails.find((em) => em._id === emailId);
      await emailService.update(emailId, { isStarred: !email.isStarred });
      setEmails((prev) =>
        prev.map((em) =>
          em._id === emailId ? { ...em, isStarred: !em.isStarred } : em
        )
      );
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleTrash = async (e, emailId) => {
    e.stopPropagation();
    try {
      await emailService.moveToTrash(emailId);
      setEmails((prev) => prev.filter((em) => em._id !== emailId));
      toast.success('Moved to trash');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleArchive = async (e, emailId) => {
    e.stopPropagation();
    try {
      await emailService.update(emailId, { isArchived: true, folder: 'archive' });
      setEmails((prev) => prev.filter((em) => em._id !== emailId));
      toast.success('Archived');
    } catch {
      toast.error('Failed to archive');
    }
  };

  const handleSelectAll = () => {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map((e) => e._id)));
    }
  };

  const handleSelect = (e, emailId) => {
    e.stopPropagation();
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(emailId)) next.delete(emailId);
      else next.add(emailId);
      return next;
    });
  };

  const formatTime = (date) => {
    if (!date) return '';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const getDisplayName = (email) => {
    if (folder === 'sent' || folder === 'drafts') {
      return email.to?.[0]?.name || email.to?.[0]?.email || 'Unknown';
    }
    return email.from?.name || email.from?.email || 'Unknown';
  };

  return (
    <div className="dashboard">
      <div className="dashboard-toolbar">
        <div className="dashboard-toolbar-left">
          <input
            type="checkbox"
            className="dashboard-checkbox"
            checked={selectedEmails.size === emails.length && emails.length > 0}
            onChange={handleSelectAll}
          />
          <h2 className="dashboard-title">{folderTitles[folder] || 'Inbox'}</h2>
          {pagination.total > 0 && (
            <span className="dashboard-count">{pagination.total} emails</span>
          )}
        </div>
        <div className="dashboard-toolbar-right">
          <button
            className="dashboard-toolbar-btn"
            onClick={handleRefresh}
            title="Refresh"
          >
            <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
          </button>
          {pagination.pages > 1 && (
            <div className="dashboard-pagination">
              <span className="dashboard-page-info">
                {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
              </span>
              <button
                className="dashboard-toolbar-btn"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="dashboard-toolbar-btn"
                disabled={page === pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="email-list">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <SkeletonLoader key={i} lines={2} avatar />
          ))
        ) : emails.length === 0 ? (
          <EmptyState
            icon={<Inbox size={48} />}
            title={`No emails in ${folderTitles[folder] || 'this folder'}`}
            description="Your mailbox is empty. Compose a new email to get started."
            action={
              <Button variant="primary" onClick={() => navigate('/compose')}>
                Compose Email
              </Button>
            }
          />
        ) : (
          <AnimatePresence>
            {emails.map((email, index) => (
              <motion.div
                key={email._id}
                className={`email-row ${!email.isRead ? 'email-unread' : ''} ${selectedEmails.has(email._id) ? 'email-selected' : ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => navigate(`/email/${email._id}`)}
              >
                <input
                  type="checkbox"
                  className="dashboard-checkbox"
                  checked={selectedEmails.has(email._id)}
                  onChange={(e) => handleSelect(e, email._id)}
                />

                <button
                  className={`email-star ${email.isStarred ? 'email-star-active' : ''}`}
                  onClick={(e) => handleToggleStar(e, email._id)}
                >
                  <Star size={18} fill={email.isStarred ? '#f59e0b' : 'none'} />
                </button>

                <Avatar name={getDisplayName(email)} size="sm" />

                <div className="email-content">
                  <div className="email-top">
                    <span className={`email-sender ${!email.isRead ? 'email-sender-unread' : ''}`}>
                      {getDisplayName(email)}
                    </span>
                    {email.category && email.category !== 'primary' && (
                      <Badge variant="default" size="sm">
                        <span
                          className="email-cat-dot"
                          style={{ background: categoryColors[email.category] }}
                        />
                        {email.category}
                      </Badge>
                    )}
                    {email.sentiment && (
                      <span className="email-sentiment" title={email.sentiment}>
                        {sentimentIcons[email.sentiment]}
                      </span>
                    )}
                  </div>
                  <div className="email-middle">
                    <span className={`email-subject ${!email.isRead ? 'email-subject-unread' : ''}`}>
                      {email.subject}
                    </span>
                    <span className="email-snippet"> — {email.snippet}</span>
                  </div>
                  {email.labels?.length > 0 && (
                    <div className="email-labels">
                      {email.labels.map((label) => (
                        <span
                          key={label._id}
                          className="email-label-tag"
                          style={{ borderColor: label.color, color: label.color }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="email-right">
                  <span className="email-time">{formatTime(email.sentAt || email.createdAt)}</span>
                  <div className="email-actions">
                    <button
                      className="email-action-btn"
                      onClick={(e) => handleArchive(e, email._id)}
                      title="Archive"
                    >
                      <Archive size={16} />
                    </button>
                    <button
                      className="email-action-btn"
                      onClick={(e) => handleTrash(e, email._id)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      className="email-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        emailService.update(email._id, { isRead: !email.isRead });
                        setEmails((prev) =>
                          prev.map((em) =>
                            em._id === email._id ? { ...em, isRead: !em.isRead } : em
                          )
                        );
                      }}
                      title={email.isRead ? 'Mark unread' : 'Mark read'}
                    >
                      {email.isRead ? <MailIcon size={16} /> : <MailOpen size={16} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
