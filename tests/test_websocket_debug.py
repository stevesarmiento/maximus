#!/usr/bin/env python3
"""
Debug script to test websocket connections directly.
"""
import os
import time
import logging
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Enable debug logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

from maximus.tools.realtime_prices import get_websocket_manager, get_price_cache

def main():
    print("=" * 80)
    print("WebSocket Connection Debug Test")
    print("=" * 80)
    
    # Check API key
    api_key = os.getenv("COINGECKO_API_KEY")
    if api_key:
        print(f"✓ CoinGecko API key found: {api_key[:8]}...{api_key[-4:]}")
    else:
        print("✗ CoinGecko API key NOT found")
        return
    
    # Get manager and cache
    manager = get_websocket_manager()
    cache = get_price_cache()
    
    print("\n" + "=" * 80)
    print("Starting WebSocket Manager...")
    print("=" * 80)
    
    # Subscribe to a few test tokens
    test_tokens = ["bitcoin", "ethereum", "solana"]
    for token in test_tokens:
        manager.subscribe_cg_token(token)
        print(f"  Subscribed to: {token}")
    
    # Start the manager
    manager.start()
    
    print("\nWaiting 15 seconds for connections and data...")
    for i in range(15, 0, -1):
        # Check cache status
        live_count = sum(1 for token in test_tokens if cache.get(token))
        print(f"\r  {i}s remaining... ({live_count}/{len(test_tokens)} prices received)", end="", flush=True)
        time.sleep(1)
    
    print("\n\n" + "=" * 80)
    print("Results:")
    print("=" * 80)
    
    # Check which tokens received data
    for token in test_tokens:
        price_data = cache.get(token)
        if price_data:
            print(f"✓ {token.upper():<10} ${price_data.price:,.2f} (age: {time.time() - price_data.received_at:.1f}s)")
        else:
            print(f"✗ {token.upper():<10} No data received")
    
    # Show all cached data
    all_cached = cache.get_all()
    print(f"\nTotal cached entries: {len(all_cached)}")
    
    print("\n" + "=" * 80)
    print("Stopping manager...")
    print("=" * 80)
    manager.stop()
    print("Done!")

if __name__ == "__main__":
    main()


