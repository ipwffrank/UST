import { createContext, useContext, useMemo } from 'react';
import { useYieldData } from '../hooks/useYieldData';
import { calculateBollingerBands, getLatestSignal } from '../utils/bollingerUtils';
import { MATURITIES, BOLLINGER } from '../constants/maturities';

const YieldDataContext = createContext(null);

/**
 * Provides enriched Bollinger Band data for all 4 maturities.
 * Each maturity exposes: { rawData, enrichedData, latestSignal, loading, error }
 */
function MaturityProvider({ maturity, children }) {
  // This pattern fetches one series at a time. We compose all 4 in the root provider.
  const { data, loading, error } = useYieldData(maturity.id);
  return { data, loading, error };
}

export function YieldDataProvider({ children }) {
  const dgs2  = useYieldData('DGS2');
  const dgs5  = useYieldData('DGS5');
  const dgs7  = useYieldData('DGS7');
  const dgs10 = useYieldData('DGS10');

  const sources = { DGS2: dgs2, DGS5: dgs5, DGS7: dgs7, DGS10: dgs10 };

  // Compute enriched data (Bollinger Bands) for each maturity.
  // useMemo so we don't recompute on unrelated renders.
  const yieldData = useMemo(() => {
    return MATURITIES.reduce((acc, m) => {
      const src = sources[m.id];
      const enrichedData = src.data
        ? calculateBollingerBands(src.data, BOLLINGER.period, BOLLINGER.stdDev)
        : null;
      const latestSignal = enrichedData ? getLatestSignal(enrichedData) : null;

      acc[m.id] = {
        rawData: src.data,
        enrichedData,
        latestSignal,
        loading: src.loading,
        error: src.error,
      };
      return acc;
    }, {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dgs2.data, dgs5.data, dgs7.data, dgs10.data]);

  const anyLoading = MATURITIES.some((m) => yieldData[m.id]?.loading);
  const lastUpdated = useMemo(() => {
    // Use the most recent date across all series
    let latest = null;
    for (const m of MATURITIES) {
      const sig = yieldData[m.id]?.latestSignal;
      if (sig?.date && (!latest || sig.date > latest)) latest = sig.date;
    }
    return latest;
  }, [yieldData]);

  return (
    <YieldDataContext.Provider value={{ yieldData, anyLoading, lastUpdated }}>
      {children}
    </YieldDataContext.Provider>
  );
}

export function useYieldDataContext() {
  const ctx = useContext(YieldDataContext);
  if (!ctx) throw new Error('useYieldDataContext must be used inside YieldDataProvider');
  return ctx;
}
