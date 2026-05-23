# helpers/calendars.py — macro events and per-ticker earnings windows
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 1 run(), get_hours_to_next_macro_event() (Gate 4 via market_context)
#
# Functions:
#   get_upcoming_macro_events(hours_ahead=24)   → [{event, country, time, impact}] | None
#   get_ticker_earnings_window(ticker, days_ahead=1) → {reports_today, reports_tomorrow, report_date, hour} | None
#   get_hours_to_next_macro_event()             → float (hours) | None
#
# Test: python backend/02_intelligence/helpers/calendars.py
