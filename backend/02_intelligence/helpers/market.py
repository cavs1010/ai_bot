# helpers/market.py — VIX, SPY, and sector ETF snapshots
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 1 run(), get_market_context() (Gate 4)
#
# Functions:
#   get_vix_snapshot()               → {level, change_pct_today, prior_close} | None
#   get_spy_snapshot()               → {price, change_pct_today, prior_close}  | None   [TODO]
#   get_sector_etf_snapshot(sector)  → {etf_ticker, change_pct_today, prior_close} | None  [TODO]
#
# Test: python backend/02_intelligence/helpers/market.py

import yfinance as yf


def get_vix_snapshot() -> dict | None:
    """
    Fetches the VIX level and intraday change vs prior close via yfinance.

    Args:
        None

    Returns:
        dict with keys:
            level (float)             — most recent closing level
            change_pct_today (float)  — signed % change vs prior close (e.g. 0.05 = +5%)
            prior_close (float)       — prior session's closing level
        None on fetch failure or insufficient data (< 2 rows).
    """
    try:
        df = yf.Ticker("^VIX").history(period="5d", interval="1d")
        if df is None or len(df) < 2:
            print("[market] VIX: insufficient data returned (need ≥ 2 rows)")
            return None
        prior_close = round(float(df["Close"].iloc[-2]), 2)
        level = round(float(df["Close"].iloc[-1]), 2)
        change_pct_today = round((level - prior_close) / prior_close, 4)
        return {
            "level": level,
            "change_pct_today": change_pct_today,
            "prior_close": prior_close,
        }
    except Exception as e:
        print(f"[market] VIX: fetch failed — {e}")
        return None


# get_spy_snapshot()              → TODO: Phase 4.1
# get_sector_etf_snapshot(sector) → TODO: Phase 4.1


if __name__ == "__main__":
    result = get_vix_snapshot()
    if result:
        print(f"[market] VIX level:        {result['level']}")
        print(f"[market] VIX prior close:  {result['prior_close']}")
        print(f"[market] VIX change today: {result['change_pct_today']:+.2%}")
    else:
        print("[market] VIX: snapshot returned None")
