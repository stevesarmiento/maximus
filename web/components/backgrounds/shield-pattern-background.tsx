"use client";

export function ShieldPatternBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
      <svg 
        width="200" 
        height="240" 
        viewBox="0 0 200 240" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="opacity-[0.08]"
      >
        {/* Shield outline */}
        <path
          d="M100 10 L180 50 L180 110 C180 170 140 210 100 230 C60 210 20 170 20 110 L20 50 Z"
          stroke="rgba(255, 175, 95, 1)"
          strokeWidth="2"
          fill="none"
        />
        
        {/* Inner shield layers */}
        <path
          d="M100 30 L160 60 L160 105 C160 155 130 185 100 200 C70 185 40 155 40 105 L40 60 Z"
          stroke="rgba(255, 175, 95, 0.7)"
          strokeWidth="1.5"
          fill="none"
        />
        
        <path
          d="M100 50 L140 70 L140 100 C140 140 120 160 100 170 C80 160 60 140 60 100 L60 70 Z"
          stroke="rgba(255, 175, 95, 0.5)"
          strokeWidth="1"
          fill="none"
        />
        
        {/* Checkmark */}
        <path
          d="M75 110 L90 125 L125 85"
          stroke="rgba(255, 175, 95, 0.6)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

