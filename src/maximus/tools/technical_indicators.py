from langchain.tools import tool
from typing import Literal, Optional
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np
import talib
from maximus.tools.prices import get_ohlc_data

####################################
# Core Calculation Functions
####################################

def calculate_wavetrend(prices_df: pd.DataFrame, n1: int = 9, n2: int = 21) -> dict:
    """
    Calculate WaveTrend Channel indicator.
    
    Port from PineScript:
    ap = (high + low + close) / 3
    esa = ta.ema(ap, n1)
    d = ta.ema(abs(ap - esa), n1)
    ci = (ap - esa) / (0.015 * d)
    tci = ta.ema(ci, n2)
    wt1 = tci
    wt2 = ta.sma(wt1, 2)
    
    Returns:
        dict: WaveTrend values and overbought/oversold flags
    """
    # Calculate average price (HLC3)
    ap = (prices_df['high'] + prices_df['low'] + prices_df['close']) / 3
    
    # Calculate ESA (Exponential Moving Average of ap)
    esa = talib.EMA(ap.values, timeperiod=n1)
    
    # Calculate d (EMA of absolute difference)
    d = talib.EMA(np.abs(ap.values - esa), timeperiod=n1)
    
    # Calculate CI (Channel Index)
    ci = (ap.values - esa) / (0.015 * d)
    
    # Calculate TCI (EMA of CI)
    tci = talib.EMA(ci, timeperiod=n2)
    
    # WaveTrend lines
    wt1 = tci
    wt2 = talib.SMA(wt1, timeperiod=2)
    
    # Get current values (last valid value)
    wt1_current = wt1[-1] if not np.isnan(wt1[-1]) else 0
    wt2_current = wt2[-1] if not np.isnan(wt2[-1]) else 0
    
    return {
        'wt1': wt1_current,
        'wt2': wt2_current,
        'wt1_series': pd.Series(wt1, index=prices_df.index),
        'wt2_series': pd.Series(wt2, index=prices_df.index),
        'difference': wt1_current - wt2_current,
        'overbought': wt1_current > 60,
        'overbought_strong': wt1_current > 53,
        'oversold': wt1_current < -60,
        'oversold_strong': wt1_current < -53
    }


def calculate_money_flow(prices_df: pd.DataFrame, period: int = 9, multiplier: float = 5.0) -> float:
    """
    Calculate Money Flow indicator.
    
    Port from PineScript:
    hlc3 = (high + low + close) / 3
    rawMoneyFlow = (2 * ta.sma(hlc3 - ta.sma(hlc3, period), period)) / ta.sma(high - low, period)
    moneyFlow = rawMoneyFlow * multiplier
    
    Returns:
        float: Money flow value
    """
    # Calculate HLC3
    hlc3 = (prices_df['high'] + prices_df['low'] + prices_df['close']) / 3
    
    # Calculate components
    hlc3_sma = talib.SMA(hlc3.values, timeperiod=period)
    hlc3_diff = hlc3.values - hlc3_sma
    hlc3_diff_sma = talib.SMA(hlc3_diff, timeperiod=period)
    
    hl_range = prices_df['high'].values - prices_df['low'].values
    hl_range_sma = talib.SMA(hl_range, timeperiod=period)
    
    # Calculate raw money flow
    raw_money_flow = (2 * hlc3_diff_sma) / hl_range_sma
    
    # Apply multiplier
    money_flow = raw_money_flow * multiplier
    
    # Get current value
    current_value = money_flow[-1] if not np.isnan(money_flow[-1]) else 0
    
    return current_value


def calculate_rsi(close_prices: pd.Series, length: int = 14, smooth_length: int = 5) -> dict:
    """
    Calculate RSI and smoothed RSI.
    
    Port from PineScript:
    rsi = ta.rsi(close, rsiLength)
    smoothedRsi = ta.sma(rsi, rsiSmoothLength)
    
    Returns:
        dict: RSI values and overbought/oversold flags
    """
    # Calculate RSI
    rsi = talib.RSI(close_prices.values, timeperiod=length)
    
    # Calculate smoothed RSI
    smoothed_rsi = talib.SMA(rsi, timeperiod=smooth_length)
    
    # Get current values
    rsi_current = rsi[-1] if not np.isnan(rsi[-1]) else 50
    smoothed_current = smoothed_rsi[-1] if not np.isnan(smoothed_rsi[-1]) else 50
    
    return {
        'value': rsi_current,
        'smoothed': smoothed_current,
        'rsi_series': pd.Series(rsi, index=close_prices.index),
        'overbought': rsi_current > 70,
        'oversold': rsi_current < 30
    }


