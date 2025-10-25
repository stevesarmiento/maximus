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
import asyncio
import base64


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
    Swap tokens using Titan router with live streaming quotes from multiple providers.
    
    This tool streams quotes from Jupiter aggregator, Pyth Express Relay, Hashflow,
    and other providers in real-time, displaying a live table of rates. User confirms
    by pressing Enter to execute the best quote.
    
    IMPORTANT: The delegate wallet must have tokens to swap. Either:
    1. Transfer tokens to the delegate wallet first, or
    2. Approve token delegation via the web dashboard (experimental)
    
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
        
        # Validate swap programs are allowed
        # Accept Titan, Jupiter, or Raydium for backwards compatibility
        allowed_swap_programs = ["Titan", "Jupiter", "Raydium"]
        if not any(program in config.allowed_programs for program in allowed_swap_programs):
            return {
                "success": False,
                "error": f"Swap programs not allowed in delegation. Current allowed: {config.allowed_programs}"
            }
        
        # Validate amount against limits
        if amount > config.max_token_per_tx:
            return {
                "success": False,
                "error": f"Amount {amount} exceeds delegation limit of {config.max_token_per_tx} per transaction"
            }
        
        # Use delegate wallet address for transaction building
        # The delegate wallet will sign and execute the swap
        delegate_address = str(keypair.pubkey())
        
        # Stream quotes from Titan with live display
        # Pass delegate address so Titan builds transaction for the delegate to sign
        result = asyncio.run(
            get_titan_swap_with_display(
                from_token=from_token,
                to_token=to_token,
                amount=amount,
                user_public_key=delegate_address,
                slippage_bps=slippage_bps,
            )
        )
        
        if not result:
            return {
                "success": False,
                "error": "Swap cancelled or no quotes available"
            }
        
        provider_id, best_quote, all_quotes = result
        
        # Get output token info for proper decimal formatting
        _, output_decimals, _ = resolve_token_info(to_token)
        out_amount = best_quote.out_amount / (10 ** output_decimals)
        
        # Execute the swap transaction
        print(f"\n💫 Executing swap via {provider_id}...")
        
        try:
            # Get Solana client
            client = get_solana_client()
            
            # Check if we have a pre-built transaction or need to build from instructions
            if best_quote.transaction:
                # Deserialize the transaction provided by Titan
                from solders.transaction import VersionedTransaction
                tx = VersionedTransaction.from_bytes(best_quote.transaction)
                
                # Sign with delegate wallet (transaction is already built with correct accounts)
                tx.sign([keypair])
                
                # Send the transaction
                print(f"📤 Sending transaction to Solana...")
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
                
                print(f"⏳ Waiting for confirmation...")
                # Wait for confirmation
                confirmation = client.client.confirm_transaction(
                    signature,
                    commitment=Confirmed
                )
                
                if confirmation.value:
                    return {
                        "success": True,
                        "signature": str(signature),
                        "provider": provider_id,
                        "in_amount": amount,
                        "out_amount": out_amount,
                        "from_token": from_token,
                        "to_token": to_token,
                        "slippage_bps": best_quote.slippage_bps,
                        "message": f"✅ Swap executed successfully!\n\n"
                                  f"Swapped: {amount} {from_token} → {out_amount:.6f} {to_token}\n"
                                  f"Provider: {provider_id}\n"
                                  f"Transaction: {str(signature)}\n\n"
                                  f"View on Solscan: https://solscan.io/tx/{str(signature)}"
                    }
                else:
                    return {
                        "success": False,
                        "error": "Transaction failed to confirm"
                    }
            
            elif best_quote.instructions:
                # Build transaction from instructions
                print(f"🔧 Building transaction from {len(best_quote.instructions)} instructions...")
                
                from solders.instruction import Instruction as SoldersInstruction
                from solders.message import MessageV0
                from solders.transaction import VersionedTransaction
                from solders.address_lookup_table_account import AddressLookupTableAccount
                
                # Convert Titan instructions to Solders instructions
                instructions = []
                for titan_ix in best_quote.instructions:
                    # Titan format: {p: Pubkey, a: [AccountMeta], d: bytes}
                    program_id = Pubkey(titan_ix['p'])
                    accounts = []
                    for acc in titan_ix['a']:
                        from solders.instruction import AccountMeta
                        accounts.append(AccountMeta(
                            pubkey=Pubkey(acc['p']),
                            is_signer=acc['s'],
                            is_writable=acc['w']
                        ))
                    data = bytes(titan_ix['d'])
                    instructions.append(SoldersInstruction(program_id, data, accounts))
                
                # Get recent blockhash
                recent_blockhash_resp = client.client.get_latest_blockhash(Confirmed)
                recent_blockhash = recent_blockhash_resp.value.blockhash
                
                # Load address lookup tables if any
                lookup_accounts = []
                if best_quote.address_lookup_tables:
                    print(f"📋 Loading {len(best_quote.address_lookup_tables)} address lookup tables...")
                    from solders.address_lookup_table_account import AddressLookupTableAccount
                    
                    for table_address in best_quote.address_lookup_tables:
                        try:
                            # Fetch lookup table account data
                            table_pubkey = Pubkey(table_address)
                            account_info = client.client.get_account_info(table_pubkey)
                            
                            if account_info.value and account_info.value.data:
                                # Parse address lookup table from raw bytes
                                # ALT format: discriminator (4) + deactivation_slot (8) + last_extended_slot (8) + last_extended_slot_start_index (1) + authority (33) + padding (7) + addresses (32 * n)
                                data = bytes(account_info.value.data)
                                
                                # Skip header (61 bytes) and parse addresses
                                HEADER_SIZE = 61
                                if len(data) > HEADER_SIZE:
                                    addresses_data = data[HEADER_SIZE:]
                                    addresses = []
                                    
                                    # Each address is 32 bytes
                                    for i in range(0, len(addresses_data), 32):
                                        if i + 32 <= len(addresses_data):
                                            addr_bytes = addresses_data[i:i+32]
                                            addresses.append(Pubkey(addr_bytes))
                                    
                                    # Create lookup table account
                                    alt = AddressLookupTableAccount(
                                        key=table_pubkey,
                                        addresses=addresses
                                    )
                                    lookup_accounts.append(alt)
                                    print(f"  ✓ Loaded {len(addresses)} addresses from table")
                                else:
                                    print(f"  ⚠️  Lookup table data too short")
                            else:
                                print(f"  ⚠️  No data found for lookup table")
                        except Exception as e:
                            print(f"  ⚠️  Could not load lookup table: {e}")
                
                # Create message (V0 for address lookup table support)
                message = MessageV0.try_compile(
                    payer=keypair.pubkey(),
                    instructions=instructions,
                    address_lookup_table_accounts=lookup_accounts,
                    recent_blockhash=recent_blockhash,
                )
                
                # Create and sign transaction
                tx = VersionedTransaction(message, [keypair])
                
                # Send the transaction
                print(f"📤 Sending transaction to Solana...")
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
                
                print(f"⏳ Waiting for confirmation...")
                # Wait for confirmation
                confirmation = client.client.confirm_transaction(
                    signature,
                    commitment=Confirmed
                )
                
                if confirmation.value:
                    return {
                        "success": True,
                        "signature": str(signature),
                        "provider": provider_id,
                        "in_amount": amount,
                        "out_amount": out_amount,
                        "from_token": from_token,
                        "to_token": to_token,
                        "slippage_bps": best_quote.slippage_bps,
                        "message": f"✅ Swap executed successfully!\n\n"
                                  f"Swapped: {amount} {from_token} → {out_amount:.6f} {to_token}\n"
                                  f"Provider: {provider_id}\n"
                                  f"Transaction: {str(signature)}\n\n"
                                  f"View on Solscan: https://solscan.io/tx/{str(signature)}"
                    }
                else:
                    return {
                        "success": False,
                        "error": "Transaction failed to confirm"
                    }
            
            else:
                return {
                    "success": False,
                    "error": "Provider returned neither transaction nor instructions. Cannot execute swap."
                }
                
        except Exception as tx_error:
            error_msg = str(tx_error).lower()
            
            # Check for common errors
            if "insufficient" in error_msg or "balance" in error_msg:
                return {
                    "success": False,
                    "error": f"❌ Insufficient funds in delegate wallet.\n\n"
                           f"The delegate wallet ({delegate_address}) doesn't have enough tokens to swap.\n\n"
                           f"Solutions:\n"
                           f"1. Send {amount} {from_token} to the delegate wallet\n"
                           f"2. Or approve token delegation via http://localhost:3000/approve-token\n\n"
                           f"Details: {tx_error}"
                }
            elif "simulation" in error_msg:
                return {
                    "success": False,
                    "error": f"❌ Transaction simulation failed.\n\n"
                           f"The swap transaction didn't pass simulation. This usually means:\n"
                           f"- Delegate wallet doesn't have the tokens\n"
                           f"- Token account doesn't exist\n"
                           f"- Slippage tolerance too tight\n\n"
                           f"Details: {tx_error}"
                }
            else:
                return {
                    "success": False,
                    "error": f"Transaction execution failed: {str(tx_error)}\n\n"
                           f"Quote was valid but execution failed. Your funds are safe."
                }
    
    except ValueError as e:
        # Likely missing Titan API token
        error_msg = str(e)
        if "Titan API token" in error_msg:
            return {
                "success": False,
                "error": "Titan API token not configured.\n\n"
                       "To enable token swaps:\n"
                       "1. Contact info@titandex.io to obtain a Titan API token\n"
                       "2. Add TITAN_API_TOKEN=your-token to your .env file\n"
                       "3. Restart Maximus\n\n"
                       f"Details: {error_msg}"
            }
        return {
            "success": False,
            "error": f"Configuration error: {error_msg}"
        }
    except ImportError as e:
        return {
            "success": False,
            "error": f"Missing dependencies. Run 'uv sync' to install required packages.\n\nDetails: {str(e)}"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to swap tokens: {str(e)}\n\n"
                   "If this is a connection error, ensure:\n"
                   "- TITAN_API_TOKEN is set in your .env file\n"
                   "- You have run 'uv sync' to install dependencies\n"
                   "- Your network connection is active"
        }


