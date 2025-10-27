"""
Live price monitoring dashboard for top cryptocurrencies.
Displays a real-time updating grid of prices using websocket data.
"""

import time
import sys
import os
from typing import List, Dict, Optional
from datetime import datetime
from maximus.tools.api import call_api
from maximus.tools.realtime_prices import get_price_cache, get_websocket_manager
from maximus.utils.ui import Colors


class LivePriceMonitor:
    """Monitors and displays live cryptocurrency prices in a grid."""
    
    def __init__(self, limit: int = 10):
        self.limit = limit
        self.tokens: List[Dict] = []
        self.running = False
        self.cache = get_price_cache()
        self.manager = get_websocket_manager()
        self.refresh_count = 0
        self.last_refresh = time.time()
    
    def fetch_top_tokens(self) -> List[Dict]:
        """Fetch top tokens by market cap from CoinGecko."""
        try:
            data = call_api(
                "/coins/markets",
                params={
                    "vs_currency": "usd",
                    "order": "market_cap_desc",
                    "per_page": self.limit,
                    "page": 1,
                    "sparkline": "false",
                    "locale": "en"
                }
            )
            return data
        except Exception as e:
            print(f"{Colors.RED}Error fetching top tokens:{Colors.ENDC} {e}")
            return []
    
    def subscribe_tokens(self, tokens: List[Dict]):
        """Subscribe all tokens to websocket for real-time updates."""
        for token in tokens:
            coin_id = token.get("id")
            if coin_id:
                # Subscribe via CGSimplePrice (works for most tokens)
                self.manager.subscribe_cg_token(coin_id)
    
    def get_live_price(self, coin_id: str, fallback_price: float) -> tuple[float, float, bool]:
        """
        Get live price from cache or use fallback.
        Returns: (price, age_seconds, is_live)
        """
        cached = self.cache.get(coin_id)
        if cached:
            age = time.time() - cached.received_at
            return cached.price, age, True
        return fallback_price, -1, False
    
    def format_price(self, price: float) -> str:
        """Format price with appropriate decimal places."""
        if price >= 1000:
            return f"${price:,.2f}"
        elif price >= 1:
            return f"${price:.4f}"
        elif price >= 0.01:
            return f"${price:.6f}"
        else:
            return f"${price:.8f}"
    
    def format_change(self, change_pct: Optional[float]) -> str:
        """Format 24h change with color and arrow."""
        if change_pct is None:
            return f"{Colors.DIM}N/A{Colors.ENDC}      "
        
        if change_pct > 0:
            color = Colors.GREEN
            arrow = "▲"
        elif change_pct < 0:
            color = Colors.RED
            arrow = "▼"
        else:
            color = Colors.DIM
            arrow = "→"
        
        return f"{color}{arrow} {change_pct:+.2f}%{Colors.ENDC}"
    
    def format_volume(self, volume: Optional[float]) -> str:
        """Format volume in human-readable format."""
        if volume is None:
            return "N/A"
        
        if volume >= 1_000_000_000:
            return f"${volume/1_000_000_000:.1f}B"
        elif volume >= 1_000_000:
            return f"${volume/1_000_000:.0f}M"
        elif volume >= 1_000:
            return f"${volume/1_000:.0f}K"
        else:
            return f"${volume:.0f}"
    
    def format_age(self, age_seconds: float, is_live: bool) -> str:
        """Format data age indicator."""
        if not is_live:
            return f"{Colors.DIM}REST{Colors.ENDC}"
        
        if age_seconds < 2:
            return f"{Colors.GREEN}{age_seconds:.1f}s ⚡{Colors.ENDC}"
        elif age_seconds < 10:
            return f"{Colors.LIGHT_ORANGE}{age_seconds:.1f}s ⚡{Colors.ENDC}"
        else:
            return f"{Colors.YELLOW}{age_seconds:.1f}s{Colors.ENDC}"
    
    def clear_screen(self):
        """Clear terminal screen."""
        print("\033[2J\033[H", end="")
    
    def render_header(self):
        """Render the dashboard header."""
        # Count live vs REST prices
        live_count = sum(1 for token in self.tokens if self.cache.get(token.get("id")))
        rest_count = len(self.tokens) - live_count
        
        # Calculate uptime
        uptime = int(time.time() - self.last_refresh) if self.refresh_count == 0 else 0
        
        print(f"\n{Colors.BOLD}╔{'═'*78}╗{Colors.ENDC}")
        
        # First line: Title
        title = f" {Colors.RED}🔴 LIVE PRICES{Colors.ENDC} - Top {self.limit} Tokens"
        print(f"{Colors.BOLD}║{Colors.ENDC}{title}{' ' * (78 - len('🔴 LIVE PRICES') - len(f' - Top {self.limit} Tokens') - 1)}{Colors.BOLD}║{Colors.ENDC}")
        
        # Second line: Stats
        stats = f" {Colors.GREEN}⚡ {live_count} live{Colors.ENDC} | {Colors.DIM}{rest_count} REST{Colors.ENDC} | Refresh #{self.refresh_count}"
        stats_plain = f" ⚡ {live_count} live | {rest_count} REST | Refresh #{self.refresh_count}"
        padding = 78 - len(stats_plain) - 2
        print(f"{Colors.BOLD}║{Colors.ENDC}{stats}{' ' * padding}{Colors.BOLD}║{Colors.ENDC}")
        
        print(f"{Colors.BOLD}╠{'═'*78}╣{Colors.ENDC}")
        print(f"{Colors.BOLD}║{Colors.ENDC}  # {'Symbol':<8} {'Price':<16} {'24h Change':<18} {'Volume':<12} {'Updated':<10}{Colors.BOLD}║{Colors.ENDC}")
        print(f"{Colors.BOLD}╟{'─'*78}╢{Colors.ENDC}")
    
    def render_row(self, rank: int, token: Dict):
        """Render a single token row."""
        coin_id = token.get("id", "")
        symbol = token.get("symbol", "").upper()
        fallback_price = token.get("current_price", 0)
        change_24h = token.get("price_change_percentage_24h")
        volume = token.get("total_volume")
        
        # Get live price from cache
        price, age, is_live = self.get_live_price(coin_id, fallback_price)
        
        # Format data
        price_str = self.format_price(price)
        change_str = self.format_change(change_24h)
        volume_str = self.format_volume(volume)
        age_str = self.format_age(age, is_live)
        
        # Render row
        print(f"{Colors.BOLD}║{Colors.ENDC} {rank:2d}  {symbol:<8} {price_str:<16} {change_str:<28} {volume_str:<12} {age_str:<18}{Colors.BOLD}║{Colors.ENDC}")
    
    def render_footer(self):
        """Render the dashboard footer."""
        print(f"{Colors.BOLD}╚{'═'*78}╝{Colors.ENDC}")
        print(f"\n{Colors.DIM}Press Ctrl+C to exit | Updates every 0.3s | ⚡ = Real-time websocket data{Colors.ENDC}\n")
    
    def render_dashboard(self):
        """Render the complete dashboard."""
        self.clear_screen()
        self.refresh_count += 1
        self.render_header()
        
        for i, token in enumerate(self.tokens, 1):
            self.render_row(i, token)
        
        self.render_footer()
    
    def start(self):
        """Start the live price monitor."""
        print(f"\n{Colors.LIGHT_ORANGE}Fetching top {self.limit} tokens...{Colors.ENDC}")
        
        # Check if CoinGecko API key is configured (needed for websockets)
        if not os.getenv("COINGECKO_API_KEY"):
            print(f"{Colors.YELLOW}⚠{Colors.ENDC}  {Colors.DIM}CoinGecko API key not found - websocket streaming disabled{Colors.ENDC}")
        
        # Fetch top tokens
        self.tokens = self.fetch_top_tokens()
        
        if not self.tokens:
            print(f"{Colors.RED}Failed to fetch tokens. Exiting.{Colors.ENDC}\n")
            return
        
        print(f"{Colors.GREEN}✓{Colors.ENDC} Fetched {len(self.tokens)} tokens")
        print(f"{Colors.LIGHT_ORANGE}Starting websocket manager...{Colors.ENDC}")
        
        # Start the websocket manager if not already running
        if not self.manager.running:
            self.manager.start()
            time.sleep(0.5)  # Give it a moment to initialize
        
        print(f"{Colors.GREEN}✓{Colors.ENDC} Websocket manager started")
        print(f"{Colors.LIGHT_ORANGE}Subscribing to websocket feeds...{Colors.ENDC}")
        
        # Subscribe to websockets
        self.subscribe_tokens(self.tokens)
        
        print(f"{Colors.GREEN}✓{Colors.ENDC} Subscribed to real-time updates")
        print(f"{Colors.YELLOW}⚠{Colors.ENDC}  Waiting for websocket connections (10s)...")
        
        # Wait with countdown to let websockets connect and receive data
        for i in range(10, 0, -1):
            # Check how many are live
            live_count = sum(1 for token in self.tokens if self.cache.get(token.get("id")))
            print(f"\r   {i}s remaining... ({live_count}/{len(self.tokens)} prices streaming) ", end="", flush=True)
            time.sleep(1)
        
        # Check final connection status
        final_live_count = sum(1 for token in self.tokens if self.cache.get(token.get("id")))
        
        if final_live_count == 0:
            print(f"\r{Colors.YELLOW}⚠{Colors.ENDC}  No live websocket connections established{' ' * 40}")
            print(f"{Colors.DIM}   Using REST API data (updated every refresh){Colors.ENDC}\n")
        else:
            print(f"\r{Colors.GREEN}✓{Colors.ENDC} Ready! {final_live_count}/{len(self.tokens)} tokens streaming live{' ' * 30}\n")
        
        # Start live monitoring
        self.running = True
        self.last_refresh = time.time()
        time.sleep(0.5)
        
        try:
            while self.running:
                self.render_dashboard()
                time.sleep(0.3)  # Update every 300ms for smoother display
        
        except KeyboardInterrupt:
            self.stop()
    
    def stop(self):
        """Stop the live price monitor."""
        self.running = False
        self.clear_screen()
        print(f"\n{Colors.LIGHT_ORANGE}Cleaning up...{Colors.ENDC}")
        
        # Unsubscribe from all tokens
        for token in self.tokens:
            coin_id = token.get("id")
            if coin_id:
                self.manager.unsubscribe_cg_token(coin_id)
        
        print(f"{Colors.GREEN}✓{Colors.ENDC} Live price monitor stopped\n")


def show_live_prices(limit: int = 10):
    """
    Display live cryptocurrency prices in a real-time updating grid.
    
    Args:
        limit: Number of top tokens to display (default: 10)
    """
    monitor = LivePriceMonitor(limit=limit)
    monitor.start()


if __name__ == "__main__":
    # For standalone testing
    show_live_prices(25)

