# Titan Router Integration

This document describes the Titan router integration that replaces Jupiter for token swaps in Maximus.

## Overview

Titan is a WebSocket-based swap API that streams live quotes from multiple providers including Jupiter aggregator, Pyth Express Relay, Hashflow, and other RFQ (Request for Quote) providers. Unlike Jupiter's single REST API call, Titan provides continuous streaming updates with improving prices until the user confirms.

## Implementation Details

### Architecture

The Titan integration consists of three main components:

1. **WebSocket Client** (`titan_client.py`)
   - Handles WebSocket connection with authentication
   - MessagePack encoding/decoding
   - Streaming quote management
   - Protocol negotiation (v1.api.titan.ag)

2. **Live Display** (`titan_display.py`)
   - Interactive terminal UI with in-place updates
   - Shows quotes from multiple providers in a table
   - Highlights best quote in real-time
   - Waits for user Enter key to confirm

3. **Swap Tool Integration** (`solana_transactions.py`)
   - Replaced Jupiter REST API calls with Titan streaming
   - Resolves token symbols to mint addresses
   - Manages async execution in sync tool context
   - Validates delegation permissions

### Protocol Details

**WebSocket Endpoints (Demo):**
- US (Ohio): `wss://us1.api.demo.titan.exchange/api/v1/ws` (default)
- Japan (Tokyo): `wss://jp1.api.demo.titan.exchange/api/v1/ws`
- Germany (Frankfurt): `wss://de1.api.demo.titan.exchange/api/v1/ws`

**Authentication:** JWT Bearer token in Authorization header

**Encoding:** MessagePack with optional compression (zstd, brotli, gzip)

**Message Types:**
- `ClientRequest`: User requests (GetInfo, NewSwapQuoteStream, StopStream)
- `ServerMessage`: Server responses (Response, Error, StreamData, StreamEnd)
- `SwapQuotes`: Quote data with provider details and routes

### Key Features

1. **Multiple Provider Support**
   - Jupiter (DEX aggregator)
   - Pyth Express Relay (RFQ)
   - Hashflow (RFQ)
   - Other integrated providers

2. **Live Streaming Quotes**
   - Updates every 500ms by default
   - Shows up to 5 quotes per update
   - Continuous until user confirms or cancels

3. **Interactive UI**
   - Table format with columns: Provider, Route, In Amount, Out Amount, Rate
   - Best quote highlighted with ★ in green
   - Updates in-place without scrolling
   - Clean, readable display

4. **Route Transparency**
   - Shows DEX venues in the route (e.g., "Raydium → Orca")
   - Displays slippage, compute units, platform fees
   - Full route plan with step-by-step details

## Files Changed

### New Files

1. **`src/maximus/tools/titan_client.py`** (327 lines)
   - TitanClient class for WebSocket communication
   - MessagePack encode/decode utilities
   - SwapQuote and SwapQuotes data classes
   - Async streaming quote iterator
   - Helper function for best quote selection

2. **`src/maximus/tools/titan_display.py`** (270 lines)
   - LiveQuoteDisplay class for terminal UI
   - In-place table rendering
   - Quote formatting utilities
   - User input handling (Enter/Ctrl+C)
   - Integration function for streaming with display

3. **`TITAN_INTEGRATION.md`** (this file)
   - Documentation of the integration
   - Architecture overview
   - Usage examples

### Modified Files

1. **`pyproject.toml`**
   - Added `msgpack>=1.0.8` dependency
   - Added `websockets>=12.0` dependency

2. **`src/maximus/tools/solana_transactions.py`**
   - Replaced Jupiter REST API with Titan WebSocket streaming
   - Updated `swap_tokens` tool description and implementation
   - Added `get_titan_swap_with_display()` async function
   - Added common token mint address mappings
   - Validation now checks for "Titan" in allowed programs

3. **`src/maximus/utils/delegate_wallet.py`**
   - Changed default `allowed_programs` from `["Jupiter", "Raydium"]` to `["Titan"]`
   - Updated in both `__init__` and `from_dict` methods

4. **`web/app/api/delegate/route.ts`**
   - Changed default `allowedPrograms` from `["Jupiter", "Raydium"]` to `["Titan"]`

5. **`README.md`**
   - Added Titan API token to prerequisites
   - Added TITAN_API_TOKEN to environment variables
   - Updated swap tool description
   - Added new section "Token Swaps with Titan Router"
   - Included example of live quote display

6. **`src/maximus/tools/solana_approve.py`**
   - Updated tool description to mention Titan instead of Jupiter

## Environment Configuration

Add to your `.env` file:

