import { useState, useEffect, useRef, KeyboardEvent } from 'react';

interface PasswordDialogProps {
  isOpen: boolean;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export function PasswordDialog({ isOpen, onSubmit, onCancel }: PasswordDialogProps) {
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setPassword('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (password.trim()) {
      onSubmit(password);
      setPassword('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      setPassword('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="password-dialog-overlay">
      <div className="password-dialog">
        <div className="password-dialog-header">
          <h3>🔐 Delegation Password Required</h3>
          <p>Enter your delegation password to unlock wallet features</p>
        </div>
        
        <div className="password-dialog-content">
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter delegation password..."
            className="password-dialog-input"
          />
        </div>
        
        <div className="password-dialog-actions">
          <button 
            onClick={onCancel}
            className="password-dialog-button password-dialog-button-cancel"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!password.trim()}
            className="password-dialog-button password-dialog-button-submit"
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}

