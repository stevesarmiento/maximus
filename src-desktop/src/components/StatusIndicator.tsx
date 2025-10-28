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

  const getSymbol = () => {
    if (phase === 'complete') return '✓';
    if (phase === 'error') return '✗';
    if (phase === 'idle') return '';
    return SPINNER_FRAMES[spinnerIndex];
  };

  if (phase === 'idle') return null;

  return (
    <div className="status-indicator" data-phase={phase}>
      <span className="status-indicator-symbol">{getSymbol()}</span>
      <span className="status-indicator-message">{message}</span>
      {details && <span className="status-indicator-details">{details}</span>}
    </div>
  );
}

