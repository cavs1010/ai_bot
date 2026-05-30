# gate2_news_threat/gate.py — News Threat Assessment (Claude call 1 of 4)
# Phase 4.2 | Intelligence Layer
#
# Function: run(ticker, company_name, headlines=None)
#   → {passed: bool, threat_detected: bool, threat_type: str, reason: str, headlines_used: int}
#
# Imports from helpers: news (format_news_for_prompt)
# Claude prompt: catastrophic threats only — parse THREAT_DETECTED, THREAT_TYPE, REASON
# Note: headlines fetched by Pipeline before this gate; gate fetches only in standalone test
#
# Test: python backend/02_intelligence/gate2_news_threat/gate.py
