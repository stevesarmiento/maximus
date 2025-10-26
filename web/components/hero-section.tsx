import React from 'react';
import { AnimatedLine } from './animated-line';

interface HeroSectionProps {
  title: string;
  description: string;
}

export function HeroSection({ title, description }: HeroSectionProps) {
  return (
    <section className="relative py-16 px-8">
      <AnimatedLine id="heroHorizontalPulse" />
      
      <div className="max-w-5xl text-left relative z-10">
        <h1 className="text-h1 max-w-2xl text-sand-100 mb-8 font-diatype-medium">
          {title}
        </h1>
        <p className="text-lg max-w-xl font-diatype-mono text-sand-1000 mb-12">
          {description}
        </p>
      </div>
    </section>
  );
}

