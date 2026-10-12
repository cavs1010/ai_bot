# trade_levels.py — trade level calculations
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 5 decide_gate5_signal()
#
# Functions:
#   build_trade_levels(candidate)     → {entry, atr, stop, target, stop_pct, target_pct, reward_risk}
#
# Stop/target formulas use TRADE_LEVEL_PARAMS (money_params.trade_risk in the active strategy config).
#
# Test: python -m backend.intelligence.rules.trade_levels

from collections.abc import Mapping

# Strategy settings come from the active Neon config, passed in by Node.
from backend.config import TRADE_LEVEL_PARAMS


def build_trade_levels(candidate: Mapping[str, float]) -> dict[str, float]:
    """
    Computes entry, stop, target, and reward:risk from price and ATR.

    Formulas (mission non-negotiables, from TRADE_LEVEL_PARAMS):
        stop   = entry − (atr_stop_multiplier × ATR)
        target = entry + (target_rr_multiple × stop_distance)
        reward_risk = (target − entry) / (entry − stop)

    Args:
        candidate: Momentum scanner dict. Required keys: 'price' (float), 'atr' (float).

    Returns:
        dict with keys:
            entry, atr, stop, target          (float) — price levels
            stop_pct, target_pct, reward_risk (float) — fractions / ratio
    """
    atr_mult = TRADE_LEVEL_PARAMS['atr_stop_multiplier']
    target_mult = TRADE_LEVEL_PARAMS['target_rr_multiple']

    entry = float(candidate['price'])
    atr = float(candidate['atr'])
    stop_distance = atr_mult * atr
    stop = entry - stop_distance
    target = entry + target_mult * stop_distance
    stop_pct = stop_distance / entry
    target_pct = (target - entry) / entry
    reward_risk = (target - entry) / stop_distance
    return {
        'entry': round(entry, 4),
        'atr': round(atr, 4),
        'stop': round(stop, 4),
        'target': round(target, 4),
        'stop_pct': round(stop_pct, 4),
        'target_pct': round(target_pct, 4),
        'reward_risk': round(reward_risk, 4),
    }


if __name__ == '__main__':
    candidate = {'price': 875.50, 'atr': 12.30}
    levels = build_trade_levels(candidate)
    assert levels['reward_risk'] == 2.0
    atr_mult = TRADE_LEVEL_PARAMS['atr_stop_multiplier']
    assert levels['stop'] == round(875.50 - atr_mult * 12.30, 4)
    print(
        f'[trade_levels] NVDA levels: stop={levels["stop"]}, target={levels["target"]}, '
        + f'R:R={levels["reward_risk"]}'
    )

    print('[trade_levels] all checks passed ✅')
