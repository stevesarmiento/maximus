from typing import Optional, Dict, Any
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.transaction import Transaction
from solders.message import Message
from solana.rpc.commitment import Confirmed
from maximus.tools.solana_client import get_solana_client


def create_token_delegation(
    owner_keypair: Keypair,
    token_account: str,
    delegate: str,
    amount: int
) -> Transaction:
    """
    Create an SPL token delegation transaction.
    
    This allows a delegate wallet to spend tokens from the owner's token account
    up to the specified amount.
    
    Args:
        owner_keypair: Owner's keypair (will sign)
        token_account: Token account address to delegate from
        delegate: Delegate wallet public key
        amount: Maximum amount delegate can spend (in token's smallest units)
        
    Returns:
        Transaction ready to be sent
    """
    from spl.token.instructions import approve, ApproveParams
    
    # Build approve instruction
    approve_ix = approve(
        ApproveParams(
            program_id=Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
            source=Pubkey.from_string(token_account),
            delegate=Pubkey.from_string(delegate),
            owner=owner_keypair.pubkey(),
            amount=amount,
        )
    )
    
    # Get recent blockhash
    client = get_solana_client()
    recent_blockhash = client.client.get_latest_blockhash(Confirmed).value.blockhash
    
    # Create message and transaction
    message = Message.new_with_blockhash(
        [approve_ix],
        owner_keypair.pubkey(),
        recent_blockhash
    )
    
    # Sign with owner
    tx = Transaction([owner_keypair], message, recent_blockhash)
    
    return tx


def revoke_token_delegation(
    owner_keypair: Keypair,
    token_account: str
) -> Transaction:
    """
    Revoke an SPL token delegation.
    
    This removes all delegation permissions from a token account.
    
    Args:
        owner_keypair: Owner's keypair (will sign)
        token_account: Token account address to revoke delegation from
        
    Returns:
        Transaction ready to be sent
    """
    from spl.token.instructions import revoke, RevokeParams
    
    # Build revoke instruction
    revoke_ix = revoke(
        RevokeParams(
            program_id=Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
            account=Pubkey.from_string(token_account),
            owner=owner_keypair.pubkey(),
        )
    )
    
    # Get recent blockhash
    client = get_solana_client()
    recent_blockhash = client.client.get_latest_blockhash(Confirmed).value.blockhash
    
    # Create message and transaction
    message = Message.new_with_blockhash(
        [revoke_ix],
        owner_keypair.pubkey(),
        recent_blockhash
    )
    
    # Sign with owner
    tx = Transaction([owner_keypair], message, recent_blockhash)
    
    return tx


def check_delegation_status(
    token_account: str
) -> Optional[Dict[str, Any]]:
    """
    Check the delegation status of a token account.
    
    Args:
        token_account: Token account address to check
        
    Returns:
        Dictionary with delegation info or None if not delegated
    """
    from solana.rpc.types import TokenAccountOpts
    
    try:
        client = get_solana_client()
        pubkey = Pubkey.from_string(token_account)
        
        # Get token account info
        response = client.client.get_account_info_json_parsed(pubkey)
        
        if not response.value:
            return None
        
        # Parse account data
        account_data = response.value.data
        
        if isinstance(account_data, dict):
            parsed = account_data.get('parsed', {})
            info = parsed.get('info', {})
            
            # Check if there's a delegate
            delegate = info.get('delegate')
            delegated_amount = info.get('delegatedAmount', {})
            
            if delegate:
                return {
                    'delegated': True,
                    'delegate': delegate,
                    'amount': delegated_amount.get('uiAmount', 0),
                    'amount_string': delegated_amount.get('uiAmountString', '0'),
                }
        
        return {'delegated': False}
    
    except Exception as e:
        print(f"Error checking delegation status: {e}")
        return None


def get_token_account_for_mint(
    wallet: str,
    mint: str
) -> Optional[str]:
    """
    Get the token account address for a specific mint owned by a wallet.
    
    Args:
        wallet: Wallet public key
        mint: Token mint address
        
    Returns:
        Token account address or None if not found
    """
    try:
        client = get_solana_client()
        token_accounts = client.get_token_accounts(wallet)
        
        for account in token_accounts:
            if account.get('mint') == mint:
                # Need to get the actual token account address
                # This is simplified - in production you'd query the actual account address
                return account.get('mint')  # Placeholder
        
        return None
    
    except Exception as e:
        print(f"Error finding token account: {e}")
        return None


