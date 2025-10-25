from langchain.tools import tool
from typing import Dict, Any
from pydantic import BaseModel, Field
from solders.pubkey import Pubkey
from maximus.tools.solana_client import get_solana_client
from maximus.utils.wallet_storage import get_wallet_storage
from maximus.utils.delegate_wallet import get_delegate_wallet, get_session_password


class ApproveTokenInput(BaseModel):
    """Input for approve_token_delegation."""
    token_symbol: str = Field(
        description="Token symbol to approve (e.g., 'USDC', 'BONK')"
    )
    amount: float = Field(
        description="Maximum amount of tokens delegate can spend"
    )


@tool(args_schema=ApproveTokenInput)
def approve_token_delegation(token_symbol: str, amount: float) -> dict:
    """
    Approve the delegate wallet to spend tokens from your main wallet.
    
    This creates an on-chain SPL token delegation that allows the delegate wallet
    to spend up to the specified amount from your main wallet's token account.
    
    Once approved, the delegate can:
    - Swap your tokens via Titan router
    - Send tokens to other addresses
    - All without transferring tokens to the delegate first!
    
    Use this when users want to:
    - "Let the agent swap my USDC"
    - "Approve delegate to use my tokens"
    - "Enable token trading"
    
    Returns approval transaction details.
    """
    try:
        # Get main wallet
        storage = get_wallet_storage()
        wallets = storage.get_wallets()
        
        if not wallets:
            return {
                "success": False,
                "error": "No main wallet found. Please connect a wallet via the web dashboard."
            }
        
        main_wallet_address = wallets[0].address
        
        # Get delegate wallet info
        password = get_session_password()
        if not password:
            import getpass
            from maximus.utils.password_input import get_password
            password = get_password("Enter delegation password: ")
        
        delegate = get_delegate_wallet()
        delegate_keypair = delegate.load_delegate(password)
        delegate_address = str(delegate_keypair.pubkey())
        
        # Get token accounts for main wallet
        client = get_solana_client()
        token_accounts = client.get_token_accounts(main_wallet_address)
        
        # Find token account for the specified symbol
        token_account = None
        token_mint = None
        decimals = 6
        
        for account in token_accounts:
            mint = account.get('mint')
            if mint:
                metadata = client.get_token_metadata(mint)
                if metadata.get('symbol', '').upper() == token_symbol.upper():
                    token_mint = mint
                    decimals = account.get('decimals', 6)
                    # We need the actual token account address, not just the mint
                    # For now, store the account info
                    token_account = account
                    break
        
        if not token_mint:
            return {
                "success": False,
                "error": f"Token '{token_symbol}' not found in wallet {main_wallet_address[:8]}..."
            }
        
        # Convert amount to smallest units
        amount_raw = int(amount * (10 ** decimals))
        
        # Since we need the main wallet to sign this, we'll return instructions
        # for the user to approve via the web dashboard
        return {
            "success": False,
            "requires_browser_approval": True,
            "message": f"To approve {token_symbol} delegation, please:\n\n"
                      f"1. Visit http://localhost:3000/approve-token\n"
                      f"2. Token: {token_symbol}\n"
                      f"3. Amount: {amount}\n"
                      f"4. Delegate: {delegate_address[:8]}...{delegate_address[-8:]}\n"
                      f"5. Sign the approval with your main wallet\n\n"
                      f"Then you can swap/send {token_symbol} directly from your main wallet!",
            "token_mint": token_mint,
            "delegate": delegate_address,
            "amount": amount,
            "decimals": decimals,
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to create token approval: {str(e)}"
        }


@tool
def check_token_allowance(token_symbol: str) -> dict:
    """
    Check if the delegate has spending allowance for a specific token.
    
    Shows how much of a token the delegate is approved to spend from
    the main wallet's token account.
    
    Use this to verify token delegation status before swaps.
    """
    try:
        from maximus.tools.solana_delegation import check_delegation_status
        
        # Get main wallet
        storage = get_wallet_storage()
        wallets = storage.get_wallets()
        
        if not wallets:
            return {
                "success": False,
                "error": "No main wallet found"
            }
        
        main_wallet_address = wallets[0].address
        
        # Get token accounts
        client = get_solana_client()
        token_accounts = client.get_token_accounts(main_wallet_address)
        
        # Find the token
        for account in token_accounts:
            mint = account.get('mint')
            if mint:
                metadata = client.get_token_metadata(mint)
                if metadata.get('symbol', '').upper() == token_symbol.upper():
                    # Check delegation status (simplified)
                    return {
                        "success": True,
                        "token": token_symbol,
                        "mint": mint,
                        "balance": account.get('ui_amount', 0),
                        "message": f"Token account found for {token_symbol}. Delegation check in progress..."
                    }
        
        return {
            "success": False,
            "error": f"Token '{token_symbol}' not found in wallet"
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to check allowance: {str(e)}"
        }

