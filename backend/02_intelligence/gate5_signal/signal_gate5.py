# gate5_signal/signal_gate5.py — Edge Check + EV (rules only, zero Claude cost)
# Phase 4.5 | Intelligence Layer
#
# Function: decide_gate5_signal(candidate, gate_results)
#   → {passed, decision, win_probability, expected_value, edge, position_confidence,
#      reason, trade_levels, gate_summary}
#
# Computes trade levels, applies helpers/logic/ev_rules.apply_edge_rules on Gate 3 output,
# and BUY/SKIPs against MIN_EDGE_PCT. No LLM — upstream gates already structured the
# qualitative assessment.
#
# Imports: helpers/logic/trade_levels, helpers/logic/ev_rules
#
# Test: python backend/02_intelligence/gate5_signal/signal_gate5.py

import sys
import pathlib

base = pathlib.Path(__file__).resolve().parents[1]   # → 02_intelligence/ (for helpers.*)
sys.path.insert(0, str(base))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))   # → backend/ (for config)

from config import MIN_EDGE_PCT
from helpers.logic.ev_rules import apply_edge_rules
from helpers.logic.trade_levels import build_gate_summary, build_trade_levels

_RESULT_KEYS = {
    'passed', 'decision', 'win_probability', 'expected_value', 'edge',
    'position_confidence', 'reason', 'trade_levels', 'gate_summary',
}


def _skip_result(
    ticker: str,
    reason: str,
    gate_results: dict,
    trade_levels: dict | None = None,
) -> dict:
    """Structured SKIP when required inputs are missing — same shape as a normal run."""
    print(f'[gate5] {ticker}: SKIP — {reason}')
    return {
        'passed': False,
        'decision': 'SKIP',
        'win_probability': 0.0,
        'expected_value': 0.0,
        'edge': 0.0,
        'position_confidence': 'LOW',
        'reason': reason,
        'trade_levels': trade_levels or {},
        'gate_summary': build_gate_summary(gate_results),
    }


def decide_gate5_signal(candidate: dict, gate_results: dict) -> dict:
    """
    Gate 5 — deterministic edge check after Gates 1–4 pass.

    Computes trade levels from price/ATR, maps Gate 3 sentiment + momentum score to win
    probability via apply_edge_rules(), then BUY/SKIPs on MIN_EDGE_PCT. No Claude call.

    Args:
        candidate:    Momentum scanner dict. Required keys: 'ticker', 'price', 'atr'.
                      Optional: 'score' (int, default 2).
        gate_results: Prior gate outputs. Required: gate_results['gate3'] with 'passed',
                      'direction', 'confidence', 'caution'. Optional gate1–gate4 for audit.

    Returns:
        dict with keys:
            passed               (bool)  — True when decision == 'BUY'.
            decision             (str)   — 'BUY' or 'SKIP'.
            win_probability      (float) — estimated win rate (0–1).
            expected_value       (float) — EV from fixed reward:risk formula.
            edge                 (float) — expected_value / reward_risk.
            position_confidence  (str)   — 'HIGH' / 'MEDIUM' / 'LOW'.
            reason               (str)   — human-readable verdict or skip cause.
            trade_levels         (dict)  — from build_trade_levels(); {} on early SKIP.
            gate_summary         (str)  — audit block from build_gate_summary().

    Prints:
        One line to stdout with the verdict — this is the `[gate5] …` line you see in logs:
            `[gate5] <ticker>: BUY — EV <ev> | win_prob=<p>% | <CONF>` — EV cleared MIN_EDGE_PCT.
            `[gate5] <ticker>: SKIP — EV <ev> | win_prob=<p>%`         — EV below the edge threshold.
            `[gate5] <ticker>: SKIP — <reason>`  (no EV shown)         — guard tripped: missing
                                                                        price/atr or Gate 3 not passed.
    """
    ticker = candidate['ticker']
    min_edge = MIN_EDGE_PCT

    gate3 = gate_results.get('gate3')
    if not gate3 or not gate3.get('passed'):
        return _skip_result(ticker, 'gate3_not_passed', gate_results)

    if 'price' not in candidate or 'atr' not in candidate:
        return _skip_result(ticker, 'missing_price_or_atr', gate_results)

    trade_levels = build_trade_levels(candidate)
    score = int(candidate.get('score', 2))

    edge_result = apply_edge_rules(
        score=score,
        direction=gate3.get('direction', 'NEUTRAL'),
        confidence=int(gate3.get('confidence', 0)),
        caution=bool(gate3.get('caution', False)),
        reward_risk=trade_levels['reward_risk'],
        min_edge_pct=min_edge,
    )

    win_prob = edge_result['win_probability']
    ev = edge_result['expected_value']
    decision = 'BUY' if edge_result['passed'] else 'SKIP'
    position_conf = edge_result['position_confidence']

    if decision == 'BUY':
        reason = (
            f'EV {ev:.3f} ≥ {min_edge:.0%} min edge — score={score}, '
            f'{gate3.get("direction", "?")} conf={gate3.get("confidence", "?")}, '
            f'win_prob={win_prob:.0%}'
        )
        print(f'[gate5] {ticker}: BUY — EV {ev:.3f} | win_prob={win_prob:.0%} | {position_conf}')
    else:
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
        'edge': edge_result['edge'],
        'position_confidence': position_conf,
        'reason': reason,
        'trade_levels': trade_levels,
        'gate_summary': build_gate_summary(gate_results),
    }


