# gate4_contradiction/gate.py — Contradiction Detection (Claude call 3 of 4)
# Phase 4.4 | Intelligence Layer
#
# Function: run(ticker, candidate, gate3_result)
#   → {passed: bool, contradiction_detected: bool, contradiction_type: str,
#      risk_level: str, reason: str, action: 'PASS'|'BLOCK'|'FLAG_FOR_REVIEW', market_context: dict}
#
# Imports from helpers: market_context (get_market_context)
# Claude prompt: bullish signals vs market context — parse CONTRADICTION_DETECTED, CONTRADICTION_TYPE, RISK_LEVEL, REASON
# HIGH → block; MEDIUM/LOW → FLAG_FOR_REVIEW
#
# Test: python backend/02_intelligence/gate4_contradiction/gate.py