```bash
TITAN_API_TOKEN=your-titan-api-token
```

To obtain a Titan API token, contact info@titandex.io or reach out on their Telegram/Discord.

Optional configuration (uses defaults if not set):
```bash
# Choose your preferred region (defaults to US)
TITAN_WS_URL=wss://us1.api.demo.titan.exchange/api/v1/ws  # US (Ohio) - default
# TITAN_WS_URL=wss://jp1.api.demo.titan.exchange/api/v1/ws  # Japan (Tokyo)
# TITAN_WS_URL=wss://de1.api.demo.titan.exchange/api/v1/ws  # Germany (Frankfurt)
```

## Usage Example

### Terminal Session

```bash
# Start Maximus
$ uv run maximus

# User query
>> Swap 10 USDC for SOL

# Maximus displays live streaming quotes
╭─ Live Quotes
│ Provider        Route                In USDC      Out SOL      Rate
│ ───────────────────────────────────────────────────────────────────────
│ ★ Jupiter       Raydium → Orca       10.0000      0.0987       0.0987
│   Pyth Express  Direct               10.0000      0.0985       0.0985
│   Hashflow      Direct               10.0000      0.0983       0.0983
│
╰───────────────────────────────────────────────────────────────────────

Press Enter to execute best quote, or Ctrl+C to cancel

# User presses Enter

✓ Selected Jupiter quote: 0.0987 SOL
Swap ready: 10.0 USDC → 0.098700 SOL via Jupiter
```

### Programmatic Usage

```python
from maximus.tools.titan_client import TitanClient
from maximus.tools.titan_display import stream_quotes_with_display, QuoteDisplayConfig

async def swap_example():
    client = TitanClient()
    await client.connect()
    
    config = QuoteDisplayConfig(
        decimals_in=6,
        decimals_out=9,
        symbol_in="USDC",
        symbol_out="SOL"
    )
    
    result = await stream_quotes_with_display(
        client=client,
        input_mint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  # USDC
        output_mint="So11111111111111111111111111111111111111112",   # SOL
        amount=10_000_000,  # 10 USDC (6 decimals)
        user_public_key="YourWalletAddress...",
        slippage_bps=50,  # 0.5%
        config=config
    )
    
    if result:
        provider_id, best_quote, all_quotes = result
        print(f"Best quote from {provider_id}: {best_quote.out_amount} lamports")
    
    await client.close()
```

## Benefits Over Jupiter

1. **Multiple Providers**: Access to RFQ providers in addition to DEX aggregators
2. **Real-time Updates**: Quotes improve as market conditions change
3. **Better UX**: User can see all options and watch prices update
4. **Transparency**: Full route details and provider comparison
5. **Best Execution**: Always get the latest best quote before execution

## Implemented Features

✅ **Transaction Execution** - Swaps are executed on-chain!
- Deserializes transaction from Titan response
- Signs with delegate wallet
- Sends to Solana network
- Waits for confirmation
- Returns transaction signature and Solscan link

## Future Enhancements

Potential improvements for future versions:

1. **Historical Quote Data**: Track and compare quotes over time
2. **Custom Provider Selection**: Let users prefer certain providers
3. **Advanced Filtering**: Filter by route complexity, slippage, fees
4. **Persistent Connections**: Keep WebSocket open during session for faster swaps
5. **Quote Analytics**: Show price impact, fees breakdown, historical comparison
6. **Token Account Delegation**: Full support for SPL token delegation without transferring tokens

## Technical Notes

### MessagePack Encoding

Titan uses MessagePack for efficient binary serialization:
- Public keys: 32-byte binary (not base58 strings)
- Instructions: Compact encoding with shortened field names
- Enums: String values for simple enums, object-wrapped for complex enums

### Async Context

The tool uses `asyncio.run()` to bridge the sync tool interface with async WebSocket operations. This works fine for one-off swaps but could be optimized with a persistent event loop for repeated swaps.

### Error Handling

- Connection errors: Caught and reported with helpful message
- Stream errors: Handled gracefully with error codes and messages
- User cancellation: Ctrl+C properly stops stream and cleans up
- Missing token: Clear error directing user to obtain API token

## Testing

To test the Titan integration:

1. Ensure you have a Titan API token set in `.env`
2. Start the web dashboard and create a delegation
3. Ensure "Titan" is in the allowed programs
4. Run: `uv run maximus`
5. Try: "Swap 10 USDC for SOL"
6. Watch the live quotes update
7. Press Enter to confirm or Ctrl+C to cancel

## Support

For issues or questions:
- Titan API: info@titandex.io or Telegram/Discord
- Maximus: Open an issue on GitHub

