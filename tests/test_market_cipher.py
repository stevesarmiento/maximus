"""
Tests for Maximus technical signals implementation.
"""
import pytest
import pandas as pd
import numpy as np
from unittest.mock import Mock, patch
from maximus.tools.technical_indicators import (
    calculate_wavetrend,
    calculate_money_flow,
    calculate_rsi,
    calculate_stochastic_rsi,
    detect_wavetrend_crosses,
    detect_tops_bottoms,
    find_pivots,
    detect_divergences,
    generate_aggregated_signal,
    analyze_signals
)


@pytest.fixture
def sample_price_data():
    """Create sample OHLC price data for testing."""
    np.random.seed(42)
    dates = pd.date_range('2024-01-01', periods=200, freq='1H')
    
    # Generate realistic price data
    base_price = 50000
    price_changes = np.random.randn(200) * 100
    close_prices = base_price + np.cumsum(price_changes)
    
    df = pd.DataFrame({
        'timestamp': dates,
        'open': close_prices + np.random.randn(200) * 50,
        'high': close_prices + np.abs(np.random.randn(200) * 100),
        'low': close_prices - np.abs(np.random.randn(200) * 100),
        'close': close_prices,
    })
    
    return df


class TestWaveTrend:
    """Test WaveTrend indicator calculations."""
    
    def test_calculate_wavetrend_returns_dict(self, sample_price_data):
        """Test that calculate_wavetrend returns expected structure."""
        result = calculate_wavetrend(sample_price_data, n1=9, n2=21)
        
        assert isinstance(result, dict)
        assert 'wt1' in result
        assert 'wt2' in result
        assert 'wt1_series' in result
        assert 'wt2_series' in result
        assert 'difference' in result
        assert 'overbought' in result
        assert 'oversold' in result
    
    def test_wavetrend_values_are_numeric(self, sample_price_data):
        """Test that WaveTrend values are valid numbers."""
        result = calculate_wavetrend(sample_price_data)
        
        assert isinstance(result['wt1'], (int, float))
        assert isinstance(result['wt2'], (int, float))
        assert not np.isnan(result['wt1'])
        assert not np.isnan(result['wt2'])
    
    def test_wavetrend_overbought_oversold_flags(self, sample_price_data):
        """Test overbought/oversold flag logic."""
        result = calculate_wavetrend(sample_price_data)
        
        # Flags should be boolean
        assert isinstance(result['overbought'], bool)
        assert isinstance(result['oversold'], bool)
        assert isinstance(result['overbought_strong'], bool)
        assert isinstance(result['oversold_strong'], bool)
        
        # Can't be both overbought and oversold
        assert not (result['overbought'] and result['oversold'])
    
    def test_wavetrend_series_length(self, sample_price_data):
        """Test that series outputs match input length."""
        result = calculate_wavetrend(sample_price_data)
        
        assert len(result['wt1_series']) == len(sample_price_data)
        assert len(result['wt2_series']) == len(sample_price_data)


class TestMoneyFlow:
    """Test Money Flow indicator calculations."""
    
    def test_calculate_money_flow_returns_float(self, sample_price_data):
        """Test that money flow returns a number."""
        result = calculate_money_flow(sample_price_data, period=9, multiplier=5.0)
        
        assert isinstance(result, (int, float))
        assert not np.isnan(result)
    
    def test_money_flow_with_different_periods(self, sample_price_data):
        """Test money flow with different period parameters."""
        fast = calculate_money_flow(sample_price_data, period=9, multiplier=5.0)
        slow = calculate_money_flow(sample_price_data, period=14, multiplier=5.0)
        
        assert isinstance(fast, (int, float))
        assert isinstance(slow, (int, float))
        # Values should be different
        assert fast != slow or len(sample_price_data) < 20


class TestRSI:
    """Test RSI calculations."""
    
    def test_calculate_rsi_returns_dict(self, sample_price_data):
        """Test that RSI returns expected structure."""
        result = calculate_rsi(sample_price_data['close'], length=14, smooth_length=5)
        
        assert isinstance(result, dict)
        assert 'value' in result
        assert 'smoothed' in result
        assert 'rsi_series' in result
        assert 'overbought' in result
        assert 'oversold' in result
    
    def test_rsi_values_in_range(self, sample_price_data):
        """Test that RSI values are between 0 and 100."""
        result = calculate_rsi(sample_price_data['close'])
        
        assert 0 <= result['value'] <= 100
        assert 0 <= result['smoothed'] <= 100
    
    def test_rsi_overbought_oversold_thresholds(self, sample_price_data):
        """Test RSI overbought/oversold flag thresholds."""
        result = calculate_rsi(sample_price_data['close'])
        
        if result['value'] > 70:
            assert result['overbought']
        if result['value'] < 30:
            assert result['oversold']


