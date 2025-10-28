import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface AgentMessage {
  id: string;
  type: 'user' | 'agent' | 'status' | 'error';
  content: string;
  timestamp: number;
  phase?: string;
}

export interface QueryResponse {
  success: boolean;
  response: string;
  error?: string;
}

export interface AgentStatus {
  running: boolean;
  connected: boolean;
}

export interface StatusUpdate {
  phase: string;
  message: string;
  details?: string;
}

export function useAgent() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<StatusUpdate | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({ running: false, connected: false });
  const messageIdCounter = useRef(0);

  // Check agent status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  // Listen for status updates from Tauri backend
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;

    const setupListener = async () => {
      unlistenFn = await listen<StatusUpdate>('status-update', (event) => {
        console.log('Status update received:', event.payload);
        setCurrentStatus(event.payload);
      });
    };

    setupListener();

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const status = await invoke<AgentStatus>('get_agent_status');
      setAgentStatus(status);
    } catch (error) {
      console.error('Failed to check agent status:', error);
    }
  }, []);

  const addMessage = useCallback((type: AgentMessage['type'], content: string) => {
    const message: AgentMessage = {
      id: `msg-${++messageIdCounter.current}`,
      type,
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, message]);
    return message;
  }, []);

  const sendQuery = useCallback(async (query: string) => {
    if (!query.trim()) return;

    // Add user message
    addMessage('user', query);
    setIsLoading(true);
    
    // Clear any previous status
    setCurrentStatus(null);

    try {
      // Send query to backend
      const response = await invoke<QueryResponse>('send_query', { query });

      if (response.success) {
        // Add agent response
        addMessage('agent', response.response);
        // Clear status after response
        setCurrentStatus(null);
      } else {
        // Add error message
        addMessage('error', response.error || 'Unknown error occurred');
        setCurrentStatus(null);
      }

      // Update status
      await checkStatus();
    } catch (error) {
      console.error('Failed to send query:', error);
      addMessage('error', `Failed to communicate with agent: ${error}`);
      setCurrentStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, checkStatus]);

  const clearMemory = useCallback(async () => {
    try {
      await invoke('clear_memory');
      addMessage('status', '💾 Memory cleared');
    } catch (error) {
      console.error('Failed to clear memory:', error);
      addMessage('error', `Failed to clear memory: ${error}`);
    }
  }, [addMessage]);

  const getWalletBalances = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await invoke<QueryResponse>('get_wallet_balances');
      if (response.success) {
        addMessage('agent', response.response);
      } else {
        addMessage('error', response.error || 'Failed to get wallet balances');
      }
    } catch (error) {
      console.error('Failed to get wallet balances:', error);
      addMessage('error', `Failed to get wallet balances: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [addMessage]);

  const getTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await invoke<QueryResponse>('get_transactions');
      if (response.success) {
        addMessage('agent', response.response);
      } else {
        addMessage('error', response.error || 'Failed to get transactions');
      }
    } catch (error) {
      console.error('Failed to get transactions:', error);
      addMessage('error', `Failed to get transactions: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [addMessage]);

  const openWalletManager = useCallback(async () => {
    try {
      await invoke('open_wallet_manager');
      addMessage('status', '🌐 Opening wallet manager...');
    } catch (error) {
      console.error('Failed to open wallet manager:', error);
      addMessage('error', `Failed to open wallet manager: ${error}`);
    }
  }, [addMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    currentStatus,
    agentStatus,
    sendQuery,
    clearMemory,
    clearMessages,
    getWalletBalances,
    getTransactions,
    openWalletManager,
    checkStatus,
  };
}

