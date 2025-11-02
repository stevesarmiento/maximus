"""
Live-updating display for Titan quote streaming.

Shows a table of quotes from multiple providers that updates in-place
as new quotes arrive, with the best quote highlighted.
"""

import sys
import threading
import asyncio
import json
import uuid
from enum import Enum
from typing import Optional, Dict
from dataclasses import dataclass
from maximus.utils.ui import Colors
from maximus.tools.titan_client import SwapQuotes, SwapQuote

# Session states
class SessionState(Enum):
    ACTIVE = "active"
    ACCEPTING = "accepting"
    REJECTING = "rejecting"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

# Global store for pending swap quotes (JSON mode)
_pending_swaps: Dict[str, tuple] = {}
_active_streams: Dict[str, bool] = {}  # Track active streams
_cancel_events: Dict[str, threading.Event] = {}  # Thread-safe cancellation
_session_states: Dict[str, SessionState] = {}  # Track session states
_stream_clients: Dict[str, any] = {}  # Track active client connections
_stream_tasks: Dict[str, asyncio.Task] = {}  # Track async stream tasks for cancellation


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
    from_token: str = None,
    to_token: str = None,
    amount_float: float = None,
) -> Optional[tuple[str, SwapQuote, SwapQuotes]]:
    """
    Stream quotes and display them with live updates until user confirms.
    
    Returns:
        Tuple of (provider_id, best_quote, all_quotes) or None if cancelled
    """
    # Check if we're in JSON mode (Tauri app)
    is_json_mode = not sys.stdin.isatty()
    
    if is_json_mode:
        return await _stream_quotes_json_mode(
            client, input_mint, output_mint, amount, 
            user_public_key, slippage_bps, config,
            from_token, to_token, amount_float
        )
    else:
        return await _stream_quotes_interactive(
            client, input_mint, output_mint, amount,
            user_public_key, slippage_bps, config
        )


async def _stream_quotes_json_mode(
    client,
    input_mint: str,
    output_mint: str,
    amount: int,
    user_public_key: str,
    slippage_bps: int,
    config: QuoteDisplayConfig,
    from_token: str = None,
    to_token: str = None,
    amount_float: float = None,
) -> Optional[tuple[str, SwapQuote, SwapQuotes]]:
    """Handle quote streaming in JSON mode (for Tauri app).
    
    In JSON mode, we start the stream loop as a background task and return immediately,
    storing the session for later accept/reject commands.
    """
    global _pending_swaps, _active_streams, _session_states, _stream_clients, _stream_tasks
    
    # CLEANUP: Stop all previous streams before starting new one
    for sid in list(_active_streams.keys()):
        _active_streams[sid] = False
        _session_states[sid] = SessionState.CANCELLED
        if sid in _cancel_events:
            _cancel_events[sid].set()  # Signal thread-safe cancellation
        # Close any active client connections
        if sid in _stream_clients:
            try:
                await _stream_clients[sid].close()
            except:
                pass
            _stream_clients.pop(sid, None)
    _pending_swaps.clear()
    
    # Generate unique session ID for this swap
    session_id = str(uuid.uuid4())
    _active_streams[session_id] = True
    _session_states[session_id] = SessionState.ACTIVE
    _cancel_events[session_id] = threading.Event()  # Create cancel event
    _stream_clients[session_id] = client  # Store client for cleanup
    print(json.dumps({"type": "debug", "message": f"Starting new stream {session_id[:8]}"}), flush=True)
    
    # In JSON mode, we need to start streaming but return quickly
    # The issue is that asyncio.run() will close the event loop when this function returns
    # So we need to get at least one quote, then start the stream as a background task
    # that will continue running in the background thread/process
    
    # Start the stream and wait for first quote
    try:
        # Create the stream
        quote_stream = client.request_swap_quotes(
            input_mint=input_mint,
            output_mint=output_mint,
            amount=amount,
            user_public_key=user_public_key,
            slippage_bps=slippage_bps,
        )
        
        # Wait for first quote with timeout
        try:
            first_quotes = await asyncio.wait_for(quote_stream.__anext__(), timeout=5.0)
            
            # Process and send first quote
            if first_quotes.quotes:
                formatted_quotes = []
                best_provider = None
                best_quote = None
                
                for provider_id, quote in sorted(
                    first_quotes.quotes.items(),
                    key=lambda x: x[1].out_amount,
                    reverse=True
                ):
                    if best_quote is None or quote.out_amount > best_quote.out_amount:
                        best_provider = provider_id
                        best_quote = quote
                    
                    is_best = provider_id == best_provider
                    formatted_quotes.append({
                        "provider": provider_id,
                        "route": _format_route_simple(quote.route_steps),
                        "inAmount": _format_amount_simple(quote.in_amount, config.decimals_in),
                        "outAmount": _format_amount_simple(quote.out_amount, config.decimals_out),
                        "rate": _calculate_rate_simple(quote.in_amount, quote.out_amount),
                        "isBest": is_best
                    })
                
                # Send first quote
                quote_message = {
                    "type": "swap_quote_update",
                    "session_id": session_id,
                    "quotes": formatted_quotes,
                    "symbolIn": config.symbol_in,
                    "symbolOut": config.symbol_out
                }
                print(json.dumps(quote_message), flush=True)
                
                # Store for later
                if best_quote:
                    _pending_swaps[session_id] = (
                        best_provider,
                        best_quote,
                        first_quotes,
                        from_token or config.symbol_in,
                        to_token or config.symbol_out,
                        amount_float or (amount / 10**config.decimals_in)
                    )
        except asyncio.TimeoutError:
            print(json.dumps({"type": "debug", "message": f"Timeout waiting for first quote"}), flush=True)
        except StopAsyncIteration:
            print(json.dumps({"type": "debug", "message": f"Stream ended before first quote"}), flush=True)
        
        # Now start the background stream loop
        # Since we're inside asyncio.run(), we can create a task
        # The task will run until the event loop closes, but by then we've sent the first quote
        loop = asyncio.get_event_loop()
        stream_task = loop.create_task(
            _run_stream_loop(client, session_id, quote_stream, config, from_token, to_token, amount_float, amount)
        )
        _stream_tasks[session_id] = stream_task
        
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        error_msg = {
            "type": "error",
            "error": f"Failed to start quote stream: {str(e)}",
            "details": error_detail
        }
        print(json.dumps(error_msg), flush=True)
    
    # Return None immediately - first quote sent, stream continues in background
    return None


