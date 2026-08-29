import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Mail, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', name: '' });

  const handleChange = (e) => {
    setError('');
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.email, form.password, form.name);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left panel */}
      <div className="login-left">
        <div className="login-hero">
          <div className="hero-logo">
            <Layers size={32} />
          </div>
          <h1 className="hero-title">
            Finance <span style={{ color: '#ffffff' }}>OS</span><br />
            <span style={{ fontSize: 26, fontWeight: 700, color: '#a1a1aa' }}>Monochrome Operating System</span>
          </h1>

          <div className="quote-box" style={{ background: '#1c1c21', borderColor: '#27272a', marginTop: 16, marginBottom: 24 }}>
            <div className="quote-label">PLATFORM VISION</div>
            <div className="quote-text" style={{ color: '#ffffff' }}>“Precision financial analytics in high contrast simplicity.”</div>
          </div>

          <p className="hero-desc">
            An all-in-one financial operating system built exclusively for statement processing, analytics, and intelligent wealth tracking.
          </p>
          <div className="hero-features">
            {['Universal PDF statement parsing', 'Machine-learning spend predictions', 'Statistical anomaly detection (Z-Score)', 'Financial Health Score (0–100)'].map(f => (
              <div key={f} className="hero-feature">
                <span className="feature-dot" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="login-right">
        <div className="login-card card animate-fade-in">
          {/* Tabs */}
          <div className="auth-tabs">
            <button
              id="tab-login"
              className={`auth-tab ${tab === 'login' ? 'auth-tab-active' : ''}`}
              onClick={() => { setTab('login'); setError(''); }}
            >
              Sign In
            </button>
            <button
              id="tab-register"
              className={`auth-tab ${tab === 'register' ? 'auth-tab-active' : ''}`}
              onClick={() => { setTab('register'); setError(''); }}
            >
              Create Account
            </button>
          </div>

          <form id="auth-form" onSubmit={handleSubmit} className="auth-form">
            {tab === 'register' && (
              <div className="form-group animate-fade-in">
                <label className="form-label" htmlFor="name">Full Name</label>
                <div className="input-icon-wrap">
                  <User size={15} className="input-icon" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Jane Doe"
                    className="form-input input-with-icon"
                    value={form.name}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <div className="input-icon-wrap">
                <Mail size={15} className="input-icon" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className="form-input input-with-icon"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="input-icon-wrap">
                <Lock size={15} className="input-icon" />
                <input
                  id="password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="form-input input-with-icon input-with-icon-right"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPass(s => !s)}
                  aria-label="Toggle password visibility"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="alert alert-error animate-fade-in">
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? (
                <span className="btn-spinner" />
              ) : (
                <>
                  {tab === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              className="auth-switch-btn"
              onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); setError(''); }}
            >
              {tab === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
