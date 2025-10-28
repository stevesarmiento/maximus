import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useAgent } from '../hooks/useAgent';
import { MessageList } from './MessageList';
import { IntroScreen } from './IntroScreen';
import { CommandPalette, COMMANDS } from './CommandPalette';
import { StatusIndicator } from './StatusIndicator';

function Separator() {
  return (
    <div style={{
      color: 'var(--separator-color)',
      fontSize: '0.9em',
      letterSpacing: '0.05em',
      userSelect: 'none',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    }}>
      {'·'.repeat(200)}
    </div>
  );
}

export function Terminal() {
  const [input, setInput] = useState('');
  const [showIntro, setShowIntro] = useState(true);
  const [paletteExpanded, setPaletteExpanded] = useState(false);
  const [paletteFilter, setPaletteFilter] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    messages,
    isLoading,
    currentStatus,
    sendQuery,
    clearMessages,
    getWalletBalances,
    getTransactions,
  } = useAgent();

  useEffect(() => {
    inputRef.current?.focus();
    console.log('Terminal mounted, event listeners should be active');
  }, []);

  useEffect(() => {
    // Hide intro once first message is sent
    if (messages.length > 0 && showIntro) {
      setShowIntro(false);
    }
  }, [messages, showIntro]);

  useEffect(() => {
    // Expand palette when "/" is typed
    if (input.startsWith('/') && input.length > 0) {
      setPaletteExpanded(true);
      setPaletteFilter(input.slice(1)); // Everything after /
      setPaletteIndex(0);
    } else {
      setPaletteExpanded(false);
      setPaletteFilter('');
    }
  }, [input]);

  const getFilteredCommands = () => {
    return COMMANDS.filter(cmd => 
      cmd.name.toLowerCase().includes(paletteFilter.toLowerCase()) ||
      cmd.description.toLowerCase().includes(paletteFilter.toLowerCase())
    );
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const query = input.trim();
    
    // Handle command palette selection
    if (paletteExpanded) {
      const filtered = getFilteredCommands();
      if (filtered[paletteIndex]) {
        const selectedCommand = filtered[paletteIndex].name;
        setInput('');
        setPaletteExpanded(false);
        
        // Execute the selected command
        if (selectedCommand === '/clear') {
          clearMessages();
          return;
        }
        if (selectedCommand === '/balances') {
          await getWalletBalances();
          return;
        }
        if (selectedCommand === '/transactions') {
          await getTransactions();
          return;
        }
        if (selectedCommand === '/exit') {
          // Could close window here
          return;
        }
        
        // For other commands, send as query
        await sendQuery(selectedCommand);
        return;
      }
    }
    
    setInput('');

    // Handle direct command input
    if (query === '/clear') {
      clearMessages();
      return;
    }
    if (query === '/balances') {
      await getWalletBalances();
      return;
    }
    if (query === '/transactions') {
      await getTransactions();
      return;
    }

    // Send regular query
    await sendQuery(query);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setInput('');
      setPaletteExpanded(false);
    }
    if (e.key === 'ArrowUp' && paletteExpanded) {
      e.preventDefault();
      const filtered = getFilteredCommands();
      setPaletteIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    }
    if (e.key === 'ArrowDown' && paletteExpanded) {
      e.preventDefault();
      const filtered = getFilteredCommands();
      setPaletteIndex((prev) => (prev + 1) % filtered.length);
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'Geist Mono, JetBrains Mono, monospace',
    }}>
      {/* Intro screen or messages */}
      {showIntro && messages.length === 0 ? (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <IntroScreen />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '20px' }}>
            <MessageList messages={messages} isLoading={isLoading} />
            
            {/* Status indicator - always show when loading or has status */}
            {(isLoading || (currentStatus && currentStatus.phase !== 'idle' && currentStatus.phase !== 'complete')) && (
              <div style={{ marginTop: '8px' }}>
                <StatusIndicator 
                  phase={currentStatus?.phase || 'planning'}
                  message={currentStatus?.message || 'Processing...'}
                  details={currentStatus?.details}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Command palette */}
      {paletteExpanded && (
        <CommandPalette 
          isExpanded={paletteExpanded}
          filterText={paletteFilter}
          selectedIndex={paletteIndex}
        />
      )}

      {/* Input area */}
      <div style={{ padding: '0 20px 20px 20px' }}>
        <Separator />
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginTop: '10px',
          marginBottom: '10px',
        }}>
          <span style={{
            color: 'var(--accent-orange)',
            marginRight: '8px',
            fontSize: '1em',
            flexShrink: 0,
          }}>
            {'>>'}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '1em',
              padding: 0,
            }}
            placeholder={isLoading ? 'Processing...' : ''}
          />
        </div>

        <Separator />

        {/* Command hints (only when palette is NOT expanded) */}
        {!paletteExpanded && (
          <div style={{
            marginTop: '10px',
            color: 'var(--text-muted)',
          }}>
            Type '/' to see all commands
          </div>
        )}
      </div>
    </div>
  );
}

