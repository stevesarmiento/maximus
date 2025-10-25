"use client";

import { useState, useEffect } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { Keypair, clusterApiUrl } from "@solana/web3.js";
import { useMemo } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";

function DelegationContent() {
  const { publicKey, connected } = useWallet();
  const [maxSolPerTx, setMaxSolPerTx] = useState("1.0");
  const [maxTokenPerTx, setMaxTokenPerTx] = useState("100");
  const [durationHours, setDurationHours] = useState("24");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [delegatePublicKey, setDelegatePublicKey] = useState<string>("");

  const handleCreateDelegation = async () => {
    if (!connected || !publicKey) {
      setMessage({
        type: "error",
        text: "Please connect your wallet first",
      });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({
        type: "error",
        text: "Passwords do not match",
      });
      return;
    }

    if (password.length < 8) {
      setMessage({
        type: "error",
        text: "Password must be at least 8 characters",
      });
      return;
    }

    setIsCreating(true);
    setMessage(null);

    try {
      // Generate new delegate keypair
      const delegateKeypair = Keypair.generate();
      const delegatePubkey = delegateKeypair.publicKey.toBase58();
      setDelegatePublicKey(delegatePubkey);

      // Send delegation data to API
      const response = await fetch("/api/delegate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delegatePublicKey: delegatePubkey,
          delegateSecretKey: Array.from(delegateKeypair.secretKey),
          delegatedBy: publicKey.toBase58(),
          maxSolPerTx: parseFloat(maxSolPerTx),
          maxTokenPerTx: parseFloat(maxTokenPerTx),
          durationHours: parseInt(durationHours),
          password,
        }),
      });

      if (response.ok) {
        setMessage({
          type: "success",
          text: `Delegation created! Now open the Maximus terminal to activate it. The delegation will be encrypted automatically when you start maximus.`,
        });
        
        // Clear password fields
        setPassword("");
        setConfirmPassword("");
      } else {
        const error = await response.json();
        setMessage({
          type: "error",
          text: error.error || "Failed to create delegation",
        });
      }
    } catch (error) {
      console.error("Error creating delegation:", error);
      setMessage({
        type: "error",
        text: "Failed to create delegation. Please try again.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Wallet Connection */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h2 className="text-2xl font-semibold mb-4">1. Connect Wallet</h2>
        <p className="text-gray-400 mb-6">
          Connect the wallet you want to delegate from
        </p>
        <WalletMultiButton className="!bg-orange-500 hover:!bg-orange-600 !rounded-lg" />
        {connected && publicKey && (
          <div className="mt-4 text-sm text-gray-400">
            Connected: {publicKey.toBase58().slice(0, 8)}...
            {publicKey.toBase58().slice(-8)}
          </div>
        )}
      </div>

      {/* Delegation Settings */}
      {connected && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-2xl font-semibold mb-4">2. Set Delegation Limits</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Max SOL per Transaction
              </label>
              <input
                type="number"
                step="0.1"
                min="0.01"
                value={maxSolPerTx}
                onChange={(e) => setMaxSolPerTx(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
              <p className="text-sm text-gray-500 mt-1">
                Maximum SOL the delegate can send in a single transaction
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Max Tokens per Transaction
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={maxTokenPerTx}
                onChange={(e) => setMaxTokenPerTx(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
              <p className="text-sm text-gray-500 mt-1">
                Maximum tokens the delegate can send in a single transaction
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Duration (hours)
              </label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="1">1 hour</option>
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours (recommended)</option>
                <option value="48">48 hours</option>
                <option value="168">1 week</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Delegation will expire automatically after this time
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Password Setup */}
      {connected && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-2xl font-semibold mb-4">3. Create Password</h2>
          <p className="text-gray-400 mb-4">
            This password will encrypt the delegate wallet on your computer
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                placeholder="Enter a secure password"
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                placeholder="Confirm your password"
                minLength={8}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Delegation Button */}
      {connected && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <button
            onClick={handleCreateDelegation}
            disabled={isCreating || !password || !confirmPassword}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isCreating ? "Creating Delegation..." : "Create Delegation"}
          </button>

          {message && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-900/20 border border-green-800 text-green-400"
                  : "bg-red-900/20 border border-red-800 text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}

          {delegatePublicKey && (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
              <p className="text-sm font-semibold mb-2">Delegate Wallet Address:</p>
              <p className="font-mono text-xs text-orange-400 break-all">
                {delegatePublicKey}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Save this address for your records. You can view delegation status
                in the terminal using <code className="bg-gray-900 px-1 py-0.5 rounded">/delegate</code>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DelegationManager() {
  const endpoint = useMemo(() => clusterApiUrl("mainnet-beta"), []);
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <DelegationContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

