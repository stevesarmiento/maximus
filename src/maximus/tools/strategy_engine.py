"""
Autonomous Trading Strategy Engine

Orchestrates trading decisions based on Maximus technical signals and user-defined strategy parameters.
"""

from langchain.tools import tool
from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime
from maximus.tools.technical_indicators import analyze_signals
from maximus.tools.solana import get_wallet_balances
from maximus.tools.solana_transactions import swap_tokens

####################################
# Strategy Configuration
####################################

class StrategyConfig(BaseModel):
    """Configuration for trading strategy"""
    name: str = Field(default="Maximus Signals Momentum", description="Strategy name")
    enabled: bool = Field(default=True, description="Whether strategy is active")
    
    # Entry conditions
    min_signal_strength: int = Field(
        default=85,
        ge=0,
        le=100,
        description="Minimum signal strength to enter (0-100)"
    )
    require_divergence: bool = Field(
        default=False,
        description="Require regular divergence for entry"
    )
    require_oversold_overbought: bool = Field(
        default=True,
        description="Require oversold (buy) or overbought (sell) conditions"
    )
    
    # Position sizing
    risk_per_trade: float = Field(
        default=0.02,
        ge=0.001,
        le=0.10,
        description="Risk per trade as % of portfolio (0.1% to 10%)"
    )
    max_position_size: float = Field(
        default=0.15,
        ge=0.01,
        le=0.50,
        description="Maximum position size as % of portfolio (1% to 50%)"
    )
    
    # Risk management
    stop_loss_pct: float = Field(
        default=0.05,
        ge=0.01,
        le=0.20,
        description="Stop loss percentage (1% to 20%)"
    )
    take_profit_pct: float = Field(
        default=0.15,
        ge=0.02,
        le=1.0,
        description="Take profit percentage (2% to 100%)"
    )
    trailing_stop: bool = Field(
        default=True,
        description="Enable trailing stop loss"
    )
    trailing_stop_activation: float = Field(
        default=0.08,
        description="Activate trailing stop after this % profit"
    )
    
    # Exit conditions
    exit_on_opposite_signal: bool = Field(
        default=True,
        description="Exit when opposite signal detected"
    )
    exit_on_neutral: bool = Field(
        default=False,
        description="Exit when signal becomes neutral"
    )


class StrategyExecutionInput(BaseModel):
    """Input for execute_strategy tool"""
    identifier: str = Field(description="Token to analyze (e.g., 'BTC', 'SOL', 'ETH')")
    strategy_config: Optional[dict] = Field(
        default=None,
        description="Optional strategy configuration (uses defaults if not provided)"
    )
    dry_run: bool = Field(
        default=True,
        description="If True, simulates trades without executing. Always start with dry_run=True!"
    )


####################################
# Helper Functions
####################################

def calculate_position_size(
    portfolio_balance: float,
    risk_per_trade: float,
    stop_loss_pct: float,
    signal_strength: int,
    max_position_size: float
) -> float:
    """
    Calculate position size based on Kelly Criterion and signal strength.
    
    Args:
        portfolio_balance: Total portfolio value in USDC
        risk_per_trade: Maximum risk per trade (e.g., 0.02 = 2%)
        stop_loss_pct: Stop loss percentage (e.g., 0.05 = 5%)
        signal_strength: Signal strength from 0-100
        max_position_size: Maximum position size as % of portfolio
    
    Returns:
        Position size in USDC
    """
    # Base risk amount
    base_risk = portfolio_balance * risk_per_trade
    
    # Adjust by signal strength (scale from 70-100 to 0.5-1.0)
    if signal_strength >= 70:
        strength_multiplier = 0.5 + (signal_strength - 70) / 60  # 0.5 to 1.0
    else:
        strength_multiplier = signal_strength / 140  # 0 to 0.5
    
    adjusted_risk = base_risk * strength_multiplier
    
    # Calculate position size to risk 'adjusted_risk' with given stop loss
    position_size = adjusted_risk / stop_loss_pct
    
    # Cap at max position size
    max_position = portfolio_balance * max_position_size
    position_size = min(position_size, max_position)
    
    # Minimum position check
    if position_size < 10:  # Minimum $10 position
        position_size = 0
    
    return round(position_size, 2)


