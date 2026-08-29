import { useEffect, useState } from 'react';
import {
  Brain, TrendingUp, PiggyBank, AlertTriangle, Heart,
  ChevronRight, Loader2, RefreshCw
} from 'lucide-react';
import { aiApi } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import './AiPage.css';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// Section loader HOC
function AiSection({ id, title, icon, children, loading, error, onRefresh }) {
  return (
    <div id={id} className="card ai-section">
      <div className="ai-section-header">
        <div className="ai-section-icon">{icon}</div>
        <div className="ai-section-title">
          <h3>{title}</h3>
        </div>
        <button className="btn btn-ghost btn-sm ai-refresh-btn" onClick={onRefresh} aria-label="Refresh">
          <RefreshCw size={13} />
        </button>
      </div>
      {loading && <LoadingSpinner size={28} />}
      {!loading && error && <div className="alert alert-error">{error}</div>}
      {!loading && !error && children}
    </div>
  );
}

// Health Score Ring
function HealthRing({ score, grade }) {
  const data = [{ value: score, fill: '#ffffff' }, { value: 100 - score, fill: '#27272a' }];
  return (
    <div className="health-ring-wrapper">
      <div className="health-ring-chart">
        <ResponsiveContainer width={160} height={160}>
          <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={data} startAngle={90} endAngle={-270} barSize={14}>
            <RadialBar dataKey="value" cornerRadius={8} background={false} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="health-ring-label">
          <span className="health-score-num">{score}</span>
          <span className="health-grade">Grade {grade}</span>
        </div>
      </div>
    </div>
  );
}

