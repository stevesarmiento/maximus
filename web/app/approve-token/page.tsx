"use client";

import dynamic from "next/dynamic";
import { Navigation } from "@/components/navigation";
import { HeroSection } from "@/components/hero-section";
import { ContentSection } from "@/components/content-section";
import { InfoBox } from "@/components/info-box";
import { FooterSection } from "@/components/footer-section";

const TokenApproval = dynamic(() => import("@/components/token-approval"), {
  ssr: false,
});

export default function ApproveTokenPage() {
  return (
    <div className="min-h-screen bg-bg1 overflow-x-clip relative">
      {/* Gradient from top to bottom */}
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-sand-1400/30 to-transparent pointer-events-none z-0" />
      
      <Navigation />
      
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto border-r border-l border-border-low">
          <HeroSection 
            title="Approve Token Delegation"
            description="Allow your delegate wallet to spend tokens from your main wallet"
          />

          <ContentSection>
            <TokenApproval />

            <InfoBox title="What is Token Approval?">
              <div className="space-y-6 text-sand-500">
                <p className="text-body-l">
                  Token approval allows your delegate wallet to spend SPL tokens directly
                  from your main wallet's token accounts. This enables autonomous swaps
                  and transfers without moving tokens to the delegate first.
                </p>
                <div className="p-6 bg-sand-1300 border border-sand-1000">
                  <h3 className="text-title-5 text-sand-100 mb-4 font-diatype-medium">How It Works</h3>
                  <ul className="text-body-l text-sand-100 space-y-2">
                    <li>• Your tokens stay in your main wallet</li>
                    <li>• Delegate can spend up to approved amount</li>
                    <li>• You can revoke approval anytime</li>
                    <li>• Approval is per-token (approve each token separately)</li>
                  </ul>
                </div>
                <div className="p-6 bg-sand-1300 border border-sand-1000">
                  <h3 className="text-title-5 text-sand-100 mb-4 font-diatype-medium">Example Use Case</h3>
                  <div className="text-body-l text-sand-100 space-y-2">
                    <p>1. Approve delegate to spend 1000 USDC</p>
                    <p>2. Terminal can now: "Swap 100 USDC for SOL"</p>
                    <p>3. Swap happens from YOUR wallet, not delegate's</p>
                    <p>4. No need to transfer USDC to delegate!</p>
                  </div>
                </div>
              </div>
            </InfoBox>
          </ContentSection>

          <FooterSection />
        </div>
      </div>
    </div>
  );
}