def calculate_stochastic_rsi(
    close_prices: pd.Series,
    stoch_length: int = 14,
    smooth_k: int = 21,
    smooth_d: int = 9,
    additional_smooth_k: int = 3,
    additional_smooth_d: int = 3
) -> dict:
    """
    Calculate Stochastic RSI.
    
    Port from PineScript:
    stoch_rsi = ta.stoch(rsi, rsi, rsi, stochLength)
    smoothK = ta.sma(stoch_rsi, stochSmoothK)
    smoothD = ta.sma(smoothK, stochSmoothD)
    additionalSmoothK = ta.sma(smoothK, stochSmoothKAdditional)
    additionalSmoothD = ta.sma(smoothD, stochSmoothDAdditional)
    
    Returns:
        dict: Stochastic RSI values and overbought/oversold flags
    """
    # First calculate RSI
    rsi = talib.RSI(close_prices.values, timeperiod=14)
    
    # Calculate Stochastic of RSI
    # Using RSI as high, low, and close for stochastic calculation
    stoch_k, stoch_d = talib.STOCH(
        rsi, rsi, rsi,
        fastk_period=stoch_length,
        slowk_period=1,
        slowk_matype=0,
        slowd_period=1,
        slowd_matype=0
    )
    
    # Smooth K and D
    smooth_k_values = talib.SMA(stoch_k, timeperiod=smooth_k)
    smooth_d_values = talib.SMA(smooth_k_values, timeperiod=smooth_d)
    
    # Additional smoothing
    additional_k = talib.SMA(smooth_k_values, timeperiod=additional_smooth_k)
    additional_d = talib.SMA(smooth_d_values, timeperiod=additional_smooth_d)
    
    # Get current values
    k_current = smooth_k_values[-1] if not np.isnan(smooth_k_values[-1]) else 50
    d_current = smooth_d_values[-1] if not np.isnan(smooth_d_values[-1]) else 50
    k_add_current = additional_k[-1] if not np.isnan(additional_k[-1]) else 50
    d_add_current = additional_d[-1] if not np.isnan(additional_d[-1]) else 50
    
    return {
        'k': k_current,
        'd': d_current,
        'k_additional': k_add_current,
        'd_additional': d_add_current,
        'overbought': k_current > 80 or d_current > 80,
        'oversold': k_current < 20 or d_current < 20
    }


def detect_wavetrend_crosses(wt1_series: pd.Series, wt2_series: pd.Series) -> dict:
    """
    Detect WaveTrend crosses.
    
    Port from PineScript:
    bullishCross = ta.cross(wt1, wt2) and wt2 > wt1
    bearishCross = ta.cross(wt1, wt2) and wt2 < wt1
    
    Returns:
        dict: Cross detection flags
    """
    if len(wt1_series) < 2 or len(wt2_series) < 2:
        return {
            'bullish_cross': False,
            'bearish_cross': False
        }
    
    # Get last two values
    wt1_curr = wt1_series.iloc[-1]
    wt1_prev = wt1_series.iloc[-2]
    wt2_curr = wt2_series.iloc[-1]
    wt2_prev = wt2_series.iloc[-2]
    
    # Check for crosses
    crossed = (wt1_prev <= wt2_prev and wt1_curr > wt2_curr) or \
              (wt1_prev >= wt2_prev and wt1_curr < wt2_curr)
    
    bullish_cross = crossed and wt1_curr > wt2_curr
    bearish_cross = crossed and wt1_curr < wt2_curr
    
    return {
        'bullish_cross': bool(bullish_cross),
        'bearish_cross': bool(bearish_cross)
    }


