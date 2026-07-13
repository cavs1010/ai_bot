# helpers/logic/trade_levels.py — trade level calculations and gate summary formatting
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 5 decide_gate5_signal()
#
# Functions:
#   build_trade_levels(candidate)     → {entry, atr, stop, target, stop_pct, target_pct, reward_risk}
#   build_gate_summary(gate_results)  → str
#
# Stop/target formulas use TRADE_LEVEL_PARAMS from config.py (mission non-negotiables).
#
# Test: python backend/02_intelligence/helpers/logic/trade_levels.py

import sys
import pathlib
from collections.abc import Mapping

# TRADE_LEVEL_PARAMS lives on the central board — backend/config.py.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))   # → backend/
from config import TRADE_LEVEL_PARAMS


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


def build_gate_summary(gate_results: Mapping[str, Mapping[str, object]]) -> str:
    """
    Formats Gate 1–4 outputs into a readable audit block for logging.

    Args:
        gate_results: Dict with optional keys 'gate1' … 'gate4' (each a result dict).

    Returns:
        Multi-line summary string; empty sections are skipped.
    """
    lines: list[str] = []

    gate1 = gate_results.get('gate1')
    if gate1 is not None:
        status = 'PASS' if gate1.get('passed') else f"BLOCK ({gate1.get('block_reason', '?')})"
        lines.append(f'Gate 1 (hard threats): {status}')

    gate2 = gate_results.get('gate2')
    if gate2 is not None:
        if gate2.get('passed'):
            lines.append('Gate 2 (news threat): PASS — no catastrophic threat')
        else:
            lines.append(
                f"Gate 2 (news threat): BLOCK — {gate2.get('threat_type', '?')}: "
                + f"{gate2.get('reason', '')}"
            )

    gate3 = gate_results.get('gate3')
    if gate3 is not None:
        caution = ' (caution)' if gate3.get('caution') else ''
        lines.append(
            f"Gate 3 (sentiment): {gate3.get('direction', '?')} "
            + f"conf={gate3.get('confidence', '?')}{caution} — {gate3.get('key_reason', '')}"
        )

    gate4 = gate_results.get('gate4')
    if gate4 is not None:
        lines.append(
            f"Gate 4 (contradiction): {gate4.get('action', '?')} — "
            + f"{gate4.get('contradiction_type', 'none')} / {gate4.get('risk_level', 'NONE')}: "
            + f"{gate4.get('reason', '')}"
        )

    return '\n'.join(lines) if lines else '(no prior gate results)'


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

    summary = build_gate_summary({
        'gate1': {'passed': True},
        'gate3': {'direction': 'BULLISH', 'confidence': 9, 'caution': False, 'key_reason': 'ok'},
    })
    assert 'Gate 1' in summary and 'Gate 3' in summary
    print(f'[trade_levels] summary sample:\n{summary}')
    print('[trade_levels] all checks passed ✅')
