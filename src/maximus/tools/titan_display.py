"""
Live-updating display for Titan quote streaming.

Shows a table of quotes from multiple providers that updates in-place
as new quotes arrive, with the best quote highlighted.
"""

import sys
import threading
import asyncio
from typing import Optional, Dict
from dataclasses import dataclass
from maximus.utils.ui import Colors
from maximus.tools.titan_client import SwapQuotes, SwapQuote


@dataclass
class QuoteDisplayConfig:
    """Configuration for quote display."""
    decimals_in: int = 6
    decimals_out: int = 6
    symbol_in: str = "TOKEN"
    symbol_out: str = "TOKEN"


class LiveQuoteDisplay:
    """
    Live-updating table display for streaming quotes.
    
    Updates in-place without scrolling, showing quotes from multiple
    providers with real-time price updates.
    """
    
    def __init__(self, config: QuoteDisplayConfig):
        self.config = config
        self.current_quotes: Optional[SwapQuotes] = None
        self.is_running = False
        self.user_confirmed = False
        self._lock = threading.Lock()
        self._input_thread: Optional[threading.Thread] = None
        
    def _format_amount(self, amount: int, decimals: int) -> str:
        """Format token amount with decimals."""
        value = amount / (10 ** decimals)
        if value >= 1000:
            return f"{value:,.2f}"
        elif value >= 1:
            return f"{value:.4f}"
        else:
            return f"{value:.8f}"
    
    def _format_route(self, steps: list) -> str:
        """Format route steps into a readable string."""
        if not steps:
            return "Direct"
        
        # Show first few venues in the route
        venues = []
        for step in steps[:3]:
            label = step.get("label", "Unknown")
            venues.append(label.split()[0])  # Take first word
        
        route = " → ".join(venues)
        if len(steps) > 3:
            route += f" +{len(steps) - 3}"
        
        return route
    
    def _calculate_rate(self, in_amount: int, out_amount: int) -> str:
        """Calculate and format the exchange rate."""
        if in_amount == 0:
            return "0.0000"
        
        rate = out_amount / in_amount
        if rate >= 1000:
            return f"{rate:,.2f}"
        elif rate >= 1:
            return f"{rate:.4f}"
        else:
            return f"{rate:.8f}"
    
    def _render_table(self) -> str:
        """Render the current quotes as a table."""
        if not self.current_quotes or not self.current_quotes.quotes:
            return f"{Colors.YELLOW}⏳{Colors.ENDC} Waiting for quotes..."
        
        # Find best quote (highest out_amount for ExactIn)
        best_provider = None
        best_out = 0
        for provider, quote in self.current_quotes.quotes.items():
            if quote.out_amount > best_out:
                best_out = quote.out_amount
                best_provider = provider
        
        # Build table
        lines = []
        
        # Header
        lines.append(f"\n{Colors.BOLD}{Colors.LIGHT_ORANGE}╭─ Live Quotes{Colors.ENDC}")
        lines.append(
            f"{Colors.LIGHT_ORANGE}│{Colors.ENDC} "
            f"{Colors.DIM}Provider{' ' * 8} Route{' ' * 15} "
            f"In {self.config.symbol_in}{' ' * 8} Out {self.config.symbol_out}{' ' * 8} Rate{Colors.ENDC}"
        )
        lines.append(f"{Colors.LIGHT_ORANGE}│{Colors.ENDC} {Colors.DIM}{'─' * 75}{Colors.ENDC}")
        
        # Sort providers by out_amount (best first)
        sorted_quotes = sorted(
            self.current_quotes.quotes.items(),
            key=lambda x: x[1].out_amount,
            reverse=True
        )
        
        # Quote rows
        for provider, quote in sorted_quotes:
            is_best = provider == best_provider
            color = Colors.GREEN if is_best else Colors.WHITE
            prefix = "★" if is_best else " "
            
            # Format columns
            provider_name = provider[:15].ljust(15)
            route = self._format_route(quote.route_steps)[:20].ljust(20)
            in_amt = self._format_amount(quote.in_amount, self.config.decimals_in).rjust(12)
            out_amt = self._format_amount(quote.out_amount, self.config.decimals_out).rjust(12)
            rate = self._calculate_rate(quote.in_amount, quote.out_amount).rjust(10)
            
            line = (
                f"{Colors.LIGHT_ORANGE}│{Colors.ENDC} {color}{prefix} "
                f"{provider_name} {route} {in_amt} {out_amt} {rate}{Colors.ENDC}"
            )
            lines.append(line)
        
        # Footer with instruction
        lines.append(f"{Colors.LIGHT_ORANGE}│{Colors.ENDC}")
        lines.append(
            f"{Colors.LIGHT_ORANGE}╰{'─' * 75}{Colors.ENDC}"
        )
        lines.append(
            f"\n{Colors.DIM}Press {Colors.BOLD}Enter{Colors.ENDC}{Colors.DIM} "
            f"to execute best quote, or {Colors.BOLD}Ctrl+C{Colors.ENDC}{Colors.DIM} to cancel{Colors.ENDC}"
        )
        
        return "\n".join(lines)
    
    def _clear_display(self, num_lines: int):
        """Clear the display by moving cursor up and clearing lines."""
        for _ in range(num_lines):
            sys.stdout.write("\033[F")  # Move cursor up
            sys.stdout.write("\033[K")  # Clear line
    
    def _wait_for_enter(self):
        """Wait for user to press Enter in a separate thread."""
        try:
            input()
            with self._lock:
                self.user_confirmed = True
                self.is_running = False
        except:
            pass
    
    def update_quotes(self, quotes: SwapQuotes):
        """Update the displayed quotes."""
        with self._lock:
            self.current_quotes = quotes
    
    def start(self):
        """Start the display."""
        with self._lock:
            self.is_running = True
            self.user_confirmed = False
        
        # Start thread to wait for Enter key
        self._input_thread = threading.Thread(target=self._wait_for_enter, daemon=True)
        self._input_thread.start()
    
    def stop(self):
        """Stop the display."""
        with self._lock:
            self.is_running = False
    
    def render(self):
        """Render the current state to the terminal."""
        table = self._render_table()
        
        # Count lines for clearing later
        num_lines = table.count('\n') + 1
        
        # Print the table
        sys.stdout.write(table)
        sys.stdout.flush()
        
        return num_lines
    
    def render_update(self, last_num_lines: int):
        """Update the display in-place."""
        if last_num_lines > 0:
            self._clear_display(last_num_lines)
        
        return self.render()


