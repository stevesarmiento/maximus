import { useEffect, useRef } from 'react';
import { AgentMessage } from '../hooks/useAgent';

interface MessageListProps {
  messages: AgentMessage[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const formatContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      // Style lines with emojis
      if (line.match(/^[💭⚙️✓🎯📊🤖🔐⚠️]/)) {
        return <div key={i} style={{ color: 'var(--accent-orange)', margin: '2px 0' }}>{line}</div>;
      }
      // Dimmed text (like delegate wallet labels)
      if (line.includes('Delegate Wallet') || line.match(/^\s*\(/)) {
        return <div key={i} style={{ color: 'var(--text-muted)' }}>{line || '\u00A0'}</div>;
      }
      // Regular line
      return <div key={i}>{line || '\u00A0'}</div>;
    });
  };

  const renderMessage = (message: AgentMessage) => {
    // User query - show with >> prefix
    if (message.type === 'user') {
      return (
        <div key={message.id} style={{
          padding: '8px 0',
          color: 'var(--text-primary)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          <span style={{ color: 'var(--accent-orange)' }}>{'>> '}</span>
          {message.content}
        </div>
      );
    }

    // Agent response
    if (message.type === 'agent') {
      return (
        <div key={message.id} style={{
          padding: '12px 0',
          color: 'var(--text-primary)',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.95em',
          lineHeight: '1.6',
        }}>
          {formatContent(message.content)}
        </div>
      );
    }

    // Error message
    if (message.type === 'error') {
      return (
        <div key={message.id} style={{
          padding: '12px 0',
          color: 'var(--accent-red)',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.95em',
        }}>
          {message.content}
        </div>
      );
    }

    // Status message
    return (
      <div key={message.id} style={{
        padding: '8px 0',
        color: 'var(--accent-orange)',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '0.9em',
      }}>
        {message.content}
      </div>
    );
  };

  return (
    <div style={{
      fontFamily: 'Geist Mono, JetBrains Mono, monospace',
    }}>
      {messages.map(renderMessage)}

      <div ref={bottomRef} />
    </div>
  );
}

