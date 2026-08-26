import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, Bell, Menu, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../UI/UI';
import './Layout.css';

const Header = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-menu-btn" onClick={onMenuToggle}>
          <Menu size={22} />
        </button>
        <form className="header-search" onSubmit={handleSearch}>
          <Search size={18} className="header-search-icon" />
          <input
            type="text"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="header-search-input"
          />
        </form>
      </div>

      <div className="header-right">
        <button className="header-icon-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <button className="header-icon-btn" title="Notifications">
          <Bell size={20} />
          <span className="header-notification-dot" />
        </button>
        <div className="header-user-wrapper">
          <button
            className="header-user-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <Avatar name={user?.name} size="sm" />
          </button>
          {showUserMenu && (
            <div className="header-dropdown" onClick={() => setShowUserMenu(false)}>
              <div className="header-dropdown-info">
                <span className="header-dropdown-name">{user?.name}</span>
                <span className="header-dropdown-email">{user?.email}</span>
              </div>
              <div className="header-dropdown-divider" />
              <button
                className="header-dropdown-item"
                onClick={() => navigate('/settings')}
              >
                Settings
              </button>
              <button
                className="header-dropdown-item header-dropdown-danger"
                onClick={logout}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
