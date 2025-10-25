import os
from typing import Optional, List, Dict, Any
from solana.rpc.api import Client
from solders.pubkey import Pubkey
from solders.signature import Signature
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed


class SolanaClient:
    """Wrapper for Solana RPC client with Helius integration."""
    
    # Class-level cache for token metadata
    # Using class-level instead of @lru_cache on instance methods prevents memory leaks
    _metadata_cache: Dict[str, Dict[str, Any]] = {}
    _cache_max_size = 1000
    
    def __init__(self, rpc_url: Optional[str] = None):
        """
        Initialize Solana client.
        
        Args:
            rpc_url: Optional RPC URL. If not provided, reads from HELIUS_RPC_URL env var.
        """
        self.rpc_url = rpc_url or os.getenv("HELIUS_RPC_URL")
        
        if not self.rpc_url:
            raise ValueError(
                "HELIUS_RPC_URL environment variable not set. "
                "Please add your Helius RPC endpoint to .env"
            )
        
        self.client = Client(self.rpc_url)
    
    def get_balance(self, address: str) -> float:
        """
        Get SOL balance for a wallet address.
        
        Args:
            address: Solana wallet public key as string
            
        Returns:
            Balance in SOL (converted from lamports)
        """
        try:
            pubkey = Pubkey.from_string(address)
            response = self.client.get_balance(pubkey)
            
            if response.value is None:
                return 0.0
            
            # Convert lamports to SOL (1 SOL = 1e9 lamports)
            return response.value / 1e9
        except Exception as e:
            raise Exception(f"Failed to get balance for {address}: {str(e)}")
    
    def get_token_accounts(self, address: str) -> List[Dict[str, Any]]:
        """
        Get all SPL token accounts for a wallet.
        
        Args:
            address: Solana wallet public key as string
            
        Returns:
            List of token account information
        """
        try:
            from solana.rpc.types import TokenAccountOpts
            from solders.rpc.config import RpcTokenAccountsFilterMint
            
            pubkey = Pubkey.from_string(address)
            
            # Token program ID
            token_program_id = Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
            
            # Get token accounts by owner using correct API
            opts = TokenAccountOpts(program_id=token_program_id)
            response = self.client.get_token_accounts_by_owner_json_parsed(
                pubkey,
                opts
            )
            
            if not response.value:
                return []
            
            token_accounts = []
            for account in response.value:
                # Parse the account data
                account_data = account.account.data
                
                # The data should be parsed JSON
                if isinstance(account_data, dict):
                    parsed = account_data.get('parsed', {})
                    info = parsed.get('info', {})
                    
                    token_amount = info.get('tokenAmount', {})
                    token_accounts.append({
                        'mint': info.get('mint'),
                        'owner': info.get('owner'),
                        'amount': token_amount.get('uiAmountString', '0'),
                        'decimals': token_amount.get('decimals', 0),
                        'ui_amount': token_amount.get('uiAmount', 0),
                    })
            
            return token_accounts
        except Exception as e:
            raise Exception(f"Failed to get token accounts for {address}: {str(e)}")
    
    def get_token_metadata(self, mint_address: str) -> Dict[str, Any]:
        """
        Get token metadata from Helius DAS API with class-level caching.
        
        Args:
            mint_address: Token mint address
            
        Returns:
            Token metadata including symbol, name, decimals
        """
        # Check cache first
        if mint_address in self._metadata_cache:
            return self._metadata_cache[mint_address]
        
        # Fetch and cache
        return self._fetch_token_metadata(mint_address)
    
    def _fetch_token_metadata(self, mint_address: str) -> Dict[str, Any]:
        """
        Internal method to fetch token metadata from Helius DAS API.
        
        Args:
            mint_address: Token mint address
            
        Returns:
            Token metadata including symbol, name, decimals
        """
        result = None
        
        try:
            # Use Helius DAS API for token metadata
            response = requests.post(
                self.rpc_url,
                json={
                    "jsonrpc": "2.0",
                    "id": "helius-token-metadata",
                    "method": "getAsset",
                    "params": {
                        "id": mint_address
                    }
                },
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                api_result = data.get('result', {})
                
                # Try to extract metadata
                content = api_result.get('content', {})
                metadata = content.get('metadata', {})
                
                result = {
                    'symbol': metadata.get('symbol', 'UNKNOWN'),
                    'name': metadata.get('name', 'Unknown Token'),
                    'decimals': api_result.get('token_info', {}).get('decimals', 0),
                    'mint': mint_address,
                }
            else:
                # Fallback: return basic info
                result = {
                    'symbol': 'UNKNOWN',
                    'name': 'Unknown Token',
                    'decimals': 0,
                    'mint': mint_address,
                }
        except Exception:
            # Return fallback metadata if API call fails
            result = {
                'symbol': 'UNKNOWN',
                'name': 'Unknown Token',
                'decimals': 0,
                'mint': mint_address,
            }
        
        # Cache the result with size limit and FIFO eviction
        if len(self._metadata_cache) >= self._cache_max_size:
            # Simple FIFO eviction - remove oldest entry
            self._metadata_cache.pop(next(iter(self._metadata_cache)))
        self._metadata_cache[mint_address] = result
        
        return result
    
    def get_token_metadata_batch(self, mint_addresses: List[str], max_workers: int = 10) -> Dict[str, Dict[str, Any]]:
        """
        Get token metadata for multiple mints in parallel with caching.
        
        Args:
            mint_addresses: List of token mint addresses
            max_workers: Maximum number of concurrent requests (default: 10)
            
        Returns:
            Dictionary mapping mint address to metadata
        """
        if not mint_addresses:
            return {}
        
        metadata_map = {}
        
        # Use ThreadPoolExecutor for parallel fetching
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks - get_token_metadata uses class-level cache
            future_to_mint = {
                executor.submit(self.get_token_metadata, mint): mint 
                for mint in mint_addresses
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_mint):
                mint = future_to_mint[future]
                try:
                    metadata = future.result()
                    metadata_map[mint] = metadata
                except Exception as e:
                    # Fall back to empty metadata for failed mints
                    metadata_map[mint] = {
                        'symbol': 'UNKNOWN',
                        'name': 'Unknown Token',
                        'decimals': 0,
                        'mint': mint,
                    }
        
        return metadata_map
    
    def get_recent_transactions(self, address: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent transactions for a wallet.
        
        Args:
            address: Solana wallet public key as string
            limit: Maximum number of transactions to return
            
        Returns:
            List of transaction signatures and basic info
        """
        try:
            from solana.rpc.commitment import Confirmed
            
            pubkey = Pubkey.from_string(address)
            
            # Get signatures for address with proper configuration
            response = self.client.get_signatures_for_address(
                pubkey,
                limit=limit,
                commitment=Confirmed
            )
            
            if not response.value:
                return []
            
            transactions = []
            for sig_info in response.value:
                transactions.append({
                    'signature': str(sig_info.signature),
                    'slot': sig_info.slot,
                    'block_time': sig_info.block_time,
                    'err': sig_info.err,
                    'memo': getattr(sig_info, 'memo', None),
                })
            
            return transactions
        except Exception as e:
            raise Exception(f"Failed to get transactions for {address}: {str(e)}")
    
    def get_transaction_details(self, signature: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific transaction.
        
        Args:
            signature: Transaction signature
            
        Returns:
            Transaction details or None if not found
        """
        try:
            from solana.rpc.commitment import Confirmed
            
            sig = Signature.from_string(signature)
            response = self.client.get_transaction(
                sig,
                max_supported_transaction_version=0,
                commitment=Confirmed
            )
            
            if not response.value:
                return None
            
            tx = response.value
            return {
                'signature': signature,
                'slot': tx.slot,
                'block_time': tx.block_time,
            }
        except Exception as e:
            raise Exception(f"Failed to get transaction details for {signature}: {str(e)}")


# Singleton instance
_solana_client = None


def get_solana_client() -> SolanaClient:
    """Get the global Solana client instance."""
    global _solana_client
    if _solana_client is None:
        _solana_client = SolanaClient()
    return _solana_client

