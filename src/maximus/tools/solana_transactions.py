from langchain.tools import tool
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from solders.pubkey import Pubkey
from solders.system_program import transfer, TransferParams
from solders.transaction import Transaction as SoldersTransaction
from solders.message import Message
from solana.rpc.commitment import Confirmed
from maximus.tools.solana_client import get_solana_client
from maximus.utils.delegate_wallet import get_delegate_wallet
import requests


####################################
# Input Schemas
####################################


class SendSolInput(BaseModel):
    """Input for send_sol."""
    to_address: str = Field(
        description="Recipient's Solana wallet address"
    )
    amount: float = Field(
        description="Amount of SOL to send (e.g., 0.1 for 0.1 SOL)"
    )


class SendTokenInput(BaseModel):
    """Input for send_token."""
    token_mint: str = Field(
        description="Token mint address (e.g., USDC mint)"
    )
    to_address: str = Field(
        description="Recipient's Solana wallet address"
    )
    amount: float = Field(
        description="Amount of tokens to send"
    )


class SwapTokensInput(BaseModel):
    """Input for swap_tokens."""
    from_token: str = Field(
        description="Input token mint address or symbol (e.g., 'USDC' or mint address)"
    )
    to_token: str = Field(
        description="Output token mint address or symbol (e.g., 'SOL' or mint address)"
    )
    amount: float = Field(
        description="Amount of input token to swap"
    )
    slippage_bps: int = Field(
        default=50,
        description="Slippage tolerance in basis points (50 = 0.5%)"
    )


####################################
# Tools
####################################


@tool(args_schema=SendSolInput)
def send_sol(to_address: str, amount: float) -> dict:
    """
    Send SOL to another wallet address using the delegated wallet.
    
    This tool uses the delegate wallet to sign and send a SOL transfer transaction.
    The delegation must be active and the amount must be within the delegated limits.
    
    Use this when users ask to:
    - "Send X SOL to address Y"
    - "Transfer SOL"
    - "Pay someone in SOL"
    
    Returns transaction signature and status.
    """
    import getpass
    from maximus.utils.delegate_wallet import get_session_password
    
    try:
        # Try to get cached password first
        password = get_session_password()
        
        if not password:
            # Fallback: prompt for password (shouldn't happen if CLI caches it)
            print("\n🔐 Delegation password required to sign transaction")
            password = getpass.getpass("Enter delegation password: ")
        
        # Load delegate wallet
        delegate = get_delegate_wallet()
        keypair = delegate.load_delegate(password)
        
        # Get delegation config to check limits
        config = delegate.get_delegation_info(password)
        if not config:
            return {
                "success": False,
                "error": "No delegation found"
            }
        
        # Validate amount against limits
        if amount > config.max_sol_per_tx:
            return {
                "success": False,
                "error": f"Amount {amount} SOL exceeds delegation limit of {config.max_sol_per_tx} SOL per transaction"
            }
        
        # Build transfer transaction
        client = get_solana_client()
        
        # Create transfer instruction
        transfer_ix = transfer(
            TransferParams(
                from_pubkey=keypair.pubkey(),
                to_pubkey=Pubkey.from_string(to_address),
                lamports=int(amount * 1e9)  # Convert SOL to lamports
            )
        )
        
        # Get recent blockhash with finalized commitment for reliability
        recent_blockhash_resp = client.client.get_latest_blockhash(Confirmed)
        recent_blockhash = recent_blockhash_resp.value.blockhash
        
        # Create message and transaction
        message = Message.new_with_blockhash(
            [transfer_ix],
            keypair.pubkey(),
            recent_blockhash
        )
        
        # Sign transaction with delegate wallet
        tx = SoldersTransaction([keypair], message, recent_blockhash)
        
        # Serialize and send transaction
        from solana.rpc.types import TxOpts
        opts = TxOpts(
            skip_preflight=False,
            preflight_commitment=Confirmed,
            max_retries=3
        )
        
        signature = client.client.send_raw_transaction(
            bytes(tx),
            opts=opts
        ).value
        
        return {
            "success": True,
            "signature": str(signature),
            "amount": amount,
            "to": to_address,
            "from": str(keypair.pubkey()),
            "message": f"Successfully sent {amount} SOL to {to_address}"
        }
    
    except FileNotFoundError as e:
        return {
            "success": False,
            "error": str(e)
        }
    except ValueError as e:
        return {
            "success": False,
            "error": str(e)
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to send SOL: {str(e)}"
        }


@tool(args_schema=SendTokenInput)
def send_token(token_mint: str, to_address: str, amount: float) -> dict:
    """
    Send SPL tokens to another wallet address using the delegated wallet.
    
    This tool uses the delegate wallet to sign and send an SPL token transfer.
    The token must be delegated and the amount must be within limits.
    
    Use this when users ask to:
    - "Send X USDC to address Y"
    - "Transfer tokens"
    - "Pay someone in tokens"
    
    Returns transaction signature and status.
    """
    import getpass
    from maximus.utils.delegate_wallet import get_session_password
    
    try:
        from spl.token.instructions import transfer_checked, TransferCheckedParams
        
        # Try to get cached password first
        password = get_session_password()
        
        if not password:
            # Fallback: prompt for password
            print("\n🔐 Delegation password required to sign transaction")
            password = getpass.getpass("Enter delegation password: ")
        
        # Load delegate wallet
        delegate = get_delegate_wallet()
        keypair = delegate.load_delegate(password)
        
        # Get delegation config to check limits
        config = delegate.get_delegation_info(password)
        if not config:
            return {
                "success": False,
                "error": "No delegation found"
            }
        
        # Validate amount against limits
        if amount > config.max_token_per_tx:
            return {
                "success": False,
                "error": f"Amount {amount} tokens exceeds delegation limit of {config.max_token_per_tx} tokens per transaction"
            }
        
        # Get token account info
        client = get_solana_client()
        token_accounts = client.get_token_accounts(str(keypair.pubkey()))
        
        # Find source token account
        source_account = None
        decimals = 6  # Default for most tokens
        
        for account in token_accounts:
            if account.get('mint') == token_mint:
                source_account = account
                decimals = account.get('decimals', 6)
                break
        
        if not source_account:
            return {
                "success": False,
                "error": f"No token account found for mint {token_mint}"
            }
        
        # TODO: Get destination token account (associated token account)
        # This is simplified - in production you'd use get_associated_token_address
        
        return {
            "success": False,
            "error": "Token transfer not fully implemented yet. Use send_sol for now."
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to send token: {str(e)}"
        }


