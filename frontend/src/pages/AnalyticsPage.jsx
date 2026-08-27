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

const PIE_COLORS = ['#7c6aff', '#00d4aa', '#ff6b8a', '#ff9f5a', '#4fa3ff', '#a78bfa', '#34d399', '#f87171'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, marginTop: 4 }}>
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
        setByMonth(mon.data.slice().reverse());
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
      <div className="page-header">
        <h1>Analytics</h1>
        <p>Deep dive into your spending patterns</p>
      </div>

      {/* Summary row */}
      {overview && (
        <div className="summary-chips">
          <div className="chip chip-pink">
            <span>Total Spent</span>
            <strong>{fmt(overview.total_spent)}</strong>
          </div>
          <div className="chip chip-teal">
            <span>Total Received</span>
            <strong>{fmt(overview.total_received)}</strong>
          </div>
          <div className="chip chip-purple">
            <span>Net Balance</span>
            <strong>{fmt(overview.net_balance)}</strong>
          </div>
          <div className="chip chip-blue">
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
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#8b95b0', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8b95b0', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} width={55} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar dataKey="total_debit" name="Spent" fill="#ff6b8a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="total_credit" name="Received" fill="#00d4aa" radius={[4, 4, 0, 0]} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#8b95b0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8b95b0', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} width={55} />
              <Tooltip formatter={(v) => [fmt(v), 'Net']} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} contentStyle={{ background: 'rgba(13,18,32,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 13 }} />
              <Line type="monotone" dataKey="net" stroke="#7c6aff" strokeWidth={2.5} dot={{ fill: '#7c6aff', r: 4 }} activeDot={{ r: 6, fill: '#7c6aff' }} />
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
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: 'rgba(13,18,32,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 13 }} />
              <Legend formatter={(value) => <span style={{ color: '#8b95b0', fontSize: 12 }}>{value}</span>} />
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
