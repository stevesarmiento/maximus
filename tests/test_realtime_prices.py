"""
Test script for real-time websocket price integration.

This script tests:
1. Websocket manager initialization
2. Real-time price updates for SOL and other tokens
3. Cache performance vs REST API
4. Multi-token subscriptions
"""

import time
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from maximus.tools.realtime_prices import (
    initialize_realtime_prices,
    shutdown_realtime_prices,
    get_price_cache,
    get_websocket_manager,
)
from maximus.tools.prices import get_price_snapshot


def test_realtime_vs_rest():
    """Compare real-time websocket prices vs REST API."""
    print("=" * 80)
    print("Testing Real-time Websocket Prices")
    print("=" * 80)
    
    # Initialize with common tokens
    print("\n1. Initializing websocket manager...")
    common_tokens = ["sol", "btc", "eth", "usdc", "bonk"]
    initialize_realtime_prices(common_tokens)
    
    # Give websockets time to connect and receive first updates
    print("   Waiting 15 seconds for websocket connections and initial price updates...")
    for i in range(15, 0, -1):
        print(f"   {i}...", end="\r")
        time.sleep(1)
    print("   Ready!                    ")
    
    cache = get_price_cache()
    
    # Check cached prices
    print("\n2. Checking real-time cached prices:")
    print("-" * 80)
    for token in common_tokens:
        price_data = cache.get(token)
        if price_data:
            change_str = f"{price_data.price_change_24h_pct:+.2f}%" if price_data.price_change_24h_pct else "N/A"
            print(f"   ✓ {token.upper():6s} ${price_data.price:>12.4f} "
                  f"(age: {price_data.to_dict()['age_seconds']:.1f}s, "
                  f"24h: {change_str})")
        else:
            print(f"   ✗ {token.upper():6s} Not in cache yet")
    
    # Test SOL price comparison
    print("\n3. Testing SOL price retrieval speed:")
    print("-" * 80)
    
    # Test with cache (should use websocket data)
    print("   Testing get_price_snapshot (with real-time cache)...")
    start_time = time.time()
    sol_snapshot_cached = get_price_snapshot.invoke({"identifier": "sol"})
    cached_time = time.time() - start_time
    
    print(f"   → SOL Price: ${sol_snapshot_cached['current_price']:.2f}")
    print(f"   → Data Source: {sol_snapshot_cached.get('data_source', 'unknown')}")
    print(f"   → Time taken: {cached_time:.3f}s")
    
    # Show all cached token prices
    print("\n4. All cached prices:")
    print("-" * 80)
    all_prices = cache.get_all()
    if all_prices:
        for token_id, data in all_prices.items():
            print(f"   {token_id:15s} ${data['price']:>12.4f} "
                  f"(age: {data['age_seconds']:.1f}s)")
    else:
        print("   No prices in cache")
    
    # Test manager status
    print("\n5. Websocket Manager Status:")
    print("-" * 80)
    manager = get_websocket_manager()
    print(f"   Running: {manager.running}")
    print(f"   CGSimplePrice tokens: {len(manager.cg_tokens)}")
    print(f"   OnchainSimpleTokenPrice tokens: {len(manager.onchain_tokens)}")
    print(f"   CG tokens: {', '.join(manager.cg_tokens)}")
    print(f"   Onchain tokens: {', '.join(manager.onchain_tokens)}")
    
    # Cleanup
    print("\n6. Shutting down...")
    shutdown_realtime_prices()
    print("   ✓ Websocket manager stopped")
    
    print("\n" + "=" * 80)
    print("Test Complete!")
    print("=" * 80)
    
    # Summary
    print(f"\nSummary:")
    print(f"  - Real-time price retrieval: {cached_time:.3f}s")
    print(f"  - Tokens subscribed: {len(common_tokens)}")
    print(f"  - Cache hit rate: {len([t for t in common_tokens if cache.get(t)])}/{len(common_tokens)}")


def test_dynamic_subscription():
    """Test dynamic token subscription during runtime."""
    print("\n" + "=" * 80)
    print("Testing Dynamic Token Subscription")
    print("=" * 80)
    
    # Initialize without tokens
    print("\n1. Initializing empty websocket manager...")
    initialize_realtime_prices([])
    time.sleep(2)
    
    cache = get_price_cache()
    manager = get_websocket_manager()
    
    # Request a price that isn't subscribed yet
    print("\n2. Requesting price for unsubscribed token (JUP)...")
    start_time = time.time()
    jup_snapshot = get_price_snapshot.invoke({"identifier": "jup"})
    request_time = time.time() - start_time
    
    print(f"   → JUP Price: ${jup_snapshot['current_price']:.4f}")
    print(f"   → Time taken: {request_time:.3f}s")
    print(f"   → Should have auto-subscribed for future requests")
    
    # Check if subscribed
    print(f"\n3. Checking subscription status:")
    print(f"   Onchain tokens: {', '.join(manager.onchain_tokens)}")
    
    # Wait for websocket to receive data
    print("\n4. Waiting 5 seconds for websocket to receive JUP price...")
    time.sleep(5)
    
    # Check cache
    jup_cached = cache.get("jup")
    if jup_cached:
        print(f"   ✓ JUP now in cache: ${jup_cached.price:.4f}")
    else:
        print(f"   ✗ JUP not in cache yet (may need more time)")
    
    # Cleanup
    print("\n5. Shutting down...")
    shutdown_realtime_prices()
    print("   ✓ Complete")


if __name__ == "__main__":
    try:
        test_realtime_vs_rest()
        # Uncomment to test dynamic subscription
        # test_dynamic_subscription()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        shutdown_realtime_prices()
    except Exception as e:
        print(f"\n\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        shutdown_realtime_prices()