def check_entry_conditions(
    analysis: dict,
    config: StrategyConfig
) -> tuple[bool, str, list[str]]:
    """
    Check if entry conditions are met.
    
    Returns:
        (should_enter, action, reasons)
    """
    signal = analysis['signal']
    divergences = analysis['signals']['divergences']
    wavetrend = analysis['indicators']['wavetrend']
    
    reasons = []
    
    # Check signal strength
    if signal['strength'] < config.min_signal_strength:
        return False, 'HOLD', ['Signal strength below minimum threshold']
    
    # Check if signal is buy or sell
    if signal['direction'] not in ['strong_buy', 'buy', 'strong_sell', 'sell']:
        return False, 'HOLD', ['Signal is neutral']
    
    # Determine action
    if signal['direction'] in ['strong_buy', 'buy']:
        action = 'BUY'
        
        # Check oversold condition if required
        if config.require_oversold_overbought and not (wavetrend['oversold'] or wavetrend['oversold_strong']):
            return False, 'HOLD', ['Buy signal but not in oversold territory']
        
        # Check divergence if required
        if config.require_divergence and not divergences['regular_bullish']:
            return False, 'HOLD', ['Buy signal but no bullish divergence detected']
        
        reasons = signal['reasons']
        return True, action, reasons
        
    elif signal['direction'] in ['strong_sell', 'sell']:
        action = 'SELL'
        
        # Check overbought condition if required
        if config.require_oversold_overbought and not (wavetrend['overbought'] or wavetrend['overbought_strong']):
            return False, 'HOLD', ['Sell signal but not in overbought territory']
        
        # Check divergence if required
        if config.require_divergence and not divergences['regular_bearish']:
            return False, 'HOLD', ['Sell signal but no bearish divergence detected']
        
        reasons = signal['reasons']
        return True, action, reasons
    
    return False, 'HOLD', ['No clear entry signal']


def get_portfolio_balance() -> float:
    """
    Get current USDC balance from wallet.
    
    Returns:
        USDC balance
    """
    try:
        balances = get_wallet_balances.invoke({})
        
        # Find USDC balance
        for wallet in balances:
            for token in wallet.get('tokens', []):
                if token['symbol'] == 'USDC':
                    return float(token['balance'])
        
        # If no USDC found, return 0
        return 0.0
    except Exception as e:
        print(f"Warning: Could not fetch wallet balance: {e}")
        return 0.0


####################################
# Main Strategy Tool
####################################

