import sys
import getpass
from typing import Optional

# Try to import POSIX-specific modules
try:
    import tty
    import termios
    IS_POSIX = True
except ImportError:
    IS_POSIX = False

# Try to import Windows-specific module
try:
    import msvcrt
    IS_WINDOWS = True
except ImportError:
    IS_WINDOWS = False


def _get_password_posix(prompt: str) -> str:
    """
    POSIX implementation of password input with asterisks.
    Uses tty and termios for terminal control.
    """
    print(prompt, end='', flush=True)
    
    password = []
    
    # Save terminal settings
    fd = sys.stdin.fileno()
    old_settings = termios.tcgetattr(fd)
    
    try:
        # Set terminal to raw mode
        tty.setraw(fd)
        
        while True:
            char = sys.stdin.read(1)
            
            # Handle Enter/Return
            if char in ('\r', '\n'):
                print()  # New line
                break
            
            # Handle Backspace (both ASCII 127 and 8)
            elif char in ('\x7f', '\x08'):
                if password:
                    password.pop()
                    # Erase the asterisk
                    sys.stdout.write('\b \b')
                    sys.stdout.flush()
            
            # Handle Ctrl+C
            elif char == '\x03':
                print()
                raise KeyboardInterrupt
            
            # Handle Ctrl+D (EOF)
            elif char == '\x04':
                print()
                break
            
            # Handle printable characters (Unicode-safe: accepts accents, emoji, etc.)
            elif char.isprintable():
                password.append(char)
                sys.stdout.write('*')
                sys.stdout.flush()
        
    finally:
        # Restore terminal settings
        termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
    
    return ''.join(password)


def _get_password_windows(prompt: str) -> str:
    """
    Windows implementation of password input with asterisks.
    Uses msvcrt.getch() for character-by-character input.
    """
    print(prompt, end='', flush=True)
    
    password = []
    
    try:
        while True:
            # Get a single character
            char = msvcrt.getch()
            
            # Handle Enter/Return (CR)
            if char in (b'\r', b'\n'):
                print()  # New line
                break
            
            # Handle Backspace
            elif char in (b'\x08', b'\x7f'):
                if password:
                    password.pop()
                    # Erase the asterisk
                    sys.stdout.write('\b \b')
                    sys.stdout.flush()
            
            # Handle Ctrl+C
            elif char == b'\x03':
                print()
                raise KeyboardInterrupt
            
            # Handle Ctrl+D or Ctrl+Z (EOF on Windows)
            elif char in (b'\x04', b'\x1a'):
                print()
                break
            
            # Handle printable characters
            else:
                try:
                    # Decode the byte to a character
                    decoded_char = char.decode('utf-8', errors='ignore')
                    if decoded_char and decoded_char.isprintable():
                        password.append(decoded_char)
                        sys.stdout.write('*')
                        sys.stdout.flush()
                except (UnicodeDecodeError, AttributeError):
                    # Skip characters that can't be decoded
                    pass
    
    except KeyboardInterrupt:
        print()
        raise
    
    return ''.join(password)


def _get_password_fallback(prompt: str) -> str:
    """
    Fallback implementation using getpass.getpass.
    This is used when neither POSIX nor Windows-specific modules are available.
    """
    return getpass.getpass(prompt)


def get_password_with_asterisks(prompt: str = "Password: ") -> str:
    """
    Get password input with asterisks displayed.
    
    This function is cross-platform:
    - On POSIX systems (Linux, macOS), uses tty/termios
    - On Windows, uses msvcrt.getch()
    - Falls back to getpass.getpass() if neither is available
    
    Args:
        prompt: The prompt to display
        
    Returns:
        The password string
        
    Raises:
        KeyboardInterrupt: If user presses Ctrl+C
    """
    if IS_POSIX:
        return _get_password_posix(prompt)
    elif IS_WINDOWS:
        return _get_password_windows(prompt)
    else:
        # Fallback to getpass if neither implementation is available
        return _get_password_fallback(prompt)


def get_password(prompt: str = "Password: ", show_asterisks: bool = True) -> str:
    """
    Get password input.
    
    Args:
        prompt: The prompt to display
        show_asterisks: If True, shows asterisks. If False, hides input completely.
        
    Returns:
        The password string
        
    Raises:
        KeyboardInterrupt: If user presses Ctrl+C
    """
    if show_asterisks:
        return get_password_with_asterisks(prompt)
    else:
        return getpass.getpass(prompt)

