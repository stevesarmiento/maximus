"""
Quick test for live prices display.
Just verifies the module loads and basic functionality works.
"""

import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from maximus.utils.live_prices import LivePriceMonitor

def test_basic_functionality():
    """Test that LivePriceMonitor can be created and fetch tokens."""
    print("Testing LivePriceMonitor basic functionality...")
    
    monitor = LivePriceMonitor(limit=5)
    
    print("✓ LivePriceMonitor created")
    
    # Fetch tokens
    print("Fetching top 5 tokens...")
    tokens = monitor.fetch_top_tokens()
    
    if not tokens:
        print("❌ Failed to fetch tokens (check COINGECKO_API_KEY)")
        return False
    
    print(f"✓ Fetched {len(tokens)} tokens")
    
    # Display token info
    print("\nTop 5 tokens:")
    for i, token in enumerate(tokens, 1):
        symbol = token.get('symbol', '').upper()
        price = token.get('current_price', 0)
        change = token.get('price_change_percentage_24h', 0)
        print(f"  {i}. {symbol:6s} ${price:>12,.2f}  {change:+.2f}%")
    
    # Test formatting functions
    print("\n✓ Price formatting works")
    print(f"  Large: {monitor.format_price(68432.21)}")
    print(f"  Medium: {monitor.format_price(204.52)}")
    print(f"  Small: {monitor.format_price(0.0001234)}")
    
    print("\n✓ Volume formatting works")
    print(f"  Billions: {monitor.format_volume(45200000000)}")
    print(f"  Millions: {monitor.format_volume(3400000)}")
    
    print("\n✅ All basic tests passed!")
    return True


if __name__ == "__main__":
    try:
        success = test_basic_functionality()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


