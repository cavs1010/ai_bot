# risk_gate.py — final gate before execution (rules only, zero Claude cost)
# Phase 5 | Risk Gate
#
# Functions:
#   calculate_position_size(signal, portfolio_value) → {position_pct, position_value,
#       shares, full_kelly_pct}
#   validate_trade(ticker, signal, portfolio_value, daily_pnl, open_positions_count,
#       drawdown_pct) → {approved, reject_reason, checks, position}
#
# Deliberately thin: edge (Gate 5's expected_value/decision) and reward:risk
# (Gate 5's trade_levels) are reused here, not recomputed. The only checks genuinely
# new to this gate are open-position count, drawdown kill switch, and Quarter-Kelly
# sizing; the daily-loss check reuses Gate 1's helper with live, execution-time P&L.
#
# Test: python backend/03_risk/risk_gate.py

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))   # → backend/ (for config)
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / '02_intelligence'))  # → helpers.*

from config import MAX_OPEN_POSITIONS, MAX_DAILY_LOSS_PCT, MAX_DRAWDOWN_PCT, KELLY_FRACTION, MIN_REWARD_RISK, MAX_POSITION_SIZE_PCT
from helpers.logic.portfolio import check_daily_loss_limit


def calculate_position_size(signal: dict, portfolio_value: float) -> dict:
    """
    Sizes a position using Quarter-Kelly, capped at MAX_POSITION_SIZE_PCT.

    Full Kelly for a binary bet: f* = win_prob − (1 − win_prob) / reward_risk.
    Quarter-Kelly = f* × KELLY_FRACTION (0.25), then capped so no single trade
    exceeds MAX_POSITION_SIZE_PCT regardless of how favorable the edge looks.

    Args:
        signal: Gate 5 result dict (decide_gate5_signal output). Required keys:
                'win_probability' (float 0–1), 'trade_levels' with 'entry' and
                'reward_risk'.
        portfolio_value: Live account equity in dollars. Must be > 0.

    Returns:
        dict with keys:
            position_pct   (float) — fraction of portfolio allocated (post-cap)
            position_value (float) — dollars allocated
            shares         (int)   — whole shares to buy (floored)
            full_kelly_pct (float) — uncapped full-Kelly fraction, for audit
    """
    win_prob = signal['win_probability']
    reward_risk = signal['trade_levels']['reward_risk']
    entry = signal['trade_levels']['entry']

    full_kelly_pct = win_prob - (1 - win_prob) / reward_risk if reward_risk > 0 else 0.0
    position_pct = min(max(0.0, full_kelly_pct) * KELLY_FRACTION, MAX_POSITION_SIZE_PCT)
    position_value = portfolio_value * position_pct
    shares = int(position_value // entry) if entry > 0 else 0

    return {
        'position_pct': round(position_pct, 4),
        'position_value': round(position_value, 2),
        'shares': shares,
        'full_kelly_pct': round(full_kelly_pct, 4),
    }


def validate_trade(
    ticker: str,
    signal: dict,
    portfolio_value: float,
    daily_pnl: float,
    open_positions_count: int,
    drawdown_pct: float,
) -> dict:
    """
    Runs the five last-mile checks before a Gate 5 BUY becomes a live order.

    Args:
        ticker: Stock symbol, for logging only.
        signal: Gate 5 result dict (decide_gate5_signal output).
        portfolio_value: Live account equity in dollars (from get_portfolio_value()).
        daily_pnl: Today's realized + unrealized P&L in dollars (from get_daily_pnl()).
        open_positions_count: Currently open position count (from get_open_positions()).
        drawdown_pct: Current drawdown from peak equity, positive fraction (e.g. 0.05 = down 5%).

    Returns:
        dict with keys:
            approved      (bool)
            reject_reason (str | None) — name of the first failed check, None if approved
            checks        (dict)       — every check's raw result, for audit
            position      (dict)       — calculate_position_size() output; zeros if rejected
    """
    checks = {
        'edge': {
            'passed': signal.get('decision') == 'BUY' and bool(signal.get('passed')),
            'expected_value': signal.get('expected_value'),
        },
        'open_positions': {
            'passed': open_positions_count < MAX_OPEN_POSITIONS,
            'count': open_positions_count,
            'max': MAX_OPEN_POSITIONS,
        },
        'drawdown': {
            'passed': drawdown_pct < MAX_DRAWDOWN_PCT,
            'drawdown_pct': drawdown_pct,
            'max': MAX_DRAWDOWN_PCT,
        },
        'reward_risk': {
            'passed': signal.get('trade_levels', {}).get('reward_risk', 0.0) >= MIN_REWARD_RISK,
            'reward_risk': signal.get('trade_levels', {}).get('reward_risk', 0.0),
        },
    }

    loss_check = check_daily_loss_limit(portfolio_value, daily_pnl, limit_pct=MAX_DAILY_LOSS_PCT)
    checks['daily_loss'] = {'passed': not loss_check['breached'], 'loss_pct': loss_check['loss_pct']}

    failed = [name for name, c in checks.items() if not c['passed']]
    approved = not failed
    reject_reason = None if approved else failed[0]

    position = (
        calculate_position_size(signal, portfolio_value) if approved
        else {'position_pct': 0.0, 'position_value': 0.0, 'shares': 0, 'full_kelly_pct': 0.0}
    )

    if approved:
        print(f"[risk] {ticker}: APPROVED — {position['shares']} shares (${position['position_value']:,.2f}, "
              f"{position['position_pct']:.1%} of portfolio)")
    else:
        print(f'[risk] {ticker}: REJECTED — {reject_reason} check failed')

    return {
        'approved': approved,
        'reject_reason': reject_reason,
        'checks': checks,
        'position': position,
    }


if __name__ == '__main__':
    mock_signal = {
        'passed': True,
        'decision': 'BUY',
        'win_probability': 0.55,
        'expected_value': 0.10,
        'trade_levels': {'entry': 875.50, 'stop': 857.05, 'target': 912.40, 'reward_risk': 2.0},
    }

    # Happy path — everything within limits
    result = validate_trade('NVDA', mock_signal, portfolio_value=100_000, daily_pnl=0,
                             open_positions_count=1, drawdown_pct=0.01)
    assert result['approved'] is True
    assert result['position']['shares'] > 0
    print(f"[risk] happy path position: {result['position']}")

    # Failure path — max open positions already reached
    blocked = validate_trade('NVDA', mock_signal, portfolio_value=100_000, daily_pnl=0,
                              open_positions_count=MAX_OPEN_POSITIONS, drawdown_pct=0.01)
    assert blocked['approved'] is False
    assert blocked['reject_reason'] == 'open_positions'
    assert blocked['position']['shares'] == 0

    # Failure path — drawdown kill switch tripped
    halted = validate_trade('NVDA', mock_signal, portfolio_value=100_000, daily_pnl=0,
                             open_positions_count=1, drawdown_pct=MAX_DRAWDOWN_PCT)
    assert halted['approved'] is False
    assert halted['reject_reason'] == 'drawdown'

    # Failure path — daily loss limit breached
    loss_halted = validate_trade('NVDA', mock_signal, portfolio_value=100_000, daily_pnl=-3_500,
                                  open_positions_count=1, drawdown_pct=0.01)
    assert loss_halted['approved'] is False
    assert loss_halted['reject_reason'] == 'daily_loss'

    print('[risk] all checks passed ✅')
