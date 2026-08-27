import './LoadingSpinner.css';

export default function LoadingSpinner({ fullscreen = false, size = 36 }) {
  if (fullscreen) {
    return (
      <div className="spinner-fullscreen">
        <div className="spinner-ring" style={{ width: size, height: size }} />
        <p className="spinner-text">Loading…</p>
      </div>
    );
  }
  return (
    <div className="spinner-inline">
      <div className="spinner-ring" style={{ width: size, height: size }} />
    </div>
  );
}