export default function AiPage() {
  const [predict, setPredict] = useState(null);
  const [savings, setSavings] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [health, setHealth] = useState(null);

  const [loadingMap, setLoadingMap] = useState({ predict: true, savings: true, anomalies: true, health: true });
  const [errorMap, setErrorMap] = useState({});

  const fetch = (key, apiFn, setter) => {
    setLoadingMap(m => ({ ...m, [key]: true }));
    setErrorMap(m => ({ ...m, [key]: '' }));
    apiFn()
      .then(r => setter(r.data))
      .catch(e => setErrorMap(m => ({ ...m, [key]: e.response?.data?.detail || `Failed to load ${key}` })))
      .finally(() => setLoadingMap(m => ({ ...m, [key]: false })));
  };

  useEffect(() => {
    fetch('predict', aiApi.predict, setPredict);
    fetch('savings', aiApi.savingsPlan, setSavings);
    fetch('anomalies', aiApi.anomalies, setAnomalies);
    fetch('health', aiApi.healthScore, setHealth);
  }, []);

  return (
    <div className="ai-page animate-fade-in">
      <div className="section-badge">
        <span className="section-eyebrow">SECTION 04</span>
        <span className="section-title">AI Intelligence & Health Score</span>
      </div>
      <div className="page-header">
        <div>
          <h1><Brain size={22} style={{ marginRight: 10, verticalAlign: 'middle', color: '#ffffff' }} />AI Insights & Predictions</h1>
          <p>Machine learning–powered analysis, anomaly detection, and health score</p>
        </div>
      </div>

      <div className="ai-grid">
        {/* Financial Health Score */}
        <AiSection
          id="ai-health"
          title="Financial Health Score"
          icon={<Heart size={16} />}
          loading={loadingMap.health}
          error={errorMap.health}
          onRefresh={() => fetch('health', aiApi.healthScore, setHealth)}
        >
          {health && (
            <div className="health-content">
              <HealthRing score={health.score} grade={health.grade} />
              <div className="health-breakdown">
                <ScoreBar label="Savings Rate" value={health.breakdown.savings_rate_score} max={40} color="#ffffff" />
                <ScoreBar label="Spending Trend" value={health.breakdown.trend_score} max={30} color="#a1a1aa" />
                <ScoreBar label="Category Diversity" value={health.breakdown.diversity_score} max={30} color="#71717a" />
              </div>
              <div className="insights-list">
                {health.insights.map((ins, i) => (
                  <div key={i} className="insight-item">
                    <ChevronRight size={13} style={{ color: '#ffffff', flexShrink: 0, marginTop: 2 }} />
                    {ins}
                  </div>
                ))}
              </div>
            </div>
          )}
        </AiSection>

        {/* Spending Prediction */}
        <AiSection
          id="ai-predict"
          title="Next Month Prediction"
          icon={<TrendingUp size={16} />}
          loading={loadingMap.predict}
          error={errorMap.predict}
          onRefresh={() => fetch('predict', aiApi.predict, setPredict)}
        >
          {predict && (
            <div className="predict-content">
              <div className="predict-meta">
                <span className="badge badge-mono">{predict.method === 'regression' ? '📈 Linear Regression' : '📊 Rolling Average'}</span>
                <span className="text-muted" style={{ fontSize: 12 }}>{predict.predicted_month} · {predict.data_months} months of data</span>
              </div>
              <div className="predict-total">
                <span className="text-secondary" style={{ fontSize: 13 }}>Total predicted spend</span>
                <span className="predict-amount">{fmt(predict.total_predicted)}</span>
              </div>
              <div className="predict-list">
                {Object.entries(predict.predictions).map(([cat, amt]) => (
                  <div key={cat} className="predict-row">
                    <span className="predict-cat">{cat}</span>
                    <span className="predict-val">{fmt(amt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AiSection>

        {/* Savings Plan */}
        <AiSection
          id="ai-savings"
          title="Savings Plan"
          icon={<PiggyBank size={16} />}
          loading={loadingMap.savings}
          error={errorMap.savings}
          onRefresh={() => fetch('savings', aiApi.savingsPlan, setSavings)}
        >
          {savings && (
            <div className="savings-content">
              <div className="savings-stats">
                <div className="savings-stat">
                  <span className="text-secondary" style={{ fontSize: 12 }}>Avg Monthly Income</span>
                  <strong>{fmt(savings.avg_monthly_income)}</strong>
                </div>
                <div className="savings-stat">
                  <span className="text-secondary" style={{ fontSize: 12 }}>Avg Monthly Spend</span>
                  <strong>{fmt(savings.avg_monthly_spend)}</strong>
                </div>
                <div className="savings-stat">
                  <span className="text-secondary" style={{ fontSize: 12 }}>Savings Rate</span>
                  <strong>
                    {savings.current_savings_rate.toFixed(1)}%
                  </strong>
                </div>
                <div className="savings-stat">
                  <span className="text-secondary" style={{ fontSize: 12 }}>Target Rate</span>
                  <strong className="text-secondary">{savings.recommended_savings_rate}%</strong>
                </div>
              </div>

              {savings.monthly_savings_gap > 0 && (
                <div className="savings-gap-alert">
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  Save <strong>{fmt(savings.monthly_savings_gap)}</strong> more per month to hit your target.
                </div>
              )}

              {savings.recommendations.length > 0 && (
                <div className="recommendations">
                  <h4 style={{ marginBottom: 12 }}>Cut Recommendations</h4>
                  {savings.recommendations.map(rec => (
                    <div key={rec.category} className="rec-item">
                      <div className="rec-header">
                        <span className="rec-cat">{rec.category}</span>
                        <span className="rec-excess">-{fmt(rec.suggested_cut)}/mo</span>
                      </div>
                      <p className="rec-tip">{rec.tip}</p>
                      <div className="rec-bar-track">
                        <div className="rec-bar-benchmark" style={{ width: `${Math.min(rec.benchmark_amount / rec.avg_spent * 100, 100)}%` }} />
                      </div>
                      <div className="rec-bar-labels">
                        <span className="text-muted" style={{ fontSize: 11 }}>Benchmark {fmt(rec.benchmark_amount)}</span>
                        <span className="text-muted" style={{ fontSize: 11 }}>Avg {fmt(rec.avg_spent)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {savings.recommendations.length === 0 && (
                <div className="alert" style={{ marginTop: 12 }}>
                  🎉 Great job! You're within recommended spending limits across all categories.
                </div>
              )}
            </div>
          )}
        </AiSection>

        {/* Anomaly Detection */}
        <AiSection
          id="ai-anomalies"
          title="Anomaly Detection"
          icon={<AlertTriangle size={16} />}
          loading={loadingMap.anomalies}
          error={errorMap.anomalies}
          onRefresh={() => fetch('anomalies', aiApi.anomalies, setAnomalies)}
        >
          {anomalies && (
            <div className="anomalies-content">
              <div className="anomaly-meta">
                <span className="text-muted" style={{ fontSize: 12 }}>Scanned {anomalies.total_scanned} transactions</span>
                <span className="badge badge-mono">
                  {anomalies.anomalies_found} anomalies found
                </span>
              </div>
              {anomalies.anomalies.length === 0 ? (
                <div className="alert" style={{ marginTop: 12 }}>
                  ✅ No unusual transactions detected.
                </div>
              ) : (
                <div className="anomaly-list">
                  {anomalies.anomalies.map(a => (
                    <div key={a.id} className="anomaly-item">
                      <div className="anomaly-top">
                        <span className="anomaly-merchant">{a.merchant || '—'}</span>
                        <span className="anomaly-amount">
                          {fmt(a.amount)}
                        </span>
                      </div>
                      <div className="anomaly-meta-row">
                        <span className="badge badge-mono" style={{ fontSize: 11 }}>{a.category}</span>
                        <span className="text-muted" style={{ fontSize: 11 }}>{a.date}</span>
                        <span className="text-muted" style={{ fontSize: 11 }}>Z={a.z_score.toFixed(2)}</span>
                      </div>
                      <p className="anomaly-reason">{a.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </AiSection>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, max, color }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="score-bar-item">
      <div className="score-bar-labels">
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{value}/{max}</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
