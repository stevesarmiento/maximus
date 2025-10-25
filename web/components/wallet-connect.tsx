"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useState, useEffect, useRef, useCallback } from "react";

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
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAddWallet = useCallback(async () => {
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

    // Clear any existing timeout before setting a new one
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }

    // Clear message after 5 seconds
    messageTimeoutRef.current = setTimeout(() => setMessage(null), 5000);
  }, [publicKey, onConnect]);

  useEffect(() => {
    if (connected && publicKey) {
      handleAddWallet();
    }
  }, [connected, publicKey, handleAddWallet]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="border border-border-low rounded-lg p-8">
      <h2 className="text-title-4 mb-3">Connect Wallet</h2>
      <p className="text-body-l text-sand-500 mb-6">
        Connect your Solana wallet to approve it for use with Maximus terminal
      </p>

      <div className="flex flex-col items-center space-y-4">
        <WalletMultiButton className="!bg-sand-100 hover:!bg-sand-200 !text-sand-1500 !rounded-lg !font-inter-medium !text-body-md" />

        {isAdding && (
          <div className="text-body-md text-sand-500 animate-pulse">
            Adding wallet to configuration...
          </div>
        )}

        {message && (
          <div
            className={`p-4 rounded-lg w-full border text-body-md ${
              message.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {connected && publicKey && (
          <div className="text-body-md text-sand-500 font-berkeley-mono">
            Connected: {publicKey.toBase58().slice(0, 8)}...
            {publicKey.toBase58().slice(-8)}
          </div>
        )}
      </div>
    </div>
  );
}

