import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, List, BarChart2, Brain,
  Upload, LogOut, ChevronRight, Menu, X, User, Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const NAV_ITEMS = [
  { to: '/',             label: 'Dashboard',    icon: LayoutDashboard, section: '01' },
  { to: '/transactions', label: 'Transactions', icon: List,            section: '02' },
  { to: '/analytics',    label: 'Analytics',    icon: BarChart2,       section: '03' },
  { to: '/ai',           label: 'AI Insights',  icon: Brain,          section: '04' },
  { to: '/upload',       label: 'Upload PDF',   icon: Upload,         section: '05' },
];

const MONO_SWATCHES = [
  { bg: '#ffffff', hex: 'FFFFFF' },
  { bg: '#e4e4e7', hex: 'E4E4E7' },
  { bg: '#a1a1aa', hex: 'A1A1AA' },
  { bg: '#71717a', hex: '71717A' },
  { bg: '#3f3f46', hex: '3F3F46' },
  { bg: '#18181b', hex: '18181B' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const close = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        id="mobile-nav-toggle"
        className="mobile-nav-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop */}
      {mobileOpen && <div className="nav-backdrop" onClick={close} />}

      {/* Sidebar */}
      <nav className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        {/* Logo Header */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Layers size={22} />
          </div>
          <div>
            <span className="logo-text">Finance <span className="logo-badge">OS</span></span>
            <span className="logo-sub">Monochrome Platform</span>
          </div>
        </div>

        <div className="sidebar-divider" />

        {/* Navigation Section */}
        <div className="nav-section-label">Main Navigation</div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon, section }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
              onClick={close}
            >
              <Icon size={18} className="nav-icon" />
              <span className="nav-label">{label}</span>
              <span className="nav-section-num">{section}</span>
              <ChevronRight size={14} className="nav-chevron" />
            </NavLink>
          ))}
        </nav>

        {/* Monochrome Palette Indicator */}
        <div className="sidebar-palette-box">
          <span className="palette-title">Monochrome Theme</span>
          <div className="palette-dots">
            {MONO_SWATCHES.map(s => (
              <span key={s.hex} className="palette-dot" style={{ backgroundColor: s.bg }} title={`#${s.hex}`} />
            ))}
          </div>
        </div>

        {/* User profile at bottom */}
        <div className="sidebar-footer">
          <div className="sidebar-divider" />
          <div className="user-profile">
            <div className="user-avatar">
              <User size={16} />
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name || 'Account Holder'}</span>
              <span className="user-email">{user?.email}</span>
            </div>
          </div>
          <button id="logout-btn" className="btn btn-ghost btn-full logout-btn" onClick={handleLogout}>
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </nav>
    </>
  );
}
