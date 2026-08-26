import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/UI/UI';
import toast from 'react-hot-toast';
import './Auth.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!formData.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Invalid email';
    if (!formData.password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(formData.email, formData.password);
      toast.success('Welcome back!');
      navigate('/inbox');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

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
          <h1>Welcome back</h1>
          <p>Sign in to your EmailAI account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
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
                placeholder="Enter your password"
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
            {errors.password && <span className="input-error-text">{errors.password}</span>}
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            Sign In
          </Button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Create one</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
