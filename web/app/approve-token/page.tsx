"use client";

import dynamic from "next/dynamic";

const TokenApproval = dynamic(() => import("@/components/token-approval"), {
  ssr: false,
});

export default function ApproveTokenPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Approve Token Delegation
            </h1>
            <p className="text-gray-400 text-lg">
              Allow your delegate wallet to spend tokens from your main wallet
            </p>
          </div>

          <TokenApproval />

          <div className="mt-12 p-6 bg-gray-900 rounded-lg border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">What is Token Approval?</h2>
            <div className="space-y-4 text-gray-400">
              <p>
                Token approval allows your delegate wallet to spend SPL tokens directly
                from your main wallet's token accounts. This enables autonomous swaps
                and transfers without moving tokens to the delegate first.
              </p>
              <div className="mt-4 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                <h3 className="font-semibold text-blue-400 mb-2">How It Works</h3>
                <ul className="text-sm space-y-2">
                  <li>• Your tokens stay in your main wallet</li>
                  <li>• Delegate can spend up to approved amount</li>
                  <li>• You can revoke approval anytime</li>
                  <li>• Approval is per-token (approve each token separately)</li>
                </ul>
              </div>
              <div className="mt-4 p-4 bg-green-900/20 border border-green-800 rounded-lg">
                <h3 className="font-semibold text-green-400 mb-2">Example Use Case</h3>
                <p className="text-sm">
                  1. Approve delegate to spend 1000 USDC<br />
                  2. Terminal can now: "Swap 100 USDC for SOL"<br />
                  3. Swap happens from YOUR wallet, not delegate's<br />
                  4. No need to transfer USDC to delegate!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

