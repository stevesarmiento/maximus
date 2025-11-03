"use client";

import { useState, useEffect } from 'react';
import { Logo } from './logo';
import { IconCheckmark } from 'symbols-react';

const DEMO_QUERIES = [
  {
    command: 'what is the current price of SOL?',
    response: 'SOL is currently trading at $143.52 (+5.2% in 24h)\nMarket Cap: $68.4B | 24h Volume: $2.8B'
  },
  {
    command: 'show me my wallet balances',
    response: 'Main Wallet (8k2x...9fJ3)\n  SOL: 12.4523\n  Tokens (3):\n    • USDC: 1,240.50\n    • JUP: 845.20\n    • BONK: 1,250,000'
  },
  {
    command: 'swap 23 SOL for USDC',
    response: '💫 Finding best route...\n★ Jupiter: 23 SOL → 3,300.96 USDC (rate: 143.52)\n✅ Swap executed successfully!\n   Transaction: 5K7Qp...abc123'
  },
  {
    command: 'compare ETH and SOL performance over 30 days',
    response: 'ETH: +18.2% | SOL: +42.8%\nSOL outperformed ETH by +24.6% over the last 30 days\nSOL Volume/MCap ratio: 0.041 vs ETH: 0.032'
  },
];

export function BrowserTerminal() {
  const [typedText, setTypedText] = useState('');
  const [showResponse, setShowResponse] = useState(false);
  const [currentQueryIndex, setCurrentQueryIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  
  const currentQuery = DEMO_QUERIES[currentQueryIndex];
  
  useEffect(() => {
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= currentQuery.command.length) {
        setTypedText(currentQuery.command.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setTimeout(() => {
          setShowResponse(true);
          setIsComplete(true);
        }, 500);
      }
    }, 60);

    return () => clearInterval(typingInterval);
  }, [currentQuery]);

  // Cycle to next query
  useEffect(() => {
    if (isComplete) {
      const cycleTimeout = setTimeout(() => {
        setTypedText('');
        setShowResponse(false);
        setIsComplete(false);
        setCurrentQueryIndex((prev) => (prev + 1) % DEMO_QUERIES.length);
      }, 4000);

      return () => clearTimeout(cycleTimeout);
    }
  }, [isComplete]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Browser Window */}
      <div className="bg-sand-1600/80 backdrop-blur-xl h-[420px] rounded-lg shadow-2xl overflow-hidden border border-sand-1300">
        {/* Browser Chrome */}
        <div className="px-2 py-2">
          <div className="flex items-center gap-2">
            {/* Traffic Light Buttons */}
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
          </div>
        </div>

        {/* Terminal Content */}
        <div className="bg-sand-1600/50 p-8 min-h-[600px] text-[13px] leading-relaxed">
          <div className="font-berkeley-mono">
            {/* Logo and Header */}
            <div className="flex items-start gap-4 mb-4">
              <Logo width={40} height={32} className="text-sand-300 flex-shrink-0 mt-1" />
              <div className="text-sand-300">
                <div className="text-[14px] font-semibold">MAXIMUS <span className="text-sand-1000">v0.1.0</span></div>
                <div className="text-[11px] text-sand-1000">
                  Autonomous agent for onchain asset analysis and transaction execution
                </div>
              </div>
            </div>

            {/* Session Info */}
            <div className="text-sand-500 space-y-1 mb-4 text-[12px]">
              <div><IconCheckmark className="inline-block w-2 h-2 mr-2 fill-green-500" /> Session initialized (ID: 6e7b195c)</div>
              <div><IconCheckmark className="inline-block w-2 h-2 mr-2 fill-green-500" /> OpenAI API</div>
              <div><IconCheckmark className="inline-block w-2 h-2 mr-2 fill-green-500" /> CoinGecko API</div>
            </div>

            {/* Separator */}
            <div className="text-sand-1300 text-[10px]">
              {'·'.repeat(176)}
            </div>

            {/* Prompt */}
            <div className="">
              <span className="text-sand-400 mr-2">&gt;&gt;</span>
              <span className="text-sand-200">{typedText}</span>
              {!showResponse && <span className="inline-block w-2 h-4 bg-sand-400 ml-1 animate-pulse" />}
            </div>

            {/* Separator */}
            <div className="text-sand-1300 text-[10px]">
              {'·'.repeat(176)}
            </div>

            {/* Response */}
            {showResponse && (
              <div className="mt-4 space-y-2">
                <div className="text-sand-400 text-[12px] whitespace-pre-line">
                  {currentQuery.response}
                </div>
              </div>
            )}

            {!showResponse && (
              <div className="text-sand-600 mt-4 text-[12px]">Type '/' to see all commands</div>
            )}




          </div>
        </div>
      </div>
    </div>
  );
}

