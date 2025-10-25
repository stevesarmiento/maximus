import React from 'react';

interface FooterLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export function FooterLogo({ width = 196, height = 32, className = "" }: FooterLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 375 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="75" height="75" fill="#FFAF5F"/>
        <rect x="300" width="75" height="75" fill="#FFAF5F"/>
        <rect x="150" width="75" height="75" fill="#FFAF5F"/>
        <rect x="150" y="225" width="75" height="75" fill="#FFAF5F"/>
        <rect y="75" width="75" height="75" fill="#FFAF5F"/>
        <rect x="300" y="75" width="75" height="75" fill="#FFAF5F"/>
        <rect x="225" y="75" width="75" height="75" fill="#FFAF5F"/>
        <rect x="150" y="75" width="75" height="75" fill="#FFAF5F"/>
        <rect x="75" y="75" width="75" height="75" fill="#FFAF5F"/>
        <rect y="150" width="75" height="75" fill="#FFAF5F"/>
        <rect x="300" y="150" width="75" height="75" fill="#FFAF5F"/>
        <rect y="225" width="75" height="75" fill="#FFAF5F"/>
        <rect x="300" y="225" width="75" height="75" fill="#FFAF5F"/>
      </svg>
      <span className="text-2xl font-abc-diatype font-bold tracking-tight">
        Maximus
      </span>
    </div>
  );
}

