"use client";

import { IconBrainFill, IconCharacterMagnify, IconChartBarXaxisAscending, IconHandRaisedFill, IconHareFill } from 'symbols-react';
import { AnimatedLine } from './animated-line';
import { PriceChartBackground } from './backgrounds/price-chart-background';
import { GeometricWaveGridBackground } from './backgrounds/geometric-wave-grid-background';
import { PerlinContoursBackground } from './backgrounds/perlin-contours-background';
import { RadarSweepBackground } from './backgrounds/radar-sweep-background';
import { CircuitTracesBackground } from './backgrounds/circuit-traces-background';
import { GlitchGridTextBackground } from './backgrounds/glitch-grid-text-background';

interface FeatureBoxProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  background?: React.ReactNode;
}

function FeatureBox({ icon, title, description, className = "", background }: FeatureBoxProps) {
  return (
    <div className={`relative p-6 flex flex-col justify-start overflow-hidden  ${className}`}>
      <div className="absolute inset-0 transform translate-y-[100px] mask-b-from-10%">
        {background}
      </div>
      <div className="relative z-10">
        <h3 className="text-base font-semibold text-sand-200 mb-1 font-diatype-medium flex items-center gap-2">
          <span className="hidden">
            {icon}
          </span>
          {title}
        </h3>
        <p className="text-sand-1000 text-sm leading-relaxed font-diatype-mono">
          {description}
        </p>
      </div>
    </div>
  );
}

export function FeaturesBento() {
  return (
    <section className="relative">
    <AnimatedLine id="heroHorizontalPulse" />
    
    <div className="w-full border-t border-b border-sand-1400">
      {/* Main grid: 2 equal columns */}
      <div className="grid grid-cols-2">
        
        
        {/* Left Column: 2 small on top, 1 big below */}
        <div className="border-r border-sand-1400">
          {/* Top: 2 small boxes in grid */}
          <div className="grid grid-cols-2 border-b border-sand-1400">
            <div className="border-r border-sand-1400 min-h-[240px]">
              <FeatureBox
                icon={<IconChartBarXaxisAscending className="size-4.5 fill-sand-1000/50" />}
                title="Live Price Monitoring"
                description="Real-time prices for any onchain assets."
                className="h-full"
                background={<PriceChartBackground />}
              />
            </div>
            <div className="min-h-[240px]">
              <FeatureBox
                icon={<IconBrainFill className="size-4.5 fill-sand-1000/50" />}
                title="Intelligent Analysis"
                description="Market signals based on technicals for analysis."
                className="h-full"
                background={
                  <RadarSweepBackground />
                }
              />
            </div>
          </div>
          
          {/* Bottom: 1 big box */}
          <div className="">
            <FeatureBox
              icon={<IconCharacterMagnify className="size-4.5 fill-sand-1000/50" />}
              title="Natural Language Interface"
              description="Execute swaps and analyze markets through conversation. No need to learn commands, just talk to the agent."
              className="h-full min-h-[420px]"
              background={<GeometricWaveGridBackground />}
            />
          </div>
        </div>

        {/* Right Column: 1 big above, 2 small below */}
        <div>
          {/* Top: 1 big box */}
          <div className="border-b border-sand-1400">
            <FeatureBox
              icon={<IconHandRaisedFill className="size-4.5 fill-sand-1000/50" />}
              title="Checks & Balances"
              description="Time-limited delegate wallet with transaction caps for autonomous trading. Revocable anytime."
              className="h-full min-h-[420px]"
              background={
                <GlitchGridTextBackground />
              }
            />
          </div>
          
          {/* Bottom: 2 small boxes in grid */}
          <div className="grid grid-cols-2">
            <div className="border-r border-sand-1400 min-h-[240px]">
              <FeatureBox
                icon={<IconHareFill className="size-5 fill-sand-1000/50" />}
                title="Every route, swap instantly"
                description="Swap tokens instantly with powered by Titan."
                className="h-full"
                background={
                  <CircuitTracesBackground />            
                }
              />
            </div>
            <div className="min-h-[240px]">
              <FeatureBox
                icon={<IconChartBarXaxisAscending className="size-4.5 fill-sand-1000/50" />}
                title="Full Wallet Management"
                description="View balances and sign transactions with Maximus."
                className="h-full"
                background={
                  <PerlinContoursBackground />      
                }
              />
            </div>
          </div>
        </div>

      </div>
    </div>
    </section>
  );
}

