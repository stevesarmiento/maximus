# Maximus Desktop

Native desktop application for Maximus - the autonomous Solana trading agent.

## Architecture

This desktop app is built with:
- **Tauri 2.0** - Rust-based native runtime (lightweight, fast, secure)
- **React + TypeScript** - Modern UI framework
- **Vite** - Lightning-fast build tool
- **Python Agent** - Existing Maximus Python agent (unchanged)

## Getting Started

### Prerequisites

1. **Rust** - Install from https://rustup.rs/
2. **Node.js** - v18 or higher
3. **Python** - Python 3.10+ with `uv` (for the agent)
4. **Xcode Command Line Tools** (macOS) - `xcode-select --install`

### Installation

```bash
# From the root of maximus repo

# 1. Install desktop frontend dependencies
npm run install:desktop

# 2. Install Tauri CLI (if not already installed)
cargo install tauri-cli

# 3. Ensure Python agent dependencies are installed
uv sync
```

### Development

Run the app in development mode:

```bash
# Terminal 1: Start the frontend dev server
npm run dev:desktop

# Terminal 2: Run the Tauri app
npm run tauri:dev
```

Or use the combined command (from src-tauri):
```bash
cd src-tauri
cargo tauri dev
```

This will:
1. Start Vite dev server on port 5173
2. Launch the native window
3. Enable hot-reload for React changes
4. Connect to your local Python agent

### Building

Build the production app bundle:

```bash
npm run tauri:build
```

This creates:
- **macOS**: `src-tauri/target/release/bundle/dmg/Maximus_0.1.0_x64.dmg`
- **macOS**: `src-tauri/target/release/bundle/macos/Maximus.app`

## Project Structure

```
src-desktop/
├── src/
│   ├── components/
│   │   ├── Terminal.tsx       # Main terminal interface
│   │   ├── MessageList.tsx    # Chat message display
│   │   ├── PriceHeader.tsx    # Real-time price ticker
│   │   └── StatusBar.tsx      # Agent status indicator
│   ├── hooks/
│   │   └── useAgent.ts        # Agent communication hook
│   ├── styles/
│   │   └── terminal.css       # Terminal aesthetic styles
│   ├── App.tsx                # Root component
│   └── main.tsx               # React entry point
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json

src-tauri/
├── src/
│   ├── main.rs                # Tauri app entry point
│   ├── python.rs              # Python process manager
│   ├── commands.rs            # Tauri commands (IPC)
│   └── lib.rs
├── Cargo.toml
├── tauri.conf.json            # App configuration
└── build.rs
```

## How It Works

1. **Tauri launches** the native window and starts the React frontend
2. **On startup**, Rust spawns the Python agent process (`uv run maximus`)
3. **User types query** in the terminal UI
4. **Frontend calls** Tauri command (`send_query`) via IPC
5. **Rust backend** sends query to Python agent via stdin
6. **Python agent** processes query (using existing logic)
7. **Response streams** back through stdout
8. **Frontend displays** the response with nice formatting

## Features

### Current
- ✅ Terminal-style interface
- ✅ Real-time price ticker (header)
- ✅ Agent status indicator
- ✅ Quick command buttons (/balances, /transactions)
- ✅ Message history
- ✅ Keyboard shortcuts (Enter to send)
- ✅ Native window (macOS)
- ✅ Python agent integration

### Planned
- 🚧 TradingView-style charts (lightweight-charts)
- 🚧 Real-time price streaming from agent
- 🚧 Notification support
- 🚧 System tray integration
- 🚧 Global keyboard shortcut (Cmd+Shift+M)
- 🚧 Chart overlays for technical indicators
- 🚧 Python runtime bundling (for distribution)
- 🚧 Windows support

## Development Notes

### Python Agent Integration

In development mode, the app uses `uv run maximus` to start the agent, which means:
- You must have the Python environment set up
- The agent runs from your local source code
- Changes to Python code require restarting the agent

In production mode (after bundling), we'll bundle a Python runtime with the app.

### Tauri Commands

The app exposes these commands to the frontend:

- `send_query(query: String)` - Send a query to the agent
- `get_agent_status()` - Check if agent is running
- `start_agent()` - Start the Python agent
- `stop_agent()` - Stop the Python agent
- `clear_memory()` - Clear agent memory
- `get_wallet_balances()` - Get wallet balances
- `get_transactions()` - Get transaction history
- `open_wallet_manager()` - Open web dashboard

### Styling

The app uses a custom terminal aesthetic with:
- JetBrains Mono font
- Dark theme (high contrast)
- Minimal animations
- Focus on readability and speed

See `src/styles/terminal.css` for the complete theme.

## Troubleshooting

### Agent won't start

Make sure:
1. Python environment is set up: `uv sync`
2. You can run the CLI: `uv run maximus`
3. Check Rust console output in terminal

### Build fails

Common issues:
- Missing Rust toolchain: `rustup update`
- Missing Xcode tools: `xcode-select --install`
- Outdated dependencies: `cargo update`, `npm update`

### Hot reload not working

- Restart both dev server and Tauri app
- Clear Vite cache: `rm -rf src-desktop/node_modules/.vite`

## License

MIT

