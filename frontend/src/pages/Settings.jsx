import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Palette, Bell, Shield, Tag, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/authService';
import { labelService } from '../services/dataService';
import { Button, Input, Avatar } from '../components/UI/UI';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import './Settings.css';

const Settings = () => {
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    signature: user?.settings?.signature || '',
  });
  const [labels, setLabels] = useState([]);
  const [newLabel, setNewLabel] = useState({ name: '', color: '#6366f1' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const res = await labelService.getAll();
        setLabels(res.data);
      } catch {}
    };
    fetchLabels();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await authService.updateProfile({
        name: profileData.name,
        settings: { ...user.settings, signature: profileData.signature },
      });
      updateUser(res.data);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabel.name.trim()) return;
    try {
      const res = await labelService.create(newLabel);
      setLabels((prev) => [...prev, res.data]);
      setNewLabel({ name: '', color: '#6366f1' });
      toast.success('Label created!');
    } catch (err) {
      toast.error(err.message || 'Failed to create label');
    }
  };

  const handleDeleteLabel = async (id) => {
    try {
      await labelService.delete(id);
      setLabels((prev) => prev.filter((l) => l._id !== id));
      toast.success('Label deleted');
    } catch {
      toast.error('Failed to delete label');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'labels', label: 'Labels', icon: Tag },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
      </div>

      <div className="settings-layout">
        <nav className="settings-sidebar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'settings-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="settings-content">
          {activeTab === 'profile' && (
            <motion.div
              className="settings-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2>Profile Settings</h2>
              <div className="settings-avatar-row">
                <Avatar name={user?.name} size="xl" />
                <div>
                  <p className="settings-avatar-name">{user?.name}</p>
                  <p className="settings-avatar-email">{user?.email}</p>
                </div>
              </div>
              <div className="settings-form">
                <Input
                  label="Display Name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                />
                <div className="input-group">
                  <label className="input-label">Email Signature</label>
                  <textarea
                    className="settings-textarea"
                    placeholder="Your email signature..."
                    value={profileData.signature}
                    onChange={(e) => setProfileData({ ...profileData, signature: e.target.value })}
                    rows={4}
                  />
                </div>
                <Button
                  variant="primary"
                  loading={saving}
                  onClick={handleSaveProfile}
                >
                  Save Changes
                </Button>
              </div>
            </motion.div>
          )}

          {activeTab === 'appearance' && (
            <motion.div
              className="settings-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2>Appearance</h2>
              <div className="settings-option">
                <div>
                  <h4>Theme</h4>
                  <p>Choose your preferred theme</p>
                </div>
                <div className="settings-theme-toggle">
                  <button
                    className={`settings-theme-btn ${theme === 'light' ? 'settings-theme-btn-active' : ''}`}
                    onClick={() => theme !== 'light' && toggleTheme()}
                  >
                    ☀️ Light
                  </button>
                  <button
                    className={`settings-theme-btn ${theme === 'dark' ? 'settings-theme-btn-active' : ''}`}
                    onClick={() => theme !== 'dark' && toggleTheme()}
                  >
                    🌙 Dark
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'labels' && (
            <motion.div
              className="settings-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2>Labels</h2>
              <div className="settings-label-create">
                <input
                  type="text"
                  placeholder="New label name"
                  value={newLabel.name}
                  onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
                  className="settings-label-input"
                />
                <input
                  type="color"
                  value={newLabel.color}
                  onChange={(e) => setNewLabel({ ...newLabel, color: e.target.value })}
                  className="settings-color-picker"
                />
                <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={handleCreateLabel}>
                  Add
                </Button>
              </div>
              <div className="settings-labels-list">
                {labels.map((label) => (
                  <div key={label._id} className="settings-label-item">
                    <span className="settings-label-dot" style={{ background: label.color }} />
                    <span className="settings-label-name">{label.name}</span>
                    <button
                      className="settings-label-delete"
                      onClick={() => handleDeleteLabel(label._id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {labels.length === 0 && (
                  <p className="settings-empty">No labels yet. Create one above.</p>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              className="settings-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2>Notifications</h2>
              <div className="settings-option">
                <div>
                  <h4>Email Notifications</h4>
                  <p>Receive real-time notifications for new emails</p>
                </div>
                <label className="settings-switch">
                  <input type="checkbox" defaultChecked />
                  <span className="settings-switch-slider" />
                </label>
              </div>
              <div className="settings-option">
                <div>
                  <h4>Sound</h4>
                  <p>Play a sound when a new email arrives</p>
                </div>
                <label className="settings-switch">
                  <input type="checkbox" />
                  <span className="settings-switch-slider" />
                </label>
              </div>
            </motion.div>
          )}

          <div className="settings-danger-zone">
            <h3>Danger Zone</h3>
            <Button variant="danger" size="sm" onClick={logout}>
              Logout from all devices
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
