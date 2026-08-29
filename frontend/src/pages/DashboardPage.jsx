import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingDown, TrendingUp, Wallet, Activity,
  Upload, ArrowRight, RefreshCw, Layers, Brain, List, BarChart2
} from 'lucide-react';
import { analyticsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import './DashboardPage.css';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const PIE_COLORS = ['#ffffff', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46'];

const MONO_SWATCHES = [
  { color: '#ffffff', hex: 'FFFFFF' },
  { color: '#e4e4e7', hex: 'E4E4E7' },
  { color: '#a1a1aa', hex: 'A1A1AA' },
  { color: '#71717a', hex: '71717A' },
  { color: '#3f3f46', hex: '3F3F46' },
  { color: '#18181b', hex: '18181B' },
];

const MONO_TAGS = ['FINANCE OS', 'REAL-TIME ANALYTICS', 'STATEMENT PARSER', 'AI SCORING', 'MONOCHROME UI'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color === '#ffffff' ? '#ffffff' : '#a1a1aa', fontWeight: 700 }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [byMonth, setByMonth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [ov, cat, mon] = await Promise.all([
        analyticsApi.overview(),
        analyticsApi.byCategory(),
        analyticsApi.byMonth(),
      ]);
      setOverview(ov.data);
      setByCategory(cat.data.slice(0, 7));
      setByMonth(mon.data.slice(0, 6));
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return <LoadingSpinner />;

  const hasData = overview && overview.transaction_count > 0;

  return (
    <div className="dashboard animate-fade-in">
      {/* Hero Section Header */}
      <div className="hero-card">
        <div className="hero-glow-bar" />
        <div className="hero-header">
          <div className="logo-box">
            <Layers size={24} />
          </div>
          <div className="hero-title">
            <h2>Personal <span style={{ color: '#ffffff' }}>Finance OS</span></h2>
            <p className="text-secondary" style={{ fontSize: 13, margin: 0 }}>
              {greeting()}, {user?.name?.split(' ')[0] || 'Account Holder'} 👋
            </p>
          </div>
          <button id="refresh-btn" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={load}>
            <RefreshCw size={14} />
            Sync Data
          </button>
        </div>

        <p className="hero-desc">
          An all-in-one financial operating system built with high-contrast monochrome design, offering real-time statement parsing, transaction analytics, and AI-driven spending optimization.
        </p>

        {/* Headline Quote Box */}
        <div className="quote-box">
          <div className="quote-label">SYSTEM SLOGAN</div>
          <div className="quote-text">“Precision finance in high contrast simplicity.”</div>
        </div>

        {/* Swatch Palette Strip */}
        <div className="palette-strip">
          {MONO_SWATCHES.map(s => (
            <div key={s.hex} className="swatch">
              <div className="swatch-color" style={{ backgroundColor: s.color }} />
              <span className="swatch-label">{s.hex}</span>
            </div>
          ))}
        </div>

        {/* Pill Tags */}
        <div className="tag-list">
          {MONO_TAGS.map(t => (
            <span key={t} className="tag-pill">{t}</span>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 24 }}>
          {error}
        </div>
      )}

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* SECTION 01 — SUMMARY */}
          <div className="section-badge">
            <span className="section-eyebrow">SECTION 01</span>
            <span className="section-title">Summary & Metrics</span>
          </div>

          {/* Stat cards */}
          <div className="grid-4" style={{ marginBottom: 32 }}>
            <StatCard
              icon={<TrendingDown size={18} />}
              label="Total Outflow"
              value={fmt(overview.total_spent)}
              sub="Debits & expenses"
              accentColor="mono"
              section="OUTFLOW"
            />
            <StatCard
              icon={<TrendingUp size={18} />}
              label="Total Inflow"
              value={fmt(overview.total_received)}
              sub="Credits & income"
              accentColor="mono"
              section="INFLOW"
            />
            <StatCard
              icon={<Wallet size={18} />}
              label="Net Position"
              value={fmt(overview.net_balance)}
              sub="Current balance"
              accentColor="mono"
              section="BALANCE"
            />
            <StatCard
              icon={<Activity size={18} />}
              label="Total Records"
              value={overview.transaction_count}
              sub="Parsed transactions"
              accentColor="mono"
              section="RECORDS"
            />
          </div>

          {/* SECTION 02 — ANALYTICS */}
          <div className="section-badge">
            <span className="section-eyebrow">SECTION 02</span>
            <span className="section-title">Visual Analytics</span>
          </div>

          {/* Charts row */}
          <div className="grid-2" style={{ marginBottom: 32 }}>
            {/* Monthly bar chart */}
            <div className="card chart-card">
              <div className="card-header-row">
                <div>
                  <h3>Monthly Outflow vs Inflow</h3>
                  <p className="text-secondary" style={{ fontSize: 12, marginTop: 2 }}>Monthly transaction breakdown</p>
                </div>
                <Link to="/analytics" className="btn btn-ghost btn-sm">
                  Full Analytics <ArrowRight size={13} />
                </Link>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byMonth} barGap={4} barCategoryGap="30%">
                  <XAxis dataKey="month" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                  <Bar dataKey="total_debit" name="Outflow" fill="#ffffff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total_credit" name="Inflow" fill="#71717a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Spending pie */}
            <div className="card chart-card">
              <div className="card-header-row">
                <div>
                  <h3>Spend by Category</h3>
                  <p className="text-secondary" style={{ fontSize: 12, marginTop: 2 }}>Top categories distribution</p>
                </div>
                <Link to="/analytics" className="btn btn-ghost btn-sm">
                  Explore Categories <ArrowRight size={13} />
                </Link>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#121215" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, fontSize: 13, color: '#ffffff' }} />
                  <Legend
                    formatter={(value) => <span style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SECTION 03 — QUICK ACTIONS */}
          <div className="section-badge">
            <span className="section-eyebrow">SECTION 03</span>
            <span className="section-title">Quick Actions & Modules</span>
          </div>

          <div className="grid-3">
            <QuickLink to="/transactions" label="View Transactions" sub="Filter, search & audit raw records" icon={<List size={20} />} />
            <QuickLink to="/ai" label="AI Insights & Scoring" sub="Z-score anomaly & financial health" icon={<Brain size={20} />} />
            <QuickLink to="/upload" label="Upload Statement PDF" sub="Gemini file parser integration" icon={<Upload size={20} />} />
          </div>
        </>
      )}
    </div>
  );
}

function QuickLink({ to, label, sub, icon }) {
  return (
    <Link to={to} className="quick-link card" id={`quicklink-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="quick-link-content">
        <div className="quick-icon-box">{icon}</div>
        <div>
          <h4>{label}</h4>
          <p className="text-secondary" style={{ fontSize: 12, marginTop: 2 }}>{sub}</p>
        </div>
      </div>
      <ArrowRight size={16} className="quick-arrow" />
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="card dashboard-empty">
      <div className="empty-icon">⚡</div>
      <h2>Welcome to Personal Finance OS</h2>
      <p>Upload your first bank or wallet statement PDF to launch your financial analytics.</p>
      <Link to="/upload" id="get-started-btn" className="btn btn-primary btn-lg">
        <Upload size={16} />
        Upload Statement PDF
      </Link>
    </div>
  );
}
