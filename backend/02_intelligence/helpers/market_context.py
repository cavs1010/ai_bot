# helpers/market_context.py — bundles market + macro data for Gate 4 prompt
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 4 run()
#
# Functions:
#   get_market_context(sector) → {vix: dict, spy: dict, sector: dict, hours_to_next_macro: float} | None
#
# Composes: get_vix_snapshot(), get_spy_snapshot(), get_sector_etf_snapshot(), get_hours_to_next_macro_event()
# Does NOT duplicate fetch logic — imports from helpers/market.py and helpers/calendars.py
#
# Test: python backend/02_intelligence/helpers/market_context.py
