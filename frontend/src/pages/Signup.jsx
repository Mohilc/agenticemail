import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/UI/UI';
import toast from 'react-hot-toast';
import './Auth.css';

const Signup = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!formData.name || formData.name.length < 2) errs.name = 'Name must be at least 2 characters';
    if (!formData.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Invalid email';
    if (!formData.password || formData.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await signup(formData.name, formData.email, formData.password);
      toast.success('Account created successfully!');
      navigate('/inbox');
    } catch (err) {
      toast.error(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const p = formData.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strength = passwordStrength();
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const strengthColors = ['', '#ef4444', '#f59e0b', '#eab308', '#22c55e', '#10b981'];

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-orb auth-bg-orb-1" />
        <div className="auth-bg-orb auth-bg-orb-2" />
        <div className="auth-bg-orb auth-bg-orb-3" />
      </div>

      <motion.div
        className="auth-card glass"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-header">
          <div className="auth-logo">
            <Mail size={32} />
            <Sparkles size={16} className="auth-logo-spark" />
          </div>
          <h1>Create account</h1>
          <p>Start managing your emails with AI</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <Input
            label="Full Name"
            type="text"
            placeholder="John Doe"
            icon={<User size={18} />}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            icon={<Mail size={18} />}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
          />

          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-wrapper">
              <span className="input-icon"><Lock size={18} /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 6 characters"
                className={`input input-with-icon ${errors.password ? 'input-error' : ''}`}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formData.password && (
              <div className="password-strength">
                <div className="password-strength-bar">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="password-strength-segment"
                      style={{
                        background: i <= strength ? strengthColors[strength] : 'var(--border-color)',
                      }}
                    />
                  ))}
                </div>
                <span style={{ color: strengthColors[strength], fontSize: '12px' }}>
                  {strengthLabels[strength]}
                </span>
              </div>
            )}
            {errors.password && <span className="input-error-text">{errors.password}</span>}
          </div>

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Repeat your password"
            icon={<Lock size={18} />}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            error={errors.confirmPassword}
          />

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            Create Account
          </Button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;
