import json
import asyncio
import threading
import time
import os
from typing import Dict, Optional, Set, Callable
from datetime import datetime
import websockets
from websockets.client import WebSocketClientProtocol
from websockets.exceptions import ConnectionClosed, ConnectionClosedError, ConnectionClosedOK
import logging

logger = logging.getLogger(__name__)

####################################
# Configuration
####################################

COINGECKO_API_KEY = os.getenv("COINGECKO_API_KEY")
WEBSOCKET_URL = f"wss://stream.coingecko.com/v1?x_cg_pro_api_key={COINGECKO_API_KEY}"
REALTIME_ENABLED = os.getenv("REALTIME_PRICE_ENABLED", "true").lower() == "true"

# Network ID mappings for OnchainSimpleTokenPrice
NETWORK_MAPPINGS = {
    "solana": "solana",
    "sol": "solana",
    "ethereum": "eth",
    "eth": "eth",
    "bsc": "bsc",
    "binance": "bsc",
    "polygon": "polygon",
    "matic": "polygon",
    "arbitrum": "arbitrum",
    "optimism": "optimism",
    "avalanche": "avax",
    "avax": "avax",
}

# Token address mappings for common Solana tokens
SOLANA_TOKEN_ADDRESSES = {
    "sol": "So11111111111111111111111111111111111111112",
    "usdc": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "usdt": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    "bonk": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    "jup": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    "pyth": "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    "jto": "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
    "wen": "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk",
}

####################################
# Price Cache
####################################

class PriceData:
    """Container for price data with metadata."""
    def __init__(self, 
                 price: float,
                 market_cap: Optional[float] = None,
                 volume_24h: Optional[float] = None,
                 price_change_24h_pct: Optional[float] = None,
                 last_updated: Optional[int] = None):
        self.price = price
        self.market_cap = market_cap
        self.volume_24h = volume_24h
        self.price_change_24h_pct = price_change_24h_pct
        self.last_updated = last_updated or int(time.time())
        self.received_at = time.time()
    
    def to_dict(self) -> dict:
        return {
            "price": self.price,
            "market_cap": self.market_cap,
            "volume_24h": self.volume_24h,
            "price_change_24h_pct": self.price_change_24h_pct,
            "last_updated": self.last_updated,
            "age_seconds": time.time() - self.received_at
        }


class PriceCache:
    """Thread-safe in-memory cache for real-time prices."""
    
    def __init__(self):
        self._cache: Dict[str, PriceData] = {}
        self._lock = threading.Lock()
    
    def set(self, token_id: str, price_data: PriceData):
        """Store price data for a token."""
        with self._lock:
            self._cache[token_id] = price_data
    
    def get(self, token_id: str) -> Optional[PriceData]:
        """Retrieve price data for a token."""
        with self._lock:
            return self._cache.get(token_id)
    
    def get_price(self, token_id: str) -> Optional[float]:
        """Quick access to just the price value."""
        data = self.get(token_id)
        return data.price if data else None
    
    def has(self, token_id: str) -> bool:
        """Check if token is in cache."""
        with self._lock:
            return token_id in self._cache
    
    def get_all(self) -> Dict[str, dict]:
        """Get all cached prices."""
        with self._lock:
            return {k: v.to_dict() for k, v in self._cache.items()}
    
    def remove(self, token_id: str):
        """Remove a token from cache."""
        with self._lock:
            self._cache.pop(token_id, None)
    
    def clear(self):
        """Clear all cached data."""
        with self._lock:
            self._cache.clear()


####################################
# Websocket Manager
####################################