@tool(args_schema=SwapTokensInput)
def swap_tokens(
    from_token: str,
    to_token: str,
    amount: float,
    slippage_bps: int = 50
) -> dict:
    """
    Swap tokens using Jupiter aggregator with the delegated wallet.
    
    This tool gets the best swap rate from Jupiter and executes the swap
    using the delegate wallet for signing.
    
    Use this when users ask to:
    - "Swap X USDC for SOL"
    - "Exchange tokens"
    - "Convert USDC to SOL"
    - "Trade tokens"
    
    Returns transaction signature and swap details.
    """
    import getpass
    from maximus.utils.delegate_wallet import get_session_password
    
    try:
        # Try to get cached password first
        password = get_session_password()
        
        if not password:
            # Fallback: prompt for password
            print("\n🔐 Delegation password required to sign transaction")
            password = getpass.getpass("Enter delegation password: ")
        
        # Load delegate wallet
        delegate = get_delegate_wallet()
        keypair = delegate.load_delegate(password)
        
        # Get delegation config
        config = delegate.get_delegation_info(password)
        if not config:
            return {
                "success": False,
                "error": "No delegation found"
            }
        
        # Validate Jupiter is in allowed programs
        if "Jupiter" not in config.allowed_programs:
            return {
                "success": False,
                "error": "Jupiter swaps not allowed in delegation"
            }
        
        # Validate amount against limits
        if amount > config.max_token_per_tx:
            return {
                "success": False,
                "error": f"Amount {amount} exceeds delegation limit of {config.max_token_per_tx} per transaction"
            }
        
        # Get main wallet address (where the tokens actually are)
        from maximus.utils.wallet_storage import get_wallet_storage
        storage = get_wallet_storage()
        wallets = storage.get_wallets()
        
        if not wallets:
            return {
                "success": False,
                "error": "No main wallet found. Connect wallet via web dashboard first."
            }
        
        main_wallet_address = wallets[0].address
        
        # Get Jupiter quote using MAIN wallet as owner
        # (delegate will sign, but tokens come from main wallet's accounts)
        quote = get_jupiter_quote(from_token, to_token, amount)
        if not quote:
            return {
                "success": False,
                "error": "Failed to get Jupiter quote"
            }
        
        # Build swap transaction
        # Use main wallet address so Jupiter routes from correct token accounts
        swap_tx = build_jupiter_swap(
            quote=quote,
            user_public_key=main_wallet_address,  # Main wallet's tokens!
            slippage_bps=slippage_bps
        )
        
        if not swap_tx:
            return {
                "success": False,
                "error": "Failed to build swap transaction"
            }
        
        return {
            "success": False,
            "error": "Jupiter swap ready! But requires token approval first.\n\n"
                   f"Visit http://localhost:3000/approve-token to approve {from_token} delegation.\n"
                   "Then the delegate can swap your tokens directly!"
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to swap tokens: {str(e)}"
        }


####################################
# Jupiter Integration Helpers
####################################


def get_jupiter_quote(
    input_mint: str,
    output_mint: str,
    amount: float
) -> Optional[Dict[str, Any]]:
    """
    Get a swap quote from Jupiter API.
    
    Args:
        input_mint: Input token mint address
        output_mint: Output token mint address
        amount: Amount to swap (in token units)
        
    Returns:
        Quote data or None if failed
    """
    try:
        # Jupiter API endpoint
        url = "https://quote-api.jup.ag/v6/quote"
        
        # Convert amount to smallest units (assume 6 decimals for now)
        amount_lamports = int(amount * 1e6)
        
        params = {
            "inputMint": input_mint,
            "outputMint": output_mint,
            "amount": amount_lamports,
            "slippageBps": 50,
        }
        
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            return response.json()
        
        return None
    
    except Exception as e:
        print(f"Error getting Jupiter quote: {e}")
        return None


def build_jupiter_swap(
    quote: Dict[str, Any],
    user_public_key: str,
    slippage_bps: int = 50
) -> Optional[str]:
    """
    Build a Jupiter swap transaction.
    
    Args:
        quote: Quote from get_jupiter_quote
        user_public_key: User's wallet address
        slippage_bps: Slippage tolerance in basis points
        
    Returns:
        Serialized transaction or None if failed
    """
    try:
        # Jupiter swap API endpoint
        url = "https://quote-api.jup.ag/v6/swap"
        
        payload = {
            "quoteResponse": quote,
            "userPublicKey": user_public_key,
            "wrapAndUnwrapSol": True,
            "slippageBps": slippage_bps,
        }
        
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            data = response.json()
            return data.get("swapTransaction")
        
        return None
    
    except Exception as e:
        print(f"Error building Jupiter swap: {e}")
        return None


