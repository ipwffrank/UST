import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, LineStyle } from 'lightweight-charts';
import { formatYield, formatDate } from '../../utils/formatters';

/**
 * BollingerChart — renders a single maturity's Bollinger Band chart.
 * Uses Lightweight Charts (TradingView) canvas renderer.
 *
 * Props:
 *   maturity   — { id, label, shortLabel, color }
 *   enrichedData — array from calculateBollingerBands()
 *   latestSignal — object from getLatestSignal()
 */
export default function BollingerChart({ maturity, enrichedData, latestSignal }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({});
  const [tooltip, setTooltip] = useState(null);

  const buildSeries = useCallback((chart, data) => {
    if (!data || data.length === 0) return;

    // Upper band — dashed red
    const upperSeries = chart.addLineSeries({
      color: 'rgba(239,68,68,0.7)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    // Lower band — dashed green
    const lowerSeries = chart.addLineSeries({
      color: 'rgba(34,197,94,0.7)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    // SMA middle line — subdued gray
    const smaSeries = chart.addLineSeries({
      color: 'rgba(148,163,184,0.6)',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    // Raw yield — bold, maturity color
    const yieldSeries = chart.addLineSeries({
      color: maturity.color,
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    });

    // Convert to LW Charts format { time: 'YYYY-MM-DD', value: number }
    const withBands = data.filter((d) => d.sma20 !== null);

    upperSeries.setData(withBands.map((d) => ({ time: d.date, value: d.upperBand })));
    lowerSeries.setData(withBands.map((d) => ({ time: d.date, value: d.lowerBand })));
    smaSeries.setData(withBands.map((d) => ({ time: d.date, value: d.sma20 })));
    yieldSeries.setData(data.map((d) => ({ time: d.date, value: d.yield })));

    seriesRef.current = { upperSeries, lowerSeries, smaSeries, yieldSeries };

    // Default visible range: last 2 years
    const lastDate = data[data.length - 1]?.date;
    if (lastDate) {
      const twoYearsAgo = new Date(lastDate);
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      chart.timeScale().setVisibleRange({
        from: twoYearsAgo.toISOString().slice(0, 10),
        to: lastDate,
      });
    }
  }, [maturity.color]);

  useEffect(() => {
    if (!containerRef.current || !enrichedData) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0f172a' },
        textColor: '#94a3b8',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(148,163,184,0.08)' },
        horzLines: { color: 'rgba(148,163,184,0.08)' },
      },
      crosshair: {
        vertLine: { color: 'rgba(148,163,184,0.3)', labelBackgroundColor: '#1e293b' },
        horzLine: { color: 'rgba(148,163,184,0.3)', labelBackgroundColor: '#1e293b' },
      },
      rightPriceScale: {
        borderColor: 'rgba(148,163,184,0.15)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: 'rgba(148,163,184,0.15)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
      width: containerRef.current.clientWidth,
      height: 280,
    });

    chartRef.current = chart;
    buildSeries(chart, enrichedData);

    // Crosshair tooltip
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setTooltip(null);
        return;
      }
      const yieldPoint = param.seriesData.get(seriesRef.current.yieldSeries);
      const upperPoint = param.seriesData.get(seriesRef.current.upperSeries);
      const lowerPoint = param.seriesData.get(seriesRef.current.lowerSeries);
      const smaPoint   = param.seriesData.get(seriesRef.current.smaSeries);

      setTooltip({
        date: typeof param.time === 'string' ? param.time : null,
        yield: yieldPoint?.value ?? null,
        upper: upperPoint?.value ?? null,
        lower: lowerPoint?.value ?? null,
        sma:   smaPoint?.value ?? null,
        x: param.point?.x,
        y: param.point?.y,
      });
    });

    // Responsive resize
    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = {};
    };
  }, [enrichedData, buildSeries]);

  const signalColor = latestSignal?.signal === 'above_band'
    ? '#ef4444'
    : latestSignal?.signal === 'below_band'
    ? '#22c55e'
    : '#94a3b8';

  const signalLabel = latestSignal?.signal === 'above_band'
    ? 'ABOVE BAND'
    : latestSignal?.signal === 'below_band'
    ? 'BELOW BAND'
    : 'WITHIN BAND';

  return (
    <div className="chart-panel">
      {/* Header */}
      <div className="chart-header">
        <div className="chart-title">
          <span className="maturity-dot" style={{ background: maturity.color }} />
          <span className="maturity-label">US {maturity.label} Treasury</span>
        </div>
        <div className="chart-meta">
          {latestSignal?.sufficientHistory && (
            <span className="signal-badge" style={{ color: signalColor, borderColor: signalColor }}>
              {signalLabel}
            </span>
          )}
          <span className="latest-yield" style={{ color: maturity.color }}>
            {latestSignal ? formatYield(latestSignal.yield) : '—'}
          </span>
        </div>
      </div>

      {/* Band stats row */}
      {latestSignal?.sufficientHistory && (
        <div className="band-stats">
          <span>Upper <b style={{ color: '#ef4444' }}>{formatYield(latestSignal.upperBand)}</b></span>
          <span>SMA20 <b style={{ color: '#94a3b8' }}>{formatYield(latestSignal.sma20)}</b></span>
          <span>Lower <b style={{ color: '#22c55e' }}>{formatYield(latestSignal.lowerBand)}</b></span>
          {latestSignal.percentB != null && (
            <span>%B <b style={{ color: '#e2e8f0' }}>{(latestSignal.percentB * 100).toFixed(1)}</b></span>
          )}
        </div>
      )}

      {/* Chart canvas */}
      <div ref={containerRef} className="chart-canvas" />

      {/* Crosshair tooltip */}
      {tooltip && tooltip.yield != null && (
        <div className="chart-tooltip">
          <div className="tooltip-date">{formatDate(tooltip.date)}</div>
          <div className="tooltip-row">
            <span style={{ color: maturity.color }}>Yield</span>
            <span>{formatYield(tooltip.yield)}</span>
          </div>
          {tooltip.upper != null && (
            <>
              <div className="tooltip-row">
                <span style={{ color: '#ef4444' }}>Upper</span>
                <span>{formatYield(tooltip.upper)}</span>
              </div>
              <div className="tooltip-row">
                <span style={{ color: '#94a3b8' }}>SMA20</span>
                <span>{formatYield(tooltip.sma)}</span>
              </div>
              <div className="tooltip-row">
                <span style={{ color: '#22c55e' }}>Lower</span>
                <span>{formatYield(tooltip.lower)}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
