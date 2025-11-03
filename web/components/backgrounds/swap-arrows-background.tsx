"use client";

export function SwapArrowsBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
      <svg 
        width="120" 
        height="120" 
        viewBox="0 0 120 120" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="opacity-10"
      >
        <g className="animate-pulse" style={{ animationDuration: '2s' }}>
          {/* Top arrow (right) */}
          <path
            d="M20 40 L80 40 L80 30 L100 45 L80 60 L80 50 L20 50 Z"
            fill="rgba(255, 175, 95, 1)"
          />
          
          {/* Bottom arrow (left) */}
          <path
            d="M100 80 L40 80 L40 70 L20 85 L40 100 L40 90 L100 90 Z"
            fill="rgba(255, 175, 95, 1)"
          />
        </g>
      </svg>
    </div>
  );
}

