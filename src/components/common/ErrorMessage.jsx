export default function ErrorMessage({ message }) {
  return (
    <div className="error-message">
      <span className="error-icon">⚠</span>
      <span>{message || 'Failed to load data. Check your FRED API key and network connection.'}</span>
    </div>
  );
}
