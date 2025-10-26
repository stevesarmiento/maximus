"use client";

import { IconBolt, IconBrain, IconShield, IconChartBarXaxisAscending } from 'symbols-react';

interface FeatureBoxProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

function FeatureBox({ icon, title, description, className = "" }: FeatureBoxProps) {
  return (
    <div className={`p-8 flex flex-col justify-end ${className}`}>
      <div className="mb-4 text-sand-300">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-sand-200 mb-3 font-diatype-medium">
        {title}
      </h3>
      <p className="text-sand-500 text-sm leading-relaxed font-diatype-mono">
        {description}
      </p>
    </div>
  );
}

export function FeaturesBento() {
  return (
    <div className="w-full border-t border-b border-sand-1400">
      {/* Bento grid: 2 cols, 4 boxes with alternating heights */}
      <div className="grid grid-cols-12">
        {/* Top Left - 2x4 (tall) */}
        <div className="border-r border-b border-sand-1400 min-h-[400px] col-span-7">
          <FeatureBox
            icon={<IconBrain className="w-12 h-12" />}
            title="Autonomous Planning"
            description="Maximus thinks ahead. It breaks down complex queries into actionable steps, executes them with precision, and validates results before responding. No hand-holding required."
            className="h-full"
          />
        </div>

        {/* Top Right - 2x2 (square) */}
        <div className="border-b border-sand-1400 min-h-[200px] col-span-5">
          <FeatureBox
            icon={<IconBolt className="w-10 h-10" />}
            title="Real-Time Execution"
            description="Direct access to market data, on-chain transactions, and live swap quotes. Execute trades with natural language commands."
            className="h-full"
          />
        </div>

        {/* Bottom Left - 2x2 (square) */}
        <div className="border-r min-h-[200px] col-span-5">
          <FeatureBox
            icon={<IconChartBarXaxisAscending className="w-10 h-10" />}
            title="Market Intelligence"
            description="Live price data, OHLC charts, and comprehensive portfolio analysis powered by CoinGecko API."
            className="h-full"
          />
        </div>

        {/* Bottom Right - 2x4 (tall) */}
        <div className="min-h-[400px] col-span-7">
          <FeatureBox
            icon={<IconShield className="w-12 h-12" />}
            title="Secure Delegation"
            description="Set spending limits and time-based controls for autonomous operations. Your delegate wallet is encrypted locally with password protection you control."
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}