async def _run_stream_loop(
    client,
    session_id: str,
    quote_stream,
    config: QuoteDisplayConfig,
    from_token: str = None,
    to_token: str = None,
    amount_float: float = None,
    amount: int = None,
):
    """Run the stream loop - keeps running until cancelled."""
    global _pending_swaps, _active_streams, _session_states, _stream_clients
    
    best_provider = None
    best_quote = None
    latest_quotes = None
    
    # In JSON mode, stream live quote updates until user accepts/rejects
    # This provides dynamic real-time rates like terminal mode
    # Use a timeout-based approach to check cancellation more frequently
    update_count = 0
    first_quote_sent = False
    
    try:
        while True:
            # Check state BEFORE waiting for next quote
            session_state = _session_states.get(session_id, SessionState.ACTIVE)
            if session_state != SessionState.ACTIVE:
                print(json.dumps({"type": "debug", "message": f"Stream {session_id[:8]} stopped - state is {session_state.value}"}), flush=True)
                try:
                    await client.stop_stream()
                    await client.close()
                except:
                    pass
                return None  # Exit immediately
            
            # Check cancellation flags
            cancel_event = _cancel_events.get(session_id)
            if (cancel_event and cancel_event.is_set()) or _active_streams.get(session_id) is False:
                print(json.dumps({"type": "debug", "message": f"Stream {session_id[:8]} stopped - cancelled before wait"}), flush=True)
                try:
                    await client.stop_stream()
                    await client.close()
                except:
                    pass
                return None
            
            # Try to get next quote with a short timeout so we can check state frequently
            try:
                quotes = await asyncio.wait_for(quote_stream.__anext__(), timeout=0.5)
            except asyncio.TimeoutError:
                # Timeout - check state again and continue loop
                continue
            except StopAsyncIteration:
                # Stream ended naturally
                break
            
            update_count += 1
            
            # Check state again after receiving quote
            session_state = _session_states.get(session_id, SessionState.ACTIVE)
            if session_state != SessionState.ACTIVE:
                print(json.dumps({"type": "debug", "message": f"Stream {session_id[:8]} stopped - state changed to {session_state.value} after quote"}), flush=True)
                try:
                    await client.stop_stream()
                    await client.close()
                except:
                    pass
                return None
            
            latest_quotes = quotes
            
            # Skip if we don't have any quotes yet
            if not quotes.quotes:
                await asyncio.sleep(0.1)
                continue
            
            # Find best quote
            for provider_id, quote in quotes.quotes.items():
                if best_quote is None or quote.out_amount > best_quote.out_amount:
                    best_provider = provider_id
                    best_quote = quote
            
            # Format quotes for JSON
            formatted_quotes = []
            for provider_id, quote in sorted(
                quotes.quotes.items(),
                key=lambda x: x[1].out_amount,
                reverse=True
            ):
                is_best = provider_id == best_provider
                formatted_quotes.append({
                    "provider": provider_id,
                    "route": _format_route_simple(quote.route_steps),
                    "inAmount": _format_amount_simple(quote.in_amount, config.decimals_in),
                    "outAmount": _format_amount_simple(quote.out_amount, config.decimals_out),
                    "rate": _calculate_rate_simple(quote.in_amount, quote.out_amount),
                    "isBest": is_best
                })
            
            # Only send quote update if session is still ACTIVE
            session_state = _session_states.get(session_id, SessionState.ACTIVE)
            if session_state == SessionState.ACTIVE:
                # Send quote update as JSON
                quote_message = {
                    "type": "swap_quote_update",  # Use "update" to distinguish from initial
                    "session_id": session_id,
                    "quotes": formatted_quotes,
                    "symbolIn": config.symbol_in,
                    "symbolOut": config.symbol_out
                }
                print(json.dumps(quote_message), flush=True)
                first_quote_sent = True
                
                # Update stored quote if this one has transaction data (better for execution)
                if best_quote and (best_quote.transaction or best_quote.instructions):
                    _pending_swaps[session_id] = (
                        best_provider,
                        best_quote,
                        latest_quotes,
                        from_token or config.symbol_in,
                        to_token or config.symbol_out,
                        amount_float or (amount / 10**config.decimals_in)
                    )
            else:
                # Session was cancelled/accepting/rejecting - stop immediately
                print(json.dumps({"type": "debug", "message": f"Stream {session_id[:8]} state changed to {session_state.value}, stopping"}), flush=True)
                try:
                    await client.stop_stream()
                    await client.close()
                except:
                    pass
                return
            
            # Small delay before next iteration (allows cancellation to be detected)
            await asyncio.sleep(0.1)
        
        # Store the swap session for user confirmation via commands
        # Store: (provider_id, best_quote, all_quotes, from_token, to_token, amount)
        if best_quote:
            _pending_swaps[session_id] = (
                best_provider, 
                best_quote, 
                latest_quotes, 
                from_token or config.symbol_in,
                to_token or config.symbol_out,
                amount_float or (amount / 10**config.decimals_in)
            )
        
    except asyncio.CancelledError:
        print(json.dumps({"type": "debug", "message": f"Stream {session_id[:8]} cancelled via task cancellation"}), flush=True)
        try:
            await client.stop_stream()
            await client.close()
        except:
            pass
        # Clean up on cancellation
        _active_streams.pop(session_id, None)
        _cancel_events.pop(session_id, None)
        _stream_clients.pop(session_id, None)
        _stream_tasks.pop(session_id, None)
        _session_states.pop(session_id, None)
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        error_msg = {
            "type": "error", 
            "error": f"Quote streaming failed: {str(e)}",
            "details": error_detail
        }
        print(json.dumps(error_msg), flush=True)
        # Clean up on error
        _active_streams.pop(session_id, None)
        _cancel_events.pop(session_id, None)
        _stream_clients.pop(session_id, None)
        _stream_tasks.pop(session_id, None)
        _session_states.pop(session_id, None)
        try:
            await client.stop_stream()
            await client.close()
        except:
            pass
    finally:
        # Cleanup when stream loop exits
        print(json.dumps({"type": "debug", "message": f"Stream {session_id[:8]} loop exited"}), flush=True)


