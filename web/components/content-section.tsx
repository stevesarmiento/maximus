import React from 'react';
import { AnimatedLine } from './animated-line';
import Image from 'next/image';

interface ContentSectionProps {
  children: React.ReactNode;
}

export function ContentSection({ children }: ContentSectionProps) {
  return (
    <section className="relative py-16 px-4">
      <AnimatedLine id="contentHorizontalPulse" animationDelay="3.5s" />
      
      {/* Background Image */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src="https://uksgfm3uq5.ufs.sh/f/cflVQmqOSasDH3WhWklGuwJKRyhcQ7TrLvbWPaOqoBSdgH06"
          alt="Background pattern"
          fill
          className="object-cover"
          quality={90}
          priority={false}
        />
      </div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        {children}
      </div>
    </section>
  );
}

