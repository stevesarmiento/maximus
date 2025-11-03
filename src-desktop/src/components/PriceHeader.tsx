import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
}

export function PriceHeader() {
  const [prices, setPrices] = useState<PriceData[]>([
    { symbol: 'SOL', price: 0, change24h: 0 },
    { symbol: 'BTC', price: 0, change24h: 0 },
    { symbol: 'ETH', price: 0, change24h: 0 },
  ]);
  const [connected, setConnected] = useState(false);

  // TODO: Connect to real-time price streaming from Python agent
  // For now, this is a placeholder that will be implemented when we integrate
  // with the Python agent's real-time price streaming feature

  useEffect(() => {
    // Placeholder - will be replaced with actual WebSocket connection
    // to Python agent's price streaming
    const interval = setInterval(() => {
      // Simulate price updates for demo
      setPrices([
        { symbol: 'SOL', price: 145.32, change24h: 3.2 },
        { symbol: 'BTC', price: 43200, change24h: 1.8 },
        { symbol: 'ETH', price: 2300, change24h: -0.5 },
      ]);
      setConnected(true);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number, symbol: string) => {
    if (symbol === 'BTC') {
      return `$${(price / 1000).toFixed(1)}K`;
    }
    if (symbol === 'ETH' || symbol === 'SOL') {
      return `$${price.toFixed(2)}`;
    }
    return `$${price.toFixed(4)}`;
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '0.85em',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Activity size={16} style={{ color: 'var(--accent-blue)' }} />
        <span style={{ fontWeight: 600 }}>Maximus</span>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        {prices.map((item) => (
          <div key={item.symbol} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{item.symbol}</span>
            <span style={{ fontWeight: 600 }}>{formatPrice(item.price, item.symbol)}</span>
            {item.change24h !== 0 && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                color: item.change24h > 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                fontSize: '0.9em',
              }}>
                {item.change24h > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(item.change24h).toFixed(1)}%
              </span>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: connected ? 'var(--accent-green)' : 'var(--accent-red)',
        }} />
        <span style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>
          {connected ? 'Connected' : 'Connecting...'}
        </span>
      </div>
    </div>
  );
}

