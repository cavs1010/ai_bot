# helpers/logic/ev_rules.py — apply_edge_rules (pure logic, no API)
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 5 decide_gate5_signal() (after upstream gates pass)
#
# Functions:
#   apply_edge_rules(score, direction, confidence, caution, reward_risk, min_edge_pct)
#       → {win_probability, expected_value, edge, passed, position_confidence}
#
# Win-probability mapping (tune from paper-trading data during weekly review):
#   base + momentum component + confidence component − caution/NEUTRAL penalties
# EV = (win_prob × reward_risk) − (1 − win_prob); passed when EV ≥ min_edge_pct
#
# Test: python backend/02_intelligence/helpers/logic/ev_rules.py

import sys
import pathlib

# Win-probability dials live on the central board — backend/config.py.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))   # → backend/
from config import (
    WIN_PROB_BASE, MOMENTUM_SCORE_MIN, MOMENTUM_SCORE_MAX, MOMENTUM_COMPONENT,
    CONFIDENCE_BASELINE, CONFIDENCE_COMPONENT, CAUTION_PENALTY, NEUTRAL_DIRECTION_PENALTY,
    WIN_PROB_FLOOR, WIN_PROB_CEILING, POSITION_CONFIDENCE_HIGH, POSITION_CONFIDENCE_MEDIUM,
)


def _estimate_win_probability(
    score: int,
    direction: str,
    confidence: int,
    caution: bool,
) -> float:
    """Maps structured scanner + Gate 3 fields to a clamped win probability."""
    score = max(MOMENTUM_SCORE_MIN, min(int(score), MOMENTUM_SCORE_MAX))
    score_range = MOMENTUM_SCORE_MAX - MOMENTUM_SCORE_MIN
    momentum_part = MOMENTUM_COMPONENT * (
        0.5 + (score - MOMENTUM_SCORE_MIN) / score_range
    )

    confidence = max(0, min(int(confidence), 10))
    conf_range = 10 - CONFIDENCE_BASELINE
    conf_part = CONFIDENCE_COMPONENT * max(0, confidence - CONFIDENCE_BASELINE) / conf_range

    win_prob = WIN_PROB_BASE + momentum_part + conf_part

    if caution:
        win_prob -= CAUTION_PENALTY
    if direction == 'NEUTRAL':
        win_prob -= NEUTRAL_DIRECTION_PENALTY

    return round(max(WIN_PROB_FLOOR, min(win_prob, WIN_PROB_CEILING)), 4)


def _position_confidence(win_prob: float) -> str:
    if win_prob >= POSITION_CONFIDENCE_HIGH:
        return 'HIGH'
    if win_prob >= POSITION_CONFIDENCE_MEDIUM:
        return 'MEDIUM'
    return 'LOW'


def apply_edge_rules(
    score: int,
    direction: str,
    confidence: int,
    caution: bool,
    reward_risk: float,
    min_edge_pct: float,
) -> dict:
    """
    Turns Gate 3's parsed sentiment + momentum score into an EV-based pass decision.

    Plain scalars in, not gate dicts — helpers/logic must not depend on a gate module.
    Mirrors helpers/logic/sentiment_rules.apply_pass_rules for the Gate 5 math step.

    Args:
        score:         Momentum score (typically 2–3 at Gate 5).
        direction:     'BULLISH', 'BEARISH', or 'NEUTRAL' from Gate 3.
        confidence:    Gate 3 confidence 0–10.
        caution:       Gate 3 caution flag (True → win-probability penalty).
        reward_risk:   Reward-to-risk ratio from build_trade_levels() (~2.0).
        min_edge_pct:  Minimum EV to pass (from MIN_EDGE_PCT env, default 0.04).

    Returns:
        dict with keys:
            win_probability     (float) — estimated win rate (0–1).
            expected_value      (float) — EV from fixed reward:risk formula.
            edge                (float) — expected_value / reward_risk.
            passed              (bool)  — True when expected_value ≥ min_edge_pct.
            position_confidence (str)   — 'HIGH' / 'MEDIUM' / 'LOW'.
    """
    win_prob = _estimate_win_probability(score, direction, confidence, caution)
    ev = round((win_prob * reward_risk) - (1.0 - win_prob), 4)
    edge = round(ev / reward_risk, 4) if reward_risk else 0.0
    return {
        'win_probability': win_prob,
        'expected_value': ev,
        'edge': edge,
        'passed': ev >= min_edge_pct,
        'position_confidence': _position_confidence(win_prob),
    }


if __name__ == '__main__':
    rr = 2.0
    min_edge = 0.04

    strong = apply_edge_rules(3, 'BULLISH', 9, False, rr, min_edge)
    assert strong['passed'] is True
    assert strong['expected_value'] >= min_edge
    print(f'[ev] strong: win_prob={strong["win_probability"]:.0%} '
          f'EV={strong["expected_value"]:.3f} passed={strong["passed"]}')

    weak = apply_edge_rules(2, 'BULLISH', 6, True, rr, min_edge)
    assert weak['passed'] is False
    assert weak['expected_value'] < min_edge
    print(f'[ev] weak:   win_prob={weak["win_probability"]:.0%} '
          f'EV={weak["expected_value"]:.3f} passed={weak["passed"]}')

    assert strong['win_probability'] > weak['win_probability']
    print('[ev] apply_edge_rules: strong BUY + weak SKIP OK ✅')
