# Maximus Web Setup Guide

## Quick Start

```bash
cd web
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
web/
├── app/
│   ├── api/
│   │   └── wallets/        # Wallet management API routes
│   ├── globals.css         # Global styles & design system
│   ├── layout.tsx          # Root layout with fonts
│   └── page.tsx            # Home page
├── components/
│   ├── wallet-connect.tsx  # Wallet connection UI
│   ├── wallet-list.tsx     # Connected wallets list
│   └── wallet-manager.tsx  # Main wallet manager
├── fonts/
│   └── README.md           # Font setup instructions
├── lib/
│   └── utils.ts            # Utility functions (cn, etc.)
├── package.json
├── tsconfig.json
└── next.config.ts
```

## Technology Stack

- **Framework**: Next.js 15.5.2 (App Router)
- **React**: 19.1.0
- **Build Tool**: Turbopack
- **Styling**: Tailwind CSS 4.1.16
- **UI Components**: Radix UI
- **Package Manager**: Bun
- **TypeScript**: 5.x
- **Blockchain**: Solana wallet adapters

## Design System

### Typography

The design system includes responsive typography classes:

```tsx
<h1 className="text-h1">Main Heading</h1>
<h2 className="text-title-2">Section Title</h2>
<p className="text-body-xl">Large body text</p>
<p className="text-body-l">Regular body text</p>
```

### Fonts

- **Inter** - Body text (variable weights: 450, 550, 600)
- **ABC Diatype** - Headings (400, 500, 700)
- **Berkeley Mono** - Code/monospace (400)
- **Geist Sans/Mono** - System fonts from Google

Font classes:
```tsx
<p className="font-inter">Inter font</p>
<h1 className="font-diatype">ABC Diatype</h1>
<code className="font-berkeley-mono">Code font</code>
```

### Colors

Using OKLCH color space:
- **Sand Scale**: `sand-100` through `sand-1600`
- **Borders**: `border-extra-low`, `border-low`, `border-medium`, `border-strong`
- **Grays**: `gray-400` through `gray-900`

```tsx
<div className="bg-bg1 text-gray-900 border border-border-low">
  Content
</div>
```

## Available Scripts

```bash
# Development with Turbopack
bun run dev

# Production build
bun run build

# Start production server
bun run start

# Lint code
bun run lint
```

## Environment Setup

### Required Font Files

Place these files in the `/fonts` directory:
- `InterVariable.woff2`
- `ABCDiatype-Regular.woff2`
- `ABCDiatype-Medium.woff2`
- `ABCDiatype-Bold.woff2`
- `BerkeleyMono-Regular.otf`
- `BerkeleyMono-Oblique.otf`

See `/fonts/README.md` for download links and licensing info.

### API Integration

The app connects to the Maximus Python backend to manage wallet storage:
- `GET /api/wallets` - List stored wallets
- `POST /api/wallets` - Add new wallet
- `DELETE /api/wallets` - Remove wallet

Wallets are stored in `~/.maximus/wallets.json` via the backend.

## Solana Integration

### Supported Wallets

- Phantom
- Solflare
- (Other wallets can be added to `wallet-manager.tsx`)

### Wallet Connection Flow

1. User clicks "Connect Wallet" button
2. Browser wallet extension prompts for approval
3. Wallet address is sent to backend API
4. Backend stores wallet in local config
5. Terminal can now use the wallet for queries

## Component Usage

### Using the Wallet Manager

```tsx
import WalletManager from "@/components/wallet-manager";

export default function Page() {
  return <WalletManager />;
}
```

### Using Class Name Utility

```tsx
import { cn } from "@/lib/utils";

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  "conditional-classes"
)} />
```

## Building UI Components

The project includes Radix UI primitives. To create new components:

```tsx
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export function MyDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={cn("overlay-styles")} />
        <Dialog.Content className={cn("content-styles")}>
          {/* Content */}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

## Troubleshooting

### Fonts Not Loading

If fonts don't appear:
1. Check `/fonts` directory has all required files
2. Verify file names match `layout.tsx` configuration
3. System fallback fonts will be used if files are missing

### Build Errors

```bash
# Clear cache and rebuild
rm -rf .next node_modules
bun install
bun run build
```

### Port Already in Use

```bash
# Use a different port
bun run dev -- -p 3001
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [Radix UI Components](https://www.radix-ui.com)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [Bun Documentation](https://bun.sh/docs)

