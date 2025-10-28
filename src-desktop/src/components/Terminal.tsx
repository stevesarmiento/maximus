import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useAgent } from '../hooks/useAgent';
import { MessageList } from './MessageList';
import { IntroScreen } from './IntroScreen';
import { CommandPalette, COMMANDS } from './CommandPalette';
import { StatusIndicator } from './StatusIndicator';
import { PasswordDialog } from './PasswordDialog';
import '../styles/terminal-layout.css';
import '../styles/password-dialog.css';

function Separator() {
  return (
    <div className="terminal-separator">
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
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    messages,
    isLoading,
    currentStatus,
    sendQuery,
    clearMessages,
    getWalletBalances,
    getTransactions,
    setDelegationPassword,
  } = useAgent();

  useEffect(() => {
    inputRef.current?.focus();
    console.log('Terminal mounted, event listeners should be active');
  }, []);

  useEffect(() => {
    if (messages.length > 0 && showIntro) {
      setShowIntro(false);
    } else if (messages.length === 0 && !showIntro) {
      setShowIntro(true);
    }
  }, [messages, showIntro]);

  useEffect(() => {
    if (input.startsWith('/') && input.length > 0) {
      setPaletteExpanded(true);
      setPaletteFilter(input.slice(1));
      setPaletteIndex(0);
    } else {
      setPaletteExpanded(false);
      setPaletteFilter('');
    }
  }, [input]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === 'agent' && 
          lastMessage.content.includes('password not cached')) {
        setShowPasswordDialog(true);
        setPendingCommand('/delegate');
      }
    }
  }, [messages]);

  const getFilteredCommands = () => {
    return COMMANDS.filter(cmd => 
      cmd.name.toLowerCase().includes(paletteFilter.toLowerCase()) ||
      cmd.description.toLowerCase().includes(paletteFilter.toLowerCase())
    );
  };

  const handlePasswordSubmit = async (password: string) => {
    setShowPasswordDialog(false);
    const success = await setDelegationPassword(password);
    if (success && pendingCommand) {
      await sendQuery(pendingCommand);
      setPendingCommand(null);
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordDialog(false);
    setPendingCommand(null);
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    const query = input.trim();
    
    if (paletteExpanded) {
      const filtered = getFilteredCommands();
      if (filtered[paletteIndex]) {
        const selectedCommand = filtered[paletteIndex].name;
        setInput('');
        setPaletteExpanded(false);
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
          return;
        }
        await sendQuery(selectedCommand);
        return;
      }
    }
    
    setInput('');
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
    <div className="terminal-container">
      <PasswordDialog 
        isOpen={showPasswordDialog}
        onSubmit={handlePasswordSubmit}
        onCancel={handlePasswordCancel}
      />
      <div className="terminal-content">
        {showIntro && messages.length === 0 ? (
          <IntroScreen />
        ) : (
          <div className="terminal-content-inner">
            <MessageList messages={messages} isLoading={isLoading} />
            {(isLoading || (currentStatus && currentStatus.phase !== 'idle' && currentStatus.phase !== 'complete')) && (
              <div className="terminal-status-container">
                <StatusIndicator 
                  phase={currentStatus?.phase || 'planning'}
                  message={currentStatus?.message || 'Processing...'}
                  details={currentStatus?.details}
                />
              </div>
            )}
          </div>
        )}
      </div>
      <CommandPalette 
        isExpanded={paletteExpanded}
        filterText={paletteFilter}
        selectedIndex={paletteIndex}
      />
      <div className="terminal-input-area">
        <Separator />
        <div className="terminal-prompt">
          <span className="terminal-prompt-symbol">{'>>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="terminal-input"
            placeholder={isLoading ? 'Processing...' : ''}
          />
        </div>
        <Separator />
        {messages.length === 0 && !paletteExpanded && (
          <div className="terminal-hint">
            Type '/' to see all commands
          </div>
        )}
      </div>
    </div>
  );
}
