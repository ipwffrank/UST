export const MATURITIES = [
  { id: 'DGS2',  label: '2-Year',  shortLabel: '2Y', color: '#60a5fa' },
  { id: 'DGS5',  label: '5-Year',  shortLabel: '5Y', color: '#34d399' },
  { id: 'DGS7',  label: '7-Year',  shortLabel: '7Y', color: '#f59e0b' },
  { id: 'DGS10', label: '10-Year', shortLabel: '10Y', color: '#f87171' },
  { id: 'DGS30', label: '30-Year', shortLabel: '30Y', color: '#a78bfa' },
];

// Yield curve spread definitions — { id, label, shortLabel, color, type, seriesA, seriesB }
// spread = seriesB.value - seriesA.value
export const SPREADS = [
  { id: '2Y10Y', label: '2Y–10Y Spread (bps)', shortLabel: '2Y10Y', color: '#fb923c', type: 'spread', seriesA: 'DGS2',  seriesB: 'DGS10' },
  { id: '10Y30Y', label: '10Y–30Y Spread (bps)', shortLabel: '10Y30Y', color: '#e879f9', type: 'spread', seriesA: 'DGS10', seriesB: 'DGS30' },
];

export const BOLLINGER = {
  period: 20,
  stdDev: 2,
};

export const CACHE_TTL_HOURS = 23;
export const OBSERVATION_START = '2010-01-01';
