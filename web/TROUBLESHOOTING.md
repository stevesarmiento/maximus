# Troubleshooting Guide

## Tailwind CSS Not Working

If you see unstyled content or Tailwind classes aren't being applied:

### Solution 1: Restart Dev Server
Stop your dev server (Ctrl+C) and restart it:
```bash
cd web
bun run dev
```

The PostCSS configuration (`postcss.config.js`) needs to be loaded at server startup.

### Solution 2: Clear Cache
```bash
rm -rf .next
bun run dev
```

### Solution 3: Verify PostCSS Config
Make sure `postcss.config.js` exists with:
```js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

### Solution 4: Check globals.css Import
Verify `app/layout.tsx` imports `./globals.css` and `globals.css` starts with:
```css
@import "tailwindcss";
```

## Font Not Loading

If custom fonts aren't appearing:

### Solution 1: Add Font Files
Place these files in `/fonts/`:
- `InterVariable.woff2`
- `ABCDiatype-Regular.woff2`
- `ABCDiatype-Medium.woff2`
- `ABCDiatype-Bold.woff2`
- `BerkeleyMono-Regular.otf`
- `BerkeleyMono-Oblique.otf`

### Solution 2: Use Fallback Fonts
The app will use system fonts if custom fonts are missing. This is intentional for development.

## Wallet Adapter CSS Error

If you see errors about wallet adapter styles:

### Solution
Make sure `components/wallet-manager.tsx` uses ES6 import:
```tsx
import "@solana/wallet-adapter-react-ui/styles.css";
```

Not `require()`.

## Build Errors

### Turbopack Error
If you get Turbopack errors, try building without it:
```bash
bun run dev -- --no-turbopack
```

### Module Not Found
```bash
bun install
rm -rf .next node_modules
bun install
bun run dev
```

## Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
bun run dev -- -p 3001
```

## Type Errors

If TypeScript complains about missing types:
```bash
rm -rf .next
bun run dev
```

Next.js will regenerate type definitions.

## Styling Not Updating

### Hard Refresh Browser
- **Mac**: Cmd + Shift + R
- **Windows/Linux**: Ctrl + Shift + R

### Clear Browser Cache
Or open in incognito mode to test.

## API Route Errors

If `/api/wallets` returns errors:

1. Make sure the Python Maximus backend is running
2. Check wallet storage at `~/.maximus/wallets.json`
3. Verify API route file exists at `app/api/wallets/route.ts`

## Still Having Issues?

1. Check console for errors (F12 in browser)
2. Check terminal for build errors
3. Verify all dependencies installed: `bun install`
4. Try a clean build:
   ```bash
   rm -rf .next node_modules bun.lockb
   bun install
   bun run build
   ```

