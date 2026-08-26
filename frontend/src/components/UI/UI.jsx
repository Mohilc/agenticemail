import { motion } from 'framer-motion';
import './UI.css';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  fullWidth,
  ...props
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${loading ? 'btn-loading' : ''}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="btn-spinner" />
      ) : (
        <>
          {icon && <span className="btn-icon">{icon}</span>}
          {children}
        </>
      )}
    </motion.button>
  );
};

export const Input = ({ label, error, icon, ...props }) => {
  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <input className={`input ${icon ? 'input-with-icon' : ''} ${error ? 'input-error' : ''}`} {...props} />
      </div>
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
};

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={`modal-content modal-${size}`}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="modal-header">
            <h2>{title}</h2>
            <button className="modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
      </motion.div>
    </motion.div>
  );
};

export const Loader = ({ size = 'md', text }) => {
  return (
    <div className={`loader loader-${size}`}>
      <div className="loader-spinner" />
      {text && <p className="loader-text">{text}</p>}
    </div>
  );
};

export const SkeletonLoader = ({ lines = 3, avatar = false }) => {
  return (
    <div className="skeleton-wrapper">
      {avatar && <div className="skeleton skeleton-avatar" />}
      <div className="skeleton-lines">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton skeleton-line"
            style={{ width: `${100 - i * 20}%` }}
          />
        ))}
      </div>
    </div>
  );
};

export const EmptyState = ({ icon, title, description, action }) => {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </motion.div>
  );
};

export const Badge = ({ children, variant = 'default', size = 'sm' }) => {
  return (
    <span className={`badge badge-${variant} badge-${size}`}>{children}</span>
  );
};

export const Avatar = ({ name, src, size = 'md' }) => {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
    '#10b981', '#06b6d4', '#3b82f6',
  ];
  const colorIndex = name
    ? name.charCodeAt(0) % colors.length
    : 0;

  return (
    <div
      className={`avatar avatar-${size}`}
      style={{ backgroundColor: src ? 'transparent' : colors[colorIndex] }}
    >
      {src ? (
        <img src={src} alt={name} className="avatar-img" />
      ) : (
        <span className="avatar-initials">{initials}</span>
      )}
    </div>
  );
};