@tool(args_schema=StrategyExecutionInput)
def execute_strategy(
    identifier: str,
    strategy_config: Optional[dict] = None,
    dry_run: bool = True
) -> dict:
    """
    Execute autonomous trading strategy based on Maximus technical signals.
    
    This tool analyzes a cryptocurrency using Maximus technical signals and automatically
    determines if entry conditions are met according to the strategy configuration.
    
    ** CRITICAL: Always start with dry_run=True for testing! **
    
    The strategy:
    1. Analyzes the token with Maximus signals
    2. Checks if signal strength meets minimum threshold
    3. Validates entry conditions (divergences, overbought/oversold)
    4. Calculates position size based on risk parameters
    5. Executes trade if conditions met (or simulates if dry_run=True)
    
    Returns detailed analysis including:
    - Action taken (BUY, SELL, HOLD)
    - Position size calculated
    - Entry/exit prices and risk levels
    - Signal analysis and reasons
    - Trade execution result (if not dry run)
    
    Use this for automated strategy execution with predefined risk parameters.
    """
    # Parse strategy config or use defaults
    if strategy_config:
        config = StrategyConfig(**strategy_config)
    else:
        config = StrategyConfig()
    
    # Get signal analysis
    try:
        analysis = analyze_signals.invoke({
            'identifier': identifier,
            'days': '30',
            'vs_currency': 'usd'
        })
        
        if 'error' in analysis:
            return {
                'action': 'ERROR',
                'error': analysis['error'],
                'message': analysis['message'],
                'identifier': identifier
            }
    except Exception as e:
        return {
            'action': 'ERROR',
            'error': 'Analysis failed',
            'message': str(e),
            'identifier': identifier
        }
    
    # Check entry conditions
    should_enter, action, reasons = check_entry_conditions(analysis, config)
    
    # Get current price
    current_price = analysis.get('current_price', 0)
    
    # If no entry signal, return hold
    if not should_enter:
        return {
            'action': 'HOLD',
            'identifier': identifier,
            'coin': analysis.get('coin', identifier),
            'current_price': current_price,
            'signal_strength': analysis['signal']['strength'],
            'signal_direction': analysis['signal']['direction'],
            'reason': reasons[0] if reasons else 'No entry conditions met',
            'analysis': analysis['signal'],
            'dry_run': dry_run
        }
    
    # Calculate position size
    portfolio_balance = get_portfolio_balance()
    
    if portfolio_balance == 0:
        return {
            'action': 'HOLD',
            'identifier': identifier,
            'reason': 'No USDC balance available',
            'dry_run': dry_run
        }
    
    position_size = calculate_position_size(
        portfolio_balance,
        config.risk_per_trade,
        config.stop_loss_pct,
        analysis['signal']['strength'],
        config.max_position_size
    )
    
    if position_size == 0:
        return {
            'action': 'HOLD',
            'identifier': identifier,
            'reason': 'Calculated position size too small',
            'signal_strength': analysis['signal']['strength'],
            'portfolio_balance': portfolio_balance,
            'dry_run': dry_run
        }
    
    # Calculate stop loss and take profit levels
    if action == 'BUY':
        stop_loss_price = current_price * (1 - config.stop_loss_pct)
        take_profit_price = current_price * (1 + config.take_profit_pct)
    else:  # SELL
        stop_loss_price = current_price * (1 + config.stop_loss_pct)
        take_profit_price = current_price * (1 - config.take_profit_pct)
    
    # Prepare result
    result = {
        'action': action,
        'identifier': identifier,
        'coin': analysis.get('coin', identifier),
        'current_price': current_price,
        'position_size_usd': position_size,
        'position_size_pct': (position_size / portfolio_balance) * 100,
        'portfolio_balance': portfolio_balance,
        'signal_strength': analysis['signal']['strength'],
        'signal_direction': analysis['signal']['direction'],
        'reasons': reasons,
        'risk_management': {
            'stop_loss_price': round(stop_loss_price, 2),
            'stop_loss_pct': config.stop_loss_pct * 100,
            'take_profit_price': round(take_profit_price, 2),
            'take_profit_pct': config.take_profit_pct * 100,
            'trailing_stop': config.trailing_stop,
            'max_risk_usd': round(position_size * config.stop_loss_pct, 2)
        },
        'analysis': analysis,
        'dry_run': dry_run
    }
    
    # Execute trade if not dry run
    if not dry_run and action == 'BUY':
        try:
            print(f"\n🎯 EXECUTING LIVE TRADE: {action} {position_size} USDC worth of {identifier}")
            print(f"⚠️  This is a REAL trade with REAL money!")
            
            swap_result = swap_tokens.invoke({
                'from_token': 'USDC',
                'to_token': identifier,
                'amount': position_size,
                'slippage_bps': 50
            })
            
            result['executed'] = True
            result['transaction'] = swap_result
            
            print(f"✅ Trade executed successfully!")
            
        except Exception as e:
            result['executed'] = False
            result['execution_error'] = str(e)
            print(f"❌ Trade execution failed: {e}")
    else:
        result['executed'] = False
        result['note'] = 'DRY RUN MODE - No actual trade executed' if dry_run else 'Only BUY orders supported currently'
    
    return result

