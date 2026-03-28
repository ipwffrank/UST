export default function LoadingSpinner({ label = 'Loading data…' }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <span className="spinner-label">{label}</span>
    </div>
  );
}
