/**
 * Client-side fetch wrapper — calls our Netlify Function proxy, not FRED directly.
 */

const BASE = import.meta.env.DEV
  ? 'http://localhost:3000/.netlify/functions/treasury-yields'
  : '/.netlify/functions/treasury-yields';

const BATCH_BASE = import.meta.env.DEV
  ? 'http://localhost:3000/.netlify/functions/treasury-yields-batch'
  : '/.netlify/functions/treasury-yields-batch';

/**
 * Fetch yield observations for a single FRED series.
 * Kept for backwards compatibility.
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

/**
 * Fetch yield observations for multiple FRED series in a single request.
 * Uses the batch endpoint which fires all FRED calls in parallel server-side.
 *
 * @param {string[]} seriesIds — e.g. ['DGS2', 'DGS5', 'DGS7', 'DGS10', 'DGS30']
 * @returns {Promise<Record<string, Array<{date: string, value: number}>>>}
 *   e.g. { DGS2: [...], DGS5: [...], DGS7: [...], DGS10: [...], DGS30: [...] }
 */
export async function fetchAllYieldSeries(seriesIds) {
  const query = seriesIds.map(encodeURIComponent).join(',');
  const res = await fetch(`${BATCH_BASE}?series=${query}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status} fetching batch series`);
  }
  return res.json(); // { DGS2: [...], DGS5: [...], ... }
}
