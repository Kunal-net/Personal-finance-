import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, List, BarChart2, Brain,
  Upload, LogOut, ChevronRight, Sparkles, Menu, X, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const NAV_ITEMS = [
  { to: '/',             label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: List },
  { to: '/analytics',    label: 'Analytics',    icon: BarChart2 },
  { to: '/ai',           label: 'AI Insights',  icon: Brain },
  { to: '/upload',       label: 'Upload',       icon: Upload },
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
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <span className="logo-text text-gradient">FinanceAI</span>
            <span className="logo-sub">Smart Dashboard</span>
          </div>
        </div>

        <div className="sidebar-divider" />

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
              onClick={close}
            >
              <Icon size={18} className="nav-icon" />
              <span>{label}</span>
              <ChevronRight size={14} className="nav-chevron" />
            </NavLink>
          ))}
        </nav>

        {/* User profile at bottom */}
        <div className="sidebar-footer">
          <div className="sidebar-divider" />
          <div className="user-profile">
            <div className="user-avatar">
              <User size={16} />
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name || 'User'}</span>
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