class TestStochasticRSI:
    """Test Stochastic RSI calculations."""
    
    def test_calculate_stochastic_rsi_returns_dict(self, sample_price_data):
        """Test that Stochastic RSI returns expected structure."""
        result = calculate_stochastic_rsi(sample_price_data['close'])
        
        assert isinstance(result, dict)
        assert 'k' in result
        assert 'd' in result
        assert 'k_additional' in result
        assert 'd_additional' in result
        assert 'overbought' in result
        assert 'oversold' in result
    
    def test_stochastic_values_in_range(self, sample_price_data):
        """Test that Stochastic values are between 0 and 100."""
        result = calculate_stochastic_rsi(sample_price_data['close'])
        
        assert 0 <= result['k'] <= 100
        assert 0 <= result['d'] <= 100


class TestCrossDetection:
    """Test WaveTrend cross detection."""
    
    def test_detect_crosses_with_bullish_cross(self):
        """Test detection of bullish cross."""
        wt1 = pd.Series([50, 52, 54, 56])
        wt2 = pd.Series([55, 54, 53, 52])
        
        result = detect_wavetrend_crosses(wt1, wt2)
        
        assert isinstance(result, dict)
        assert 'bullish_cross' in result
        assert 'bearish_cross' in result
        assert isinstance(result['bullish_cross'], bool)
        assert isinstance(result['bearish_cross'], bool)
    
    def test_detect_crosses_with_insufficient_data(self):
        """Test cross detection with insufficient data."""
        wt1 = pd.Series([50])
        wt2 = pd.Series([55])
        
        result = detect_wavetrend_crosses(wt1, wt2)
        
        assert result['bullish_cross'] is False
        assert result['bearish_cross'] is False


class TestPivotDetection:
    """Test pivot high/low detection."""
    
    def test_find_pivots_returns_dict(self):
        """Test that find_pivots returns expected structure."""
        series = pd.Series([1, 2, 3, 2, 1, 2, 3, 4, 3, 2, 1])
        
        result = find_pivots(series, lookback_left=2, lookback_right=2)
        
        assert isinstance(result, dict)
        assert 'pivot_highs' in result
        assert 'pivot_high_indices' in result
        assert 'pivot_lows' in result
        assert 'pivot_low_indices' in result
    
    def test_find_pivots_identifies_high(self):
        """Test that pivot highs are correctly identified."""
        # Create series with obvious high at index 3
        series = pd.Series([1, 2, 3, 5, 3, 2, 1])
        
        result = find_pivots(series, lookback_left=1, lookback_right=1)
        
        # Should find the peak at value 5
        assert 5 in result['pivot_highs']


class TestDivergenceDetection:
    """Test divergence detection."""
    
    def test_detect_divergences_returns_dict(self, sample_price_data):
        """Test that detect_divergences returns expected structure."""
        oscillator = pd.Series(np.random.randn(len(sample_price_data)))
        
        result = detect_divergences(
            sample_price_data,
            oscillator,
            lookback_left=10,
            lookback_right=10
        )
        
        assert isinstance(result, dict)
        assert 'regular_bullish' in result
        assert 'regular_bearish' in result
        assert 'hidden_bullish' in result
        assert 'hidden_bearish' in result
    
    def test_divergences_with_insufficient_data(self):
        """Test divergence detection with insufficient data."""
        df = pd.DataFrame({
            'high': [1, 2, 3],
            'low': [0.5, 1, 2],
            'close': [1, 2, 2.5]
        })
        oscillator = pd.Series([0, 1, 2])
        
        result = detect_divergences(df, oscillator)
        
        # Should return all False with insufficient data
        assert result['regular_bullish'] is False
        assert result['regular_bearish'] is False


class TestTopBottomDetection:
    """Test top/bottom detection."""
    
    def test_detect_tops_bottoms_returns_dict(self, sample_price_data):
        """Test that detect_tops_bottoms returns expected structure."""
        wt1 = pd.Series(np.random.randn(len(sample_price_data)))
        
        result = detect_tops_bottoms(
            wt1,
            sample_price_data['close'],
            divergence_length=28
        )
        
        assert isinstance(result, dict)
        assert 'potential_top' in result
        assert 'potential_bottom' in result
        assert isinstance(result['potential_top'], bool)
        assert isinstance(result['potential_bottom'], bool)
    
    def test_tops_bottoms_with_insufficient_data(self):
        """Test top/bottom detection with insufficient data."""
        wt1 = pd.Series([1, 2, 3])
        close = pd.Series([100, 101, 102])
        
        result = detect_tops_bottoms(wt1, close, divergence_length=28)
        
        assert result['potential_top'] is False
        assert result['potential_bottom'] is False


