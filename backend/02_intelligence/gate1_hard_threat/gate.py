# gate1_hard_threat/gate.py — Hard Threat Screen (rules only, zero Claude cost)
# Phase 4.1 | Intelligence Layer
#
# Function: run(ticker, sector, portfolio_value, daily_pnl)
#   → {passed: bool, block_reason: str | None, checks: dict}
#
# Imports from helpers: market, calendars, premarket, filings, portfolio
# Thresholds from: constants.BLOCK_THRESHOLDS
# No Claude call — first gate, runs in milliseconds
#
# Test: python backend/02_intelligence/gate1_hard_threat/gate.py
