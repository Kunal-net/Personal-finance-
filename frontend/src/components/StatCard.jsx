import './StatCard.css';

export default function StatCard({ icon, label, value, sub, trend, section, accentColor = 'mono' }) {
  const isPositive = trend > 0;
  const isNeutral = trend === undefined || trend === null;

  return (
    <div className={`stat-card card accent-${accentColor}`}>
      <div className="stat-card-top">
        {section && <span className="stat-section-tag">{section}</span>}
        <div className="stat-icon">
          {icon}
        </div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-card-bottom">
        {sub && <span className="stat-sub">{sub}</span>}
        {!isNeutral && (
          <span className="stat-trend">
            {isPositive ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}
