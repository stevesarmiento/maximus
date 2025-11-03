import uuid
import os
import sys
import shutil
import threading
import logging
import json
import argparse
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging to suppress verbose websocket errors
logging.basicConfig(
    level=logging.WARNING,
    format='%(levelname)s: %(message)s'
)
# Suppress websocket library logs unless they're errors
logging.getLogger('websockets').setLevel(logging.ERROR)
# Suppress realtime prices info logs (they're noisy at startup)
logging.getLogger('maximus.tools.realtime_prices').setLevel(logging.WARNING)

from maximus.agent import Agent
from maximus.tools.memory import clear_memories
from maximus.utils.intro import print_intro
from maximus.utils.ui import Colors
from maximus.utils.command_palette import CommandPalette

from prompt_toolkit.application import Application
from prompt_toolkit.buffer import Buffer
from prompt_toolkit.layout import Layout, HSplit, Window
from prompt_toolkit.layout.controls import BufferControl, FormattedTextControl
from prompt_toolkit.key_binding import KeyBindings
from prompt_toolkit.keys import Keys
from prompt_toolkit.styles import Style
from prompt_toolkit.formatted_text import FormattedText


def get_terminal_width():
    """Get current terminal width."""
    return shutil.get_terminal_size().columns


def strip_ansi_codes(text: str) -> str:
    """Remove ANSI color codes from text for clean output."""
    ansi_escape = re.compile(r'\x1b\[[0-9;]*m')
    return ansi_escape.sub('', text)


class AppState:
    """Application state management."""
    
    def __init__(self, session_id: str):
        self.palette = CommandPalette()
        self.session_id = session_id
        self.agent = Agent(session_id=session_id)
        self.should_exit = False
        self.processing = False
        self.pending_query = None
        self.command_message = None
        self.delegation_password = None  # Cache delegation password for session


def create_separator_line():
    """Create a separator line as formatted text."""
    width = get_terminal_width()
    return FormattedText([('class:separator', '·' * width + '\n')])


def execute_command(command_name: str, state: AppState) -> str:
    """
    Execute a command and return message.
    
    Returns:
        str: Message to display (or None)
    """
    if command_name == "/liveprices":
        return "LIVEPRICES_INTERACTIVE"
    elif command_name == "/clear":
        clear_memories(state.session_id)
        return "Memory cleared"
    elif command_name == "/balances":
        return execute_balances_command()
    elif command_name == "/transactions":
        return execute_transactions_command()
    elif command_name == "/delegate":
        return execute_delegate_command()
    elif command_name == "/export-delegate":
        return execute_export_delegate_command()
    elif command_name == "/import-delegate":
        return execute_import_delegate_command()
    elif command_name == "/revoke":
        return execute_revoke_command()
    elif command_name == "/config":
        return "Configuration panel (coming soon)"
    elif command_name == "/cost":
        return "Session cost tracking (coming soon)"
    elif command_name == "/exit":
        state.should_exit = True
        return "Goodbye!"
    return None


