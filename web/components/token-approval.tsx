"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl, PublicKey, Transaction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createApproveInstruction,
} from "@solana/spl-token";
import "@solana/wallet-adapter-react-ui/styles.css";

interface TokenBalance {
  symbol: string;
  mint: string;
  balance: number;
  decimals: number;
}

function TokenApprovalContent() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [delegateAddress, setDelegateAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Fetch token balances
  useEffect(() => {
    if (!publicKey || !connection) return;

    const fetchTokens = async () => {
      try {
        // Get token accounts using Solana RPC
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_PROGRAM_ID }
        );

        const tokenList: TokenBalance[] = [];
        
        for (const { account } of tokenAccounts.value) {
          const parsedInfo = account.data.parsed.info;
          const mint = parsedInfo.mint;
          const balance = parsedInfo.tokenAmount.uiAmount || 0;
          const decimals = parsedInfo.tokenAmount.decimals;

          if (balance > 0) {
            // For now, use mint address as symbol (can enhance with metadata lookup)
            tokenList.push({
              symbol: mint.slice(0, 8) + "...",
              mint,
              balance,
              decimals,
            });
          }
        }

        setTokens(tokenList);
      } catch (error) {
        console.error("Failed to fetch tokens:", error);
      }
    };

    fetchTokens();
  }, [publicKey, connection]);

  // Load delegate address from config
  useEffect(() => {
    const loadDelegate = async () => {
      try {
        const response = await fetch("/api/delegate");
        if (response.ok) {
          const data = await response.json();
          if (data.exists) {
            // Read delegate info from file
            const delegateResp = await fetch("/api/delegate/info");
            if (delegateResp.ok) {
              const delegateData = await delegateResp.json();
              setDelegateAddress(delegateData.publicKey || "");
            }
          }
        }
      } catch (error) {
        console.error("Failed to load delegate:", error);
      }
    };

    loadDelegate();
  }, []);

  const handleApprove = async () => {
    if (!publicKey || !signTransaction || !selectedToken || !amount || !delegateAddress) {
      setMessage({
        type: "error",
        text: "Please fill in all fields and connect your wallet",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const token = tokens.find((t) => t.mint === selectedToken);
      if (!token) {
        throw new Error("Token not found");
      }

      const mintPubkey = new PublicKey(token.mint);
      const delegatePubkey = new PublicKey(delegateAddress);
      
      // Get associated token account
      const tokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        publicKey
      );

      // Convert amount to smallest units
      const amountRaw = Math.floor(parseFloat(amount) * Math.pow(10, token.decimals));

      // Create approve instruction
      const approveIx = createApproveInstruction(
        tokenAccount,
        delegatePubkey,
        publicKey,
        amountRaw,
        [],
        TOKEN_PROGRAM_ID
      );

      // Create transaction
      const transaction = new Transaction().add(approveIx);
      transaction.feePayer = publicKey;
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;

      // Sign and send
      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed");

      setMessage({
        type: "success",
        text: `✅ Approved ${amount} ${token.symbol} for delegate! Signature: ${signature.slice(0, 8)}...`,
      });

      // Clear form
      setSelectedToken("");
      setAmount("");
    } catch (error: any) {
      console.error("Error approving token:", error);
      setMessage({
        type: "error",
        text: `Failed to approve: ${error.message || "Unknown error"}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Wallet Connection */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h2 className="text-2xl font-semibold mb-4">1. Connect Main Wallet</h2>
        <p className="text-gray-400 mb-6">
          Connect the wallet containing the tokens you want to approve
        </p>
        <WalletMultiButton className="!bg-orange-500 hover:!bg-orange-600 !rounded-lg" />
        {connected && publicKey && (
          <div className="mt-4 text-sm text-gray-400">
            Connected: {publicKey.toBase58().slice(0, 8)}...
            {publicKey.toBase58().slice(-8)}
          </div>
        )}
      </div>

      {/* Token Selection */}
      {connected && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-2xl font-semibold mb-4">2. Select Token & Amount</h2>
          
          {delegateAddress && (
            <div className="mb-4 p-3 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-400">Delegate Wallet:</p>
              <p className="font-mono text-xs text-orange-400">{delegateAddress}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Token</label>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="">Select a token...</option>
                {tokens.map((token) => (
                  <option key={token.mint} value={token.mint}>
                    {token.symbol} (Balance: {token.balance.toFixed(4)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Amount to Approve
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                placeholder="Enter amount"
              />
              <p className="text-sm text-gray-500 mt-1">
                Maximum amount delegate can spend from your wallet
              </p>
            </div>

            <button
              onClick={handleApprove}
              disabled={loading || !selectedToken || !amount || !delegateAddress}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? "Approving..." : "Approve Token Delegation"}
            </button>

            {message && (
              <div
                className={`mt-4 p-4 rounded-lg ${
                  message.type === "success"
                    ? "bg-green-900/20 border border-green-800 text-green-400"
                    : message.type === "error"
                    ? "bg-red-900/20 border border-red-800 text-red-400"
                    : "bg-blue-900/20 border border-blue-800 text-blue-400"
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TokenApproval() {
  const endpoint = useMemo(() => clusterApiUrl("mainnet-beta"), []);
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <TokenApprovalContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

