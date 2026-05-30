# helpers/logic/sentiment_rules.py — apply_pass_rules (pure logic, no API)
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 3 run() (after Claude response is parsed)
#
# Functions:
#   apply_pass_rules(direction, confidence, source_reliability)
#       → {passed: bool, caution: bool, size_reduction_pct: int}
#
# Rules:
#   BEARISH                          → block
#   NEUTRAL + confidence < 6         → block
#   NEUTRAL + confidence >= 6        → caution (-25% size)
#   BULLISH + LOW source             → caution
#   BULLISH + MEDIUM/HIGH source     → pass
#
# Test: python backend/02_intelligence/helpers/sentiment_rules.py
