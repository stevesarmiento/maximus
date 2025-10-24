# Web Directory Upgrade Notes

## Completed Upgrades (October 2025)

### Next.js 15.5.2
- Upgraded from 15.1.6 to 15.5.2
- Using React 19.1.0
- Using Turbopack for dev and build (`--turbopack` flag)

### Tailwind CSS 4.1.16
- Upgraded from v3.4.17 to v4.1.16
- Removed `tailwind.config.ts` (no longer needed)
- Removed `postcss.config.mjs` (Tailwind 4 uses built-in Lightning CSS)
- Removed `autoprefixer` and `postcss` dependencies
- Added `@tailwindcss/postcss` for Next.js integration

### New Dependencies Added

#### UI Components (Radix UI)
All Radix UI primitives for building accessible components:
- Accordion, Alert Dialog, Avatar, Checkbox, Collapsible
- Dialog, Dropdown Menu, Hover Card, Icons, Label
- Navigation Menu, Popover, Scroll Area, Select
- Separator, Slider, Slot, Switch, Tabs, Tooltip

#### Utilities
- `@tanstack/react-query` (v5.90.5) - Data fetching and state management
- `class-variance-authority` - Type-safe component variants
- `clsx` & `tailwind-merge` - Class name utilities
- `lucide-react` - Icon library
- `next-themes` - Dark mode support

#### Fonts
- `Geist` and `Geist_Mono` from Google Fonts (auto-loaded)
- Local custom fonts (see `/fonts/README.md`):
  - **Inter Variable** - Body text (weights: 450, 550, 600)
  - **ABC Diatype** - Headings (weights: 400, 500, 700)
  - **Berkeley Mono** - Code/monospace (weight: 400)

## Migration Changes

### CSS Configuration
The `globals.css` file now uses Tailwind CSS 4's new syntax with extensive custom design system:

```css
@import "tailwindcss";

@theme {
  --color-cream: oklch(0.9553 0.0029 84.56);
  --color-bg1: oklch(0.9826 0.0034 97.35);
  /* Sand scale colors */
  /* Border colors */
  /* Custom animations */
}
```

#### Custom Typography Classes
Responsive typography matching design specs:
- `.text-h1` - 64px desktop / 36px mobile
- `.text-title-2` - 56px desktop / 36px mobile
- `.text-h2` - 44px desktop / 29px mobile
- `.text-title-4` - 32px desktop / 24px mobile
- `.text-title-5` - 21px
- `.text-body-xl` - 19px
- `.text-body-l` - 16px
- `.text-body-md` - 14px
- `.text-nav-item` - 14px

#### Custom Border Utilities
- `.border-l-dashed-wide` / `.border-r-dashed-wide`
- `.border-lr-dashed-wide`
- `.border-horizontal-dashed-wide`
- `.border-all-dashed-medium`
- `.product-card-diagonal` - Animated diagonal pattern

#### Custom Animations
- Pulse animations for borders and lines
- CTA float animations with staggered delays

### Font Setup
Fonts are configured in `app/layout.tsx` with CSS variables:
- `--font-geist-sans` / `--font-geist-mono`
- `--font-inter`
- `--font-abc-diatype`
- `--font-berkeley-mono`

### Utilities
Created `lib/utils.ts` with `cn()` helper for class merging:
```typescript
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Package Manager
Using `bun` for package management:
```bash
bun install
bun run dev --turbopack
bun run build --turbopack
```

## Design System Colors

Using OKLCH color space for perceptually uniform colors:
- **Sand Scale**: 16 shades from 100-1600
- **Border Colors**: extra-low, low, medium, strong
- **Background**: `bg1` cream color
- **Grays**: 400, 500, 600, 800, 900
- **Theme Colors**: background, foreground, card, popover, primary, secondary, muted, accent, destructive

## Components Status
All components updated with new design system:
- ✅ `app/page.tsx` - Using custom typography classes
- ✅ `components/wallet-manager.tsx` - Maintained functionality
- ✅ `components/wallet-connect.tsx` - New design system styling
- ✅ `components/wallet-list.tsx` - New design system styling

## Benefits of This Setup

1. **Tailwind CSS 4** - Faster builds with Lightning CSS
2. **Radix UI** - Production-ready accessible components
3. **Custom Design System** - Consistent typography and colors
4. **Type Safety** - Full TypeScript support with proper types
5. **Modern Stack** - Latest Next.js 15 with Turbopack
6. **Font Loading** - Optimized with Next.js font system

## Next Steps

1. Add custom font files to `/fonts/` directory (see `/fonts/README.md`)
2. Customize colors in `globals.css` `@theme` block as needed
3. Build Radix UI components in `/components/ui/` directory
4. Add dark mode toggle using `next-themes`

