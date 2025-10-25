"""
Titan Router WebSocket Client

This module implements the Titan Swap API WebSocket protocol for getting
streaming quotes from multiple DEX aggregators and RFQ providers.

Protocol: v1.api.titan.ag
Encoding: MessagePack
Authentication: JWT Bearer token
"""

import os
import asyncio
import msgpack
import base58
import ssl
from typing import Optional, Dict, Any, List, AsyncIterator
from dataclasses import dataclass
import websockets
from websockets.client import WebSocketClientProtocol


# Titan API Configuration
# Demo endpoints: us1, jp1, de1 (Ohio, Tokyo, Frankfurt)
TITAN_WS_URL = os.getenv("TITAN_WS_URL", "wss://us1.api.demo.titan.exchange/api/v1/ws")
TITAN_API_TOKEN = os.getenv("TITAN_API_TOKEN")


@dataclass
class SwapQuote:
    """A single swap quote from a provider."""
    provider: str
    in_amount: int
    out_amount: int
    slippage_bps: int
    route_steps: List[Dict[str, Any]]
    instructions: List[Dict[str, Any]]
    address_lookup_tables: List[bytes]
    compute_units: Optional[int] = None
    transaction: Optional[bytes] = None
    reference_id: Optional[str] = None


@dataclass
class SwapQuotes:
    """Collection of quotes from multiple providers."""
    id: str
    input_mint: bytes
    output_mint: bytes
    swap_mode: str
    amount: int
    quotes: Dict[str, SwapQuote]


