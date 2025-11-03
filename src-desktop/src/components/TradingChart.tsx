import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';

interface OHLCData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingChartProps {
  data: OHLCData[];
  symbol: string;
}

export function TradingChart({ data, symbol }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#0a0a0a' },
        textColor: '#e0e0e0',
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      crosshair: {
        mode: 1, // CrosshairMode.Normal
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
      },
      timeScale: {
        borderColor: '#2a2a2a',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00ff88',
      downColor: '#ff4444',
      borderUpColor: '#00ff88',
      borderDownColor: '#ff4444',
      wickUpColor: '#00ff88',
      wickDownColor: '#ff4444',
    });

    candlestickSeriesRef.current = candlestickSeries;

    // Convert data to lightweight-charts format
    const chartData: CandlestickData[] = data.map(item => ({
      time: (item.time / 1000) as Time, // Convert ms to seconds
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    candlestickSeries.setData(chartData);

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  return (
    <div style={{
      padding: '16px',
      background: 'var(--bg-secondary)',
      borderRadius: '8px',
      margin: '16px 0',
    }}>
      <div style={{
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.1em', fontWeight: 600 }}>📈 {symbol}</span>
          <span style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
            {data.length} candles
          </span>
        </div>
        <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
          OHLC Chart
        </div>
      </div>
      <div
        ref={chartContainerRef}
        style={{
          width: '100%',
          height: '400px',
          position: 'relative',
        }}
      />
    </div>
  );
}

// Utility function to parse OHLC data from agent response
export function parseOHLCFromResponse(response: string): OHLCData[] | null {
  try {
    // This is a placeholder - actual implementation would parse
    // the agent's OHLC response format
    // The agent uses plotext for charts, we'd need to extract the raw data
    
    // For now, return null - this would be implemented when integrating
    // with actual agent responses
    return null;
  } catch (error) {
    console.error('Failed to parse OHLC data:', error);
    return null;
  }
}

