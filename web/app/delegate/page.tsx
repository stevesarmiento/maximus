"use client";

import dynamic from "next/dynamic";

const DelegationManager = dynamic(() => import("@/components/delegation-manager"), {
  ssr: false,
});

export default function DelegatePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Delegate to Terminal
            </h1>
            <p className="text-gray-400 text-lg">
              Create a delegate wallet for autonomous transaction signing in the terminal
            </p>
          </div>

          <DelegationManager />

          <div className="mt-12 p-6 bg-gray-900 rounded-lg border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">How Delegation Works</h2>
            <div className="space-y-4 text-gray-400">
              <p>
                Delegation allows the Maximus terminal to sign transactions on your behalf
                within predefined limits. Your main wallet retains full control.
              </p>
              <ol className="space-y-3">
                <li className="flex items-start">
                  <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">
                    1
                  </span>
                  <span>
                    Set spending limits (max SOL and tokens per transaction)
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">
                    2
                  </span>
                  <span>
                    Choose duration (delegation expires automatically)
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">
                    3
                  </span>
                  <span>
                    Create password to encrypt the delegate wallet
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">
                    4
                  </span>
                  <span>
                    Terminal can now sign transactions within your limits
                  </span>
                </li>
              </ol>
              <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
                <h3 className="font-semibold text-yellow-400 mb-2">Security Note</h3>
                <p className="text-sm">
                  The delegate wallet is stored encrypted on your computer.
                  You can revoke the delegation at any time using{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">/revoke</code> in the terminal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

