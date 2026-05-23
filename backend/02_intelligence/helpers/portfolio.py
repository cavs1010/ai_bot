# helpers/portfolio.py — daily loss limit check (pure calculation, no API)
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 1 run()
#
# Functions:
#   check_daily_loss_limit(portfolio_value, daily_pnl, limit_pct=0.03)
#       → {breached: bool, loss_pct: float}
#
# Test: python backend/02_intelligence/helpers/portfolio.py