####################################
# Titan Integration Helpers
####################################


# Symbol to mint address mapping (for convenience)
# User can also provide mint address directly
KNOWN_TOKEN_SYMBOLS = {
    "SOL": "So11111111111111111111111111111111111111112",
    "WSOL": "So11111111111111111111111111111111111111112",
    "USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "USDT": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    "BONK": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    "JUP": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
}


def get_token_decimals(mint_address: str) -> int:
    """
    Query the Solana RPC to get token decimals from the mint account.
    
    Args:
        mint_address: Token mint address (base58)
    
    Returns:
        Number of decimals (0-9)
    """
    try:
        client = get_solana_client()
        
        # Special case for SOL/WSOL (native token, not an SPL token)
        if mint_address == "So11111111111111111111111111111111111111112":
            return 9
        
        # Get mint account info
        mint_pubkey = Pubkey.from_string(mint_address)
        account_info = client.client.get_account_info(mint_pubkey)
        
        if not account_info.value:
            print(f"⚠️  Could not find mint account {mint_address}, assuming 6 decimals")
            return 6
        
        # Parse mint data to extract decimals
        # SPL Token Mint layout: decimals is at byte offset 44
        data = account_info.value.data
        if len(data) >= 45:
            decimals = data[44]
            return decimals
        else:
            print(f"⚠️  Invalid mint data for {mint_address}, assuming 6 decimals")
            return 6
            
    except Exception as e:
        print(f"⚠️  Error fetching decimals for {mint_address}: {e}, assuming 6 decimals")
        return 6


