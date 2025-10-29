"use client";

export function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path 
              d="M 40 0 L 0 0 0 40" 
              fill="none" 
              stroke="rgba(255, 175, 95, 0.08)" 
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Animated dots */}
        <g className="animate-pulse" style={{ animationDuration: '3s' }}>
          <circle cx="20%" cy="30%" r="2" fill="rgba(255, 175, 95, 0.3)" />
          <circle cx="45%" cy="60%" r="2" fill="rgba(255, 175, 95, 0.3)" />
          <circle cx="70%" cy="40%" r="2" fill="rgba(255, 175, 95, 0.3)" />
          <circle cx="80%" cy="70%" r="2" fill="rgba(255, 175, 95, 0.3)" />
        </g>
      </svg>
    </div>
  );
}