class WebsocketManager:
    """Manages persistent websocket connections to CoinGecko streaming API."""
    
    def __init__(self, cache: PriceCache):
        self.cache = cache
        self.running = False
        self.reconnect_delay = 1  # Start with 1 second
        self.max_reconnect_delay = 60  # Max 60 seconds
        
        # Track subscribed tokens for each channel
        self.cg_tokens: Set[str] = set()  # CoinGecko IDs for CGSimplePrice
        self.onchain_tokens: Set[str] = set()  # network:address for OnchainSimpleTokenPrice
        
        # Websocket connections
        self.cg_ws: Optional[WebSocketClientProtocol] = None
        self.onchain_ws: Optional[WebSocketClientProtocol] = None
        
        # Background thread
        self.thread: Optional[threading.Thread] = None
        self.loop: Optional[asyncio.AbstractEventLoop] = None
    
    def start(self):
        """Start the websocket manager in a background thread."""
        if self.running or not REALTIME_ENABLED:
            return
        
        # Warn if API key is missing
        if not COINGECKO_API_KEY:
            logger.warning("CoinGecko API key not found - websocket streaming will not work")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run_event_loop, daemon=True)
        self.thread.start()
        logger.debug("WebsocketManager started - connecting to CoinGecko streaming API")
    
    def stop(self):
        """Gracefully stop the websocket manager."""
        if not self.running:
            return
        
        self.running = False
        if self.loop and self.loop.is_running():
            # Schedule cleanup
            asyncio.run_coroutine_threadsafe(self._cleanup(), self.loop)
        
        if self.thread:
            self.thread.join(timeout=5)
        
        logger.info("WebsocketManager stopped")
    
    def _run_event_loop(self):
        """Run the asyncio event loop in the background thread."""
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        
        try:
            self.loop.run_until_complete(self._maintain_connections())
        except Exception as e:
            logger.error(f"Event loop error: {e}")
        finally:
            self.loop.close()
    
    async def _maintain_connections(self):
        """Main coroutine to maintain both websocket connections."""
        while self.running:
            try:
                # Run both connection handlers concurrently
                await asyncio.gather(
                    self._handle_cg_simple_price(),
                    self._handle_onchain_token_price(),
                    return_exceptions=True
                )
            except Exception as e:
                logger.error(f"Connection maintenance error: {e}")
                await asyncio.sleep(self.reconnect_delay)
                self.reconnect_delay = min(self.reconnect_delay * 2, self.max_reconnect_delay)
    
    async def _handle_cg_simple_price(self):
        """Handle CGSimplePrice channel connection and messages."""
        # Wait briefly for initial tokens to be subscribed
        for _ in range(5):
            if self.cg_tokens:
                break
            await asyncio.sleep(0.5)
        
        if not self.cg_tokens:
            # No tokens after waiting, sleep and retry
            await asyncio.sleep(5)
            return
        
        try:
            async with websockets.connect(WEBSOCKET_URL, ping_interval=20, ping_timeout=10) as ws:
                self.cg_ws = ws
                self.reconnect_delay = 1  # Reset on successful connection
                logger.debug("CGSimplePrice websocket connected")
                
                # Subscribe to channel
                subscribe_msg = {
                    "command": "subscribe",
                    "identifier": json.dumps({"channel": "CGSimplePrice"})
                }
                await ws.send(json.dumps(subscribe_msg))
                logger.debug(f"Sent channel subscription: {subscribe_msg}")
                
                # Wait for confirmation
                response = await ws.recv()
                logger.debug(f"CGSimplePrice channel response: {response}")
                
                # Subscribe to tokens if we have any
                if self.cg_tokens:
                    token_msg = {
                        "command": "message",
                        "identifier": json.dumps({"channel": "CGSimplePrice"}),
                        "data": json.dumps({
                            "coin_id": list(self.cg_tokens),
                            "action": "set_tokens"
                        })
                    }
                    await ws.send(json.dumps(token_msg))
                    logger.debug(f"CGSimplePrice: Subscribed to {len(self.cg_tokens)} tokens")
                
                # Keep track of subscribed tokens
                last_token_set = set(self.cg_tokens)
                
                # Listen for messages
                while self.running:
                    try:
                        # Check if token list changed
                        current_tokens = set(self.cg_tokens)
                        if current_tokens != last_token_set and current_tokens:
                            # Update subscription
                            token_msg = {
                                "command": "message",
                                "identifier": json.dumps({"channel": "CGSimplePrice"}),
                                "data": json.dumps({
                                    "coin_id": list(current_tokens),
                                    "action": "set_tokens"
                                })
                            }
                            await ws.send(json.dumps(token_msg))
                            logger.debug(f"Updated subscription to {len(current_tokens)} tokens")
                            last_token_set = current_tokens
                        
                        # Receive messages
                        message = await asyncio.wait_for(ws.recv(), timeout=5)
                        await self._process_cg_message(message)
                        
                    except asyncio.TimeoutError:
                        # Timeout is normal, just continue
                        continue
                
        except (ConnectionClosed, ConnectionClosedError, ConnectionClosedOK):
            # Silently handle normal connection closures (common during idle times)
            logger.debug("CGSimplePrice connection closed normally")
            await asyncio.sleep(self.reconnect_delay)
        except Exception as e:
            # Only log unexpected errors
            error_msg = str(e)
            if "connection" not in error_msg.lower() and "close" not in error_msg.lower():
                logger.error(f"CGSimplePrice error: {error_msg}")
            await asyncio.sleep(self.reconnect_delay)
    
    async def _handle_onchain_token_price(self):
        """Handle OnchainSimpleTokenPrice channel connection and messages."""
        # Wait briefly for initial tokens to be subscribed
        for _ in range(5):
            if self.onchain_tokens:
                break
            await asyncio.sleep(0.5)
        
        if not self.onchain_tokens:
            # No tokens after waiting, sleep and retry
            await asyncio.sleep(5)
            return
        
        try:
            async with websockets.connect(WEBSOCKET_URL, ping_interval=20, ping_timeout=10) as ws:
                self.onchain_ws = ws
                self.reconnect_delay = 1  # Reset on successful connection
                logger.debug("OnchainSimpleTokenPrice websocket connected")
                
                # Subscribe to channel
                subscribe_msg = {
                    "command": "subscribe",
                    "identifier": json.dumps({"channel": "OnchainSimpleTokenPrice"})
                }
                await ws.send(json.dumps(subscribe_msg))
                logger.debug(f"Sent channel subscription: {subscribe_msg}")
                
                # Wait for confirmation
                response = await ws.recv()
                logger.debug(f"OnchainSimpleTokenPrice channel response: {response}")
                
                # Subscribe to tokens if we have any
                if self.onchain_tokens:
                    token_msg = {
                        "command": "message",
                        "identifier": json.dumps({"channel": "OnchainSimpleTokenPrice"}),
                        "data": json.dumps({
                            "network_id:token_addresses": list(self.onchain_tokens),
                            "action": "set_tokens"
                        })
                    }
                    await ws.send(json.dumps(token_msg))
                    logger.debug(f"OnchainSimpleTokenPrice: Subscribed to {len(self.onchain_tokens)} tokens")
                
                # Keep track of subscribed tokens
                last_token_set = set(self.onchain_tokens)
                
                # Listen for messages
                while self.running:
                    try:
                        # Check if token list changed
                        current_tokens = set(self.onchain_tokens)
                        if current_tokens != last_token_set and current_tokens:
                            # Update subscription
                            token_msg = {
                                "command": "message",
                                "identifier": json.dumps({"channel": "OnchainSimpleTokenPrice"}),
                                "data": json.dumps({
                                    "network_id:token_addresses": list(current_tokens),
                                    "action": "set_tokens"
                                })
                            }
                            await ws.send(json.dumps(token_msg))
                            logger.debug(f"Updated subscription to {len(current_tokens)} onchain tokens")
                            last_token_set = current_tokens
                        
                        # Receive messages
                        message = await asyncio.wait_for(ws.recv(), timeout=5)
                        await self._process_onchain_message(message)
                        
                    except asyncio.TimeoutError:
                        # Timeout is normal, just continue
                        continue
                
        except (ConnectionClosed, ConnectionClosedError, ConnectionClosedOK):
            # Silently handle normal connection closures
            logger.debug("OnchainSimpleTokenPrice connection closed normally")
            await asyncio.sleep(self.reconnect_delay)
        except Exception as e:
            # Only log unexpected errors
            error_msg = str(e)
            if "connection" not in error_msg.lower() and "close" not in error_msg.lower():
                logger.error(f"OnchainSimpleTokenPrice error: {error_msg}")
            await asyncio.sleep(self.reconnect_delay)
    
    async def _process_cg_message(self, message: str):
        """Process a message from CGSimplePrice channel."""
        try:
            data = json.loads(message)
            
            # Handle subscription confirmation messages
            if isinstance(data, dict) and data.get("type") == "confirm_subscription":
                logger.debug(f"CGSimplePrice channel confirmed: {data}")
                return
            
            # Handle status/code messages (subscription success, errors, etc)
            if isinstance(data, dict) and "code" in data:
                code = data.get("code")
                message_text = data.get("message", "")
                if code == 2000:
                    logger.debug(f"CGSimplePrice: {message_text}")
                elif code == 4008:
                    # Silently ignore invalid coin ID errors (common for abbreviated names)
                    logger.debug(f"CGSimplePrice: Invalid coin ID - {message_text}")
                else:
                    logger.warning(f"CGSimplePrice status {code}: {message_text}")
                return
            
            # Handle price data
            if isinstance(data, dict) and data.get("c") == "C1":
                coin_id = data.get("i")
                price = data.get("p")
                
                if coin_id and price:
                    price_data = PriceData(
                        price=float(price),
                        market_cap=data.get("m"),
                        volume_24h=data.get("v"),
                        price_change_24h_pct=data.get("pp"),
                        last_updated=data.get("t")
                    )
                    self.cache.set(coin_id, price_data)
                    logger.debug(f"Price update: {coin_id} = ${price}")
            else:
                # Log unexpected message format for debugging
                logger.debug(f"Unhandled CGSimplePrice message: {message[:200]}")
        
        except Exception as e:
            logger.error(f"Error processing CG message: {e} | Message: {message[:100]}")
    
    async def _process_onchain_message(self, message: str):
        """Process a message from OnchainSimpleTokenPrice channel."""
        try:
            data = json.loads(message)
            
            # Handle subscription confirmation messages
            if isinstance(data, dict) and data.get("type") == "confirm_subscription":
                logger.debug(f"OnchainSimpleTokenPrice channel confirmed: {data}")
                return
            
            # Handle status/code messages (subscription success, errors, etc)
            if isinstance(data, dict) and "code" in data:
                code = data.get("code")
                message_text = data.get("message", "")
                if code == 2000:
                    logger.debug(f"OnchainSimpleTokenPrice: {message_text}")
                elif code == 4008:
                    # Silently ignore invalid token/network errors
                    logger.debug(f"OnchainSimpleTokenPrice: Invalid token - {message_text}")
                else:
                    logger.warning(f"OnchainSimpleTokenPrice status {code}: {message_text}")
                return
            
            # Handle price data
            if isinstance(data, dict) and data.get("c") == "G1":
                network_id = data.get("n")
                token_address = data.get("ta")
                price = data.get("p")
                
                if network_id and token_address and price:
                    # Store with both network:address and just coin name if known
                    cache_key = f"{network_id}:{token_address}"
                    price_data = PriceData(
                        price=float(price),
                        market_cap=data.get("m"),
                        volume_24h=data.get("v"),
                        price_change_24h_pct=data.get("pp"),
                        last_updated=data.get("t")
                    )
                    self.cache.set(cache_key, price_data)
                    
                    # Also store under common name if this is a known token
                    for name, addr in SOLANA_TOKEN_ADDRESSES.items():
                        if token_address.lower() == addr.lower():
                            self.cache.set(name, price_data)
                            logger.debug(f"Price update: {name} ({network_id}) = ${price}")
                            break
                    else:
                        logger.debug(f"Price update: {network_id}:{token_address} = ${price}")
            else:
                # Log unexpected message format for debugging
                logger.debug(f"Unhandled OnchainSimpleTokenPrice message: {message[:200]}")
        
        except Exception as e:
            logger.error(f"Error processing onchain message: {e} | Message: {message[:100]}")
    
    async def _cleanup(self):
        """Clean up websocket connections."""
        if self.cg_ws:
            await self.cg_ws.close()
        if self.onchain_ws:
            await self.onchain_ws.close()
    
    def subscribe_cg_token(self, coin_id: str):
        """Subscribe to a token via CGSimplePrice channel."""
        if coin_id not in self.cg_tokens:
            self.cg_tokens.add(coin_id)
            logger.info(f"Subscribed to CGSimplePrice: {coin_id}")
    
    def subscribe_onchain_token(self, network: str, token_address: str):
        """Subscribe to a token via OnchainSimpleTokenPrice channel."""
        token_key = f"{network}:{token_address}"
        if token_key not in self.onchain_tokens:
            self.onchain_tokens.add(token_key)
            logger.info(f"Subscribed to OnchainSimpleTokenPrice: {token_key}")
    
    def unsubscribe_cg_token(self, coin_id: str):
        """Unsubscribe from a CGSimplePrice token."""
        self.cg_tokens.discard(coin_id)
        self.cache.remove(coin_id)
        logger.info(f"Unsubscribed from CGSimplePrice: {coin_id}")
    
    def unsubscribe_onchain_token(self, network: str, token_address: str):
        """Unsubscribe from an OnchainSimpleTokenPrice token."""
        token_key = f"{network}:{token_address}"
        self.onchain_tokens.discard(token_key)
        self.cache.remove(token_key)
        logger.info(f"Unsubscribed from OnchainSimpleTokenPrice: {token_key}")


