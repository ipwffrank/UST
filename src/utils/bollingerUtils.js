/**
 * bollingerUtils.js
 * Pure ES6 module — no external dependencies, runs in browser or Node.
 * Uses population SD (÷N) to match Bloomberg/TradingView convention.
 */

function _sma(values, windowSize, index) {
  if (index < windowSize - 1) return null;
  let sum = 0;
  for (let i = index - windowSize + 1; i <= index; i++) sum += values[i];
  return sum / windowSize;
}

function _stddev(values, windowSize, index, mean) {
  if (index < windowSize - 1) return null;
  let sumSq = 0;
  for (let i = index - windowSize + 1; i <= index; i++) {
    const d = values[i] - mean;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / windowSize);
}

function _percentB(yieldValue, upper, lower) {
  const bw = upper - lower;
  if (bw === 0) return null;
  return (yieldValue - lower) / bw;
}

function round6(n) {
  return Math.round(n * 1_000_000) / 1_000_000;
}

/**
 * Enrich sorted trading-day data with Bollinger Band values.
 * Input must already have non-trading days stripped.
 *
 * @param {Array<{date: string, value: number}>} dataArray
 * @param {number} [period=20]
 * @param {number} [stdDevMultiplier=2]
 * @returns {Array<{date, yield, sma20, upperBand, lowerBand, isAboveBand, isBelowBand, percentB}>}
 */
export function calculateBollingerBands(dataArray, period = 20, stdDevMultiplier = 2) {
  if (!Array.isArray(dataArray)) throw new TypeError('dataArray must be an array');

  const values = dataArray.map((p, i) => {
    const v = Number(p?.value);
    if (!Number.isFinite(v)) throw new RangeError(`Non-finite value at index ${i}: ${p?.value}`);
    return v;
  });

  return dataArray.map((point, i) => {
    const yieldValue = values[i];
    const sma20 = _sma(values, period, i);

    if (sma20 === null) {
      return { date: point.date, yield: yieldValue, sma20: null, upperBand: null, lowerBand: null, isAboveBand: false, isBelowBand: false, percentB: null };
    }

    const sd = _stddev(values, period, i, sma20);
    const upperBand = sma20 + stdDevMultiplier * sd;
    const lowerBand = sma20 - stdDevMultiplier * sd;
    const pb = _percentB(yieldValue, upperBand, lowerBand);
    const zScore = sd > 0 ? round6((yieldValue - sma20) / sd) : 0;

    return {
      date: point.date,
      yield: yieldValue,
      sma20: round6(sma20),
      stdDev: round6(sd),
      zScore,
      upperBand: round6(upperBand),
      lowerBand: round6(lowerBand),
      isAboveBand: yieldValue > upperBand,
      isBelowBand: yieldValue < lowerBand,
      percentB: pb !== null ? round6(pb) : null,
    };
  });
}

/**
 * Align two raw FRED series by date (inner join) and compute their difference (b - a).
 * @param {Array<{date: string, value: number}>} seriesA  — subtracted series (e.g. 2Y)
 * @param {Array<{date: string, value: number}>} seriesB  — base series (e.g. 10Y)
 * @returns {Array<{date: string, value: number}>}
 */
export function calculateSpreadSeries(seriesA, seriesB) {
  const mapA = new Map(seriesA.map((p) => [p.date, p.value]));
  return seriesB
    .filter((p) => mapA.has(p.date))
    .map((p) => ({ date: p.date, value: round6(p.value - mapA.get(p.date)) }));
}

/**
 * Return the most recent data point with valid band values.
 * @param {ReturnType<typeof calculateBollingerBands>} enrichedData
 * @returns {{date, yield, sma20, stdDev, zScore, upperBand, lowerBand, percentB, signal, sufficientHistory}|null}
 */
export function getLatestSignal(enrichedData) {
  if (!Array.isArray(enrichedData) || enrichedData.length === 0) return null;

  let latest = null;
  for (let i = enrichedData.length - 1; i >= 0; i--) {
    if (enrichedData[i].sma20 !== null) { latest = enrichedData[i]; break; }
  }

  if (!latest) {
    const last = enrichedData[enrichedData.length - 1];
    return { ...last, signal: 'neutral', sufficientHistory: false };
  }

  const signal = latest.isAboveBand ? 'above_band' : latest.isBelowBand ? 'below_band' : 'neutral';
  return { ...latest, signal, sufficientHistory: true };
}