def execute_balances_command() -> str:
    """Execute the /balances command to show wallet balances."""
    from maximus.tools.solana import get_wallet_balances
    from maximus.utils.delegate_wallet import get_delegate_wallet, get_session_password
    from maximus.utils.ui import Colors
    
    try:
        output_lines = [f"\n{Colors.BOLD}Wallet Balances:{Colors.ENDC}\n"]
        
        # Get main wallet balances
        result = get_wallet_balances.invoke({})
        
        if result.get("success", False):
            wallets = result.get("wallets", [])
            
            for wallet in wallets:
                if "error" in wallet:
                    output_lines.append(f"{Colors.RED}Error for {wallet['wallet_label']}:{Colors.ENDC} {wallet['error']}\n")
                    continue
                
                label = wallet.get("wallet_label", "Unknown")
                address = wallet.get("wallet_address", "")
                sol_balance = wallet.get("sol_balance", 0)
                tokens = wallet.get("tokens", [])
                
                output_lines.append(f"{Colors.LIGHT_ORANGE}{label} (Main){Colors.ENDC} ({address[:8]}...{address[-8:]})")
                output_lines.append(f"  SOL: {Colors.BOLD}{sol_balance:.4f}{Colors.ENDC}")
                
                if tokens:
                    output_lines.append(f"  Tokens ({len(tokens)}):")
                    for token in tokens:
                        symbol = token.get("symbol", "UNKNOWN")
                        balance = token.get("balance", 0)
                        output_lines.append(f"    • {symbol}: {balance:,.4f}")
                else:
                    output_lines.append(f"  {Colors.DIM}No tokens found{Colors.ENDC}")
                
                output_lines.append("")
        
        # Check for delegate wallet
        delegate = get_delegate_wallet()
        if delegate.delegation_exists():
            try:
                # Try to get password from session first
                password = get_session_password()
                
                if password:
                    try:
                        delegate_keypair = delegate.load_delegate(password)
                        delegate_address = str(delegate_keypair.pubkey())
                        
                        # Get delegate wallet balance
                        delegate_result = get_wallet_balances.invoke({"wallet_address": delegate_address})
                        
                        if delegate_result.get("success") and delegate_result.get("wallets"):
                            delegate_wallet = delegate_result["wallets"][0]
                            
                            if "error" not in delegate_wallet:
                                sol_balance = delegate_wallet.get("sol_balance", 0)
                                tokens = delegate_wallet.get("tokens", [])
                                
                                # Color code based on balance (warn if low)
                                balance_color = Colors.RED if sol_balance < 0.01 else Colors.BOLD
                                
                                output_lines.append(f"{Colors.DIM}Delegate Wallet{Colors.ENDC} ({delegate_address[:8]}...{delegate_address[-8:]})")
                                output_lines.append(f"  SOL: {balance_color}{sol_balance:.4f}{Colors.ENDC}")
                                
                                if sol_balance < 0.01:
                                    output_lines.append(f"  {Colors.YELLOW}⚠️  Low balance - add SOL for transaction fees{Colors.ENDC}")
                                
                                if tokens:
                                    output_lines.append(f"  Tokens ({len(tokens)}):")
                                    for token in tokens:
                                        symbol = token.get("symbol", "UNKNOWN")
                                        balance = token.get("balance", 0)
                                        output_lines.append(f"    • {symbol}: {balance:,.4f}")
                                
                                output_lines.append("")
                    except Exception as e:
                        # Show error but with address
                        output_lines.append(f"{Colors.DIM}Delegate Wallet{Colors.ENDC}")
                        output_lines.append(f"  {Colors.RED}Error loading balance: {str(e)}{Colors.ENDC}\n")
                else:
                    # No password - show placeholder
                    output_lines.append(f"{Colors.DIM}Delegate Wallet{Colors.ENDC}")
                    output_lines.append(f"  {Colors.DIM}Balance hidden - use /delegate to view{Colors.ENDC}\n")
            
            except Exception as e:
                # Show delegate exists but can't load
                output_lines.append(f"{Colors.DIM}Delegate Wallet{Colors.ENDC}")
                output_lines.append(f"  {Colors.YELLOW}Exists (use /delegate to view details){Colors.ENDC}\n")
        
        if len(output_lines) == 1:  # Only the header
            return f"{Colors.YELLOW}No wallets found.{Colors.ENDC}\nPlease connect a wallet via the web dashboard."
        
        return "\n".join(output_lines)
    
    except Exception as e:
        return f"{Colors.RED}Error executing /balances:{Colors.ENDC} {str(e)}"


def execute_transactions_command(limit: int = 10) -> str:
    """Execute the /transactions command to show recent transactions."""
    from maximus.tools.solana import get_transaction_history
    from maximus.utils.ui import Colors
    from datetime import datetime
    
    try:
        result = get_transaction_history.invoke({"limit": limit})
        
        if not result.get("success", False):
            return f"{Colors.RED}Error:{Colors.ENDC} {result.get('error', 'Unknown error')}"
        
        transactions = result.get("transactions", [])
        wallet_label = result.get("wallet_label", "Unknown")
        wallet_address = result.get("wallet_address", "")
        
        if not transactions:
            return f"{Colors.YELLOW}No transactions found for {wallet_label}.{Colors.ENDC}"
        
        output_lines = [f"\n{Colors.BOLD}Recent Transactions for {wallet_label}:{Colors.ENDC}"]
        output_lines.append(f"{Colors.DIM}{wallet_address}{Colors.ENDC}\n")
        
        for i, tx in enumerate(transactions, 1):
            signature = tx.get("signature", "")
            status = tx.get("status", "Unknown")
            timestamp = tx.get("timestamp")
            
            # Format timestamp
            if timestamp:
                dt = datetime.fromtimestamp(timestamp)
                time_str = dt.strftime("%Y-%m-%d %H:%M:%S")
            else:
                time_str = "Unknown time"
            
            # Color status
            status_color = Colors.GREEN if status == "Success" else Colors.RED
            
            output_lines.append(f"{i}. {Colors.LIGHT_ORANGE}{signature[:16]}...{signature[-16:]}{Colors.ENDC}")
            output_lines.append(f"   Status: {status_color}{status}{Colors.ENDC} | Time: {time_str}")
            output_lines.append("")
        
        return "\n".join(output_lines)
    
    except Exception as e:
        return f"{Colors.RED}Error executing /transactions:{Colors.ENDC} {str(e)}"


