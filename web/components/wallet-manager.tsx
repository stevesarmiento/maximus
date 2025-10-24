"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import WalletConnect from "./wallet-connect";
import WalletList from "./wallet-list";
import "@solana/wallet-adapter-react-ui/styles.css";

interface Wallet {
  address: string;
  label: string | null;
  added_at: string;
}

function WalletManagerContent() {
  const { publicKey } = useWallet();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWallets = async () => {
    try {
      const response = await fetch("/api/wallets");
      if (response.ok) {
        const data = await response.json();
        setWallets(data.wallets || []);
      }
    } catch (error) {
      console.error("Failed to fetch wallets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const handleConnect = async (address: string) => {
    try {
      const response = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          label: `Wallet ${address.slice(0, 4)}...${address.slice(-4)}`,
        }),
      });

      if (response.ok) {
        await fetchWallets();
        return true;
      } else {
        const error = await response.json();
        console.error("Failed to add wallet:", error);
        return false;
      }
    } catch (error) {
      console.error("Failed to add wallet:", error);
      return false;
    }
  };

  const handleRemove = async (address: string) => {
    try {
      const response = await fetch("/api/wallets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      if (response.ok) {
        await fetchWallets();
      }
    } catch (error) {
      console.error("Failed to remove wallet:", error);
    }
  };

  return (
    <div className="space-y-8">
      <WalletConnect onConnect={handleConnect} />
      <WalletList
        wallets={wallets}
        loading={loading}
        onRemove={handleRemove}
      />
    </div>
  );
}

export default function WalletManager() {
  const endpoint = useMemo(() => clusterApiUrl("mainnet-beta"), []);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletManagerContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

