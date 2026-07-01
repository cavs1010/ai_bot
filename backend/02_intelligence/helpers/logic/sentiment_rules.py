# helpers/logic/sentiment_rules.py — apply_pass_rules (pure logic, no API)
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 3 evaluate_gate3_sentiment() (after Claude response is parsed)
#
# Functions:
#   apply_pass_rules(direction, confidence)
#       → {passed: bool, caution: bool, size_reduction_pct: int}
#
# Rules (confidence is the single quality knob — Claude folds source reliability into it):
#   BEARISH                          → block
#   NEUTRAL + confidence < 6         → block
#   NEUTRAL + confidence >= 6        → caution (-25% size)
#   BULLISH + confidence < 6         → caution (-25% size)
#   BULLISH + confidence >= 6        → pass
#
# Test: python backend/02_intelligence/helpers/logic/sentiment_rules.py

import sys
import pathlib

# Pass-rule dials live on the central board — backend/config.py.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))   # → backend/
from config import MIN_CONFIDENCE, CAUTION_SIZE_REDUCTION_PCT


def apply_pass_rules(direction: str, confidence: int) -> dict:
    """
    Turns Gate 3's parsed sentiment into a pass/block/caution decision (pure rules, no I/O).

    Plain strings in, not the gate's enum — helpers/logic must not depend on a gate module.
    Confidence is the only quality signal: Claude already weighs source reliability (the
    headlines are tagged) when it sets confidence, so there is no separate reliability input.

    Args:
        direction:  'BULLISH', 'BEARISH', or 'NEUTRAL' — Claude's sentiment call.
        confidence: 0–10. Low confidence blocks a NEUTRAL call (no edge) and trims a BULLISH
                    one (proceed smaller). The cutoff is MIN_CONFIDENCE.

    Returns:
        dict with keys:
            passed             (bool) — False for BEARISH and low-confidence NEUTRAL.
            caution            (bool) — True when passing but size should be cut.
            size_reduction_pct (int)  — 25 when caution, else 0.
    """
    if direction == 'BEARISH':
        return {'passed': False, 'caution': False, 'size_reduction_pct': 0}

    if direction == 'NEUTRAL':
        # No directional edge — only a confident neutral read is worth a (reduced) position.
        if confidence < MIN_CONFIDENCE:
            return {'passed': False, 'caution': False, 'size_reduction_pct': 0}
        return {'passed': True, 'caution': True, 'size_reduction_pct': CAUTION_SIZE_REDUCTION_PCT}

    # BULLISH — low confidence still trades, but smaller.
    if confidence < MIN_CONFIDENCE:
        return {'passed': True, 'caution': True, 'size_reduction_pct': CAUTION_SIZE_REDUCTION_PCT}
    return {'passed': True, 'caution': False, 'size_reduction_pct': 0}


if __name__ == '__main__':
    # All five branches are deterministic — assert each one.
    assert apply_pass_rules('BEARISH', 9) == \
        {'passed': False, 'caution': False, 'size_reduction_pct': 0}
    assert apply_pass_rules('NEUTRAL', 5) == \
        {'passed': False, 'caution': False, 'size_reduction_pct': 0}
    assert apply_pass_rules('NEUTRAL', 6) == \
        {'passed': True, 'caution': True, 'size_reduction_pct': 25}
    assert apply_pass_rules('BULLISH', 5) == \
        {'passed': True, 'caution': True, 'size_reduction_pct': 25}
    assert apply_pass_rules('BULLISH', 8) == \
        {'passed': True, 'caution': False, 'size_reduction_pct': 0}
    print('[sentiment] apply_pass_rules: all five branches OK ✅')