async def stream_quotes_with_display(
    client,
    input_mint: str,
    output_mint: str,
    amount: int,
    user_public_key: str,
    slippage_bps: int,
    config: QuoteDisplayConfig,
) -> Optional[tuple[str, SwapQuote, SwapQuotes]]:
    """
    Stream quotes and display them with live updates until user confirms.
    
    Returns:
        Tuple of (provider_id, best_quote, all_quotes) or None if cancelled
    """
    display = LiveQuoteDisplay(config)
    display.start()
    
    best_provider = None
    best_quote = None
    latest_quotes = None
    last_num_lines = 0
    
    try:
        # Initial render
        last_num_lines = display.render()
        
        # Stream quotes
        quote_stream = client.request_swap_quotes(
            input_mint=input_mint,
            output_mint=output_mint,
            amount=amount,
            user_public_key=user_public_key,
            slippage_bps=slippage_bps,
        )
        
        async for quotes in quote_stream:
            # Update display
            display.update_quotes(quotes)
            latest_quotes = quotes
            
            # Find best quote
            for provider_id, quote in quotes.quotes.items():
                if best_quote is None or quote.out_amount > best_quote.out_amount:
                    best_provider = provider_id
                    best_quote = quote
            
            # Render update
            last_num_lines = display.render_update(last_num_lines)
            
            # Check if user confirmed
            if display.user_confirmed:
                await client.stop_stream()
                break
            
            # Small delay to avoid overwhelming the terminal
            await asyncio.sleep(0.1)
        
        # Clear display
        if last_num_lines > 0:
            display._clear_display(last_num_lines)
        
        if display.user_confirmed and best_quote:
            # Show final selection
            out_formatted = display._format_amount(
                best_quote.out_amount,
                config.decimals_out
            )
            print(
                f"{Colors.GREEN}✓{Colors.ENDC} Selected {Colors.BOLD}{best_provider}{Colors.ENDC} "
                f"quote: {out_formatted} {config.symbol_out}"
            )
            return (best_provider, best_quote, latest_quotes)
        
        return None
    
    except KeyboardInterrupt:
        # User cancelled with Ctrl+C
        display.stop()
        if last_num_lines > 0:
            display._clear_display(last_num_lines)
        print(f"\n{Colors.YELLOW}Swap cancelled{Colors.ENDC}")
        return None
    
    finally:
        display.stop()

