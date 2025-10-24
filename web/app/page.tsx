"use client";

import dynamic from "next/dynamic";

const WalletManager = dynamic(() => import("@/components/wallet-manager"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Maximus Wallet Manager
            </h1>
            <p className="text-gray-400 text-lg">
              Connect your Solana wallets to enable blockchain queries in the Maximus terminal
            </p>
          </div>

          <WalletManager />

          <div className="mt-12 p-6 bg-gray-900 rounded-lg border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">How it works</h2>
            <ol className="space-y-3 text-gray-400">
              <li className="flex items-start">
                <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">
                  1
                </span>
                <span>Click "Connect Wallet" and approve the connection in your browser wallet extension</span>
              </li>
              <li className="flex items-start">
                <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">
                  2
                </span>
                <span>Your wallet address will be saved to your local Maximus configuration</span>
              </li>
              <li className="flex items-start">
                <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">
                  3
                </span>
                <span>Open the Maximus terminal and use commands like <code className="bg-gray-800 px-2 py-1 rounded">/balances</code> or <code className="bg-gray-800 px-2 py-1 rounded">/transactions</code></span>
              </li>
              <li className="flex items-start">
                <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">
                  4
                </span>
                <span>Ask natural language questions like "What tokens are in my wallet?"</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}

