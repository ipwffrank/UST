import { formatDate } from '../../utils/formatters';

export default function StatusBar({ lastUpdated, anyLoading }) {
  return (
    <div className="status-bar">
      <span className="status-source">
        Data: FRED (Federal Reserve) — DGS2 · DGS5 · DGS7 · DGS10 · DGS30
      </span>
      <span className="status-right">
        {anyLoading
          ? <span className="status-loading">Loading…</span>
          : lastUpdated
          ? <>As of <b>{formatDate(lastUpdated)}</b> · Updated daily ~5PM ET</>
          : null}
      </span>
    </div>
  );
}