def execute_delegate_command() -> str:
    """Execute the /delegate command to show delegation status."""
    from maximus.utils.delegate_wallet import get_delegate_wallet, get_session_password, set_session_password
    from maximus.utils.ui import Colors
    import sys
    
    try:
        delegate = get_delegate_wallet()
        
        if not delegate.delegation_exists():
            return f"{Colors.YELLOW}No delegation found.{Colors.ENDC}\nTo create a delegation:\n1. Visit the web dashboard at http://localhost:3000/delegate\n2. Connect your wallet and set delegation limits\n3. A delegate wallet will be created automatically"
        
        # Try to get cached password first
        password = get_session_password()
        
        # If no cached password, check if we're in interactive mode
        if not password:
            # Check if stdin is a terminal (interactive mode)
            if sys.stdin.isatty():
                from maximus.utils.password_input import get_password
                password = get_password("Enter delegation password: ")
                # Cache it for the session
                set_session_password(password)
            else:
                # In JSON/non-interactive mode without cached password
                return f"{Colors.YELLOW}Delegation exists but password not cached.{Colors.ENDC}\nPlease restart the app to re-activate delegation."
        
        # Get delegation info
        config = delegate.get_delegation_info(password)
        
        if not config:
            return f"{Colors.RED}Failed to load delegation.{Colors.ENDC}\nInvalid password or corrupted file."
        
        # Check if expired
        from datetime import datetime, timezone
        expires = datetime.fromisoformat(config.expires_at) if config.expires_at else None
        is_expired = expires and datetime.now(timezone.utc) > expires
        
        output_lines = [f"\n{Colors.BOLD}Delegation Status:{Colors.ENDC}\n"]
        
        status_color = Colors.RED if is_expired else Colors.GREEN
        status_text = "EXPIRED" if is_expired else "ACTIVE"
        
        output_lines.append(f"Status: {status_color}{status_text}{Colors.ENDC}")
        output_lines.append(f"Delegate Wallet: {Colors.LIGHT_ORANGE}{config.public_key}{Colors.ENDC}")
        output_lines.append(f"Delegated By: {Colors.DIM}{config.delegated_by}{Colors.ENDC}")
        output_lines.append(f"\n{Colors.BOLD}Limits:{Colors.ENDC}")
        output_lines.append(f"  Max SOL per transaction: {config.max_sol_per_tx}")
        output_lines.append(f"  Max tokens per transaction: {config.max_token_per_tx}")
        output_lines.append(f"\n{Colors.BOLD}Allowed Programs:{Colors.ENDC}")
        for program in config.allowed_programs:
            output_lines.append(f"  • {program}")
        
        if expires:
            output_lines.append(f"\n{Colors.BOLD}Expiry:{Colors.ENDC}")
            output_lines.append(f"  {expires.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        
        output_lines.append("")
        
        return "\n".join(output_lines)
    
    except Exception as e:
        return f"{Colors.RED}Error checking delegation.{Colors.ENDC}\n{str(e)}"


def execute_export_delegate_command() -> str:
    """Execute the /export-delegate command to show delegate private key."""
    from maximus.utils.delegate_wallet import get_delegate_wallet, get_session_password
    from maximus.utils.ui import Colors
    import sys
    
    try:
        delegate = get_delegate_wallet()
        
        if not delegate.delegation_exists():
            return f"{Colors.YELLOW}No delegation found to export.{Colors.ENDC}\nCreate a delegation first using the web dashboard at http://localhost:3000/delegate"
        
        # Try to get cached password
        password = get_session_password()
        
        # If no cached password, check if we're in interactive mode
        if not password:
            if sys.stdin.isatty():
                # Interactive mode - return special marker for interactive handler
                return "EXPORT_DELEGATE_INTERACTIVE"
            else:
                # In JSON/non-interactive mode without cached password
                return f"{Colors.YELLOW}Delegation password required.{Colors.ENDC}\nPlease unlock delegation first with the /delegate command."
        
        # Export keypair with cached password
        export_data = delegate.export_keypair(password)
        
        # Format output
        output_lines = []
        output_lines.append(f"\n{Colors.BOLD}{Colors.RED}═══ PRIVATE KEY - KEEP SECRET ═══{Colors.ENDC}\n")
        output_lines.append(f"{Colors.BOLD}Public Key:{Colors.ENDC}")
        output_lines.append(f"  {export_data['public_key']}")
        output_lines.append(f"\n{Colors.BOLD}Secret Key (Base58 - for Phantom/Solflare):{Colors.ENDC}")
        output_lines.append(f"  {export_data['secret_key_base58']}")
        output_lines.append(f"\n{Colors.YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Colors.ENDC}")
        output_lines.append(f"{Colors.YELLOW}How to import into Phantom:{Colors.ENDC}")
        output_lines.append(f"  1. Open Phantom wallet")
        output_lines.append(f"  2. Settings → Add/Connect Wallet → Import Private Key")
        output_lines.append(f"  3. Paste the Base58 key above")
        output_lines.append(f"{Colors.YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Colors.ENDC}")
        output_lines.append(f"\n{Colors.GREEN}✓{Colors.ENDC} Save this in a secure password manager!")
        output_lines.append(f"{Colors.DIM}Anyone with this key can control the delegate wallet.{Colors.ENDC}\n")
        
        return "\n".join(output_lines)
    
    except Exception as e:
        return f"{Colors.RED}Error exporting delegate.{Colors.ENDC}\n{str(e)}"


def execute_import_delegate_command() -> str:
    """Execute the /import-delegate command to import existing keypair."""
    # This command needs interactive prompts, so we return a special marker
    return "IMPORT_DELEGATE_INTERACTIVE"


def handle_export_delegate_interactive():
    """Handle /export-delegate command interactively (outside prompt_toolkit)."""
    from maximus.utils.delegate_wallet import get_delegate_wallet
    from maximus.utils.password_input import get_password
    from maximus.utils.ui import Colors
    
    try:
        delegate = get_delegate_wallet()
        
        if not delegate.delegation_exists():
            print(f"\n{Colors.YELLOW}No delegation found to export.{Colors.ENDC}\n")
            return
        
        # Confirm export
        print(f"\n{Colors.YELLOW}⚠️  WARNING: This will display your delegate wallet's private key.{Colors.ENDC}")
        print(f"{Colors.YELLOW}Only export if you want to backup or import to another wallet.{Colors.ENDC}")
        response = input(f"\nContinue? (yes/no): ")
        
        if response.lower() not in ['yes', 'y']:
            print("\nExport cancelled.\n")
            return
        
        # Ask for password
        password = get_password("\nEnter delegation password: ")
        
        # Export keypair
        export_data = delegate.export_keypair(password)
        
        print(f"\n{Colors.BOLD}{Colors.RED}═══ PRIVATE KEY - KEEP SECRET ═══{Colors.ENDC}\n")
        print(f"{Colors.BOLD}Public Key:{Colors.ENDC}")
        print(f"  {export_data['public_key']}")
        print(f"\n{Colors.BOLD}Secret Key (Base58 - for Phantom/Solflare import):{Colors.ENDC}")
        print(f"  {export_data['secret_key_base58']}")
        print(f"\n{Colors.BOLD}Secret Key (Bytes - for programmatic use):{Colors.ENDC}")
        print(f"  {export_data['secret_key_bytes'][:20]}...")
        print(f"\n{Colors.YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Colors.ENDC}")
        print(f"{Colors.YELLOW}How to import into Phantom:{Colors.ENDC}")
        print(f"  1. Open Phantom")
        print(f"  2. Settings → Add/Connect Wallet → Import Private Key")
        print(f"  3. Paste the Base58 key above")
        print(f"{Colors.YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Colors.ENDC}")
        print(f"\n{Colors.GREEN}✓{Colors.ENDC} Save this in a secure password manager!")
        print(f"{Colors.DIM}Note: Anyone with this key can control the delegate wallet.{Colors.ENDC}\n")
        
        input("Press Enter to continue...")
    
    except Exception as e:
        print(f"\n{Colors.RED}Error exporting delegate:{Colors.ENDC} {str(e)}\n")
        input("Press Enter to continue...")


def handle_import_delegate_interactive():
    """Handle /import-delegate command interactively (outside prompt_toolkit)."""
    from maximus.utils.delegate_wallet import get_delegate_wallet
    from maximus.utils.password_input import get_password
    from maximus.utils.wallet_storage import get_wallet_storage
    from maximus.utils.ui import Colors
    
    try:
        delegate = get_delegate_wallet()
        
        if delegate.delegation_exists():
            print(f"\n{Colors.YELLOW}A delegation already exists.{Colors.ENDC}")
            response = input(f"Overwrite it? (yes/no): ")
            if response.lower() not in ['yes', 'y']:
                print("\nImport cancelled.\n")
                return
            delegate.revoke_delegate()
        
        # Get main wallet for delegation
        storage = get_wallet_storage()
        wallets = storage.get_wallets()
        
        if not wallets:
            print(f"\n{Colors.RED}Error:{Colors.ENDC} No main wallet connected. Connect a wallet via web dashboard first.\n")
            input("Press Enter to continue...")
            return
        
        main_wallet = wallets[0].address
        
        # Get keypair
        print(f"\n{Colors.BOLD}Import Delegate Wallet{Colors.ENDC}")
        print(f"Enter the secret key in Base58 format (from Phantom export or /export-delegate)")
        secret_key = input(f"\nSecret Key: ").strip()
        
        # Get encryption password
        password = get_password("\nCreate password to encrypt this delegation: ")
        confirm = get_password("Confirm password: ")
        
        if password != confirm:
            print(f"\n{Colors.RED}Passwords don't match.{Colors.ENDC} Import cancelled.\n")
            input("Press Enter to continue...")
            return
        
        # Set delegation limits
        print(f"\n{Colors.BOLD}Set Delegation Limits:{Colors.ENDC}")
        max_sol = input(f"Max SOL per transaction (default 1.0): ").strip() or "1.0"
        max_tokens = input(f"Max tokens per transaction (default 100): ").strip() or "100"
        duration = input(f"Duration in hours (default 24): ").strip() or "24"
        
        # Import and save
        delegate.import_keypair(
            secret_key=secret_key,
            password=password,
            delegated_by=main_wallet,
            max_sol_per_tx=float(max_sol),
            max_token_per_tx=float(max_tokens),
            duration_hours=int(duration)
        )
        
        print(f"\n{Colors.GREEN}✓{Colors.ENDC} Delegate wallet imported successfully!\n")
        print(f"Use /delegate to view status.\n")
        input("Press Enter to continue...")
    
    except Exception as e:
        print(f"\n{Colors.RED}Error importing delegate:{Colors.ENDC} {str(e)}\n")
        input("Press Enter to continue...")


def execute_revoke_command() -> str:
    """Execute the /revoke command to revoke the current delegation."""
    # This command needs interactive prompts, so we return a special marker
    return "REVOKE_DELEGATE_INTERACTIVE"


def handle_revoke_delegate_interactive():
    """Handle /revoke command interactively (outside prompt_toolkit)."""
    from maximus.utils.delegate_wallet import get_delegate_wallet
    from maximus.utils.ui import Colors
    
    try:
        delegate = get_delegate_wallet()
        
        if not delegate.delegation_exists():
            print(f"\n{Colors.YELLOW}No delegation found to revoke.{Colors.ENDC}\n")
            input("Press Enter to continue...")
            return
        
        # Confirm revocation
        print(f"\n{Colors.YELLOW}Are you sure you want to revoke the delegation?{Colors.ENDC}")
        response = input(f"This will delete the delegate wallet from local storage. (yes/no): ")
        
        if response.lower() not in ['yes', 'y']:
            print("\nRevocation cancelled.\n")
            input("Press Enter to continue...")
            return
        
        # Revoke delegation
        delegate.revoke_delegate()
        
        print(f"\n{Colors.GREEN}✓{Colors.ENDC} Delegation revoked successfully.\n")
        print(f"The delegate wallet has been removed from local storage.")
        print(f"\n{Colors.YELLOW}Note:{Colors.ENDC} On-chain delegations for SPL tokens need to be revoked separately via the web dashboard.\n")
        input("Press Enter to continue...")
    
    except Exception as e:
        print(f"\n{Colors.RED}Error revoking delegation:{Colors.ENDC} {str(e)}\n")
        input("Press Enter to continue...")


def handle_liveprices_interactive():
    """Handle /liveprices command interactively (outside prompt_toolkit)."""
    from maximus.utils.live_prices import show_live_prices
    
    try:
        show_live_prices(limit=10)
    except Exception as e:
        from maximus.utils.ui import Colors
        print(f"\n{Colors.RED}Error displaying live prices:{Colors.ENDC} {str(e)}\n")
        input("Press Enter to continue...")


def create_application(state: AppState):
    """Create and configure the prompt_toolkit Application."""
    
    # Create input buffer
    input_buffer = Buffer(multiline=False)
    
    # Create key bindings
    kb = KeyBindings()
    
    # Track buffer changes for palette interaction
    def on_text_changed(_):
        """Monitor input buffer changes."""
        text = input_buffer.text
        
        # Expand palette when "/" is typed
        if text.startswith('/') and not state.palette.is_expanded:
            state.palette.expand()
            state.palette.filter_text = text[1:]  # Everything after /
            state.palette.selected_index = 0
        # Update filter when palette is expanded
        elif state.palette.is_expanded and text.startswith('/'):
            state.palette.filter_text = text[1:]  # Everything after /
            state.palette.selected_index = 0
        # Collapse palette when "/" is deleted
        elif state.palette.is_expanded and not text.startswith('/'):
            state.palette.collapse()
    
    input_buffer.on_text_changed += on_text_changed
    
    @kb.add(Keys.Up)
    def handle_up(event):
        """Navigate up in command palette."""
        if state.palette.is_expanded:
            state.palette.navigate_up()
    
    @kb.add(Keys.Down)
    def handle_down(event):
        """Navigate down in command palette."""
        if state.palette.is_expanded:
            state.palette.navigate_down()
    
    @kb.add(Keys.Escape)
    def handle_escape(event):
        """Collapse palette on Escape."""
        if state.palette.is_expanded:
            state.palette.collapse()
            input_buffer.text = ""
    
    @kb.add(Keys.ControlC)
    def handle_ctrl_c(event):
        """Exit gracefully on Ctrl+C."""
        state.should_exit = True
        event.app.exit()
    
    @kb.add(Keys.Enter)
    def handle_enter(event):
        """Handle Enter key - execute command or query."""
        text = input_buffer.text.strip()
        
        if state.palette.is_expanded:
            # Execute selected command
            selected_cmd = state.palette.get_selected_command()
            if selected_cmd:
                # Collapse palette and clear input
                state.palette.collapse()
                input_buffer.text = ""
                
                # Execute the command
                message = execute_command(selected_cmd.name, state)
                
                # Exit app to restart and show message
                if message:
                    state.command_message = message
                
                event.app.exit()
                return
        else:
            # Handle regular query
            if text:
                # Handle exit commands
                if text.lower() in ["exit", "quit"]:
                    state.should_exit = True
                    state.command_message = "Goodbye!"
                    try:
                        clear_memories(state.session_id, silent=True)
                    except Exception:
                        pass
                    event.app.exit()
                    return
                
                # Handle legacy commands
                if text.lower() in ["/clear", "/clear-memory"]:
                    input_buffer.text = ""
                    state.command_message = "Memory cleared"
                    clear_memories(state.session_id)
                    event.app.exit()
                    return
                
                # Store the query and exit to process with agent
                input_buffer.text = ""
                state.pending_query = text
                event.app.exit()
    
    # Define styles
    style = Style.from_dict({
        'selected': '#ffaf5f',           # Light orange text only, no background (matches logo)
        'orange': '#ffaf5f',             # Light orange (matches logo)
        'dim': '#666666',                # Dim gray
        'separator': '#666666',          # Dim separators
        'bold': 'bold',
        'prompt': '#ffffff',             # White for >> prompt
    })
    
    # Create layout
    def get_palette_content():
        """Dynamic content for palette area."""
        return state.palette.render_as_formatted_text()
    
    layout = Layout(
        HSplit([
            # Top separator
            Window(
                content=FormattedTextControl(create_separator_line),
                height=1,
            ),
            # Input area with prompt
            Window(
                content=BufferControl(
                    buffer=input_buffer,
                    focusable=True,
                ),
                height=1,
                get_line_prefix=lambda line_number, wrap_count: [('class:prompt', '>> ')],
            ),
            # Bottom separator
            Window(
                content=FormattedTextControl(create_separator_line),
                height=1,
            ),
            # Command palette area (dynamic) - now below input
            Window(
                content=FormattedTextControl(
                    get_palette_content,
                    focusable=False,
                ),
                height=lambda: 2 if not state.palette.is_expanded else len(state.palette.get_filtered_commands()) + 1,
            ),
        ])
    )
    
    # Create application
    app = Application(
        layout=layout,
        key_bindings=kb,
        style=style,
        full_screen=False,
        mouse_support=False,
    )
    
    return app, input_buffer


class JSONStatusBar:
    """Status bar that outputs JSON events for the native app."""
    
    def __init__(self):
        self.current_phase = "idle"
        self.current_message = ""
        self.details = ""
        self.is_animating = False
        self.animation_thread = None
        self._frame_idx = 0
    
    def start_phase(self, phase, message, details=""):
        """Emit status update as JSON."""
        self.current_phase = phase.value if hasattr(phase, 'value') else phase
        self.current_message = message
        self.details = details
        self.is_animating = True
        
        status = {
            "type": "status",
            "phase": self.current_phase,
            "message": message,
            "details": details
        }
        print(json.dumps(status), flush=True)
    
    def complete_phase(self, final_message="", show_completion=False):
        """Emit completion status."""
        self.is_animating = False
        
        if show_completion and final_message:
            status = {
                "type": "status",
                "phase": "complete",
                "message": final_message,
                "details": ""
            }
            print(json.dumps(status), flush=True)
        
        # Reset state
        self.current_phase = "idle"
        self.current_message = ""
        self.details = ""
    
    def error_phase(self, error_message, show_on_newline=True):
        """Emit error status."""
        self.is_animating = False
        
        status = {
            "type": "status",
            "phase": "error",
            "message": error_message,
            "details": ""
        }
        print(json.dumps(status), flush=True)
        
        # Reset state
        self.current_phase = "idle"
        self.current_message = ""
        self.details = ""
    
    def transition_to(self, phase, message, details=""):
        """Transition to a new phase."""
        self.start_phase(phase, message, details)
    
    def update_details(self, details):
        """Update details."""
        self.details = details
    
    def clear(self):
        """Clear status."""
        self.is_animating = False
        self.current_phase = "idle"
        self.current_message = ""
        self.details = ""
    
    def show_static(self, message, symbol="", color=""):
        """Show static message."""
        status = {
            "type": "status",
            "phase": "info",
            "message": message,
            "details": ""
        }
        print(json.dumps(status), flush=True)


def run_json_mode():
    """Run agent in JSON mode for programmatic access (e.g., from Tauri app)."""
    import sys
    from io import StringIO
    
    session_id = str(uuid.uuid4())
    
    # Check for pending delegation from web dashboard
    from maximus.utils.delegate_wallet import process_temp_delegation
    process_temp_delegation()
    
    # Redirect agent's status bar to JSON output
    from maximus.utils import status_bar as sb_module
    json_status_bar = JSONStatusBar()
    sb_module._global_status_bar = json_status_bar
    
    # Suppress logger output in JSON mode (we want clean JSON only)
    from maximus.utils import logger as logger_module
    
    class QuietLogger:
        """Logger that doesn't print anything in JSON mode."""
        def log_user_query(self, query): pass
        def log_task_list(self, tasks): pass
        def log_task_start(self, task): pass
        def log_task_done(self, task): pass
        def log_summary(self, answer): pass
        def _log(self, message): pass
    
    # Override the logger
    logger_module.Logger = QuietLogger
    
    agent = Agent(session_id=session_id)
    
    # Output ready signal
    print(json.dumps({"type": "ready", "session_id": session_id}), flush=True)
    
    # Read queries from stdin and output JSON responses
    for line in sys.stdin:
        try:
            query = line.strip()
            if not query:
                continue
            
            # Handle special commands
            if query == "/clear":
                clear_memories(session_id)
                response = {"type": "command", "command": "clear", "message": "💾 Memory cleared"}
            elif query in ["exit", "quit"]:
                clear_memories(session_id, silent=True)
                response = {"type": "exit", "message": "Goodbye!"}
                print(json.dumps(response), flush=True)
                break
            elif query == "/balances":
                result = execute_balances_command()
                # Strip ANSI codes for clean JSON output
                clean_result = strip_ansi_codes(result)
                response = {"type": "command_result", "command": "balances", "result": clean_result}
            elif query == "/transactions":
                result = execute_transactions_command()
                # Strip ANSI codes for clean JSON output
                clean_result = strip_ansi_codes(result)
                response = {"type": "command_result", "command": "transactions", "result": clean_result}
            elif query == "/delegate":
                result = execute_delegate_command()
                # Strip ANSI codes for clean JSON output
                clean_result = strip_ansi_codes(result)
                response = {"type": "command_result", "command": "delegate", "result": clean_result}
            elif query == "/export-delegate":
                result = execute_export_delegate_command()
                # Strip ANSI codes for clean JSON output
                clean_result = strip_ansi_codes(result)
                response = {"type": "command_result", "command": "export_delegate", "result": clean_result}
            elif query.startswith("/set-delegation-password "):
                # Extract password from command
                password = query.replace("/set-delegation-password ", "").strip()
                from maximus.utils.delegate_wallet import set_session_password, get_delegate_wallet
                
                # Verify password is valid by trying to decrypt delegation
                delegate = get_delegate_wallet()
                if delegate.delegation_exists():
                    config = delegate.get_delegation_info(password)
                    if config:
                        set_session_password(password)
                        response = {"type": "command_result", "command": "set_delegation_password", "result": "✅ Delegation password set successfully"}
                    else:
                        response = {"type": "error", "error": "Invalid password"}
                else:
                    response = {"type": "error", "error": "No delegation found"}
            else:
                # Regular query - run through agent
                try:
                    answer = agent.run(query)
                    response = {"type": "answer", "query": query, "answer": answer}
                except Exception as e:
                    response = {"type": "error", "query": query, "error": str(e)}
            
            # Output JSON response
            print(json.dumps(response), flush=True)
            
        except Exception as e:
            error_response = {"type": "error", "error": str(e)}
            print(json.dumps(error_response), flush=True)


def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Maximus - Autonomous Solana Agent")
    parser.add_argument('--json', action='store_true', help='Run in JSON mode for programmatic access')
    args = parser.parse_args()
    
    # Run in JSON mode if requested
    if args.json:
        run_json_mode()
        return
    
    # Generate a unique session ID for this CLI session
    session_id = str(uuid.uuid4())
    
    # Print intro with session info
    print_intro(session_id)
    
    # Check for pending delegation from web dashboard
    from maximus.utils.delegate_wallet import process_temp_delegation
    process_temp_delegation()
    
    # Initialize state
    state = AppState(session_id)
    
    # Main interaction loop
    while not state.should_exit:
        try:
            # Create and run application
            app, input_buffer = create_application(state)
            
            # Run the application
            app.run()
            
            # Handle command messages
            if state.command_message:
                # Handle interactive commands
                if state.command_message == "LIVEPRICES_INTERACTIVE":
                    handle_liveprices_interactive()
                    state.command_message = None
                    continue
                elif state.command_message == "EXPORT_DELEGATE_INTERACTIVE":
                    handle_export_delegate_interactive()
                    state.command_message = None
                    continue
                elif state.command_message == "IMPORT_DELEGATE_INTERACTIVE":
                    handle_import_delegate_interactive()
                    state.command_message = None
                    continue
                elif state.command_message == "REVOKE_DELEGATE_INTERACTIVE":
                    handle_revoke_delegate_interactive()
                    state.command_message = None
                    continue
                
                # Regular command messages
                print(f"\n{state.command_message}\n")
                state.command_message = None
                
                # If should exit, break the loop
                if state.should_exit:
                    break
                
                # Otherwise continue to next iteration
                continue
            
            # Check if we have a query to process
            if state.pending_query:
                query = state.pending_query
                state.pending_query = None
                
                # Check if this might be a transaction query and delegation exists
                transaction_keywords = ['send', 'transfer', 'swap', 'pay']
                might_need_delegation = any(keyword in query.lower() for keyword in transaction_keywords)
                
                if might_need_delegation:
                    from maximus.utils.delegate_wallet import get_delegate_wallet, set_session_password, get_session_password
                    delegate = get_delegate_wallet()
                    
                    if delegate.delegation_exists() and not get_session_password():
                        # Prompt for delegation password before starting agent
                        from maximus.utils.password_input import get_password
                        print(f"\n{Colors.LIGHT_ORANGE}🔐 This query may require transaction signing{Colors.ENDC}")
                        password = get_password("Enter delegation password: ")
                        if password:
                            set_session_password(password)
                            state.delegation_password = password
                        print()
                
                # Run the agent (it will print the user query itself)
                try:
                    state.agent.run(query)
                    print()
                except Exception as e:
                    print(f"{Colors.RED}Error:{Colors.ENDC} {str(e)}\n")
        
        except (KeyboardInterrupt, EOFError):
            # Handle Ctrl+C gracefully
            print("\nGoodbye!")
            try:
                clear_memories(session_id, silent=True)
            except Exception:
                pass
            # Clear cached delegation password
            from maximus.utils.delegate_wallet import clear_session_password
            clear_session_password()
            break
    
    # Clean up on exit
    if not state.should_exit:
        try:
            clear_memories(session_id, silent=True)
        except Exception:
            pass
    
    # Clear cached delegation password
    from maximus.utils.delegate_wallet import clear_session_password
    clear_session_password()


def print_separator_line():
    """Print a full-width dotted line separator in light orange."""
    width = get_terminal_width()
    print(f"{Colors.LIGHT_ORANGE}{'·' * width}{Colors.ENDC}")


if __name__ == "__main__":
    main()
