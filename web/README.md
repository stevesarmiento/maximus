# Maximus Web Dashboard

Web interface for managing Solana wallets used by the Maximus terminal agent.

## Features

- Connect Solana wallets using browser extensions (Phantom, Solflare)
- View all approved wallets
- Remove wallets from the approved list
- Automatic synchronization with terminal agent via `~/.maximus/wallets.json`

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Click "Connect Wallet" and approve the connection in your browser wallet
2. The wallet will be automatically saved to `~/.maximus/wallets.json`
3. Open the Maximus terminal and use commands like `/balances` or `/transactions`
4. Ask natural language questions like "What tokens are in my wallet?"

## Production Build

Build the application for production:
```bash
npm run build
npm start
```

## Technology Stack

- Next.js 15 (App Router)
- React 19
- Solana Wallet Adapter
- Tailwind CSS
- TypeScript

