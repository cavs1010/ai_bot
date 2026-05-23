# gate5_signal/gate.py — Final Signal + Expected Value (Claude call 4 of 4)
# Phase 4.5 | Intelligence Layer
#
# Function: run(ticker, company_name, candidate, gate_results)
#   → {passed: bool, decision: 'BUY'|'SKIP', win_probability: float, expected_value: float,
#      edge: float, position_confidence: str, reason: str, trade_levels: dict}
#
# Imports from helpers: trade_levels (build_trade_levels, build_gate_summary)
# Claude prompt: EV formula + prior gate summary — parse WIN_PROBABILITY, EXPECTED_VALUE, DECISION, POSITION_CONFIDENCE, REASON
# Hard cap: EV < MIN_EDGE_PCT → force SKIP in code (not Claude's call)
#
# Test: python backend/02_intelligence/gate5_signal/gate.py
