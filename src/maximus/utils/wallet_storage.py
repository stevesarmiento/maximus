import json
import os
from pathlib import Path
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class WalletConfig(BaseModel):
    """Model for a stored wallet configuration."""
    address: str = Field(description="Solana wallet public key address")
    label: Optional[str] = Field(default=None, description="User-friendly label for the wallet")
    added_at: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Timestamp when wallet was added")


class WalletStorage:
    """Manages wallet configuration storage."""
    
    def __init__(self, config_dir: Optional[str] = None):
        """
        Initialize wallet storage.
        
        Args:
            config_dir: Optional custom config directory. Defaults to ~/.maximus
        """
        if config_dir:
            self.config_dir = Path(config_dir)
        else:
            self.config_dir = Path.home() / ".maximus"
        
        self.config_file = self.config_dir / "wallets.json"
        self._ensure_config_dir()
    
    def _ensure_config_dir(self):
        """Ensure the config directory exists."""
        self.config_dir.mkdir(parents=True, exist_ok=True)
    
    def _read_config(self) -> dict:
        """Read the wallet configuration file."""
        if not self.config_file.exists():
            return {"wallets": []}
        
        try:
            with open(self.config_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {"wallets": []}
    
    def _write_config(self, config: dict):
        """Write the wallet configuration file."""
        with open(self.config_file, 'w') as f:
            json.dump(config, f, indent=2)
    
    def get_wallets(self) -> List[WalletConfig]:
        """Get all stored wallet configurations."""
        config = self._read_config()
        return [WalletConfig(**wallet) for wallet in config.get("wallets", [])]
    
    def add_wallet(self, address: str, label: Optional[str] = None) -> WalletConfig:
        """
        Add a new wallet to the configuration.
        
        Args:
            address: Solana wallet public key
            label: Optional user-friendly label
            
        Returns:
            The created WalletConfig
        """
        config = self._read_config()
        wallets = config.get("wallets", [])
        
        # Check if wallet already exists
        if any(w.get("address") == address for w in wallets):
            raise ValueError(f"Wallet {address} already exists")
        
        # Create new wallet config
        wallet = WalletConfig(address=address, label=label)
        wallets.append(wallet.model_dump(exclude_none=True))
        
        config["wallets"] = wallets
        self._write_config(config)
        
        return wallet
    
    def remove_wallet(self, address: str) -> bool:
        """
        Remove a wallet from the configuration.
        
        Args:
            address: Solana wallet public key to remove
            
        Returns:
            True if wallet was removed, False if not found
        """
        config = self._read_config()
        wallets = config.get("wallets", [])
        
        original_count = len(wallets)
        wallets = [w for w in wallets if w.get("address") != address]
        
        if len(wallets) == original_count:
            return False
        
        config["wallets"] = wallets
        self._write_config(config)
        
        return True
    
    def get_wallet(self, address: str) -> Optional[WalletConfig]:
        """Get a specific wallet by address."""
        wallets = self.get_wallets()
        return next((w for w in wallets if w.address == address), None)
    
    def update_wallet_label(self, address: str, label: str) -> bool:
        """
        Update the label for a wallet.
        
        Args:
            address: Solana wallet public key
            label: New label
            
        Returns:
            True if updated, False if wallet not found
        """
        config = self._read_config()
        wallets = config.get("wallets", [])
        
        for wallet in wallets:
            if wallet.get("address") == address:
                wallet["label"] = label
                config["wallets"] = wallets
                self._write_config(config)
                return True
        
        return False
    
    def clear_wallets(self):
        """Remove all stored wallets."""
        self._write_config({"wallets": []})


# Singleton instance
_wallet_storage = None


def get_wallet_storage() -> WalletStorage:
    """Get the global wallet storage instance."""
    global _wallet_storage
    if _wallet_storage is None:
        _wallet_storage = WalletStorage()
    return _wallet_storage