def resolve_token_info(token: str) -> tuple[str, int, str]:
    """
    Resolve token symbol or address to (mint_address, decimals, symbol).
    
    Queries the RPC to get actual decimals from the mint account.
    
    Args:
        token: Token symbol (e.g., "SOL", "USDC") or mint address
    
    Returns:
        Tuple of (mint_address, decimals, symbol)
    """
    token_upper = token.upper()
    
    # Check if it's a known symbol
    if token_upper in KNOWN_TOKEN_SYMBOLS:
        mint_address = KNOWN_TOKEN_SYMBOLS[token_upper]
        decimals = get_token_decimals(mint_address)
        return (mint_address, decimals, token_upper)
    
    # Assume it's a mint address, query for decimals
    mint_address = token
    decimals = get_token_decimals(mint_address)
    symbol = token_upper[:8]  # Use truncated address as symbol
    
    return (mint_address, decimals, symbol)


async def get_titan_swap_with_display(
    from_token: str,
    to_token: str,
    amount: float,
    user_public_key: str,
    slippage_bps: int = 50,
) -> Optional[tuple]:
    """
    Get swap quotes from Titan with live-updating display.
    
    Args:
        from_token: Input token symbol or mint address
        to_token: Output token symbol or mint address
        amount: Amount to swap (in token units)
        user_public_key: User's wallet address
        slippage_bps: Slippage tolerance in basis points
        
    Returns:
        Tuple of (provider_id, best_quote, all_quotes) or None
    """
    from maximus.tools.titan_client import TitanClient
    from maximus.tools.titan_display import (
        stream_quotes_with_display,
        QuoteDisplayConfig
    )
    
    # Resolve token symbols to mint addresses and get decimals
    input_mint, input_decimals, input_symbol = resolve_token_info(from_token)
    output_mint, output_decimals, output_symbol = resolve_token_info(to_token)
    
    # Convert amount to smallest units using correct decimals
    amount_units = int(amount * (10 ** input_decimals))
    
    # Create display config with correct decimals
    config = QuoteDisplayConfig(
        decimals_in=input_decimals,
        decimals_out=output_decimals,
        symbol_in=input_symbol,
        symbol_out=output_symbol,
    )
    
    # Create Titan client
    client = TitanClient()
    
    try:
        await client.connect()
        
        # Stream quotes with live display
        result = await stream_quotes_with_display(
            client=client,
            input_mint=input_mint,
            output_mint=output_mint,
            amount=amount_units,
            user_public_key=user_public_key,
            slippage_bps=slippage_bps,
            config=config,
        )
        
        return result
    
    finally:
        await client.close()


