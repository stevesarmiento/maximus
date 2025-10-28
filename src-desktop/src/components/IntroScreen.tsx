import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface ApiStatus {
  intelligence: boolean;
  memory: boolean;
  market_data: boolean;
  websocket: boolean;
  token_swapping: boolean;
}

export function IntroScreen() {
  const [status, setStatus] = useState<ApiStatus>({
    intelligence: false,
    memory: false,
    market_data: false,
    websocket: false,
    token_swapping: false,
  });

  useEffect(() => {
    // Check API status on mount
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      const result = await invoke<ApiStatus>('check_api_status');
      setStatus(result);
    } catch (error) {
      console.error('Failed to check API status:', error);
      // Fallback to defaults
      setStatus({
        intelligence: true,
        memory: true,
        market_data: true,
        websocket: true,
        token_swapping: false,
      });
    }
  };

  return (
    <div style={{
      padding: 'calc(var(--spacing-xl) * 2) var(--spacing-lg)',
      fontFamily: 'var(--font-family-mono)',
      fontSize: 'var(--font-size-small)',
    }}>
      {/* Logo and Title - horizontal layout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
        {/* SVG Logo - smaller */}
        <svg
          width="60"
          height="48"
          viewBox="0 0 375 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ flexShrink: 0 }}
        >
          <rect width="75" height="75" fill="#FFAF5F"/>
          <rect x="300" width="75" height="75" fill="#FFAF5F"/>
          <rect x="150" width="75" height="75" fill="#FFAF5F"/>
          <rect x="150" y="225" width="75" height="75" fill="#FFAF5F"/>
          <rect y="75" width="75" height="75" fill="#FFAF5F"/>
          <rect x="300" y="75" width="75" height="75" fill="#FFAF5F"/>
          <rect x="225" y="75" width="75" height="75" fill="#FFAF5F"/>
          <rect x="150" y="75" width="75" height="75" fill="#FFAF5F"/>
          <rect x="75" y="75" width="75" height="75" fill="#FFAF5F"/>
          <rect y="150" width="75" height="75" fill="#FFAF5F"/>
          <rect x="300" y="150" width="75" height="75" fill="#FFAF5F"/>
          <rect y="225" width="75" height="75" fill="#FFAF5F"/>
          <rect x="300" y="225" width="75" height="75" fill="#FFAF5F"/>
        </svg>
        
        {/* Text to the right */}
        <div>
          <div style={{ color: 'var(--accent-orange)', fontWeight: 'bold', fontSize: '1.2em' }}>
            MAXIMUS
            {' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.8em' }}>v0.1.0</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '1em', marginTop: '4px' }}>
            Autonomous agent for onchain asset analysis and transaction execution
          </div>
        </div>
      </div>

      {/* Empty line */}
      <div style={{ height: '12px' }} />

      {/* API Status - matches Python CLI */}
      <div style={{ fontSize: '0.95em' }}>
        <div style={{ marginBottom: '2px' }}>
          <span style={{ color: status.intelligence ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {status.intelligence ? ' ✓' : ' ✗'}
          </span>
          <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>Intelligence</span>
        </div>
        <div style={{ marginBottom: '2px' }}>
          <span style={{ color: status.memory ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {status.memory ? ' ✓' : ' ✗'}
          </span>
          <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>Memory</span>
        </div>
        <div style={{ marginBottom: '2px' }}>
          <span style={{ color: status.market_data ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {status.market_data ? ' ✓' : ' ✗'}
          </span>
          <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>Market Data</span>
        </div>
        <div style={{ marginBottom: '2px' }}>
          <span style={{ color: status.websocket ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {status.websocket ? ' ✓' : ' ✗'}
          </span>
          <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>WebSocket</span>
        </div>
        <div style={{ marginBottom: '2px' }}>
          <span style={{ color: status.token_swapping ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>
            {status.token_swapping ? ' ✓' : ' ✗ (disabled)'}
          </span>
          <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>Token Swapping</span>
        </div>
      </div>

      {/* Empty line */}
      <div style={{ height: '12px' }} />
    </div>
  );
}

