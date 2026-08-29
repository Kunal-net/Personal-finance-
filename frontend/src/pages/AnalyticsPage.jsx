import { useEffect, useState } from 'react';
import { analyticsApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import './AnalyticsPage.css';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const PIE_COLORS = ['#ffffff', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color === '#ffffff' ? '#ffffff' : '#a1a1aa', marginTop: 4, fontWeight: 600 }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [byMonth, setByMonth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [ov, cat, mon] = await Promise.all([
          analyticsApi.overview(),
          analyticsApi.byCategory(),
          analyticsApi.byMonth(),
        ]);
        setOverview(ov.data);
        setByCategory(cat.data);
        setByMonth(mon.data);
      } catch (e) {
        setError(e.response?.data?.detail || 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  if (error) return (
    <div className="animate-fade-in">
      <div className="page-header"><h1>Analytics</h1></div>
      <div className="alert alert-error">{error}</div>
    </div>
  );

  return (
    <div className="analytics-page animate-fade-in">
      <div className="section-badge">
        <span className="section-eyebrow">SECTION 03</span>
        <span className="section-title">Deep Analytics & Categories</span>
      </div>
      <div className="page-header">
        <h1>Financial Analytics</h1>
        <p>Deep dive into your spending patterns, category trends, and monthly distribution</p>
      </div>

      {/* Summary row */}
      {overview && (
        <div className="summary-chips">
          <div className="chip">
            <span>Total Spent</span>
            <strong>{fmt(overview.total_spent)}</strong>
          </div>
          <div className="chip">
            <span>Total Received</span>
            <strong>{fmt(overview.total_received)}</strong>
          </div>
          <div className="chip">
            <span>Net Balance</span>
            <strong>{fmt(overview.net_balance)}</strong>
          </div>
          <div className="chip">
            <span>Transactions</span>
            <strong>{overview.transaction_count}</strong>
          </div>
        </div>
      )}

      {/* Monthly trend */}
      <div className="card chart-section">
        <div className="chart-section-header">
          <div>
            <h3>Monthly Cash Flow</h3>
            <p className="text-secondary" style={{ fontSize: 12, marginTop: 2 }}>Debit vs Credit over time</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={byMonth} barGap={4} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} width={55} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
            <Bar dataKey="total_debit" name="Spent" fill="#ffffff" radius={[4, 4, 0, 0]} />
            <Bar dataKey="total_credit" name="Received" fill="#71717a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Net balance line */}
      {byMonth.length > 1 && (
        <div className="card chart-section">
          <div className="chart-section-header">
            <div>
              <h3>Net Balance Trend</h3>
              <p className="text-secondary" style={{ fontSize: 12, marginTop: 2 }}>Monthly net (received − spent)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={byMonth.map(m => ({ ...m, net: m.total_credit - m.total_debit }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} width={55} />
              <Tooltip formatter={(v) => [fmt(v), 'Net']} cursor={{ stroke: 'rgba(255, 255, 255, 0.2)' }} contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, fontSize: 13, color: '#ffffff' }} />
              <Line type="monotone" dataKey="net" stroke="#ffffff" strokeWidth={2.5} dot={{ fill: '#ffffff', r: 4 }} activeDot={{ r: 6, fill: '#a1a1aa' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category breakdown */}
      <div className="grid-2">
        {/* Pie */}
        <div className="card chart-section">
          <h3 style={{ marginBottom: 20 }}>Spending Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="total"
                nameKey="category"
                cx="50%"
                cy="45%"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={4}
              >
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#121215" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, fontSize: 13, color: '#ffffff' }} />
              <Legend formatter={(value) => <span style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 500 }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category table */}
        <div className="card chart-section">
          <h3 style={{ marginBottom: 16 }}>By Category</h3>
          <div className="category-list">
            {byCategory.map((cat, i) => {
              const pct = byCategory[0]?.total > 0 ? (cat.total / byCategory[0].total * 100).toFixed(0) : 0;
              return (
                <div key={cat.category} className="category-row">
                  <div className="cat-left">
                    <div className="cat-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="cat-name">{cat.category}</span>
                  </div>
                  <div className="cat-right">
                    <span className="cat-amount">{fmt(cat.total)}</span>
                    <span className="cat-count">{cat.count} txns</span>
                  </div>
                  <div className="cat-bar-track">
                    <div
                      className="cat-bar-fill"
                      style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
