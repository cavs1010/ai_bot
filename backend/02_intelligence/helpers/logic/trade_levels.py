# helpers/logic/trade_levels.py — trade level calculations and gate summary formatting
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 5 run()
#
# Functions:
#   build_trade_levels(candidate)       → {entry, atr, stop, target, stop_pct, target_pct, reward_risk}
#   build_gate_summary(gate_results)    → str
#
# build_trade_levels formulas:
#   stop   = entry − (1.5 × ATR)
#   target = entry + (2 × stop_distance)
#   reward_risk = (target − entry) / (entry − stop)
#
# Test: python backend/02_intelligence/helpers/trade_levels.py
