# Fonts Directory

This directory contains the custom fonts used in the Maximus web application.

## Required Font Files

Place the following font files in this directory:

### Inter Variable
- `InterVariable.woff2` - Variable font with weights 450, 550, 600
- Download from: https://rsms.me/inter/

### ABC Diatype
- `ABCDiatype-Regular.woff2` (weight: 400)
- `ABCDiatype-Medium.woff2` (weight: 500)
- `ABCDiatype-Bold.woff2` (weight: 700)
- Purchase/License from: https://abcdinamo.com/typefaces/diatype

### Berkeley Mono
- `BerkeleyMono-Regular.otf` (weight: 400)
- `BerkeleyMono-Oblique.otf` (weight: 400, italic)
- Purchase/License from: https://berkeleygraphics.com/typefaces/berkeley-mono/

## Fallback Behavior

The application will gracefully fall back to system fonts if these files are not present:
- **Inter** → system-ui, sans-serif
- **ABC Diatype** → system-ui, sans-serif
- **Berkeley Mono** → ui-monospace, monospace

## Usage

Once the fonts are in place, they'll be automatically loaded via the layout.tsx configuration and available as CSS variables:
- `--font-inter`
- `--font-abc-diatype`
- `--font-berkeley-mono`
- `--font-geist-sans` (Google Font - auto-loaded)
- `--font-geist-mono` (Google Font - auto-loaded)

