import { YieldDataProvider, useYieldDataContext } from './contexts/YieldDataContext';
import BollingerChart from './components/charts/BollingerChart';
import StatusBar from './components/layout/StatusBar';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import { MATURITIES } from './constants/maturities';
import './App.css';

function Dashboard() {
  const { yieldData, anyLoading, loadingMessage, lastUpdated } = useYieldDataContext();

  const allErrors = MATURITIES
    .filter((m) => yieldData[m.id]?.error)
    .map((m) => `${m.label}: ${yieldData[m.id].error}`);

  const anyData = MATURITIES.some((m) => yieldData[m.id]?.enrichedData);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <span className="app-logo">◈</span>
          <span>US Treasury Bollinger Bands</span>
        </div>
        <StatusBar lastUpdated={lastUpdated} anyLoading={anyLoading} />
      </header>

      <div className="disclaimer">
        For informational purposes only · Not investment advice · Bollinger Bands (20-day SMA ± 2 SD) on Treasury yields are anomaly indicators, not trade signals · Data via FRED with up to 1-business-day lag
      </div>

      <main className="dashboard">
        {anyLoading && !anyData && (
          <LoadingSpinner
            label={loadingMessage || 'Loading 15 years of yield data\u2026 (first load only, cached after)'}
          />
        )}

        {allErrors.length > 0 && (
          <ErrorMessage message={allErrors.join(' · ')} />
        )}

        {anyData && (
          <div className="chart-grid">
            {MATURITIES.map((maturity) => {
              const d = yieldData[maturity.id];
              if (d.error && !d.enrichedData) return (
                <div key={maturity.id} className="chart-panel chart-panel--error">
                  <ErrorMessage message={`${maturity.label}: ${d.error}`} />
                </div>
              );
              if (!d.enrichedData) return null;
              return (
                <BollingerChart
                  key={maturity.id}
                  maturity={maturity}
                  enrichedData={d.enrichedData}
                  latestSignal={d.latestSignal}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <YieldDataProvider>
      <Dashboard />
    </YieldDataProvider>
  );
}
