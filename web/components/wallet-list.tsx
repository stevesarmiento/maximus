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
      <div className="border border-border-low rounded-lg p-8">
        <h2 className="text-title-4 mb-4">Approved Wallets</h2>
        <div className="text-body-md text-gray-600 animate-pulse">Loading wallets...</div>
      </div>
    );
  }

  return (
    <div className="border border-border-low rounded-lg p-8">
      <h2 className="text-title-4 mb-4">Approved Wallets</h2>

      {wallets.length === 0 ? (
        <div className="text-body-l text-gray-600 text-center py-8">
          No wallets connected yet. Connect a wallet above to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {wallets.map((wallet) => (
            <div
              key={wallet.address}
              className="flex items-center justify-between p-4 border border-border-extra-low hover:border-border-low rounded-lg transition-colors"
            >
              <div className="flex-1">
                <div className="font-berkeley-mono text-body-md text-gray-900">
                  {wallet.address}
                </div>
                {wallet.label && (
                  <div className="text-body-md text-gray-600 mt-1">
                    {wallet.label}
                  </div>
                )}
                <div className="text-body-md text-gray-500 mt-1">
                  Added: {new Date(wallet.added_at).toLocaleString()}
                </div>
              </div>

              <button
                onClick={() => onRemove(wallet.address)}
                className="ml-4 px-4 py-2 text-body-md font-inter-medium bg-red-50 text-red-700 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
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

