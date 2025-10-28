import json
import os
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from solders.keypair import Keypair
import base64


class DelegationConfig:
    """Configuration for a delegation."""
    
    def __init__(
        self,
        public_key: str,
        secret_key: bytes,
        delegated_by: str,
        max_sol_per_tx: float = 1.0,
        max_token_per_tx: float = 100.0,
        allowed_programs: list = None,
        created_at: str = None,
        expires_at: str = None
    ):
        self.public_key = public_key
        self.secret_key = secret_key
        self.delegated_by = delegated_by
        self.max_sol_per_tx = max_sol_per_tx
        self.max_token_per_tx = max_token_per_tx
        self.allowed_programs = allowed_programs or ["Titan"]
        self.created_at = created_at or datetime.now(timezone.utc).isoformat()
        self.expires_at = expires_at
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "publicKey": self.public_key,
            "secretKey": list(self.secret_key),
            "delegatedBy": self.delegated_by,
            "maxSolPerTx": self.max_sol_per_tx,
            "maxTokenPerTx": self.max_token_per_tx,
            "allowedPrograms": self.allowed_programs,
            "createdAt": self.created_at,
            "expiresAt": self.expires_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DelegationConfig":
        """Create from dictionary."""
        return cls(
            public_key=data["publicKey"],
            secret_key=bytes(data["secretKey"]),
            delegated_by=data["delegatedBy"],
            max_sol_per_tx=data.get("maxSolPerTx", 1.0),
            max_token_per_tx=data.get("maxTokenPerTx", 100.0),
            allowed_programs=data.get("allowedPrograms", ["Titan"]),
            created_at=data.get("createdAt"),
            expires_at=data.get("expiresAt"),
        )


