from typing import Any
from typing_extensions import Callable
from maximus.tools.prices import get_price_snapshot, get_historical_prices, get_ohlc_data, visualize_crypto_chart
from maximus.tools.market import get_top_cryptocurrencies, get_global_market_data, get_trending_coins
from maximus.tools.info import get_coin_info, search_cryptocurrency
from maximus.tools.solana import get_wallet_balances, get_transaction_history, get_token_accounts

TOOLS: list[Callable[..., Any]] = [
    get_price_snapshot,
    get_historical_prices,
    get_ohlc_data,
    visualize_crypto_chart,
    get_top_cryptocurrencies,
    get_global_market_data,
    get_trending_coins,
    get_coin_info,
    search_cryptocurrency,
    get_wallet_balances,
    get_transaction_history,
    get_token_accounts,
]
