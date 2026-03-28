/**
 * Netlify Function: treasury-yields
 * Proxies FRED API requests — keeps API key server-side.
 * Returns cleaned daily yield data for a single Treasury series.
 *
 * Usage: GET /api/treasury-yields?series=DGS10
 */

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const OBSERVATION_START = '2010-01-01';

export const handler = async (event) => {
  const series = event.queryStringParameters?.series;
  const validSeries = ['DGS2', 'DGS5', 'DGS7', 'DGS10'];

  if (!series || !validSeries.includes(series)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `series must be one of: ${validSeries.join(', ')}` }),
    };
  }

  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'FRED_API_KEY environment variable not set' }),
    };
  }

  const url = new URL(FRED_BASE);
  url.searchParams.set('series_id', series);
  url.searchParams.set('observation_start', OBSERVATION_START);
  url.searchParams.set('frequency', 'd');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('file_type', 'json');

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `FRED API error: ${response.status}` }),
      };
    }

    const json = await response.json();

    // Filter out FRED's '.' placeholder for missing trading days and parse values
    const observations = (json.observations || [])
      .filter((o) => o.value !== '.' && o.value !== '')
      .map((o) => ({
        date: o.date,           // "YYYY-MM-DD"
        value: parseFloat(o.value), // yield as number, e.g. 4.52
      }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // CDN cache 1hr
      },
      body: JSON.stringify({ series, observations }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
