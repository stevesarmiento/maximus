# App Icons

Place your app icons here for macOS, Windows, and Linux bundles.

## Required Icons

- `32x32.png` - Small icon
- `128x128.png` - Medium icon
- `128x128@2x.png` - Retina medium icon
- `icon.icns` - macOS icon bundle
- `icon.ico` - Windows icon

## Generating Icons

You can generate all required icons from a single 1024x1024 PNG using:

```bash
# Install icon generator
cargo install tauri-cli

# Generate from source image
cd src-tauri
cargo tauri icon /path/to/your-icon-1024x1024.png
```

This will automatically create all required icon formats in this directory.

## Design Guidelines

- **Simple & recognizable** at small sizes (16x16)
- **High contrast** for visibility
- **Square format** (will be rounded on macOS automatically)
- **No text** (too small to read)
- **Solid background** (transparent PNG supported but not required)

## Temporary Placeholder

Until you add custom icons, the app will use Tauri's default icons.

To add your own:
1. Create a 1024x1024 PNG of your Maximus logo/icon
2. Run `cargo tauri icon your-icon.png`
3. Rebuild the app

