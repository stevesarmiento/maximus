"use client";

import dynamic from "next/dynamic";
import { Navigation } from "@/components/navigation";
import { HeroSection } from "@/components/hero-section";
import { ContentSection } from "@/components/content-section";
import { HowItWorks } from "@/components/how-it-works";
import { InfoBox, SecurityNote } from "@/components/info-box";
import { FooterSection } from "@/components/footer-section";

const DelegationManager = dynamic(() => import("@/components/delegation-manager"), {
  ssr: false,
});

const delegationSteps = [
  {
    number: 1,
    description: 'Set spending limits (max SOL and tokens per transaction)',
  },
  {
    number: 2,
    description: 'Choose duration (delegation expires automatically)',
  },
  {
    number: 3,
    description: 'Create password to encrypt the delegate wallet',
  },
  {
    number: 4,
    description: 'Terminal can now sign transactions within your limits',
  },
];

export default function DelegatePage() {
  return (
    <div className="min-h-screen bg-bg1 overflow-x-clip relative">
      {/* Gradient from top to bottom */}
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-sand-1400/30 to-transparent pointer-events-none z-0" />
      
      <Navigation />
      
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto border-r border-l border-border-low">
          <HeroSection 
            title="Delegate to Terminal"
            description="Create a delegate wallet for autonomous transaction signing in the terminal"
          />

          <ContentSection>
            <DelegationManager />

            <InfoBox title="How Delegation Works">
              <div className="space-y-6 text-sand-500">
                <p className="text-body-l">
                  Delegation allows the Maximus terminal to sign transactions on your behalf
                  within predefined limits. Your main wallet retains full control.
                </p>
                <HowItWorks steps={delegationSteps} title="" />
                <SecurityNote>
                  <p>
                    The delegate wallet is stored encrypted on your computer.
                    You can revoke the delegation at any time using{" "}
                    <code className="font-berkeley-mono text-xs">/revoke</code> in the terminal.
                  </p>
                </SecurityNote>
              </div>
            </InfoBox>
          </ContentSection>

          <FooterSection />
        </div>
      </div>
    </div>
  );
}

