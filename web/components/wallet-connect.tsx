"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useState, useEffect } from "react";

interface WalletConnectProps {
  onConnect: (address: string) => Promise<boolean>;
}

export default function WalletConnect({ onConnect }: WalletConnectProps) {
  const { publicKey, connected } = useWallet();
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (connected && publicKey) {
      handleAddWallet();
    }
  }, [connected, publicKey]);

  const handleAddWallet = async () => {
    if (!publicKey) return;

    setIsAdding(true);
    setMessage(null);

    const success = await onConnect(publicKey.toBase58());

    if (success) {
      setMessage({
        type: "success",
        text: "Wallet added successfully! You can now use it in the Maximus terminal.",
      });
    } else {
      setMessage({
        type: "error",
        text: "This wallet is already registered or an error occurred.",
      });
    }

    setIsAdding(false);

    // Clear message after 5 seconds
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <h2 className="text-2xl font-semibold mb-4">Connect Wallet</h2>
      <p className="text-gray-400 mb-6">
        Connect your Solana wallet to approve it for use with Maximus terminal
      </p>

      <div className="flex flex-col items-center space-y-4">
        <WalletMultiButton className="!bg-orange-500 hover:!bg-orange-600 !rounded-lg" />

        {isAdding && (
          <div className="text-sm text-gray-400 animate-pulse">
            Adding wallet to configuration...
          </div>
        )}

        {message && (
          <div
            className={`p-4 rounded-lg w-full ${
              message.type === "success"
                ? "bg-green-900/20 border border-green-800 text-green-400"
                : "bg-red-900/20 border border-red-800 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {connected && publicKey && (
          <div className="text-sm text-gray-400">
            Connected: {publicKey.toBase58().slice(0, 8)}...
            {publicKey.toBase58().slice(-8)}
          </div>
        )}
      </div>
    </div>
  );
}

