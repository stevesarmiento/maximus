import Link from 'next/link';
import { memo } from 'react';
import { FooterLogo } from '@/components/footer-logo';

const Footer = memo(() => {
  return (
    <footer className="py-24 mt-[140px] h-full">
      <div className="relative">
        {/* Horizontal Lines SVG - Top */}
        <svg 
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            left: '50%',
            top: '-64px',
            transform: 'translate(-50%, -50%)',
            width: '150vw',
          }}
        >
          <defs>
            <linearGradient id="footerHorizontalPulse1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="rgba(246, 245, 243, 0.8)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          
          {/* Horizontal line - left to right across full screen */}
          <line 
            x1="0" 
            y1="50%" 
            x2="100%" 
            y2="50%" 
            stroke="rgba(57, 54, 53, 1)" 
            strokeWidth="1"
          />
          
          {/* Horizontal pulse elements */}
          <rect 
            x="0" 
            y="50%" 
            width="2%" 
            height="1" 
            fill="url(#footerHorizontalPulse1)"
            transform="translate(0, -0.5)"
          >
            <animate
              attributeName="x"
              values="0; 100%; 100%"
              dur="6s"
              begin="0.5s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0; 0.8; 0.8; 0"
              dur="6s"
              begin="0.5s"
              repeatCount="indefinite"
            />
          </rect>
        </svg>

        {/* Horizontal Lines SVG - Bottom */}
        <svg 
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            left: '50%',
            top: '0%',
            transform: 'translate(-50%, -50%)',
            width: '150vw',
          }}
        >
          <defs>
            <linearGradient id="footerHorizontalPulse2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="rgba(246, 245, 243, 0.8)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          
          {/* Horizontal line - left to right across full screen */}
          <line 
            x1="0" 
            y1="50%" 
            x2="100%" 
            y2="50%" 
            stroke="rgba(57, 54, 53, 1)" 
            strokeWidth="1"
          />
          
          {/* Horizontal pulse elements */}
          <rect 
            x="0" 
            y="50%" 
            width="2%" 
            height="1" 
            fill="url(#footerHorizontalPulse2)"
            transform="translate(0, -0.5)"
          >
            <animate
              attributeName="x"
              values="0; 100%; 100%"
              dur="6s"
              begin="0.5s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0; 0.8; 0.8; 0"
              dur="6s"
              begin="0.5s"
              repeatCount="indefinite"
            />
          </rect>
        </svg>

        <div className="max-w-6xl mx-auto p-12 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
            <div className="mb-8 md:mb-0">
              <p className="text-sm text-sand-1200 mb-2 font-berkeley-mono">Developed by:</p>
              <div className="flex items-center gap-2 py-4">
                <FooterLogo width={196} height={32} />
              </div>
              <p className="text-sm text-sand-1100 mt-4 font-berkeley-mono">
                The autonomous agent for Solana<br />
                analysis and execution.
              </p>
              <p className="text-sm text-sand-1000 mt-4 font-berkeley-mono">
                © 2025 Maximus. All rights reserved.
              </p>
            </div>
            
            <div className="flex flex-row sm:flex-col md:flex-row gap-8 md:gap-16">
              <div>
                <h4 className="font-semibold text-sand-1400 mb-3 font-abc-diatype">Features</h4>
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/"
                      className="text-sm text-sand-1200 hover:text-sand-1400 transition-colors font-berkeley-mono"
                    >
                      Wallet Manager
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/delegate"
                      className="text-sm text-sand-1200 hover:text-sand-1400 transition-colors font-berkeley-mono"
                    >
                      Delegation
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/approve-token"
                      className="text-sm text-sand-1200 hover:text-sand-1400 transition-colors font-berkeley-mono"
                    >
                      Token Approval
                    </Link>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-sand-1400 mb-3 font-abc-diatype">Resources</h4>
                <ul className="space-y-2">
                  <li>
                    <a 
                      href="https://github.com/stevesarmiento/maximus" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-sand-1200 hover:text-sand-1400 transition-colors font-berkeley-mono"
                    >
                      GitHub
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://github.com/stevesarmiento/maximus#readme" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-sand-1200 hover:text-sand-1400 transition-colors font-berkeley-mono"
                    >
                      Documentation
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://twitter.com/stevensarmi_" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-sand-1200 hover:text-sand-1400 transition-colors font-berkeley-mono"
                    >
                      Twitter
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-sand-1400 mb-3 font-abc-diatype">Technology</h4>
                <ul className="space-y-2">
                  <li>
                    <a 
                      href="https://solana.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-sand-1200 hover:text-sand-1400 transition-colors font-berkeley-mono"
                    >
                      Built on Solana
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://www.helius.dev" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-sand-1200 hover:text-sand-1400 transition-colors font-berkeley-mono"
                    >
                      Powered by Helius
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://titan.exchange" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-sand-1200 hover:text-sand-1400 transition-colors font-berkeley-mono"
                    >
                      Swaps via Titan
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>        
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export { Footer };