class DelegateWallet:
    """Manages encrypted delegate wallet storage and operations."""
    
    def __init__(self, config_dir: Optional[str] = None):
        """
        Initialize delegate wallet manager.
        
        Args:
            config_dir: Optional custom config directory. Defaults to ~/.maximus
        """
        if config_dir:
            self.config_dir = Path(config_dir)
        else:
            self.config_dir = Path.home() / ".maximus"
        
        self.delegate_file = self.config_dir / "delegate_key.enc"
        self.salt_file = self.config_dir / ".delegate_salt"
        self._ensure_config_dir()
    
    def _ensure_config_dir(self):
        """Ensure the config directory exists."""
        self.config_dir.mkdir(parents=True, exist_ok=True)
    
    def _derive_key(self, password: str) -> bytes:
        """
        Derive encryption key from password using PBKDF2.
        
        Args:
            password: User password
            
        Returns:
            Derived encryption key
        """
        # Get or create salt
        if self.salt_file.exists():
            with open(self.salt_file, 'rb') as f:
                salt = f.read()
        else:
            salt = os.urandom(16)
            with open(self.salt_file, 'wb') as f:
                f.write(salt)
        
        # Derive key using PBKDF2HMAC
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=480000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return key
    
    def generate_delegate(self) -> Keypair:
        """
        Generate a new delegate keypair.
        
        Returns:
            New Keypair for delegation
        """
        return Keypair()
    
    def save_delegate(
        self,
        keypair: Keypair,
        password: str,
        delegated_by: str,
        max_sol_per_tx: float = 1.0,
        max_token_per_tx: float = 100.0,
        duration_hours: int = 24
    ) -> DelegationConfig:
        """
        Encrypt and save delegate keypair.
        
        Args:
            keypair: Delegate keypair to save
            password: Password for encryption
            delegated_by: Public key of main wallet that delegated
            max_sol_per_tx: Maximum SOL per transaction
            max_token_per_tx: Maximum tokens per transaction
            duration_hours: How long delegation is valid
            
        Returns:
            DelegationConfig with delegation details
        """
        from datetime import timedelta
        
        # Create delegation config
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=duration_hours)).isoformat()
        
        config = DelegationConfig(
            public_key=str(keypair.pubkey()),
            secret_key=bytes(keypair),
            delegated_by=delegated_by,
            max_sol_per_tx=max_sol_per_tx,
            max_token_per_tx=max_token_per_tx,
            expires_at=expires_at
        )
        
        # Derive encryption key from password
        key = self._derive_key(password)
        fernet = Fernet(key)
        
        # Encrypt the config
        config_json = json.dumps(config.to_dict())
        encrypted = fernet.encrypt(config_json.encode())
        
        # Save encrypted data
        with open(self.delegate_file, 'wb') as f:
            f.write(encrypted)
        
        return config
    
    def load_delegate(self, password: str) -> Keypair:
        """
        Load and decrypt delegate keypair.
        
        Args:
            password: Password for decryption
            
        Returns:
            Decrypted Keypair
            
        Raises:
            FileNotFoundError: If no delegation exists
            ValueError: If delegation is expired or invalid password
        """
        if not self.delegate_file.exists():
            raise FileNotFoundError("No delegation found. Please create a delegation first.")
        
        # Derive encryption key
        key = self._derive_key(password)
        fernet = Fernet(key)
        
        try:
            # Read and decrypt
            with open(self.delegate_file, 'rb') as f:
                encrypted = f.read()
            
            decrypted = fernet.decrypt(encrypted)
            config_data = json.loads(decrypted)
            config = DelegationConfig.from_dict(config_data)
            
            # Check if delegation is expired
            if config.expires_at:
                expires = datetime.fromisoformat(config.expires_at)
                if datetime.now(timezone.utc) > expires:
                    raise ValueError("Delegation has expired. Please create a new delegation.")
            
            # Return keypair
            return Keypair.from_bytes(config.secret_key)
        
        except Exception as e:
            if "Invalid" in str(e):
                raise ValueError("Invalid password or corrupted delegation file.")
            raise
    
    def get_delegation_info(self, password: str) -> Optional[DelegationConfig]:
        """
        Get delegation information without loading the full keypair.
        
        Args:
            password: Password for decryption
            
        Returns:
            DelegationConfig or None if no delegation exists
        """
        if not self.delegate_file.exists():
            return None
        
        try:
            key = self._derive_key(password)
            fernet = Fernet(key)
            
            with open(self.delegate_file, 'rb') as f:
                encrypted = f.read()
            
            decrypted = fernet.decrypt(encrypted)
            config_data = json.loads(decrypted)
            return DelegationConfig.from_dict(config_data)
        
        except Exception:
            return None
    
    def is_valid(self, password: str) -> bool:
        """
        Check if delegation exists and is valid.
        
        Args:
            password: Password for decryption
            
        Returns:
            True if delegation exists and is not expired
        """
        try:
            config = self.get_delegation_info(password)
            if not config:
                return False
            
            if config.expires_at:
                expires = datetime.fromisoformat(config.expires_at)
                return datetime.now(timezone.utc) <= expires
            
            return True
        except Exception:
            return False
    
    def revoke_delegate(self):
        """Remove delegation from local storage."""
        if self.delegate_file.exists():
            self.delegate_file.unlink()
        if self.salt_file.exists():
            self.salt_file.unlink()
    
    def delegation_exists(self) -> bool:
        """Check if a delegation file exists."""
        return self.delegate_file.exists()
    
    def export_keypair(self, password: str) -> Dict[str, Any]:
        """
        Export the delegate keypair for backup.
        
        Args:
            password: Password to decrypt the keypair
            
        Returns:
            Dictionary with keypair in multiple formats
        """
        import base58
        
        keypair = self.load_delegate(password)
        config = self.get_delegation_info(password)
        
        # Get secret key bytes
        secret_bytes = bytes(keypair)
        
        # Convert to base58
        secret_base58 = base58.b58encode(secret_bytes).decode('ascii')
        
        return {
            "public_key": str(keypair.pubkey()),
            "secret_key_base58": secret_base58,
            "secret_key_bytes": list(secret_bytes),
            "delegation_info": config.to_dict() if config else None,
        }
    
    def import_keypair(
        self,
        secret_key: str,
        password: str,
        delegated_by: str,
        max_sol_per_tx: float = 1.0,
        max_token_per_tx: float = 100.0,
        duration_hours: int = 24
    ):
        """
        Import an existing keypair as a delegation.
        
        Args:
            secret_key: Secret key in base58 format
            password: Password to encrypt with
            delegated_by: Main wallet address
            max_sol_per_tx: Maximum SOL per transaction
            max_token_per_tx: Maximum tokens per transaction
            duration_hours: Delegation duration
        """
        import base58
        
        # Create keypair from base58 string
        secret_bytes = base58.b58decode(secret_key)
        keypair = Keypair.from_bytes(secret_bytes)
        
        # Save as delegation
        return self.save_delegate(
            keypair=keypair,
            password=password,
            delegated_by=delegated_by,
            max_sol_per_tx=max_sol_per_tx,
            max_token_per_tx=max_token_per_tx,
            duration_hours=duration_hours
        )


# Singleton instance
_delegate_wallet = None
_session_password = None


def set_session_password(password: str):
    """Set the delegation password for the current session."""
    global _session_password
    _session_password = password


def get_session_password() -> Optional[str]:
    """Get the cached delegation password for the current session."""
    global _session_password
    return _session_password


def clear_session_password():
    """Clear the cached delegation password."""
    global _session_password
    _session_password = None


def get_delegate_wallet() -> DelegateWallet:
    """Get the global delegate wallet instance."""
    global _delegate_wallet
    if _delegate_wallet is None:
        _delegate_wallet = DelegateWallet()
    return _delegate_wallet


