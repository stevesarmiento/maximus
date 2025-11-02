import { useState } from 'react';
import '../styles/swap-quote-card.css';

interface QuoteProvider {
  provider: string;
  route: string;
  inAmount: string;
  outAmount: string;
  rate: string;
  isBest: boolean;
}

interface SwapQuoteCardProps {
  quotes: QuoteProvider[];
  symbolIn: string;
  symbolOut: string;
  onAccept: () => void;
  onReject: () => void;
  isExecuting?: boolean;
}

export function SwapQuoteCard({ 
  quotes, 
  symbolIn, 
  symbolOut, 
  onAccept, 
  onReject,
  isExecuting = false 
}: SwapQuoteCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (quotes.length === 0) {
    return (
      <div className="swap-quote-card">
        <div className="swap-quote-loading">
          <div className="swap-quote-spinner"></div>
          <span>Fetching quotes from providers...</span>
        </div>
      </div>
    );
  }

  const bestQuote = quotes.find(q => q.isBest) || quotes[0];
  const otherQuotes = quotes.filter(q => !q.isBest);

  return (
    <div className="swap-quote-card">
      {/* Header */}
      <div className="swap-quote-header">
        <div className="swap-quote-title-row">
          <span className="swap-quote-title">⚡ Live Quote</span>
          <span className="swap-quote-live-indicator">
            <span className="swap-quote-pulse"></span>
            Updating
          </span>
        </div>
        <span className="swap-quote-count">{quotes.length} providers</span>
      </div>

      {/* Best Quote */}
      <div className="swap-quote-best">
        <div className="swap-quote-best-badge">★ Best Rate</div>
        <div className="swap-quote-provider">{bestQuote.provider}</div>
        <div className="swap-quote-route">{bestQuote.route}</div>
        
        <div className="swap-quote-amounts">
          <div className="swap-quote-amount-in">
            <span className="swap-quote-amount-label">You pay</span>
            <span className="swap-quote-amount-value">{bestQuote.inAmount} {symbolIn}</span>
          </div>
          <div className="swap-quote-arrow">→</div>
          <div className="swap-quote-amount-out">
            <span className="swap-quote-amount-label">You receive</span>
            <span className="swap-quote-amount-value">{bestQuote.outAmount} {symbolOut}</span>
          </div>
        </div>
        
        <div className="swap-quote-rate">
          Rate: 1 {symbolIn} = {bestQuote.rate} {symbolOut}
        </div>
      </div>

      {/* Other Quotes (Collapsible) */}
      {otherQuotes.length > 0 && (
        <div className="swap-quote-others">
          <button 
            className="swap-quote-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '▼' : '▶'} {otherQuotes.length} other {otherQuotes.length === 1 ? 'quote' : 'quotes'}
          </button>
          
          {isExpanded && (
            <div className="swap-quote-list">
              {otherQuotes.map((quote, index) => (
                <div key={index} className="swap-quote-item">
                  <div className="swap-quote-item-provider">{quote.provider}</div>
                  <div className="swap-quote-item-route">{quote.route}</div>
                  <div className="swap-quote-item-amount">{quote.outAmount} {symbolOut}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="swap-quote-actions">
        <button 
          className="swap-quote-button swap-quote-button-reject"
          onClick={onReject}
          disabled={isExecuting}
        >
          Cancel
        </button>
        <button 
          className="swap-quote-button swap-quote-button-accept"
          onClick={onAccept}
          disabled={isExecuting}
        >
          {isExecuting ? 'Executing...' : 'Execute Swap'}
        </button>
      </div>
    </div>
  );
}

