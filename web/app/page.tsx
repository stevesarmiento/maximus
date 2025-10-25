"use client";

import dynamic from "next/dynamic";
import { Navigation } from "@/components/navigation";
import { HeroSection } from "@/components/hero-section";
import { ContentSection } from "@/components/content-section";
import { HowItWorks } from "@/components/how-it-works";
import { FooterSection } from "@/components/footer-section";

const WalletManager = dynamic(() => import("@/components/wallet-manager"), {
  ssr: false,
});

const steps = [
  {
    number: 1,
    description: 'Click "Connect Wallet" and approve the connection in your browser wallet extension',
  },
  {
    number: 2,
    description: 'Your wallet address will be saved to your local Maximus configuration',
  },
  {
    number: 3,
    description: (
      <>
        Open the Maximus terminal and use commands like{' '}
        <code className="font-berkeley-mono text-xs">maximus /balances</code> or{' '}
        <code className="font-berkeley-mono text-xs">/transactions</code>
      </>
    ),
  },
  {
    number: 4,
    description: 'Ask natural language questions like "What tokens are in my wallet?"',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-bg1 overflow-x-clip relative">
            <Navigation />
      
      <div className="relative z-10">
        <div className="max-w-5xl mx-auto border-r border-l border-sand-1400">
          <HeroSection 
            title="The autonomous agent for analysis and execution."
            description="Maximus is an intelligent Solana agent that lives in your terminal. Let AI handle your trades with natural language commands and custom strategies."
          />

          <ContentSection>
            <WalletManager />
            <HowItWorks steps={steps} />
          </ContentSection>

          <FooterSection />
        </div>
      </div>
    </div>
  );
}