def process_temp_delegation() -> bool:
    """
    Check for and process a temporary delegation file from the web dashboard.
    This file contains encrypted data that needs to be decrypted.
    
    Returns:
        True if a temp file was processed, False otherwise
    """
    from pathlib import Path
    import json
    import os
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    
    config_dir = Path.home() / ".maximus"
    temp_file = config_dir / "delegate_temp.json"
    
    if not temp_file.exists():
        return False
    
    try:
        # Get encryption key from environment
        encryption_key_hex = os.getenv('DELEGATION_ENCRYPTION_KEY')
        if not encryption_key_hex:
            print("⚠️  DELEGATION_ENCRYPTION_KEY not set. Cannot decrypt delegation.")
            return False
        
        encryption_key = bytes.fromhex(encryption_key_hex)
        
        # Read temp file
        with open(temp_file, 'r') as f:
            data = json.load(f)
        
        # Decrypt secret key
        encrypted_secret = data.get('encryptedSecretKey', {})
        secret_ciphertext = bytes.fromhex(encrypted_secret['data'])
        secret_iv = bytes.fromhex(encrypted_secret['iv'])
        secret_tag = bytes.fromhex(encrypted_secret['authTag'])
        
        # AES-GCM decryption for secret key
        aesgcm = AESGCM(encryption_key)
        secret_plaintext = aesgcm.decrypt(
            secret_iv,
            secret_ciphertext + secret_tag,
            None  # no additional authenticated data
        )
        secret_key_list = json.loads(secret_plaintext.decode('utf-8'))
        
        # Decrypt password
        encrypted_password = data.get('encryptedPassword', {})
        password_ciphertext = bytes.fromhex(encrypted_password['data'])
        password_iv = bytes.fromhex(encrypted_password['iv'])
        password_tag = bytes.fromhex(encrypted_password['authTag'])
        
        # AES-GCM decryption for password
        password_plaintext = aesgcm.decrypt(
            password_iv,
            password_ciphertext + password_tag,
            None
        )
        password = password_plaintext.decode('utf-8')
        
        # Extract other data
        delegated_by = data.get('delegatedBy', '')
        max_sol_per_tx = data.get('maxSolPerTx', 1.0)
        max_token_per_tx = data.get('maxTokenPerTx', 100.0)
        duration_hours = 24  # Default
        
        # Calculate duration from expiry if available
        if 'expiresAt' in data and 'createdAt' in data:
            from datetime import datetime
            expires = datetime.fromisoformat(data['expiresAt'].replace('Z', '+00:00'))
            created = datetime.fromisoformat(data['createdAt'].replace('Z', '+00:00'))
            duration_hours = int((expires - created).total_seconds() / 3600)
        
        # Create keypair from decrypted secret key
        secret_key_bytes = bytes(secret_key_list)
        keypair = Keypair.from_bytes(secret_key_bytes)
        
        # Save encrypted delegation using user's password
        delegate = get_delegate_wallet()
        delegate.save_delegate(
            keypair=keypair,
            password=password,
            delegated_by=delegated_by,
            max_sol_per_tx=max_sol_per_tx,
            max_token_per_tx=max_token_per_tx,
            duration_hours=duration_hours
        )
        
        # Cache the password for this session
        set_session_password(password)
        
        # Delete temp file
        temp_file.unlink()
        
        # Check if we're in JSON mode (no tty)
        import sys
        if not sys.stdin.isatty():
            # JSON mode - output as JSON
            import json
            notification = {
                "type": "delegation_activated",
                "delegate_public_key": str(keypair.pubkey()),
                "max_sol_per_tx": max_sol_per_tx,
                "max_token_per_tx": max_token_per_tx,
                "duration_hours": duration_hours
            }
            print(json.dumps(notification), flush=True)
        else:
            # Interactive mode - pretty print
            print(f"✅ Delegation activated! Delegate wallet: {str(keypair.pubkey())[:8]}...{str(keypair.pubkey())[-8:]}")
            print(f"   Max SOL per transaction: {max_sol_per_tx}")
            print(f"   Max tokens per transaction: {max_token_per_tx}")
            print(f"   Duration: {duration_hours} hours")
            print(f"\nUse /delegate to view status anytime.\n")
        
        return True
    
    except Exception as e:
        # Check if we're in JSON mode (no tty)
        import sys
        if not sys.stdin.isatty():
            # JSON mode - output as JSON
            import json
            error_msg = {
                "type": "delegation_error",
                "error": str(e)
            }
            print(json.dumps(error_msg), flush=True)
        else:
            # Interactive mode - pretty print
            print(f"⚠️  Failed to process delegation: {str(e)}")
            import traceback
            traceback.print_exc()
        # Don't delete temp file if processing failed
        return False


