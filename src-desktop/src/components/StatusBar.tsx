import { AgentStatus } from '../hooks/useAgent';
import { Circle } from 'lucide-react';

interface StatusBarProps {
  status: AgentStatus;
  onRefresh: () => void;
}

export function StatusBar({ status, onRefresh }: StatusBarProps) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-color)',
      padding: '8px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '0.75em',
      color: 'var(--text-muted)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Circle 
          size={8} 
          fill={status.running ? 'var(--accent-green)' : 'var(--accent-red)'}
          color={status.running ? 'var(--accent-green)' : 'var(--accent-red)'}
        />
        <span>
          Agent: {status.running ? 'Running' : 'Stopped'}
        </span>
      </div>

      <button
        onClick={onRefresh}
        style={{
          padding: '4px 8px',
          fontSize: '0.9em',
        }}
      >
        Refresh Status
      </button>
    </div>
  );
}

