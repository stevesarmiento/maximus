# Solana Integration Setup Guide

This guide will help you set up and use the Solana wallet integration features in Maximus.

## Prerequisites

1. **Helius RPC API Key**: Sign up at [https://helius.dev](https://helius.dev) to get a free API key
2. **Solana Wallet**: Install a browser wallet extension:
   - [Phantom](https://phantom.app/)
   - [Solflare](https://solflare.com/)
3. **Node.js & npm**: Required for running the web dashboard (Node 18+ recommended)

## Installation Steps

### 1. Install Python Dependencies

The Solana dependencies should be automatically installed with uv:

```bash
uv sync
```

This will install:
- `solana>=0.35.0` - Solana Python SDK with RPC client
- `solders>=0.22.0` - High-performance Rust-based Solana toolkit

### 2. Configure Environment Variables

Add your Helius RPC URL to the `.env` file:

```bash
# Add to your .env file
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY_HERE
```

Replace `YOUR_API_KEY_HERE` with your actual Helius API key.

### 3. Set Up the Web Dashboard

The web dashboard allows you to connect and manage wallets:

```bash
# Navigate to the web directory
cd web

# Install dependencies
npm install

# Start the development server
npm run dev
```

The dashboard will be available at [http://localhost:3000](http://localhost:3000)

### 4. Connect Your Wallet

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Click the "Connect Wallet" button
3. Choose your wallet (Phantom, Solflare, etc.)
4. Approve the connection in your wallet extension
5. Your wallet address will be saved to `~/.maximus/wallets.json`

## Using Solana Features in Terminal

Once your wallet is connected, you can use these commands in the Maximus terminal:

### Slash Commands (Instant Results)

```bash
# View wallet balances
>> /balances

# View recent transactions
>> /transactions
```

### Natural Language Queries (Agent-powered)

The agent can now understand and execute Solana-related queries:

```bash
# Check balances
>> What tokens are in my wallet?
>> How much SOL do I have?
>> Show me my token balances

# View transactions
>> Show me my recent Solana transactions
>> What were my last 10 transactions?

# Combined queries
>> What's in my wallet and what's the current price of those tokens?
```

## Architecture Overview

### Wallet Storage
- Wallets are stored in `~/.maximus/wallets.json`
- Only public keys are stored (never private keys)
- Multiple wallets can be connected
- Wallets persist across terminal sessions

### Data Flow
1. **Web Dashboard** → Connect wallet → Save to `~/.maximus/wallets.json`
2. **Terminal** → Read wallet addresses → Query Helius RPC → Display results

### Security
- Private keys never leave your browser wallet extension
- Only public addresses are stored locally
- All blockchain queries are read-only
- No transaction signing capability (view-only mode)

## Available Tools

The agent has access to three Solana tools:

### 1. `get_wallet_balances`
Fetches SOL and SPL token balances for approved wallets.

**Parameters:**
- `wallet_address` (optional): Query specific wallet
- `include_zero_balances` (optional): Include tokens with zero balance

**Returns:**
- SOL balance
- List of SPL tokens with:
  - Symbol and name
  - Balance
  - Mint address
  - Decimals

### 2. `get_transaction_history`
Fetches recent transaction history for a wallet.

**Parameters:**
- `wallet_address` (optional): Query specific wallet
- `limit` (optional): Number of transactions (default: 10)

**Returns:**
- Transaction signatures
- Timestamps
- Status (Success/Failed)
- Slot numbers

### 3. `get_token_accounts`
Fetches detailed token account information.

**Parameters:**
- `wallet_address` (optional): Query specific wallet

**Returns:**
- All token accounts (including zero balance)
- Token metadata
- Account owners
- Mint addresses

## Example Workflow

1. **Start web dashboard:**
   ```bash
   cd web && npm run dev
   ```

2. **Connect wallet at http://localhost:3000**

3. **Open terminal in a new window:**
   ```bash
   cd ..
   uv run maximus
   ```

4. **Query your wallet:**
   ```bash
   >> /balances
   
   Wallet Balances:
   
   Wallet 9vXm... (9vXm...qx2Y)
     SOL: 2.5000
     Tokens (3):
       • USDC: 1,250.0000
       • RAY: 45.5000
       • BONK: 1,000,000.0000
   ```

5. **Ask natural language questions:**
   ```bash
   >> What's the USD value of my SOL?
   [Agent plans tasks, fetches SOL price, calculates value]
   ```

## Troubleshooting

### "No approved wallets found"
- Make sure you've connected a wallet via the web dashboard
- Check that `~/.maximus/wallets.json` exists and contains wallet addresses
- Try reconnecting your wallet in the dashboard

### "Failed to get balance" or RPC errors
- Verify your `HELIUS_RPC_URL` is set correctly in `.env`
- Check your Helius API key is valid
- Ensure you have an active internet connection
- Try using a different RPC endpoint (free tier has rate limits)

### Web dashboard connection issues
- Make sure your wallet extension is unlocked
- Try refreshing the page and reconnecting
- Check browser console for errors
- Ensure you're on a supported network (Mainnet Beta)

### Token metadata showing "UNKNOWN"
- Some tokens may not have metadata available
- The mint address is still shown for manual lookup
- Consider using a different RPC provider with better metadata support

## Production Deployment

For production use of the web dashboard:

```bash
cd web
npm run build
npm start
```

The production server will run on port 3000 by default.

## Advanced Configuration

### Custom RPC Endpoint
You can use any Solana RPC endpoint by updating the `HELIUS_RPC_URL`:

```bash
# Use a different provider
HELIUS_RPC_URL=https://api.mainnet-beta.solana.com

# Use devnet for testing
HELIUS_RPC_URL=https://api.devnet.solana.com
```

### Multiple Wallets
The system supports querying multiple wallets simultaneously. Connect multiple wallets via the dashboard, and `/balances` will show data for all of them.

## Next Steps

- **Transaction Signing** (future): Add support for signing and sending transactions
- **NFT Support** (future): Query NFT holdings and metadata
- **Staking Info** (future): View staking positions and rewards
- **DeFi Integration** (future): Query positions across DeFi protocols

## Support

For issues or questions:
- Check the main [README.md](README.md) for general Maximus information
- Review the [web dashboard README](web/README.md) for frontend-specific details
- Open an issue on GitHub for bugs or feature requests

## Security Best Practices

1. **Never share your private keys** - Only public addresses are needed
2. **Use hardware wallets** for large holdings
3. **Verify transactions** in your wallet before signing (when that feature is added)
4. **Keep your RPC API key private** - Don't commit `.env` files
5. **Regular audits** - Review approved wallets in the dashboard periodically

