# gate3_sentiment/sentiment_gate3.py — Sentiment Quality Check (Claude call 2 of 4)
# Phase 4.3 | Intelligence Layer
#
# Function: run(ticker, company_name, headlines)
#   → {passed: bool, direction: str, confidence: int, source_reliability: str,
#      key_reason: str, caution: bool, size_reduction_pct: int}
#
# Imports from helpers: fetchers/news (format_news_for_prompt), logic/sentiment_rules (apply_pass_rules)
# Claude prompt: sentiment direction + confidence — parse DIRECTION, CONFIDENCE, SOURCE_RELIABILITY, KEY_REASON
# Same headlines list Gate 2 received — no re-fetch
#
# Test: python backend/02_intelligence/gate3_sentiment/sentiment_gate3.py
