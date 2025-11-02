import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface SwapQuote {
  provider: string;
  route: string;
  inAmount: string;
  outAmount: string;
  rate: string;
  isBest: boolean;
}

export interface AgentMessage {
  id: string;
  type: 'user' | 'agent' | 'status' | 'error' | 'swap_quote';
  content: string;
  timestamp: number;
  phase?: string;
  swapQuote?: {
    quotes: SwapQuote[];
    symbolIn: string;
    symbolOut: string;
    sessionId?: string;
  };
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
  const activeSwapSessionRef = useRef<string | null>(null);  // Track active swap session

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
    
    // Clear any previous swap quotes (start fresh)
    setMessages((prev) => prev.filter(m => m.type !== 'swap_quote'));
    activeSwapSessionRef.current = null;  // Invalidate old swap session
    
    // Clear any previous status
    setCurrentStatus(null);

    try {
      // Send query to backend
      const response = await invoke<QueryResponse>('send_query', { query });

      if (response.success) {
        // Check if response is a swap_quote JSON
        try {
          const parsedResponse = JSON.parse(response.response);
          
          if (parsedResponse.type === 'swap_quote' || parsedResponse.type === 'swap_quote_update') {
            const incomingSessionId = parsedResponse.session_id;
            
            // If we have an active session but it's different, ignore this quote
            if (activeSwapSessionRef.current && activeSwapSessionRef.current !== incomingSessionId) {
              console.log('Ignoring stale swap quote from old session:', incomingSessionId);
              return;  // Ignore old session quotes
            }
            
            // If session was explicitly nullified (cancelled/accepted/rejected), ignore quotes
            // We check this after the first check to allow initial quotes but block stale ones
            if (activeSwapSessionRef.current === null && messages.some(m => 
              m.type === 'swap_quote' && m.swapQuote?.sessionId === incomingSessionId
            )) {
              console.log('Ignoring swap quote - session was cancelled:', incomingSessionId);
              return;  // Session was cancelled, ignore stale quotes
            }
            
            // Set this as the active session (first quote)
            if (!activeSwapSessionRef.current) {
              activeSwapSessionRef.current = incomingSessionId;
            }
            
            // Check if we already have a swap quote message for this session
            const existingIndex = messages.findIndex(
              m => m.type === 'swap_quote' && m.swapQuote?.sessionId === incomingSessionId
            );
            
            const swapQuoteData = {
              quotes: parsedResponse.quotes,
              symbolIn: parsedResponse.symbolIn,
              symbolOut: parsedResponse.symbolOut,
              sessionId: incomingSessionId,
            };
            
            if (existingIndex >= 0) {
              // Update existing swap quote message with new quotes
              setMessages((prev) => {
                const updated = [...prev];
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  swapQuote: swapQuoteData,
                  timestamp: Date.now(),
                };
                return updated;
              });
            } else {
              // Add new swap quote message
              const swapMessage: AgentMessage = {
                id: `msg-${++messageIdCounter.current}`,
                type: 'swap_quote',
                content: 'Swap quotes received',
                timestamp: Date.now(),
                swapQuote: swapQuoteData,
              };
              setMessages((prev) => [...prev, swapMessage]);
            }
            
            setCurrentStatus(null);
            setIsLoading(false);
            return;
          }
        } catch {
          // Not JSON, treat as regular response
        }
        
        // Add regular agent response
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

  const setDelegationPassword = useCallback(async (password: string): Promise<boolean> => {
    try {
      const response = await invoke<QueryResponse>('send_query', { 
        query: `/set-delegation-password ${password}` 
      });
      return response.success;
    } catch (error) {
      console.error('Failed to set delegation password:', error);
      return false;
    }
  }, []);

  const acceptSwapQuote = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    
    // Invalidate this session immediately
    activeSwapSessionRef.current = null;
    
    // Remove the swap quote message from the UI (we'll replace it with the result)
    setMessages((prev) => prev.filter(
      m => !(m.type === 'swap_quote' && m.swapQuote?.sessionId === sessionId)
    ));
    
    // Also remove the agent's "pending" message
    setMessages((prev) => prev.filter(
      m => !(m.type === 'agent' && (m.content.includes('pending') || m.content.trim() === ''))
    ));
    
    try {
      const response = await invoke<QueryResponse>('send_query', { 
        query: `/accept-swap-quote ${sessionId}` 
      });
      
      if (response.success && response.response) {
        // The response should contain the transaction result
        // Display it prominently as an agent message
        addMessage('agent', response.response);
      } else {
        addMessage('error', response.error || 'Failed to execute swap');
      }
    } catch (error) {
      console.error('Failed to accept swap quote:', error);
      addMessage('error', `Failed to accept swap: ${error}`);
    } finally {
      setIsLoading(false);
      setCurrentStatus(null);
    }
  }, [addMessage]);

  const rejectSwapQuote = useCallback(async (sessionId: string) => {
    // Invalidate this session immediately
    activeSwapSessionRef.current = null;
    
    // Remove the swap quote message from the UI immediately
    setMessages((prev) => prev.filter(
      m => !(m.type === 'swap_quote' && m.swapQuote?.sessionId === sessionId)
    ));
    
    // Also remove the agent's "pending" or empty messages
    setMessages((prev) => prev.filter(
      m => !(m.type === 'agent' && (m.content.includes('pending') || m.content.trim() === ''))
    ));
    
    // Clear loading state immediately
    setIsLoading(false);
    setCurrentStatus(null);
    
    try {
      const response = await invoke<QueryResponse>('send_query', { 
        query: `/reject-swap-quote ${sessionId}` 
      });
      
      // The response is handled, no need to show anything - UI is already cleaned up
      // The backend will send "Swap cancelled" but we don't need to display it
      // since we've already removed the quote card
    } catch (error) {
      console.error('Failed to reject swap quote:', error);
      // Don't show error for cancel - just log it
    }
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
    setDelegationPassword,
    acceptSwapQuote,
    rejectSwapQuote,
  };
}