if __name__ == '__main__':
    base_candidate = {
        'ticker': 'NVDA',
        'price': 875.50,
        'atr': 12.30,
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
        'gate4': {
            'passed': True,
            'action': 'PASS',
            'contradiction_type': 'none',
            'risk_level': 'NONE',
            'reason': 'NONE',
        },
    }

    print('=== Case 1: strong signals → BUY ===')
    r_strong = decide_gate5_signal({**base_candidate, 'score': 3}, strong_gates)
    assert set(r_strong) == _RESULT_KEYS
    assert r_strong['decision'] == 'BUY'
    assert r_strong['passed'] is True
    assert r_strong['expected_value'] >= MIN_EDGE_PCT
    assert r_strong['trade_levels']['reward_risk'] == 2.0
    print(f'passed={r_strong["passed"]} EV={r_strong["expected_value"]:.3f} '
          f'win_prob={r_strong["win_probability"]:.0%}')

    print('\n=== Case 2: weak / marginal setup → SKIP ===')
    weak_gates = {
        'gate3': {
            'passed': True,
            'direction': 'BULLISH',
            'confidence': 6,
            'caution': True,
            'key_reason': 'Mixed headlines',
        },
    }
    r_weak = decide_gate5_signal({**base_candidate, 'score': 2}, weak_gates)
    assert r_weak['decision'] == 'SKIP'
    assert r_weak['passed'] is False
    assert r_weak['expected_value'] < MIN_EDGE_PCT
    print(f'passed={r_weak["passed"]} EV={r_weak["expected_value"]:.3f} '
          f'win_prob={r_weak["win_probability"]:.0%}')

    print('\n=== Case 3: gate3 not passed → SKIP, no trade levels ===')
    r_no_g3 = decide_gate5_signal(base_candidate, {})
    assert r_no_g3['decision'] == 'SKIP'
    assert r_no_g3['reason'] == 'gate3_not_passed'
    assert r_no_g3['trade_levels'] == {}

    print('\n=== Case 4: missing price/atr → SKIP ===')
    r_missing = decide_gate5_signal({'ticker': 'BAD'}, weak_gates)
    assert r_missing['decision'] == 'SKIP'
    assert r_missing['reason'] == 'missing_price_or_atr'

    print('\n[gate5] strong BUY + weak SKIP + guard checks passed ✅')
