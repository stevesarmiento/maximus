import React from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export function Logo({ width = 30, height = 24, className = "" }: LogoProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 375 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
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
  );
}

