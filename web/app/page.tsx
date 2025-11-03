"use client";

import { Navigation } from "@/components/navigation";
import { HeroSection } from "@/components/hero-section";
import { ContentSection } from "@/components/content-section";
import { BrowserTerminal } from "@/components/browser-terminal";
import { FeaturesBento } from "@/components/features-bento";
import { CTASection } from "@/components/cta-section";
import { FeaturesList } from "@/components/features-list";
import { FooterSection } from "@/components/footer-section";



export default function Home() {
  return (
    <div className="min-h-screen bg-bg1 overflow-x-clip relative">
      <Navigation />
      
      <div className="relative z-10">
        <div className="max-w-5xl mx-auto border-r border-l border-sand-1400">
          <HeroSection 
            title="The autonomous Solana agent for analysis & execution."
            description="Maximus is an intelligent Solana agent that lives in your terminal. It can help you execute faster, understands your portfolio, and more."
          />

          <ContentSection>
            <BrowserTerminal />
          </ContentSection>

          <FeaturesBento />

          <CTASection />
        </div>
      </div>

      {/* Features list - full width outside container */}
      <FeaturesList />
      <FooterSection />
    </div>
  );
}

