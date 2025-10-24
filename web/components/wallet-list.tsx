"use client";

interface Wallet {
  address: string;
  label: string | null;
  added_at: string;
}

interface WalletListProps {
  wallets: Wallet[];
  loading: boolean;
  onRemove: (address: string) => void;
}

export default function WalletList({
  wallets,
  loading,
  onRemove,
}: WalletListProps) {
  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h2 className="text-2xl font-semibold mb-4">Approved Wallets</h2>
        <div className="text-gray-400 animate-pulse">Loading wallets...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <h2 className="text-2xl font-semibold mb-4">Approved Wallets</h2>

      {wallets.length === 0 ? (
        <div className="text-gray-400 text-center py-8">
          No wallets connected yet. Connect a wallet above to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {wallets.map((wallet) => (
            <div
              key={wallet.address}
              className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex-1">
                <div className="font-mono text-sm text-orange-400">
                  {wallet.address}
                </div>
                {wallet.label && (
                  <div className="text-xs text-gray-500 mt-1">
                    {wallet.label}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  Added: {new Date(wallet.added_at).toLocaleString()}
                </div>
              </div>

              <button
                onClick={() => onRemove(wallet.address)}
                className="ml-4 px-4 py-2 text-sm bg-red-900/20 text-red-400 rounded-lg border border-red-800 hover:bg-red-900/40 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