class TestSignalAggregation:
    """Test signal aggregation logic."""
    
    def test_generate_signal_returns_dict(self):
        """Test that generate_aggregated_signal returns expected structure."""
        indicators = {
            'wavetrend': {
                'wt1': 50,
                'wt2': 49,
                'overbought': False,
                'oversold': False
            },
            'money_flow': {
                'fast': 1.5,
                'slow': 1.2,
                'fast_positive': True,
                'slow_positive': True
            },
            'rsi': {
                'value': 50,
                'smoothed': 50,
                'overbought': False,
                'oversold': False
            },
            'stochastic_rsi': {
                'k': 50,
                'd': 50,
                'overbought': False,
                'oversold': False
            }
        }
        
        signals = {
            'wavetrend_crosses': {
                'bullish_cross': False,
                'bearish_cross': False
            },
            'divergences': {
                'regular_bullish': False,
                'regular_bearish': False,
                'hidden_bullish': False,
                'hidden_bearish': False
            },
            'extremes': {
                'potential_top': False,
                'potential_bottom': False
            }
        }
        
        result = generate_aggregated_signal(indicators, signals)
        
        assert isinstance(result, dict)
        assert 'direction' in result
        assert 'strength' in result
        assert 'reasons' in result
    
    def test_signal_direction_values(self):
        """Test that signal direction is one of expected values."""
        indicators = {
            'wavetrend': {'wt1': 50, 'wt2': 49, 'overbought': False, 'oversold': False},
            'money_flow': {'fast': 0, 'slow': 0, 'fast_positive': False, 'slow_positive': False},
            'rsi': {'value': 50, 'smoothed': 50, 'overbought': False, 'oversold': False},
            'stochastic_rsi': {'k': 50, 'd': 50, 'overbought': False, 'oversold': False}
        }
        signals = {
            'wavetrend_crosses': {'bullish_cross': False, 'bearish_cross': False},
            'divergences': {'regular_bullish': False, 'regular_bearish': False, 'hidden_bullish': False, 'hidden_bearish': False},
            'extremes': {'potential_top': False, 'potential_bottom': False}
        }
        
        result = generate_aggregated_signal(indicators, signals)
        
        assert result['direction'] in ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell']
    
    def test_signal_strength_range(self):
        """Test that signal strength is between 0 and 100."""
        indicators = {
            'wavetrend': {'wt1': -70, 'wt2': -71, 'overbought': False, 'oversold': True},
            'money_flow': {'fast': 1, 'slow': 1, 'fast_positive': True, 'slow_positive': True},
            'rsi': {'value': 25, 'smoothed': 25, 'overbought': False, 'oversold': True},
            'stochastic_rsi': {'k': 15, 'd': 15, 'overbought': False, 'oversold': True}
        }
        signals = {
            'wavetrend_crosses': {'bullish_cross': True, 'bearish_cross': False},
            'divergences': {'regular_bullish': True, 'regular_bearish': False, 'hidden_bullish': False, 'hidden_bearish': False},
            'extremes': {'potential_top': False, 'potential_bottom': True}
        }
        
        result = generate_aggregated_signal(indicators, signals)
        
        assert 0 <= result['strength'] <= 100


class TestSignalsTool:
    """Test the main analyze_signals tool."""
    
    @patch('maximus.tools.technical_indicators.get_ohlc_data')
    def test_analyze_signals_with_mock_data(self, mock_get_ohlc):
        """Test analyze_signals with mocked OHLC data."""
        # Create mock OHLC data
        dates = pd.date_range('2024-01-01', periods=150, freq='1H')
        mock_candles = []
        base_price = 50000
        
        for i, date in enumerate(dates):
            price = base_price + i * 10
            mock_candles.append({
                'timestamp': int(date.timestamp() * 1000),
                'open': price,
                'high': price + 100,
                'low': price - 100,
                'close': price
            })
        
        mock_get_ohlc.invoke = Mock(return_value={
            'id': 'bitcoin',
            'vs_currency': 'usd',
            'days': '7',
            'candles': mock_candles
        })
        
        result = analyze_signals.invoke({
            'identifier': 'bitcoin',
            'days': '7',
            'vs_currency': 'usd'
        })
        
        # Check structure
        assert 'coin' in result
        assert 'timestamp' in result
        assert 'current_price' in result
        assert 'signal' in result
        assert 'indicators' in result
        assert 'signals' in result
    
    def test_analyze_signals_handles_insufficient_data(self):
        """Test that tool handles insufficient data gracefully."""
        with patch('maximus.tools.technical_indicators.get_ohlc_data') as mock_get_ohlc:
            mock_get_ohlc.invoke = Mock(return_value={
                'id': 'bitcoin',
                'vs_currency': 'usd',
                'days': '7',
                'candles': [
                    {'timestamp': 1000, 'open': 100, 'high': 110, 'low': 90, 'close': 105}
                ] * 10  # Only 10 candles
            })
            
            result = analyze_signals.invoke({
                'identifier': 'bitcoin',
                'days': '7',
                'vs_currency': 'usd'
            })
            
            assert 'error' in result
            assert result['error'] == 'Insufficient data'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