####################################
# Global Instance
####################################

_price_cache = PriceCache()
_websocket_manager = WebsocketManager(_price_cache)


def get_price_cache() -> PriceCache:
    """Get the global price cache instance."""
    return _price_cache


def get_websocket_manager() -> WebsocketManager:
    """Get the global websocket manager instance."""
    return _websocket_manager


def initialize_realtime_prices(common_tokens: Optional[list] = None):
    """Initialize real-time price streaming with optional pre-subscriptions."""
    if not REALTIME_ENABLED:
        logger.info("Real-time prices disabled via REALTIME_PRICE_ENABLED=false")
        return
    
    manager = get_websocket_manager()
    
    # Pre-subscribe to common tokens if provided
    if common_tokens:
        for token in common_tokens:
            token_lower = token.lower()
            
            # Check if it's a known Solana token
            if token_lower in SOLANA_TOKEN_ADDRESSES:
                address = SOLANA_TOKEN_ADDRESSES[token_lower]
                manager.subscribe_onchain_token("solana", address)
            else:
                # Subscribe via CGSimplePrice (works for BTC, ETH, etc.)
                manager.subscribe_cg_token(token_lower)
    
    # Start the manager
    manager.start()
    logger.info("Real-time price streaming initialized")


def shutdown_realtime_prices():
    """Shutdown real-time price streaming."""
    manager = get_websocket_manager()
    manager.stop()

