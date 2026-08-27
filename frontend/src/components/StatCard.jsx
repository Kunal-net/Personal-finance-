import './StatCard.css';

export default function StatCard({ icon, label, value, sub, trend, accentColor = 'purple' }) {
  const isPositive = trend > 0;
  const isNeutral = trend === undefined || trend === null;

  return (
    <div className={`stat-card card accent-${accentColor}`}>
      <div className="stat-card-top">
        <div className={`stat-icon accent-bg-${accentColor}`}>
          {icon}
        </div>
        {!isNeutral && (
          <span className={`stat-trend ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
