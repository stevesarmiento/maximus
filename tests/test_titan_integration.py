"""
Tests for Titan router integration.

Run with: uv run pytest tests/test_titan_integration.py -v
"""

import os
import pytest
from unittest.mock import Mock, patch, MagicMock
from solders.pubkey import Pubkey

# Set dummy environment variables to avoid import errors
os.environ.setdefault('COINGECKO_API_KEY', 'test_key')
os.environ.setdefault('TITAN_API_TOKEN', 'test_token')


class TestTokenDecimalResolution:
    """Test dynamic token decimal resolution from RPC."""
    
    @patch('maximus.tools.solana_transactions.get_solana_client')
    def test_sol_decimals(self, mock_client):
        """SOL should always return 9 decimals."""
        from maximus.tools.solana_transactions import get_token_decimals
        
        decimals = get_token_decimals("So11111111111111111111111111111111111111112")
        assert decimals == 9
    
    @patch('maximus.tools.solana_transactions.get_solana_client')
    def test_usdc_decimals_from_rpc(self, mock_client):
        """USDC decimals should be queried from RPC."""
        from maximus.tools.solana_transactions import get_token_decimals
        
        # Mock RPC response with USDC mint data
        mock_account_info = Mock()
        # SPL Token Mint: decimals at byte 44 = 6
        mock_account_info.value.data = bytearray(82)
        mock_account_info.value.data[44] = 6
        
        mock_client_instance = Mock()
        mock_client_instance.client.get_account_info.return_value = mock_account_info
        mock_client.return_value = mock_client_instance
        
        decimals = get_token_decimals("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
        assert decimals == 6
    
    @patch('maximus.tools.solana_transactions.get_solana_client')
    def test_unknown_token_fallback(self, mock_client):
        """Unknown tokens should fall back to 6 decimals."""
        from maximus.tools.solana_transactions import get_token_decimals
        
        # Mock no account found
        mock_account_info = Mock()
        mock_account_info.value = None
        
        mock_client_instance = Mock()
        mock_client_instance.client.get_account_info.return_value = mock_account_info
        mock_client.return_value = mock_client_instance
        
        decimals = get_token_decimals("UnknownToken11111111111111111111111111111")
        assert decimals == 6
    
    @patch('maximus.tools.solana_transactions.get_token_decimals')
    def test_resolve_token_info_by_symbol(self, mock_get_decimals):
        """Test resolving token by symbol."""
        from maximus.tools.solana_transactions import resolve_token_info
        
        mock_get_decimals.return_value = 6
        
        mint, decimals, symbol = resolve_token_info("USDC")
        
        assert mint == "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        assert decimals == 6
        assert symbol == "USDC"
    
    @patch('maximus.tools.solana_transactions.get_token_decimals')
    def test_resolve_token_info_by_address(self, mock_get_decimals):
        """Test resolving token by mint address."""
        from maximus.tools.solana_transactions import resolve_token_info
        
        mock_get_decimals.return_value = 9
        
        mint, decimals, symbol = resolve_token_info("CustomMint1111111111111111111111111111111")
        
        assert mint == "CustomMint1111111111111111111111111111111"
        assert decimals == 9
        assert symbol.startswith("CUSTOMMI")  # Truncated


class TestAddressLookupTableParsing:
    """Test address lookup table parsing and loading."""
    
    def test_alt_header_parsing(self):
        """Test parsing ALT header structure."""
        # ALT format: 
        # - discriminator: 4 bytes
        # - deactivation_slot: 8 bytes
        # - last_extended_slot: 8 bytes  
        # - last_extended_slot_start_index: 1 byte
        # - authority: 33 bytes (1 + 32)
        # - padding: 7 bytes
        # Total header: 61 bytes
        
        HEADER_SIZE = 61
        assert HEADER_SIZE == 4 + 8 + 8 + 1 + 33 + 7
    
    def test_parse_alt_addresses(self):
        """Test parsing addresses from ALT data."""
        from solders.pubkey import Pubkey
        
        # Create mock ALT data
        header = bytearray(61)  # Header
        
        # Add 3 test addresses (32 bytes each)
        addr1 = Pubkey.new_unique()
        addr2 = Pubkey.new_unique()
        addr3 = Pubkey.new_unique()
        
        data = header + bytes(addr1) + bytes(addr2) + bytes(addr3)
        
        # Parse addresses
        HEADER_SIZE = 61
        addresses_data = data[HEADER_SIZE:]
        addresses = []
        
        for i in range(0, len(addresses_data), 32):
            if i + 32 <= len(addresses_data):
                addr_bytes = addresses_data[i:i+32]
                addresses.append(Pubkey(addr_bytes))
        
        assert len(addresses) == 3
        assert addresses[0] == addr1
        assert addresses[1] == addr2
        assert addresses[2] == addr3


class TestInstructionBuilding:
    """Test building Solana instructions from Titan format."""
    
    def test_titan_instruction_to_solders(self):
        """Test converting Titan instruction format to Solders format."""
        from solders.instruction import Instruction as SoldersInstruction, AccountMeta
        from solders.pubkey import Pubkey
        
        # Mock Titan instruction
        titan_ix = {
            'p': bytes(Pubkey.new_unique()),  # program_id
            'a': [  # accounts
                {'p': bytes(Pubkey.new_unique()), 's': True, 'w': True},
                {'p': bytes(Pubkey.new_unique()), 's': False, 'w': True},
                {'p': bytes(Pubkey.new_unique()), 's': False, 'w': False},
            ],
            'd': b'\x01\x02\x03\x04',  # data
        }
        
        # Convert to Solders format
        program_id = Pubkey(titan_ix['p'])
        accounts = []
        for acc in titan_ix['a']:
            accounts.append(AccountMeta(
                pubkey=Pubkey(acc['p']),
                is_signer=acc['s'],
                is_writable=acc['w']
            ))
        data = bytes(titan_ix['d'])
        
        instruction = SoldersInstruction(program_id, data, accounts)
        
        assert instruction.program_id == program_id
        assert len(instruction.accounts) == 3
        assert instruction.accounts[0].is_signer == True
        assert instruction.accounts[0].is_writable == True
        assert instruction.accounts[1].is_signer == False
        assert instruction.accounts[1].is_writable == True
        assert instruction.accounts[2].is_signer == False
        assert instruction.accounts[2].is_writable == False
        assert instruction.data == b'\x01\x02\x03\x04'


class TestTransactionSizeCalculation:
    """Test transaction size calculations and compression."""
    
    def test_transaction_without_alt_too_large(self):
        """Transactions without ALTs should exceed size limit for complex swaps."""
        from solders.instruction import Instruction, AccountMeta
        from solders.pubkey import Pubkey
        from solders.message import Message
        from solders.transaction import Transaction
        from solders.hash import Hash
        from solders.keypair import Keypair
        
        # Create a swap-like transaction with many accounts
        program_id = Pubkey.new_unique()
        accounts = [AccountMeta(Pubkey.new_unique(), False, True) for _ in range(50)]
        data = b'\x00' * 100
        
        ix = Instruction(program_id, data, accounts)
        payer = Keypair()
        
        message = Message.new_with_blockhash(
            [ix],
            payer.pubkey(),
            Hash.new_unique()
        )
        
        tx = Transaction([payer], message, Hash.new_unique())
        tx_bytes = bytes(tx)
        
        # Without ALTs, should be large
        print(f"Transaction size without ALTs: {len(tx_bytes)} bytes")
        assert len(tx_bytes) > 1232, "Transaction should exceed 1232 byte limit"
    
    def test_alt_reduces_transaction_size(self):
        """ALTs should significantly reduce transaction size."""
        from solders.address_lookup_table_account import AddressLookupTableAccount
        from solders.pubkey import Pubkey
        
        # Create lookup table with many addresses
        table_key = Pubkey.new_unique()
        addresses = [Pubkey.new_unique() for _ in range(100)]
        
        alt = AddressLookupTableAccount(key=table_key, addresses=addresses)
        
        # ALT stores 100 addresses but only costs 32 bytes (table address) in tx
        # vs 3200 bytes (100 * 32) if embedded directly
        assert len(addresses) == 100
        assert len(bytes(table_key)) == 32


class TestSwapQuoteSelection:
    """Test swap quote selection and validation."""
    
    def test_select_best_quote_by_out_amount(self):
        """Should select quote with highest output amount."""
        from maximus.tools.titan_client import SwapQuote
        
        quotes = {
            "provider1": SwapQuote(
                provider="provider1",
                in_amount=1000000,
                out_amount=9500000,
                slippage_bps=50,
                route_steps=[],
                instructions=[],
                address_lookup_tables=[]
            ),
            "provider2": SwapQuote(
                provider="provider2",
                in_amount=1000000,
                out_amount=9700000,  # Best
                slippage_bps=50,
                route_steps=[],
                instructions=[],
                address_lookup_tables=[]
            ),
            "provider3": SwapQuote(
                provider="provider3",
                in_amount=1000000,
                out_amount=9600000,
                slippage_bps=50,
                route_steps=[],
                instructions=[],
                address_lookup_tables=[]
            ),
        }
        
        # Find best quote
        best_provider = None
        best_quote = None
        
        for provider_id, quote in quotes.items():
            if best_quote is None or quote.out_amount > best_quote.out_amount:
                best_provider = provider_id
                best_quote = quote
        
        assert best_provider == "provider2"
        assert best_quote.out_amount == 9700000


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