def detect_tops_bottoms(
    wt1_series: pd.Series,
    close_prices: pd.Series,
    divergence_length: int = 28
) -> dict:
    """
    Detect potential tops and bottoms.
    
    Port from PineScript:
    wt1_peak = ta.highest(wt1, wtDivergenceLength)
    wt1_trough = ta.lowest(wt1, wtDivergenceLength)
    bullishWTDivergence = ta.crossover(wt1, wt1_trough) and ta.crossover(close, ta.lowest(close, wtDivergenceLength))
    bearishWTDivergence = ta.crossunder(wt1, wt1_peak) and ta.crossunder(close, ta.highest(close, wtDivergenceLength))
    
    Returns:
        dict: Potential top/bottom flags
    """
    if len(wt1_series) < divergence_length + 2:
        return {
            'potential_top': False,
            'potential_bottom': False
        }
    
    # Calculate highest and lowest over lookback period
    wt1_peak = wt1_series.rolling(window=divergence_length).max()
    wt1_trough = wt1_series.rolling(window=divergence_length).min()
    close_high = close_prices.rolling(window=divergence_length).max()
    close_low = close_prices.rolling(window=divergence_length).min()
    
    # Get last two values
    wt1_curr = wt1_series.iloc[-1]
    wt1_prev = wt1_series.iloc[-2]
    wt1_trough_curr = wt1_trough.iloc[-1]
    wt1_trough_prev = wt1_trough.iloc[-2]
    wt1_peak_curr = wt1_peak.iloc[-1]
    wt1_peak_prev = wt1_peak.iloc[-2]
    
    close_curr = close_prices.iloc[-1]
    close_prev = close_prices.iloc[-2]
    close_low_curr = close_low.iloc[-1]
    close_low_prev = close_low.iloc[-2]
    close_high_curr = close_high.iloc[-1]
    close_high_prev = close_high.iloc[-2]
    
    # Check for crossovers/crossunders
    wt1_crosses_up_trough = wt1_prev <= wt1_trough_prev and wt1_curr > wt1_trough_curr
    close_crosses_up_low = close_prev <= close_low_prev and close_curr > close_low_curr
    
    wt1_crosses_down_peak = wt1_prev >= wt1_peak_prev and wt1_curr < wt1_peak_curr
    close_crosses_down_high = close_prev >= close_high_prev and close_curr < close_high_curr
    
    potential_bottom = wt1_crosses_up_trough and close_crosses_up_low
    potential_top = wt1_crosses_down_peak and close_crosses_down_high
    
    return {
        'potential_top': bool(potential_top),
        'potential_bottom': bool(potential_bottom)
    }


def find_pivots(series: pd.Series, lookback_left: int, lookback_right: int) -> dict:
    """
    Find pivot highs and lows in a series.
    
    Mimics PineScript's ta.pivothigh() and ta.pivotlow()
    
    Returns:
        dict: {'pivot_highs': list, 'pivot_lows': list, 'pivot_high_indices': list, 'pivot_low_indices': list}
    """
    pivot_highs = []
    pivot_high_indices = []
    pivot_lows = []
    pivot_low_indices = []
    
    for i in range(lookback_left, len(series) - lookback_right):
        # Check if current point is a pivot high
        is_pivot_high = True
        for j in range(i - lookback_left, i + lookback_right + 1):
            if j != i and series.iloc[j] >= series.iloc[i]:
                is_pivot_high = False
                break
        
        if is_pivot_high:
            pivot_highs.append(series.iloc[i])
            pivot_high_indices.append(i)
        
        # Check if current point is a pivot low
        is_pivot_low = True
        for j in range(i - lookback_left, i + lookback_right + 1):
            if j != i and series.iloc[j] <= series.iloc[i]:
                is_pivot_low = False
                break
        
        if is_pivot_low:
            pivot_lows.append(series.iloc[i])
            pivot_low_indices.append(i)
    
    return {
        'pivot_highs': pivot_highs,
        'pivot_high_indices': pivot_high_indices,
        'pivot_lows': pivot_lows,
        'pivot_low_indices': pivot_low_indices
    }


