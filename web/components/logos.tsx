import React from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

// Placeholder logos for different products
function KoraLogo({ width = 20, height = 20, className = "" }: LogoProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 20 20" fill="none" className={className}>
      <rect width="20" height="20" rx="4" fill="#FF6B6B" />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">K</text>
    </svg>
  );
}

function CommerceKitLogo({ width = 20, height = 20, className = "" }: LogoProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 20 20" fill="none" className={className}>
      <rect width="20" height="20" rx="4" fill="#4ECDC4" />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">C</text>
    </svg>
  );
}

function SolanaPayLogo({ width = 20, height = 20, className = "" }: LogoProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 20 20" fill="none" className={className}>
      <rect width="20" height="20" rx="4" fill="#9945FF" />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">S</text>
    </svg>
  );
}

function AttestationsLogo({ width = 20, height = 20, className = "" }: LogoProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 20 20" fill="none" className={className}>
      <rect width="20" height="20" rx="4" fill="#14F195" />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">A</text>
    </svg>
  );
}

function DefaultLogo({ width = 20, height = 20, className = "" }: LogoProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 20 20" fill="none" className={className}>
      <rect width="20" height="20" rx="4" fill="#888" />
    </svg>
  );
}

export function getProductLogo(productName: string) {
  switch (productName) {
    case 'Kora':
      return KoraLogo;
    case 'CommerceKit':
      return CommerceKitLogo;
    case 'Solana Pay':
      return SolanaPayLogo;
    case 'Attestations':
      return AttestationsLogo;
    default:
      return DefaultLogo;
  }
}

