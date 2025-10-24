from langchain.tools import tool
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from maximus.tools.solana_client import get_solana_client
from maximus.utils.wallet_storage import get_wallet_storage


####################################
# Tools
####################################


class WalletBalancesInput(BaseModel):
    """Input for get_wallet_balances."""
    wallet_address: Optional[str] = Field(
        default=None,
        description="Optional specific wallet address to query. If not provided, queries all approved wallets."
    )
    include_zero_balances: bool = Field(
        default=False,
        description="Whether to include tokens with zero balance in the results."
    )


@tool(args_schema=WalletBalancesInput)
def get_wallet_balances(
    wallet_address: Optional[str] = None,
    include_zero_balances: bool = False
) -> dict:
    """
    Get SOL and SPL token balances for approved Solana wallets.
    
    This tool fetches the current balance of SOL (native token) and all SPL tokens
    for wallets that have been approved via the web dashboard.
    
    If wallet_address is provided, queries only that specific wallet.
    Otherwise, queries all approved wallets from the configuration.
    
    Returns detailed balance information including:
    - SOL balance
    - SPL token balances with metadata (symbol, name, amount)
    - Token mint addresses
    
    Use this when users ask about:
    - "What's in my wallet?"
    - "Show my balances"
    - "What tokens do I have?"
    - "How much SOL do I have?"
    """
    try:
        client = get_solana_client()
        storage = get_wallet_storage()
        
        # Determine which wallets to query
        if wallet_address:
            wallets = [{"address": wallet_address, "label": "Specified Wallet"}]
        else:
            wallet_configs = storage.get_wallets()
            if not wallet_configs:
                return {
                    "error": "No approved wallets found. Please connect a wallet via the web dashboard.",
                    "wallets": []
                }
            wallets = [{"address": w.address, "label": w.label or w.address[:8]} for w in wallet_configs]
        
        results = []
        
        for wallet in wallets:
            address = wallet["address"]
            label = wallet["label"]
            
            try:
                # Get SOL balance
                sol_balance = client.get_balance(address)
                
                # Get SPL token accounts
                token_accounts = client.get_token_accounts(address)
                
                # Filter accounts based on balance and collect mints
                filtered_accounts = []
                mints_to_fetch = []
                
                for account in token_accounts:
                    ui_amount = account.get('ui_amount', 0)
                    
                    # Skip zero balance tokens if requested
                    if not include_zero_balances and ui_amount == 0:
                        continue
                    
                    mint = account.get('mint')
                    if mint:
                        mints_to_fetch.append(mint)
                    filtered_accounts.append(account)
                
                # Batch fetch metadata for all mints
                metadata_map = client.get_token_metadata_batch(mints_to_fetch)
                
                # Build tokens list using metadata mapping
                tokens = []
                for account in filtered_accounts:
                    mint = account.get('mint')
                    metadata = metadata_map.get(mint, {
                        'symbol': 'UNKNOWN',
                        'name': 'Unknown Token',
                        'decimals': 0,
                        'mint': mint,
                    })
                    
                    tokens.append({
                        'symbol': metadata.get('symbol', 'UNKNOWN'),
                        'name': metadata.get('name', 'Unknown Token'),
                        'mint': mint,
                        'balance': account.get('ui_amount', 0),
                        'decimals': account.get('decimals', 0),
                    })
                
                results.append({
                    'wallet_address': address,
                    'wallet_label': label,
                    'sol_balance': sol_balance,
                    'token_count': len(tokens),
                    'tokens': tokens,
                })
            
            except Exception as e:
                results.append({
                    'wallet_address': address,
                    'wallet_label': label,
                    'error': str(e),
                })
        
        return {
            "success": True,
            "wallets": results,
            "total_wallets": len(results),
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to fetch wallet balances: {str(e)}",
            "wallets": []
        }


class TransactionHistoryInput(BaseModel):
    """Input for get_transaction_history."""
    wallet_address: Optional[str] = Field(
        default=None,
        description="Optional specific wallet address to query. If not provided, queries the first approved wallet."
    )
    limit: int = Field(
        default=10,
        description="Maximum number of recent transactions to fetch. Default is 10."
    )