def detect_divergences(
    prices_df: pd.DataFrame,
    oscillator_series: pd.Series,
    lookback_left: int = 10,
    lookback_right: int = 10,
    range_lower: int = 10,
    range_upper: int = 100
) -> dict:
    """
    Detect regular and hidden divergences.
    
    Port from PineScript divergence detection logic (lines 221-276).
    
    Returns:
        dict: Divergence flags for regular/hidden bullish/bearish
    """
    if len(oscillator_series) < range_upper + lookback_left + lookback_right:
        return {
            'regular_bullish': False,
            'regular_bearish': False,
            'hidden_bullish': False,
            'hidden_bearish': False
        }
    
    # Find pivots
    pivots = find_pivots(oscillator_series, lookback_left, lookback_right)
    
    # Get recent pivot indices
    recent_pivot_low_idx = pivots['pivot_low_indices'][-1] if pivots['pivot_low_indices'] else None
    recent_pivot_high_idx = pivots['pivot_high_indices'][-1] if pivots['pivot_high_indices'] else None
    
    regular_bullish = False
    regular_bearish = False
    hidden_bullish = False
    hidden_bearish = False
    
    # Check for regular bullish divergence
    if recent_pivot_low_idx is not None and len(pivots['pivot_low_indices']) >= 2:
        prev_pivot_low_idx = pivots['pivot_low_indices'][-2]
        bars_between = recent_pivot_low_idx - prev_pivot_low_idx
        
        if range_lower <= bars_between <= range_upper:
            # Price makes lower low, oscillator makes higher low
            price_ll = prices_df['low'].iloc[recent_pivot_low_idx] < prices_df['low'].iloc[prev_pivot_low_idx]
            osc_hl = oscillator_series.iloc[recent_pivot_low_idx] > oscillator_series.iloc[prev_pivot_low_idx]
            osc_negative = oscillator_series.iloc[recent_pivot_low_idx] < 0
            
            regular_bullish = price_ll and osc_hl and osc_negative
            
            # Hidden bullish: price makes higher low, oscillator makes lower low
            price_hl = prices_df['low'].iloc[recent_pivot_low_idx] > prices_df['low'].iloc[prev_pivot_low_idx]
            osc_ll = oscillator_series.iloc[recent_pivot_low_idx] < oscillator_series.iloc[prev_pivot_low_idx]
            
            hidden_bullish = price_hl and osc_ll
    
    # Check for regular bearish divergence
    if recent_pivot_high_idx is not None and len(pivots['pivot_high_indices']) >= 2:
        prev_pivot_high_idx = pivots['pivot_high_indices'][-2]
        bars_between = recent_pivot_high_idx - prev_pivot_high_idx
        
        if range_lower <= bars_between <= range_upper:
            # Price makes higher high, oscillator makes lower high
            price_hh = prices_df['high'].iloc[recent_pivot_high_idx] > prices_df['high'].iloc[prev_pivot_high_idx]
            osc_lh = oscillator_series.iloc[recent_pivot_high_idx] < oscillator_series.iloc[prev_pivot_high_idx]
            osc_positive = oscillator_series.iloc[recent_pivot_high_idx] > 0
            
            regular_bearish = price_hh and osc_lh and osc_positive
            
            # Hidden bearish: price makes lower high, oscillator makes higher high
            price_lh = prices_df['high'].iloc[recent_pivot_high_idx] < prices_df['high'].iloc[prev_pivot_high_idx]
            osc_hh = oscillator_series.iloc[recent_pivot_high_idx] > oscillator_series.iloc[prev_pivot_high_idx]
            
            hidden_bearish = price_lh and osc_hh
    
    return {
        'regular_bullish': regular_bullish,
        'regular_bearish': regular_bearish,
        'hidden_bullish': hidden_bullish,
        'hidden_bearish': hidden_bearish
    }


