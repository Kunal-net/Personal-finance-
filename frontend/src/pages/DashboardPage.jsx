import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingDown, TrendingUp, Wallet, Activity,
  Upload, ArrowRight, RefreshCw
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

const PIE_COLORS = ['#7c6aff', '#00d4aa', '#ff6b8a', '#ff9f5a', '#4fa3ff', '#a78bfa', '#34d399'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
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
      setByCategory(cat.data.slice(0, 7)); // top 7
      setByMonth(mon.data.slice(0, 6).reverse()); // last 6 months
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
      {/* Header */}
      <div className="page-header dashboard-header">
        <div>
          <h1>{greeting()}, {user?.name?.split(' ')[0] || 'there'} 👋</h1>
          <p>Here's a snapshot of your financial health</p>
        </div>
        <button id="refresh-btn" className="btn btn-ghost btn-sm" onClick={load}>
          <RefreshCw size={14} />
          Refresh
        </button>
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
          {/* Stat cards */}
          <div className="grid-4" style={{ marginBottom: 32 }}>
            <StatCard
              icon={<TrendingDown size={18} />}
              label="Total Spent"
              value={fmt(overview.total_spent)}
              accentColor="pink"
            />
            <StatCard
              icon={<TrendingUp size={18} />}
              label="Total Received"
              value={fmt(overview.total_received)}
              accentColor="teal"
            />
            <StatCard
              icon={<Wallet size={18} />}
              label="Net Balance"
              value={fmt(overview.net_balance)}
              accentColor={overview.net_balance >= 0 ? 'purple' : 'pink'}
            />
            <StatCard
              icon={<Activity size={18} />}
              label="Transactions"
              value={overview.transaction_count}
              sub="total records"
              accentColor="blue"
            />
          </div>

          {/* Charts row */}
          <div className="grid-2" style={{ marginBottom: 32 }}>
            {/* Monthly bar chart */}
            <div className="card chart-card">
              <div className="card-header-row">
                <div>
                  <h3>Monthly Trend</h3>
                  <p className="text-secondary" style={{ fontSize: 12, marginTop: 2 }}>Debit vs Credit last 6 months</p>
                </div>
                <Link to="/analytics" className="btn btn-ghost btn-sm">
                  View all <ArrowRight size={13} />
                </Link>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byMonth} barGap={4} barCategoryGap="30%">
                  <XAxis dataKey="month" tick={{ fill: '#8b95b0', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8b95b0', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="total_debit" name="Spent" fill="#ff6b8a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total_credit" name="Received" fill="#00d4aa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Spending pie */}
            <div className="card chart-card">
              <div className="card-header-row">
                <div>
                  <h3>Spending by Category</h3>
                  <p className="text-secondary" style={{ fontSize: 12, marginTop: 2 }}>Top categories breakdown</p>
                </div>
                <Link to="/analytics" className="btn btn-ghost btn-sm">
                  View all <ArrowRight size={13} />
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
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend
                    formatter={(value) => <span style={{ color: '#8b95b0', fontSize: 12 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid-3">
            <QuickLink to="/transactions" label="View Transactions" sub="Browse and filter all your records" icon={<Activity size={20} />} color="purple" />
            <QuickLink to="/ai" label="AI Insights" sub="Predictions, anomalies & health score" icon={<Activity size={20} />} color="teal" />
            <QuickLink to="/upload" label="Upload Statement" sub="Add a new bank statement PDF" icon={<Upload size={20} />} color="blue" />
          </div>
        </>
      )}
    </div>
  );
}

function QuickLink({ to, label, sub, color }) {
  return (
    <Link to={to} className={`quick-link card accent-${color}`} id={`quicklink-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div>
        <h4>{label}</h4>
        <p className="text-secondary" style={{ fontSize: 12, marginTop: 4 }}>{sub}</p>
      </div>
      <ArrowRight size={16} className="quick-arrow" />
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="card dashboard-empty">
      <div className="empty-icon">🚀</div>
      <h2>Welcome to FinanceAI!</h2>
      <p>Upload your first bank statement to start tracking your finances.</p>
      <Link to="/upload" id="get-started-btn" className="btn btn-primary btn-lg">
        <Upload size={16} />
        Upload Statement
      </Link>
    </div>
  );
}
