import { useState, useEffect } from 'react';
import { fetchYieldSeries } from '../services/fredApi';
import { getCached, setCached } from '../utils/cacheUtils';
import { CACHE_TTL_HOURS } from '../constants/maturities';

/**
 * Fetch and cache raw yield observations for a single series.
 * Returns trading-day data points only (FRED strips weekends/holidays).
 */
export function useYieldData(seriesId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!seriesId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      // Try cache first
      const cached = getCached(seriesId, CACHE_TTL_HOURS);
      if (cached) {
        if (!cancelled) { setData(cached); setLoading(false); }
        return;
      }

      // Fetch fresh
      try {
        const observations = await fetchYieldSeries(seriesId);
        if (!cancelled) {
          setCached(seriesId, observations);
          setData(observations);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [seriesId]);

  return { data, loading, error };
}
