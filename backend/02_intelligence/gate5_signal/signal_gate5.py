# gate5_signal/signal_gate5.py — Edge Check + EV (rules only, zero Claude cost)
# Phase 4.5 | Intelligence Layer
#
# Function: decide_gate5_signal(candidate, gate_results)
#   → {passed, decision, win_probability, expected_value, edge, position_confidence,
#      reason, trade_levels}
#
# Maps momentum score + Gate 3 confidence to win probability, applies the fixed 2:1
# EV formula, and BUY/SKIPs against MIN_EDGE_PCT. No LLM — upstream gates already
# structured the qualitative assessment.
#
# Imports: helpers/logic/trade_levels
#
# Test: python backend/02_intelligence/gate5_signal/signal_gate5.py

import os
import sys
import pathlib

base = pathlib.Path(__file__).resolve().parents[1]   # → 02_intelligence/
sys.path.insert(0, str(base))

from helpers.logic.trade_levels import (
    build_gate_summary,
    build_trade_levels,
    calculate_expected_value,
    estimate_win_probability,
)

DEFAULT_MIN_EDGE_PCT = 0.04

POSITION_CONFIDENCE_HIGH = 0.55
POSITION_CONFIDENCE_MEDIUM = 0.45


def _position_confidence(win_prob: float) -> str:
    if win_prob >= POSITION_CONFIDENCE_HIGH:
        return 'HIGH'
    if win_prob >= POSITION_CONFIDENCE_MEDIUM:
        return 'MEDIUM'
    return 'LOW'


def decide_gate5_signal(candidate: dict, gate_results: dict) -> dict:
    """
    Gate 5 — deterministic edge check after Gates 1–4 pass.

    Computes trade levels from price/ATR, estimates win probability from momentum score
    and Gate 3 sentiment, then applies the EV formula. BUY only when expected value
    meets MIN_EDGE_PCT (default 4%). No Claude call.

    Args:
        candidate:    Momentum scanner dict. Required keys: 'ticker', 'price', 'atr'.
                      Optional: 'score' (int, default treated as 2).
        gate_results: Prior gate outputs. Required: gate_results['gate3'] with
                      'direction', 'confidence', 'caution' for win-probability mapping.
                      Optional gate1–gate4 entries for audit summary.

    Returns:
        dict with keys:
            passed               (bool)  — True when decision == 'BUY'.
            decision             (str)   — 'BUY' or 'SKIP'.
            win_probability      (float) — estimated win rate (0–1).
            expected_value       (float) — EV from fixed reward:risk formula.
            edge                 (float) — expected_value / reward_risk (for logging).
            position_confidence  (str)   — 'HIGH' / 'MEDIUM' / 'LOW'.
            reason               (str)   — human-readable verdict.
            trade_levels         (dict)  — from build_trade_levels().
    """
    ticker = candidate['ticker']
    min_edge = float(os.getenv('MIN_EDGE_PCT', DEFAULT_MIN_EDGE_PCT))

    trade_levels = build_trade_levels(candidate)
    win_prob = estimate_win_probability(candidate, gate_results)
    reward_risk = trade_levels['reward_risk']
    ev = calculate_expected_value(win_prob, reward_risk)
    edge = round(ev / reward_risk, 4) if reward_risk else 0.0
    position_conf = _position_confidence(win_prob)

    gate3 = gate_results.get('gate3', {})
    score = candidate.get('score', 2)

    if ev >= min_edge:
        decision = 'BUY'
        reason = (
            f'EV {ev:.3f} ≥ {min_edge:.0%} min edge — score={score}, '
            f'{gate3.get("direction", "?")} conf={gate3.get("confidence", "?")}, '
            f'win_prob={win_prob:.0%}'
        )
        print(f'[gate5] {ticker}: BUY — EV {ev:.3f} | win_prob={win_prob:.0%} | {position_conf}')
    else:
        decision = 'SKIP'
        reason = (
            f'EV {ev:.3f} below {min_edge:.0%} min edge — score={score}, '
            f'{gate3.get("direction", "?")} conf={gate3.get("confidence", "?")}, '
            f'win_prob={win_prob:.0%}'
        )
        print(f'[gate5] {ticker}: SKIP — EV {ev:.3f} | win_prob={win_prob:.0%}')

    return {
        'passed': decision == 'BUY',
        'decision': decision,
        'win_probability': win_prob,
        'expected_value': ev,
        'edge': edge,
        'position_confidence': position_conf,
        'reason': reason,
        'trade_levels': trade_levels,
        'gate_summary': build_gate_summary(gate_results),
    }


if __name__ == '__main__':
    keys = {
        'passed', 'decision', 'win_probability', 'expected_value', 'edge',
        'position_confidence', 'reason', 'trade_levels', 'gate_summary',
    }

    base_candidate = {
        'ticker': 'NVDA',
        'price': 875.50,
        'atr': 12.30,
    }

    # Strong setup → BUY (score 3, high confidence, no caution)
    strong = {
        **base_candidate,
        'score': 3,
    }
    strong_gates = {
        'gate1': {'passed': True},
        'gate2': {'passed': True},
        'gate3': {
            'passed': True,
            'direction': 'BULLISH',
            'confidence': 9,
            'caution': False,
            'key_reason': 'Strong earnings beat',
        },
        'gate4': {'passed': True, 'action': 'PASS', 'contradiction_type': 'none',
                  'risk_level': 'NONE', 'reason': 'NONE'},
    }
    r_strong = decide_gate5_signal(strong, strong_gates)
    assert set(r_strong) == keys
    assert r_strong['decision'] == 'BUY'
    assert r_strong['passed'] is True
    assert r_strong['expected_value'] >= DEFAULT_MIN_EDGE_PCT
    assert r_strong['trade_levels']['reward_risk'] == 2.0
    print(f'[gate5] strong → {r_strong["decision"]} EV={r_strong["expected_value"]:.3f} '
          f'win_prob={r_strong["win_probability"]:.0%}')

    # Weak setup → SKIP (score 2, minimum confidence, caution flag)
    weak = {
        **base_candidate,
        'score': 2,
    }
    weak_gates = {
        'gate3': {
            'passed': True,
            'direction': 'BULLISH',
            'confidence': 6,
            'caution': True,
            'key_reason': 'Mixed headlines',
        },
    }
    r_weak = decide_gate5_signal(weak, weak_gates)
    assert r_weak['decision'] == 'SKIP'
    assert r_weak['passed'] is False
    assert r_weak['expected_value'] < DEFAULT_MIN_EDGE_PCT
    print(f'[gate5] weak → {r_weak["decision"]} EV={r_weak["expected_value"]:.3f} '
          f'win_prob={r_weak["win_probability"]:.0%}')

    # Missing price/atr should raise — caller contract
    try:
        decide_gate5_signal({'ticker': 'BAD'}, weak_gates)
        raise AssertionError('expected KeyError for missing price')
    except KeyError:
        print('[gate5] missing price/atr correctly raised KeyError ✅')

    print('[gate5] strong BUY + weak SKIP checks passed ✅')
