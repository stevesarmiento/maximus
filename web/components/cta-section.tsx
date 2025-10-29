"use client";

import Image from 'next/image';
import { AnimatedLine } from './animated-line';
import { BrowserTerminal } from './browser-terminal';

const dockApps = [
  {
    name: 'Finder',
    icon: 'https://uksgfm3uq5.ufs.sh/f/cflVQmqOSasD3vTvre1pMdN7v5ZBJcg2jIxs6VKnGukWSDib',
  },
  {
    name: 'Arc',
    icon: 'https://uksgfm3uq5.ufs.sh/f/cflVQmqOSasD49pz7egs1InePY4butkiEdq2aSXxv8Kl6rDV',
  },
  {
    name: 'Maximus',
    icon: 'https://uksgfm3uq5.ufs.sh/f/cflVQmqOSasDiSrGZkRJzspUvbKeWrV1MGOXdAhmuLE5I6T3',
  },
  {
    name: 'Terminal',
    icon: 'https://uksgfm3uq5.ufs.sh/f/cflVQmqOSasDlQzCJOFX0JKgWe9GFqC5RoE6UjHv8c4YAiDz',
  },
];

export function CTASection() {
  return (
    <section className="relative py-16 pb-4 px-4">
      <AnimatedLine id="ctaHorizontalPulse" animationDelay="5s" />
      
      {/* Background Image */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src="https://uksgfm3uq5.ufs.sh/f/cflVQmqOSasDlnNAfWFX0JKgWe9GFqC5RoE6UjHv8c4YAiDz"
          alt="Background pattern"
          fill
          className="object-cover"
          quality={90}
        />
      </div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Terminal Demo Window */}
        <BrowserTerminal />
    
        
        {/* iOS-style Dock - Below Buttons */}
        <div className="mt-42 flex justify-center rounded-3xl">
          <div className="flex gap-4 bg-sand-1000/30 backdrop-blur-xl px-3 py-2.5 rounded-3xl border border-sand-300/20 shadow-lg shadow-lg shadow-black/30">
            {/* Dock Icons */}
            {dockApps.map((app) => (
              <div key={app.name} className="relative">
                {/* Tooltip for Maximus */}
                {app.name === 'Maximus' && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="hidden flex flex-row gap-2 items-center justify-center bg-sand-1500 px-3 py-1 rounded-lg border border-sand-1500 shadow-lg">
                      <p className="text-white font-diatype-medium text-xs whitespace-nowrap">
                        Maximus
                      </p>
                      <p className="text-white/50 font-diatype-mono text-[10px] whitespace-nowrap">
                        coming soon
                      </p>
                    </div>
                    {/* Caret */}
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-sand-1500 -mt-px"></div>
                  </div>
                )}
                
                <div
                  className="w-14 h-14 rounded-xl overflow-hidden shadow-md hover:scale-105 hover:-translate-y-1 transition-all duration-200 cursor-pointer active:scale-100 active:translate-y-0 shadow-sm shadow-black/30"
                  title={app.name}
                >
                  <Image
                    src={app.icon}
                    alt={app.name}
                    width={156}
                    height={156}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </section>
  );
}

