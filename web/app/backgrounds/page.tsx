"use client";

import { Navigation } from "@/components/navigation";

// Import all backgrounds
import { PriceChartBackground } from '@/components/backgrounds/price-chart-background';
import { SignalsBackground } from '@/components/backgrounds/signals-background';
import { RadarSweepBackground } from '@/components/backgrounds/radar-sweep-background';
import { NeuralNetworkBackground } from '@/components/backgrounds/neural-network-background';
import { GlitchGridTextBackground } from '@/components/backgrounds/glitch-grid-text-background';
import { CircuitTracesBackground } from '@/components/backgrounds/circuit-traces-background';
import { DitheredTriangulationBackground } from '@/components/backgrounds/dithered-triangulation-background';
import { GeometricWaveGridBackground } from '@/components/backgrounds/geometric-wave-grid-background';
import { DitheredBarsBackground } from '@/components/backgrounds/dithered-bars-background';
import { RotatingOrbitsBackground } from '@/components/backgrounds/rotating-orbits-background';
import { ParticleFlowFieldBackground } from '@/components/backgrounds/particle-flow-field-background';
import { PerlinContoursBackground } from '@/components/backgrounds/perlin-contours-background';
import { RadialScanlinesBackground } from '@/components/backgrounds/radial-scanlines-background';
import { ScrambleGlitchTextBackground } from '@/components/backgrounds/scramble-glitch-text-background';
import { CyberpunkGlitchTextBackground } from '@/components/backgrounds/cyberpunk-glitch-text-background';
import { MatrixRainTextBackground } from '@/components/backgrounds/matrix-rain-text-background';
import { DecryptionTextBackground } from '@/components/backgrounds/decryption-text-background';
import { ParticleStreamExchangeBackground } from '@/components/backgrounds/particle-stream-exchange-background';
import { MorphingTokensBackground } from '@/components/backgrounds/morphing-tokens-background';
import { OrbitalExchangeBackground } from '@/components/backgrounds/orbital-exchange-background';
import { LiquidFlowBackground } from '@/components/backgrounds/liquid-flow-background';
import { SedimentLayersBackground } from '@/components/backgrounds/sediment-layers-background';
import { RippleEchoesBackground } from '@/components/backgrounds/ripple-echoes-background';
import { TimeSpiralBackground } from '@/components/backgrounds/time-spiral-background';
import { DecayParticlesBackground } from '@/components/backgrounds/decay-particles-background';
import { ArchiveScanlinesBackground } from '@/components/backgrounds/archive-scanlines-background';
import { PianoRollBackground } from '@/components/backgrounds/piano-roll-background';
import { ShieldPatternBackground } from '@/components/backgrounds/shield-pattern-background';
import { SwapArrowsBackground } from '@/components/backgrounds/swap-arrows-background';
import { GridBackground } from '@/components/backgrounds/grid-background';

interface BackgroundBoxProps {
  number: number;
  background: React.ReactNode;
  name?: string;
}

function BackgroundBox({ number, background, name }: BackgroundBoxProps) {
  return (
    <div className="relative min-h-[240px] border border-sand-1400 overflow-hidden">
      <div className="absolute inset-0 transform translate-y-[60px] mask-b-from-10%">
        {background}
      </div>
      <div className="relative z-10 p-4">
        <div className="text-2xl font-bold text-sand-200 font-diatype-medium">
          {number}
        </div>
        {name && (
          <div className="text-xs text-sand-600 font-diatype-mono mt-1">
            {name}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BackgroundsShowcase() {
  const backgrounds = [
    // Best picks (reordered based on preference)
    { bg: <PianoRollBackground />, name: 'Piano Roll' },
    { bg: <LiquidFlowBackground />, name: 'Liquid Flow' },
    { bg: <MorphingTokensBackground />, name: 'Morphing Tokens' },
    { bg: <ParticleStreamExchangeBackground />, name: 'Particle Stream' },
    { bg: <DecryptionTextBackground />, name: 'Decryption' },
    { bg: <ScrambleGlitchTextBackground />, name: 'Scramble Text' },
    { bg: <PerlinContoursBackground />, name: 'Perlin Contours' },
    { bg: <DitheredBarsBackground />, name: 'Dithered Bars' },
    { bg: <GeometricWaveGridBackground />, name: 'Wave Grid' },
    { bg: <CircuitTracesBackground />, name: 'Circuit Traces' },
    { bg: <GlitchGridTextBackground />, name: 'Glitch Grid' },
    { bg: <RadarSweepBackground />, name: 'Radar Sweep' },
    { bg: <PriceChartBackground />, name: 'Price Chart' },
    // Others
    { bg: <SignalsBackground />, name: 'Signals MA' },
    { bg: <NeuralNetworkBackground />, name: 'Neural Network' },
    { bg: <DitheredTriangulationBackground />, name: 'Triangulation' },
    { bg: <RotatingOrbitsBackground />, name: 'Rotating Orbits' },
    { bg: <ParticleFlowFieldBackground />, name: 'Flow Field' },
    { bg: <RadialScanlinesBackground />, name: 'Scanlines' },
    { bg: <CyberpunkGlitchTextBackground />, name: 'Cyberpunk Glitch' },
    { bg: <MatrixRainTextBackground />, name: 'Matrix Rain' },
    { bg: <OrbitalExchangeBackground />, name: 'Orbital Exchange' },
    { bg: <SedimentLayersBackground />, name: 'Sediment Layers' },
    { bg: <RippleEchoesBackground />, name: 'Ripple Echoes' },
    { bg: <TimeSpiralBackground />, name: 'Time Spiral' },
    { bg: <DecayParticlesBackground />, name: 'Decay Particles' },
    { bg: <ArchiveScanlinesBackground />, name: 'Archive Scanlines' },
    { bg: <ShieldPatternBackground />, name: 'Shield Pattern' },
    { bg: <SwapArrowsBackground />, name: 'Swap Arrows' },
    { bg: <GridBackground />, name: 'Grid' },
  ];

  return (
    <div className="min-h-screen bg-bg1">
      <Navigation />
      
      <div className="max-w-7xl mx-auto py-16 px-6">
        <h1 className="text-h1 text-sand-100 mb-2">Background Illustrations</h1>
        <p className="text-body-l text-sand-600 mb-12">
          {backgrounds.length} animated backgrounds created for the features section
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {backgrounds.map((item, index) => (
            <BackgroundBox
              key={index}
              number={index + 1}
              background={item.bg}
              name={item.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