async def _stream_quotes_interactive(
    client,
    input_mint: str,
    output_mint: str,
    amount: int,
    user_public_key: str,
    slippage_bps: int,
    config: QuoteDisplayConfig,
) -> Optional[tuple[str, SwapQuote, SwapQuotes]]:
    """Handle quote streaming in interactive terminal mode."""
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


def _format_route_simple(steps: list) -> str:
    """Format route steps into a readable string (simplified)."""
    if not steps:
        return "Direct"
    
    venues = []
    for step in steps[:2]:
        label = step.get("label", "Unknown")
        venues.append(label.split()[0])
    
    route = " → ".join(venues)
    if len(steps) > 2:
        route += f" +{len(steps) - 2}"
    
    return route


def _format_amount_simple(amount: int, decimals: int) -> str:
    """Format token amount with decimals (simplified)."""
    value = amount / (10 ** decimals)
    if value >= 1000:
        return f"{value:,.2f}"
    elif value >= 1:
        return f"{value:.4f}"
    else:
        return f"{value:.8f}"


def _calculate_rate_simple(in_amount: int, out_amount: int) -> str:
    """Calculate and format the exchange rate (simplified)."""
    if in_amount == 0:
        return "0.0000"
    
    rate = out_amount / in_amount
    if rate >= 1000:
        return f"{rate:,.2f}"
    elif rate >= 1:
        return f"{rate:.4f}"
    else:
        return f"{rate:.8f}"


