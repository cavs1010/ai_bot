# helpers/fetchers/premarket.py — pre-market gap calculation via yfinance
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 1 run()
#
# Functions:
#   get_premarket_gap(ticker) → {gap_pct, prior_close, premarket_price, direction} | None
#
# Data sources:
#   prior_close     — yfinance daily bars (period='5d')
#   premarket_price — yfinance 1-min bars with prepost=True, filtered to < 9:30 AM ET
#   No API key required.
#
# Test: python backend/02_intelligence/helpers/premarket.py

import sys
import pathlib
import datetime
import yfinance as yf

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))


def get_premarket_gap(ticker: str) -> dict | None:
    """
    Fetches the pre-market gap for a ticker using yfinance extended-hours bars.

    Args:
        ticker: Stock ticker symbol, e.g. 'NVDA', 'AAPL'.

    Returns:
        dict with keys:
            gap_pct (float)         — signed % gap vs prior close (e.g. -0.023 = -2.3%)
            prior_close (float)     — last regular session closing price
            premarket_price (float) — most recent pre-market bar close (before 9:30 AM ET)
            direction (str)         — 'up' | 'down' | 'flat'
        None on fetch failure, no pre-market bars found, or insufficient daily data.
    """
    try:
        # 1. Prior close (last regular session)
        df_daily = yf.Ticker(ticker).history(period='5d', interval='1d')
        if df_daily.empty:
            print(f'[premarket] {ticker}: no daily data returned')
            return None
        prior_close = round(float(df_daily['Close'].iloc[-1]), 2)

        # 2. Pre-market price (most recent 1-min bar before 9:30 AM ET)
        # Index is already America/New_York — no tz conversion needed
        df_1m = yf.Ticker(ticker).history(period='1d', interval='1m', prepost=True)
        if df_1m.empty:
            print(f'[premarket] {ticker}: no intraday data returned')
            return None

        premarket_bars = df_1m[df_1m.index.time < datetime.time(9, 30)]
        if premarket_bars.empty:
            print(f'[premarket] {ticker}: no pre-market bars found (market may be open or closed)')
            return None

        premarket_price = round(float(premarket_bars['Close'].iloc[-1]), 2)
    except Exception as e:
        print(f'[premarket] {ticker}: fetch failed — {e}')
        return None

    # 3. Compute gap
    gap_pct = round((premarket_price - prior_close) / prior_close, 4)
    if gap_pct > 0.001:
        direction = 'up'
    elif gap_pct < -0.001:
        direction = 'down'
    else:
        direction = 'flat'

    return {
        'gap_pct':          gap_pct,
        'prior_close':      prior_close,
        'premarket_price':  premarket_price,
        'direction':        direction,
    }


if __name__ == '__main__':
    result = get_premarket_gap('NVDA')
    if result:
        print(f'[premarket] ticker:           NVDA')
        print(f'[premarket] prior close:      {result["prior_close"]}')
        print(f'[premarket] pre-market price: {result["premarket_price"]}')
        print(f'[premarket] gap:              {result["gap_pct"]:+.2%} ({result["direction"]})')
    else:
        print('[premarket] get_premarket_gap returned None')

    print()

    bad = get_premarket_gap('ZZZZINVALID')
    assert bad is None, 'Expected None for invalid ticker'
    print('[premarket] invalid ticker correctly returned None ✅')