def generate_aggregated_signal(indicators: dict, signals: dict) -> dict:
    """
    Generate aggregated trading signal based on all indicators.
    
    Returns:
        dict: Aggregated signal with direction, strength, and reasons
    """
    score = 50  # Start neutral
    reasons = []
    
    wt = indicators['wavetrend']
    mf = indicators['money_flow']
    rsi = indicators['rsi']
    stoch = indicators['stochastic_rsi']
    
    # Strong buy signals (+40 points)
    if wt['oversold'] and signals['wavetrend_crosses']['bullish_cross']:
        score += 40
        reasons.append("WaveTrend oversold with bullish cross")
    
    if signals['divergences']['regular_bullish']:
        score += 40
        reasons.append("Regular bullish divergence detected")
    
    if signals['extremes']['potential_bottom']:
        score += 40
        reasons.append("Potential bottom signal")
    
    # Buy signals (+20 points)
    if wt['oversold'] and not signals['wavetrend_crosses']['bullish_cross']:
        score += 20
        reasons.append("WaveTrend oversold")
    
    if mf['fast_positive'] and rsi['oversold']:
        score += 20
        reasons.append("Positive money flow with oversold RSI")
    
    if signals['divergences']['hidden_bullish']:
        score += 20
        reasons.append("Hidden bullish divergence")
    
    if stoch['oversold']:
        score += 15
        reasons.append("Stochastic RSI oversold")
    
    # Strong sell signals (-40 points)
    if wt['overbought'] and signals['wavetrend_crosses']['bearish_cross']:
        score -= 40
        reasons.append("WaveTrend overbought with bearish cross")
    
    if signals['divergences']['regular_bearish']:
        score -= 40
        reasons.append("Regular bearish divergence detected")
    
    if signals['extremes']['potential_top']:
        score -= 40
        reasons.append("Potential top signal")
    
    # Sell signals (-20 points)
    if wt['overbought'] and not signals['wavetrend_crosses']['bearish_cross']:
        score -= 20
        reasons.append("WaveTrend overbought")
    
    if not mf['fast_positive'] and rsi['overbought']:
        score -= 20
        reasons.append("Negative money flow with overbought RSI")
    
    if signals['divergences']['hidden_bearish']:
        score -= 20
        reasons.append("Hidden bearish divergence")
    
    if stoch['overbought']:
        score -= 15
        reasons.append("Stochastic RSI overbought")
    
    # Clamp score to 0-100
    score = max(0, min(100, score))
    
    # Determine direction
    if score >= 90:
        direction = 'strong_buy'
    elif score >= 70:
        direction = 'buy'
    elif score <= 10:
        direction = 'strong_sell'
    elif score <= 30:
        direction = 'sell'
    else:
        direction = 'neutral'
        if not reasons:
            reasons.append("No strong signals detected")
    
    return {
        'direction': direction,
        'strength': score,
        'reasons': reasons
    }


####################################
# Main Tool
####################################

class SignalsInput(BaseModel):
    """Input for analyze_signals."""
    identifier: str = Field(
        description="Crypto identifier (e.g., 'bitcoin', 'BTC')"
    )
    days: Literal['7', '14', '30', '90', '180'] = Field(
        default='30',
        description="Historical data range for analysis"
    )
    vs_currency: str = Field(
        default='usd',
        description="Target currency for price data"
    )


