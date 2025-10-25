import sys
import tty
import termios
from typing import Optional


def get_password_with_asterisks(prompt: str = "Password: ") -> str:
    """
    Get password input with asterisks displayed.
    
    Args:
        prompt: The prompt to display
        
    Returns:
        The password string
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
            
            # Handle printable characters
            elif char >= ' ' and char <= '~':
                password.append(char)
                sys.stdout.write('*')
                sys.stdout.flush()
        
    finally:
        # Restore terminal settings
        termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
    
    return ''.join(password)


def get_password(prompt: str = "Password: ", show_asterisks: bool = True) -> str:
    """
    Get password input.
    
    Args:
        prompt: The prompt to display
        show_asterisks: If True, shows asterisks. If False, hides input completely.
        
    Returns:
        The password string
    """
    if show_asterisks:
        return get_password_with_asterisks(prompt)
    else:
        import getpass
        return getpass.getpass(prompt)