@tool(args_schema=TransactionHistoryInput)
def get_transaction_history(
    wallet_address: Optional[str] = None,
    limit: int = 10
) -> dict:
    """
    Get recent transaction history for a Solana wallet.
    
    Fetches the most recent transactions for an approved wallet address.
    Returns transaction signatures, timestamps, status, and basic details.
    
    If wallet_address is not provided, queries the first approved wallet.
    
    Use this when users ask about:
    - "Show my recent transactions"
    - "What were my last transactions?"
    - "Transaction history"
    - "Recent activity on my wallet"
    """
    try:
        client = get_solana_client()
        storage = get_wallet_storage()
        
        # Determine which wallet to query
        if wallet_address:
            address = wallet_address
            label = "Specified Wallet"
        else:
            wallet_configs = storage.get_wallets()
            if not wallet_configs:
                return {
                    "error": "No approved wallets found. Please connect a wallet via the web dashboard.",
                    "transactions": []
                }
            address = wallet_configs[0].address
            label = wallet_configs[0].label or address[:8]
        
        # Fetch transaction signatures
        transactions = client.get_recent_transactions(address, limit=limit)
        
        # Format transactions for display
        formatted_txs = []
        for tx in transactions:
            formatted_txs.append({
                'signature': tx['signature'],
                'slot': tx['slot'],
                'timestamp': tx['block_time'],
                'status': 'Failed' if tx['err'] else 'Success',
                'memo': tx.get('memo'),
            })
        
        return {
            "success": True,
            "wallet_address": address,
            "wallet_label": label,
            "transaction_count": len(formatted_txs),
            "transactions": formatted_txs,
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to fetch transaction history: {str(e)}",
            "transactions": []
        }


class TokenAccountsInput(BaseModel):
    """Input for get_token_accounts."""
    wallet_address: Optional[str] = Field(
        default=None,
        description="Optional specific wallet address to query. If not provided, queries all approved wallets."
    )


@tool(args_schema=TokenAccountsInput)
def get_token_accounts(wallet_address: Optional[str] = None) -> dict:
    """
    Get all SPL token accounts for approved Solana wallets.
    
    Returns detailed information about all token accounts including:
    - Token mint addresses
    - Token metadata (symbol, name)
    - Current balances
    - Decimals
    
    This is a more detailed version of get_wallet_balances that includes
    all token accounts regardless of balance.
    
    If wallet_address is provided, queries only that specific wallet.
    Otherwise, queries all approved wallets.
    
    Use this for technical queries about:
    - Token account details
    - All tokens (including zero balance)
    - Token mint addresses
    """
    try:
        client = get_solana_client()
        storage = get_wallet_storage()
        
        # Determine which wallets to query
        if wallet_address:
            wallets = [{"address": wallet_address, "label": "Specified Wallet"}]
        else:
            wallet_configs = storage.get_wallets()
            if not wallet_configs:
                return {
                    "error": "No approved wallets found. Please connect a wallet via the web dashboard.",
                    "wallets": []
                }
            wallets = [{"address": w.address, "label": w.label or w.address[:8]} for w in wallet_configs]
        
        results = []
        
        for wallet in wallets:
            address = wallet["address"]
            label = wallet["label"]
            
            try:
                # Get SPL token accounts
                token_accounts = client.get_token_accounts(address)
                
                # Collect all mints for batch fetching
                mints_to_fetch = [
                    account.get('mint') 
                    for account in token_accounts 
                    if account.get('mint')
                ]
                
                # Batch fetch metadata for all mints
                metadata_map = client.get_token_metadata_batch(mints_to_fetch)
                
                # Build accounts list using metadata mapping
                accounts = []
                for account in token_accounts:
                    mint = account.get('mint')
                    metadata = metadata_map.get(mint, {
                        'symbol': 'UNKNOWN',
                        'name': 'Unknown Token',
                        'decimals': 0,
                        'mint': mint,
                    }) if mint else {}
                    
                    accounts.append({
                        'mint': mint,
                        'symbol': metadata.get('symbol', 'UNKNOWN'),
                        'name': metadata.get('name', 'Unknown Token'),
                        'balance': account.get('ui_amount', 0),
                        'decimals': account.get('decimals', 0),
                        'owner': account.get('owner'),
                    })
                
                results.append({
                    'wallet_address': address,
                    'wallet_label': label,
                    'account_count': len(accounts),
                    'accounts': accounts,
                })
            
            except Exception as e:
                results.append({
                    'wallet_address': address,
                    'wallet_label': label,
                    'error': str(e),
                })
        
        return {
            "success": True,
            "wallets": results,
            "total_wallets": len(results),
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to fetch token accounts: {str(e)}",
            "wallets": []
        }

