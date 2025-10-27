import os
from pathlib import Path

try:
    import tomli
except ImportError:
    import tomllib as tomli

def get_version():
    """Get version from pyproject.toml"""
    try:
        # Get path to pyproject.toml (3 levels up from this file)
        project_root = Path(__file__).parent.parent.parent.parent
        pyproject_path = project_root / "pyproject.toml"
        
        with open(pyproject_path, "rb") as f:
            data = tomli.load(f)
            return data["project"]["version"]
    except (FileNotFoundError, KeyError):
        return "0.1.0"

def check_api_status():
    """Check if API keys are configured."""
    openai_key = os.getenv("OPENAI_API_KEY")
    coingecko_key = os.getenv("COINGECKO_API_KEY")
    titan_key = os.getenv("TITAN_API_TOKEN")
    realtime_enabled = os.getenv("REALTIME_PRICE_ENABLED", "true").lower() == "true"
    
    statuses = []
    
    # Check OpenAI API key for Intelligence
    if openai_key and len(openai_key) > 0:
        statuses.append(("Intelligence", " ✓", "\033[92m", False))  # Green
    else:
        statuses.append(("Intelligence", " ✗", "\033[91m", False))  # Red
    
    # Check OpenAI API key for Memory
    if openai_key and len(openai_key) > 0:
        statuses.append(("Memory", " ✓", "\033[92m", False))  # Green
    else:
        statuses.append(("Memory", " ✗", "\033[91m", False))  # Red
    
    # Check CoinGecko API key
    if coingecko_key and len(coingecko_key) > 0:
        statuses.append(("Market Data", " ✓", "\033[92m", False))  # Green
    else:
        statuses.append(("Market Data", " ✗", "\033[91m", False))  # Red
    
    # Check WebSocket streaming (if CoinGecko key exists and realtime enabled)
    if coingecko_key and realtime_enabled:
        statuses.append(("WebSocket", " ✓", "\033[92m", False))  # Green - connects in background
    
    # Check Titan API token (for token swaps)
    if titan_key and len(titan_key) > 0:
        statuses.append(("Token Swapping", " ✓", "\033[92m", False))  # Green
    else:
        statuses.append(("Token Swapping", " ✗ (disabled)", "\033[93m", False))  # Yellow
    
    return statuses

def print_intro(session_id: str = None):
    """Display the welcome screen with compact logo."""
    # ANSI color codes
    LIGHT_ORANGE = "\033[38;5;215m"
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    GREEN = "\033[92m"
    
    # Clear screen effect with some spacing
    print("\n" * 2)
    
    version = get_version()
    
    # Logo options
    # Icon logo (compact)
    icon_logo = f"""{BOLD}{LIGHT_ORANGE} █▄█▄█{RESET}  {BOLD}MAXIMUS{RESET} {DIM}v{version}{RESET}
{BOLD}{LIGHT_ORANGE} █ ▄ █{RESET}  {DIM}Autonomous agent for onchain asset analysis and transaction execution{RESET}
{BOLD}{LIGHT_ORANGE}     {RESET}   """
    
    # Full logo (with full text)
#     logo = f"""{BOLD}{LIGHT_ORANGE} █▄█▄█ ▄▀█ ▀▄▀ █ █▄█▄█ █ █ ▄▀█{RESET}  {BOLD}MAXIMUS{RESET} {DIM}v{version}{RESET}
# {BOLD}{LIGHT_ORANGE} █ ▄ █ █▀█ █░█ █ █ ▄ █ █▄█ ▄▄█{RESET}  {DIM}Autonomous agent for onchain asset analysis and transaction execution{RESET}"""
    
    print(icon_logo)
    print()
    
    # Session info
    if session_id:
        print(f"{GREEN} ✓{RESET} {DIM}Session initialized (ID: {session_id[:8]}){RESET}")
    
    # API connection status
    api_statuses = check_api_status()
    for api_name, symbol, color, is_async in api_statuses:
        print(f"{color}{symbol}{RESET} {DIM}{api_name}{RESET}")
    
    print()


