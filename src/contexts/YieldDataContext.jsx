import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { fetchAllYieldSeries } from '../services/fredApi';
import { calculateBollingerBands, calculateSpreadSeries, getLatestSignal } from '../utils/bollingerUtils';
import { getCached, setCached } from '../utils/cacheUtils';
import { MATURITIES, SPREADS, BOLLINGER, CACHE_TTL_HOURS } from '../constants/maturities';

const YieldDataContext = createContext(null);

const SERIES_IDS = MATURITIES.map((m) => m.id); // ['DGS2','DGS5','DGS7','DGS10','DGS30']

/**
 * Provides enriched Bollinger Band data for all 5 maturities.
 *
 * On mount:
 *   - If ALL series are in a fresh localStorage cache, uses cached data (instant load).
 *   - If any series is stale or missing, fires a single batch request to fetch all
 *     series in parallel server-side, then caches each result individually.
 *
 * Context value: { yieldData, anyLoading, loadingMessage, lastUpdated }
 *   yieldData[seriesId]: { rawData, enrichedData, latestSignal, error }
 */
export function YieldDataProvider({ children }) {
  // rawSeriesData: { DGS2: [...], DGS5: [...], ... } or null per series
  const [rawSeriesData, setRawSeriesData] = useState(() => {
    // Seed from cache synchronously so a fully-cached page renders without a loading flash
    const seed = {};
    for (const id of SERIES_IDS) {
      seed[id] = getCached(id, CACHE_TTL_HOURS); // null if missing/stale
    }
    return seed;
  });

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [errors, setErrors] = useState({}); // { [seriesId]: string }

  useEffect(() => {
    // Determine which series still need a fresh fetch
    const staleIds = SERIES_IDS.filter((id) => !rawSeriesData[id]);

    if (staleIds.length === 0) {
      // Everything came from cache — nothing to do
      return;
    }

    let cancelled = false;

    async function loadBatch() {
      setLoading(true);
      setLoadingMessage(
        'Loading 15 years of yield data\u2026 (first load only, cached after)'
      );
      setErrors({});

      try {
        // Single network round-trip — the batch function fans out to FRED in parallel
        const batchResult = await fetchAllYieldSeries(SERIES_IDS);

        if (cancelled) return;

        // Cache each series individually (same TTL as before)
        for (const id of SERIES_IDS) {
          if (batchResult[id]) {
            setCached(id, batchResult[id]);
          }
        }

        setRawSeriesData((prev) => {
          const next = { ...prev };
          for (const id of SERIES_IDS) {
            if (batchResult[id]) next[id] = batchResult[id];
          }
          return next;
        });
      } catch (err) {
        if (cancelled) return;
        // Apply the error to every series that was still missing
        const errMap = {};
        for (const id of staleIds) errMap[id] = err.message;
        setErrors(errMap);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMessage('');
        }
      }
    }

    loadBatch();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount — cache seeding happens in useState initializer

  // Compute Bollinger Band enrichment for each maturity
  const yieldData = useMemo(() => {
    return MATURITIES.reduce((acc, m) => {
      const raw = rawSeriesData[m.id];
      const enrichedData = raw
        ? calculateBollingerBands(raw, BOLLINGER.period, BOLLINGER.stdDev)
        : null;
      const latestSignal = enrichedData ? getLatestSignal(enrichedData) : null;

      acc[m.id] = {
        rawData: raw,
        enrichedData,
        latestSignal,
        error: errors[m.id] ?? null,
      };
      return acc;
    }, {});
  }, [rawSeriesData, errors]);

  // Compute Bollinger Band enrichment for each yield curve spread
  const spreadData = useMemo(() => {
    return SPREADS.reduce((acc, s) => {
      const rawA = rawSeriesData[s.seriesA];
      const rawB = rawSeriesData[s.seriesB];
      if (!rawA || !rawB) {
        acc[s.id] = { enrichedData: null, latestSignal: null, error: errors[s.seriesA] ?? errors[s.seriesB] ?? null };
        return acc;
      }
      const spreadSeries = calculateSpreadSeries(rawA, rawB);
      const enrichedData = calculateBollingerBands(spreadSeries, BOLLINGER.period, BOLLINGER.stdDev);
      const latestSignal = getLatestSignal(enrichedData);
      acc[s.id] = { enrichedData, latestSignal, error: null };
      return acc;
    }, {});
  }, [rawSeriesData, errors]);

  const lastUpdated = useMemo(() => {
    let latest = null;
    for (const m of MATURITIES) {
      const sig = yieldData[m.id]?.latestSignal;
      if (sig?.date && (!latest || sig.date > latest)) latest = sig.date;
    }
    return latest;
  }, [yieldData]);

  return (
    <YieldDataContext.Provider value={{ yieldData, spreadData, anyLoading: loading, loadingMessage, lastUpdated }}>
      {children}
    </YieldDataContext.Provider>
  );
}

export function useYieldDataContext() {
  const ctx = useContext(YieldDataContext);
  if (!ctx) throw new Error('useYieldDataContext must be used inside YieldDataProvider');
  return ctx;
}
