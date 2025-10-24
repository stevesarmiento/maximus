"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const WalletManager = dynamic(() => import("@/components/wallet-manager"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-h1 mb-4">
              Maximus Wallet Manager
            </h1>
            <p className="text-body-xl text-gray-600">
              Connect your Solana wallets to enable blockchain queries in the Maximus terminal
            </p>
          </div>

          <WalletManager />

          <div className="mt-12 p-8 border border-border-low rounded-lg">
            <h2 className="text-title-4 mb-6">How it works</h2>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="bg-black text-white rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 text-body-md font-inter-medium">
                  1
                </span>
                <span className="text-body-l text-gray-800">Click "Connect Wallet" and approve the connection in your browser wallet extension</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-black text-white rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 text-body-md font-inter-medium">
                  2
                </span>
                <span className="text-body-l text-gray-800">Your wallet address will be saved to your local Maximus configuration</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-black text-white rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 text-body-md font-inter-medium">
                  3
                </span>
                <span className="text-body-l text-gray-800">Open the Maximus terminal and use commands like <code className="font-berkeley-mono text-xs">maximus /balances</code> or <code className="font-berkeley-mono text-xs">/transactions</code></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-black text-white rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 text-body-md font-inter-medium">
                  4
                </span>
                <span className="text-body-l text-gray-800">Ask natural language questions like "What tokens are in my wallet?"</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}