def get_pending_swap(session_id: str) -> Optional[tuple]:
    """Retrieve a pending swap by session ID."""
    global _pending_swaps
    return _pending_swaps.get(session_id)


def set_session_state(session_id: str, state: SessionState):
    """Set the state of a swap session."""
    global _session_states
    _session_states[session_id] = state


async def stop_swap_stream(session_id: str):
    """Stop a swap stream immediately."""
    global _pending_swaps, _active_streams, _cancel_events, _session_states, _stream_clients, _stream_tasks
    
    # Set state to CANCELLED immediately to prevent any more quote outputs
    if session_id in _session_states:
        _session_states[session_id] = SessionState.CANCELLED
    
    # Signal ALL streams to stop using both flags and events
    for sid in list(_active_streams.keys()):
        _active_streams[sid] = False
        _session_states[sid] = SessionState.CANCELLED
        if sid in _cancel_events:
            _cancel_events[sid].set()  # Thread-safe signal
        
        # Cancel async task if it exists
        if sid in _stream_tasks:
            task = _stream_tasks[sid]
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            _stream_tasks.pop(sid, None)
        
        # Immediately close client connections
        if sid in _stream_clients:
            try:
                client = _stream_clients[sid]
                await client.stop_stream()
                await client.close()
            except:
                pass
            _stream_clients.pop(sid, None)
    
    # Clear all pending swaps
    _pending_swaps.clear()
    
    # Note: The stream loop will detect the event/flag and stop itself
    print(json.dumps({"type": "debug", "message": "All swap streams signaled to stop"}), flush=True)


def clear_pending_swap(session_id: str):
    """Clear a pending swap after it's been handled (sync version)."""
    global _pending_swaps, _active_streams, _cancel_events, _session_states
    
    # Set state first to prevent outputs
    _session_states[session_id] = SessionState.COMPLETED
    
    # Clear this specific session
    _pending_swaps.pop(session_id, None)
    _active_streams[session_id] = False
    if session_id in _cancel_events:
        _cancel_events[session_id].set()
    
    # Also clear any old sessions (cleanup)
    for sid in list(_active_streams.keys()):
        if sid != session_id:
            _active_streams[sid] = False
            _session_states[sid] = SessionState.CANCELLED
            if sid in _cancel_events:
                _cancel_events[sid].set()


def clear_all_swaps():
    """Clear all pending swaps and stop all active streams."""
    global _pending_swaps, _active_streams, _cancel_events, _session_states, _stream_clients, _stream_tasks
    
    # Stop all active streams using both mechanisms
    for sid in list(_active_streams.keys()):
        _active_streams[sid] = False
        _session_states[sid] = SessionState.CANCELLED
        if sid in _cancel_events:
            _cancel_events[sid].set()
        
        # Cancel async tasks
        if sid in _stream_tasks:
            task = _stream_tasks[sid]
            if not task.done():
                task.cancel()
            _stream_tasks.pop(sid, None)
        
        # Close client connections
        if sid in _stream_clients:
            try:
                # Schedule async close - note: this is sync function so we'll handle in async context
                pass  # Will be handled by async cleanup
            except:
                pass
    
    # Clear all state
    _pending_swaps.clear()
    _active_streams.clear()
    _cancel_events.clear()
    _session_states.clear()
    _stream_clients.clear()
    _stream_tasks.clear()

