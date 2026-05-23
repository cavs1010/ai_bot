# helpers/filings.py — SEC EDGAR 8-K filings via RSS feed
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 1 run()
#
# Functions:
#   get_recent_8k_filings(ticker, days_back=1) → [{form_type, filed_at, title, url}] | None
#
# Test: python backend/02_intelligence/helpers/filings.py