@tool(args_schema=SignalsInput)
def analyze_signals(identifier: str, days: str = '30', vs_currency: str = 'usd') -> dict:
    """
    Analyzes cryptocurrency using Maximus technical signals.
    
    Provides comprehensive technical analysis including:
    - WaveTrend Channel: Momentum oscillator with overbought/oversold levels
    - Money Flow: Fast & slow volume-weighted momentum indicators
    - RSI: Relative Strength Index with smoothing
    - Stochastic RSI: Overbought/oversold momentum indicator
    - Divergences: Regular and hidden bullish/bearish divergence detection
    - WaveTrend Crosses: Trend reversal signals
    - Tops/Bottoms: Major reversal point detection
    - Aggregated Signal: Overall buy/sell/neutral recommendation
    
    Returns structured analysis with detailed indicator values and trading signals.
    Use this for making informed trading decisions based on multiple technical factors.
    """
    try:
        # 1. Fetch OHLC data
        try:
            ohlc_data = get_ohlc_data.invoke({
                "identifier": identifier,
                "vs_currency": vs_currency,
                "days": days,
                "show_chart": False
            })
        except Exception as e:
            return {
                'error': 'Failed to fetch OHLC data',
                'message': f'Could not retrieve price data for {identifier}: {str(e)}',
                'identifier': identifier
            }
        
        # 2. Convert to DataFrame
        if not ohlc_data or 'candles' not in ohlc_data:
            return {
                'error': 'Invalid data format',
                'message': f'No candle data returned for {identifier}',
                'identifier': identifier
            }
        
        df = pd.DataFrame(ohlc_data['candles'])
        
        if len(df) < 100:
            return {
                'error': 'Insufficient data',
                'message': f'Need at least 100 candles for accurate analysis, got {len(df)}. Try a longer time period (90 or 180 days).',
                'identifier': identifier,
                'coin_id': ohlc_data.get('id', 'unknown')
            }
        
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        df = df.set_index('timestamp')
        
        # 3. Calculate all indicators
        wavetrend = calculate_wavetrend(df, n1=9, n2=21)
        money_flow_fast = calculate_money_flow(df, period=9, multiplier=5.0)
        money_flow_slow = calculate_money_flow(df, period=10, multiplier=5.0)
        rsi_data = calculate_rsi(df['close'], length=14, smooth_length=5)
        stoch_rsi = calculate_stochastic_rsi(df['close'])
        
        # 4. Detect signals
        crosses = detect_wavetrend_crosses(wavetrend['wt1_series'], wavetrend['wt2_series'])
        tops_bottoms = detect_tops_bottoms(wavetrend['wt1_series'], df['close'], divergence_length=28)
        
        # Calculate MACD for divergence detection (as per PineScript)
        fast_ma = talib.SMA((df['high'] + df['low'] + df['close']).values / 3, timeperiod=9)
        slow_ma = talib.SMA((df['high'] + df['low'] + df['close']).values / 3, timeperiod=21)
        macd = (fast_ma - slow_ma) / slow_ma
        macd_series = pd.Series(macd, index=df.index)
        
        divergences = detect_divergences(
            df,
            macd_series,
            lookback_left=10,
            lookback_right=10,
            range_lower=10,
            range_upper=100
        )
        
        # 5. Structure indicator values
        indicators = {
            'wavetrend': {
                'wt1': float(wavetrend['wt1']),
                'wt2': float(wavetrend['wt2']),
                'difference': float(wavetrend['difference']),
                'overbought': wavetrend['overbought'],
                'overbought_strong': wavetrend['overbought_strong'],
                'oversold': wavetrend['oversold'],
                'oversold_strong': wavetrend['oversold_strong'],
            },
            'money_flow': {
                'fast': float(money_flow_fast),
                'slow': float(money_flow_slow),
                'fast_positive': money_flow_fast > 0,
                'slow_positive': money_flow_slow > 0
            },
            'rsi': {
                'value': float(rsi_data['value']),
                'smoothed': float(rsi_data['smoothed']),
                'overbought': rsi_data['overbought'],
                'oversold': rsi_data['oversold']
            },
            'stochastic_rsi': {
                'k': float(stoch_rsi['k']),
                'd': float(stoch_rsi['d']),
                'k_additional': float(stoch_rsi['k_additional']),
                'd_additional': float(stoch_rsi['d_additional']),
                'overbought': stoch_rsi['overbought'],
                'oversold': stoch_rsi['oversold']
            }
        }
        
        # 6. Structure signals
        signals = {
            'wavetrend_crosses': crosses,
            'divergences': divergences,
            'extremes': tops_bottoms
        }
        
        # 7. Generate aggregated signal
        aggregated_signal = generate_aggregated_signal(indicators, signals)
        
        # 8. Return complete analysis
        return {
            'coin': ohlc_data['id'],
            'timestamp': df.index[-1].isoformat(),
            'current_price': float(df['close'].iloc[-1]),
            'timeframe': f"{days} days",
            'signal': aggregated_signal,
            'indicators': indicators,
            'signals': signals
        }
    
    except Exception as e:
        import traceback
        return {
            'error': 'Analysis failed',
            'message': f'Signal analysis encountered an error: {str(e)}',
            'identifier': identifier,
            'traceback': traceback.format_exc()
        }

