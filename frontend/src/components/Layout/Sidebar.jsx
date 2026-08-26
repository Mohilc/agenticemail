import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Inbox, Send, FileEdit, Star, Trash2, AlertOctagon,
  Archive, Tag, BarChart3, Settings, PenSquare, Mail, FileText,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { emailService } from '../../services/emailService';
import { labelService } from '../../services/dataService';
import { Button } from '../UI/UI';
import './Layout.css';

const navItems = [
  { path: '/inbox', icon: Inbox, label: 'Inbox', folder: 'inbox' },
  { path: '/sent', icon: Send, label: 'Sent', folder: 'sent' },
  { path: '/drafts', icon: FileEdit, label: 'Drafts', folder: 'drafts' },
  { path: '/starred', icon: Star, label: 'Starred', folder: 'starred' },
  { path: '/spam', icon: AlertOctagon, label: 'Spam', folder: 'spam' },
  { path: '/trash', icon: Trash2, label: 'Trash', folder: 'trash' },
  { path: '/archive', icon: Archive, label: 'Archive', folder: 'archive' },
];

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [labels, setLabels] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [countsRes, labelsRes] = await Promise.all([
          emailService.getCounts(),
          labelService.getAll(),
        ]);
        setCounts(countsRes.data);
        setLabels(labelsRes.data);
      } catch (err) {
        // Silent fail for sidebar data
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <motion.aside
        className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}
        initial={false}
      >
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Mail size={28} className="sidebar-logo-icon" />
            <span>EmailAI</span>
          </div>
        </div>

        <div className="sidebar-compose">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<PenSquare size={18} />}
            onClick={() => { navigate('/compose'); onClose?.(); }}
          >
            Compose
          </Button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                onClick={onClose}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                {counts[item.folder] > 0 && (
                  <span className="sidebar-count">
                    {item.folder === 'inbox' ? counts.unread || counts.inbox : counts[item.folder]}
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          {labels.length > 0 && (
            <div className="sidebar-section">
              <h4 className="sidebar-section-title">
                <Tag size={14} />
                Labels
              </h4>
              {labels.map((label) => (
                <NavLink
                  key={label._id}
                  to={`/inbox?label=${label._id}`}
                  className="sidebar-link"
                  onClick={onClose}
                >
                  <span
                    className="sidebar-label-dot"
                    style={{ backgroundColor: label.color }}
                  />
                  <span>{label.name}</span>
                </NavLink>
              ))}
            </div>
          )}

          <div className="sidebar-section sidebar-bottom">
            <NavLink
              to="/templates"
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              onClick={onClose}
            >
              <FileText size={20} />
              <span>Templates</span>
            </NavLink>
            <NavLink
              to="/analytics"
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              onClick={onClose}
            >
              <BarChart3 size={20} />
              <span>Analytics</span>
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              onClick={onClose}
            >
              <Settings size={20} />
              <span>Settings</span>
            </NavLink>
          </div>
        </nav>
      </motion.aside>
    </>
  );
};

export default Sidebar;
