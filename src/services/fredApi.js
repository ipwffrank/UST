/**
 * Client-side fetch wrapper — calls our Netlify Function proxy, not FRED directly.
 */

const BASE = import.meta.env.DEV
  ? 'http://localhost:3000/.netlify/functions/treasury-yields'
  : '/.netlify/functions/treasury-yields';

/**
 * Fetch yield observations for a single FRED series.
 * @param {string} seriesId — e.g. 'DGS10'
 * @returns {Promise<Array<{date: string, value: number}>>}
 */
export async function fetchYieldSeries(seriesId) {
  const res = await fetch(`${BASE}?series=${encodeURIComponent(seriesId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status} fetching ${seriesId}`);
  }
  const data = await res.json();
  return data.observations;
}
