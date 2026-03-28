/**
 * Netlify Function: treasury-yields-batch
 * Proxies FRED API requests for multiple Treasury series in parallel.
 * Keeps API key server-side.
 *
 * Usage: GET /.netlify/functions/treasury-yields-batch?series=DGS2,DGS5,DGS7,DGS10,DGS30
 *
 * Returns:
 * {
 *   DGS2:  [{ date: "YYYY-MM-DD", value: number }, ...],
 *   DGS5:  [...],
 *   DGS7:  [...],
 *   DGS10: [...],
 *   DGS30: [...],
 * }
 */

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const OBSERVATION_START = '2010-01-01';
const VALID_SERIES = ['DGS2', 'DGS5', 'DGS7', 'DGS10', 'DGS30'];

/**
 * Fetch and clean observations for a single FRED series.
 * Throws on network or API error.
 */
async function fetchSingleSeries(seriesId, apiKey) {
  const url = new URL(FRED_BASE);
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('observation_start', OBSERVATION_START);
  url.searchParams.set('frequency', 'd');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('file_type', 'json');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`FRED API error for ${seriesId}: ${response.status}`);
  }

  const json = await response.json();

  // Filter out FRED's '.' placeholder for missing trading days and parse values
  const observations = (json.observations || [])
    .filter((o) => o.value !== '.' && o.value !== '')
    .map((o) => ({
      date: o.date,               // "YYYY-MM-DD"
      value: parseFloat(o.value), // yield as number, e.g. 4.52
    }));

  return observations;
}

export const handler = async (event) => {
  const rawSeries = event.queryStringParameters?.series;

  if (!rawSeries) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'series query parameter is required (comma-separated, e.g. DGS2,DGS10)' }),
    };
  }

  // Parse and validate each requested series ID
  const requestedIds = rawSeries.split(',').map((s) => s.trim().toUpperCase());
  const invalidIds = requestedIds.filter((id) => !VALID_SERIES.includes(id));

  if (invalidIds.length > 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: `Invalid series IDs: ${invalidIds.join(', ')}. Must be one of: ${VALID_SERIES.join(', ')}`,
      }),
    };
  }

  if (requestedIds.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'At least one series ID is required' }),
    };
  }

  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'FRED_API_KEY environment variable not set' }),
    };
  }

  try {
    // Fetch all requested series in parallel
    const results = await Promise.all(
      requestedIds.map((id) => fetchSingleSeries(id, apiKey))
    );

    // Build response object: { DGS2: [...], DGS5: [...], ... }
    const data = {};
    requestedIds.forEach((id, i) => {
      data[id] = results[i];
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // CDN cache 1hr, same as single endpoint
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
