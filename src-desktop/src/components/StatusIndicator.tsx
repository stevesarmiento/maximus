import { useEffect, useState } from 'react';

interface StatusIndicatorProps {
  phase: string;
  message: string;
  details?: string;
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function StatusIndicator({ phase, message, details }: StatusIndicatorProps) {
  const [spinnerIndex, setSpinnerIndex] = useState(0);

  useEffect(() => {
    console.log('StatusIndicator render:', { phase, message, details });
  }, [phase, message, details]);

  useEffect(() => {
    // Animate spinner for active phases
    if (phase && phase !== 'idle' && phase !== 'complete' && phase !== 'error') {
      const interval = setInterval(() => {
        setSpinnerIndex((prev) => (prev + 1) % SPINNER_FRAMES.length);
      }, 80);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const getPhaseColor = () => {
    switch (phase) {
      case 'planning':
        return 'var(--accent-orange)';
      case 'thinking':
        return 'var(--accent-blue)';
      case 'executing':
        return 'var(--accent-yellow)';
      case 'optimizing':
        return '#ff00ff'; // Magenta
      case 'validating':
        return 'var(--accent-blue)';
      case 'generating':
        return 'var(--accent-orange)';
      case 'complete':
        return 'var(--accent-green)';
      case 'error':
        return 'var(--accent-red)';
      default:
        return 'var(--text-muted)';
    }
  };

  const getSymbol = () => {
    if (phase === 'complete') return '✓';
    if (phase === 'error') return '✗';
    if (phase === 'idle') return '';
    return SPINNER_FRAMES[spinnerIndex];
  };

  if (phase === 'idle') return null;

  return (
    <div style={{
      padding: '4px 0',
      color: getPhaseColor(),
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '0.9em',
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
    }}>
      <span>{getSymbol()}</span>
      <span>{message}</span>
      {details && <span style={{ color: 'var(--text-muted)' }}>{details}</span>}
    </div>
  );
}