class TitanClient:
    """WebSocket client for Titan Swap API."""
    
    def __init__(self, api_token: Optional[str] = None):
        self.api_token = api_token or TITAN_API_TOKEN
        if not self.api_token:
            raise ValueError(
                "Titan API token required. Set TITAN_API_TOKEN environment variable "
                "or contact info@titandex.io to obtain one."
            )
        
        self.ws: Optional[WebSocketClientProtocol] = None
        self.request_id = 0
        self.stream_id: Optional[int] = None
        
    async def connect(self) -> None:
        """Establish WebSocket connection with authentication."""
        # Protocol negotiation in Sec-WebSocket-Protocol header
        # Using v1.api.titan.ag (no compression for simplicity)
        headers = {
            "Authorization": f"Bearer {self.api_token}",
        }
        
        # Create SSL context that's more permissive for development
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        try:
            self.ws = await websockets.connect(
                TITAN_WS_URL,
                additional_headers=headers,
                subprotocols=["v1.api.titan.ag"],
                ssl=ssl_context,
            )
        except Exception as e:
            raise ConnectionError(f"Failed to connect to Titan API: {e}")
    
    async def close(self) -> None:
        """Close the WebSocket connection."""
        if self.ws:
            await self.ws.close()
            self.ws = None
    
    def _encode_pubkey(self, address: str) -> bytes:
        """Encode a Solana public key from base58 to 32 bytes."""
        return base58.b58decode(address)
    
    def _decode_pubkey(self, pubkey_bytes: bytes) -> str:
        """Decode 32 bytes to base58 Solana address."""
        return base58.b58encode(pubkey_bytes).decode('utf-8')
    
    def _encode_request(self, request_data: Dict[str, Any]) -> bytes:
        """Encode a request using MessagePack."""
        self.request_id += 1
        request = {
            "id": self.request_id,
            "data": request_data
        }
        return msgpack.packb(request, use_bin_type=True)
    
    def _decode_message(self, data: bytes) -> Dict[str, Any]:
        """Decode a message using MessagePack."""
        return msgpack.unpackb(data, raw=False)
    
    async def request_swap_quotes(
        self,
        input_mint: str,
        output_mint: str,
        amount: int,
        user_public_key: str,
        slippage_bps: int = 50,
        swap_mode: str = "ExactIn",
        interval_ms: int = 500,
        num_quotes: int = 5,
    ) -> AsyncIterator[SwapQuotes]:
        """
        Request swap quotes and stream updates.
        
        Args:
            input_mint: Input token mint address (base58)
            output_mint: Output token mint address (base58)
            amount: Amount in smallest units (lamports/token units)
            user_public_key: User's wallet address (base58)
            slippage_bps: Slippage tolerance in basis points
            swap_mode: "ExactIn" or "ExactOut"
            interval_ms: Update interval in milliseconds
            num_quotes: Maximum number of quotes to return per update
        
        Yields:
            SwapQuotes objects with updated quotes from providers
        """
        if not self.ws:
            await self.connect()
        
        # Build SwapQuoteRequest according to Titan protocol
        request_data = {
            "NewSwapQuoteStream": {
                "swap": {
                    "inputMint": self._encode_pubkey(input_mint),
                    "outputMint": self._encode_pubkey(output_mint),
                    "amount": amount,
                    "swapMode": swap_mode,
                    "slippageBps": slippage_bps,
                },
                "transaction": {
                    "userPublicKey": self._encode_pubkey(user_public_key),
                },
                "update": {
                    "intervalMs": interval_ms,
                    "numQuotes": num_quotes,
                }
            }
        }
        
        # Send request
        encoded = self._encode_request(request_data)
        await self.ws.send(encoded)
        
        # Wait for initial response with stream start
        response_data = await self.ws.recv()
        response = self._decode_message(response_data)
        
        if "Error" in response:
            error = response["Error"]
            raise Exception(f"Titan API error {error['code']}: {error['message']}")
        
        # Extract stream ID from response
        if "Response" in response:
            resp = response["Response"]
            if "stream" in resp and resp["stream"]:
                self.stream_id = resp["stream"]["id"]
        
        # Stream quote updates
        try:
            while True:
                msg_data = await self.ws.recv()
                msg = self._decode_message(msg_data)
                
                if "StreamEnd" in msg:
                    stream_end = msg["StreamEnd"]
                    if stream_end.get("errorCode"):
                        raise Exception(
                            f"Stream ended with error {stream_end['errorCode']}: "
                            f"{stream_end.get('errorMessage', 'Unknown error')}"
                        )
                    break
                
                if "StreamData" in msg:
                    stream_data = msg["StreamData"]
                    payload = stream_data.get("payload", {})
                    
                    if "SwapQuotes" in payload:
                        quotes_data = payload["SwapQuotes"]
                        yield self._parse_swap_quotes(quotes_data)
        
        except asyncio.CancelledError:
            # User cancelled, stop the stream
            await self.stop_stream()
            raise
    
    def _parse_swap_quotes(self, data: Dict[str, Any]) -> SwapQuotes:
        """Parse SwapQuotes from protocol data."""
        quotes_dict = {}
        
        for provider_id, route in data.get("quotes", {}).items():
            quotes_dict[provider_id] = SwapQuote(
                provider=provider_id,
                in_amount=route.get("inAmount", 0),
                out_amount=route.get("outAmount", 0),
                slippage_bps=route.get("slippageBps", 0),
                route_steps=route.get("steps", []),
                instructions=route.get("instructions", []),
                address_lookup_tables=[
                    addr for addr in route.get("addressLookupTables", [])
                ],
                compute_units=route.get("computeUnits"),
                transaction=route.get("transaction"),
                reference_id=route.get("referenceId"),
            )
        
        return SwapQuotes(
            id=data.get("id", ""),
            input_mint=data.get("inputMint", b""),
            output_mint=data.get("outputMint", b""),
            swap_mode=data.get("swapMode", "ExactIn"),
            amount=data.get("amount", 0),
            quotes=quotes_dict,
        )
    
    async def stop_stream(self) -> None:
        """Stop the current quote stream."""
        if not self.ws or not self.stream_id:
            return
        
        request_data = {
            "StopStream": {
                "id": self.stream_id
            }
        }
        
        encoded = self._encode_request(request_data)
        await self.ws.send(encoded)
        
        # Wait for confirmation
        response_data = await self.ws.recv()
        response = self._decode_message(response_data)
        
        if "Error" in response:
            error = response["Error"]
            raise Exception(f"Failed to stop stream: {error['message']}")
        
        self.stream_id = None
    
    async def get_server_info(self) -> Dict[str, Any]:
        """Get server information and settings."""
        if not self.ws:
            await self.connect()
        
        request_data = {"GetInfo": {}}
        encoded = self._encode_request(request_data)
        await self.ws.send(encoded)
        
        response_data = await self.ws.recv()
        response = self._decode_message(response_data)
        
        if "Error" in response:
            error = response["Error"]
            raise Exception(f"Failed to get server info: {error['message']}")
        
        if "Response" in response:
            return response["Response"].get("data", {}).get("GetInfo", {})
        
        return {}


async def get_best_quote_from_stream(
    input_mint: str,
    output_mint: str,
    amount: int,
    user_public_key: str,
    slippage_bps: int = 50,
    timeout_seconds: float = 30.0,
) -> Optional[tuple[str, SwapQuote, SwapQuotes]]:
    """
    Connect to Titan, stream quotes, and return the best one.
    
    This is a convenience function that handles connection, streaming,
    and finding the best quote automatically.
    
    Returns:
        Tuple of (provider_id, best_quote, all_quotes) or None if failed
    """
    client = TitanClient()
    
    try:
        best_provider = None
        best_quote = None
        latest_quotes = None
        
        async for quotes in client.request_swap_quotes(
            input_mint=input_mint,
            output_mint=output_mint,
            amount=amount,
            user_public_key=user_public_key,
            slippage_bps=slippage_bps,
        ):
            latest_quotes = quotes
            
            # Find best quote (highest out_amount for ExactIn)
            for provider_id, quote in quotes.quotes.items():
                if best_quote is None or quote.out_amount > best_quote.out_amount:
                    best_provider = provider_id
                    best_quote = quote
        
        return (best_provider, best_quote, latest_quotes) if best_quote else None
    
    finally:
        await client.close()

