# helpers/fetchers/premarket.py — pre-market gap calculation via yfinance
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 1 run()
#
# Functions:
#   get_premarket_gap(ticker) → {applicable: True, gap_pct, prior_close, premarket_price, direction}
#                             | {applicable: False, reason}   (no pre-market session in progress)
#                             | None                          (fetch failed during pre-market)
#
# The gap only exists during the pre-market session (4:00–9:30 AM New York on a trading day).
# At any other time the latest bars mix different sessions, so no gap is calculated.
#
# Data sources:
#   trading day     — Alpaca market calendar (weekends and exchange holidays excluded)
#   prior_close     — yfinance daily bars: the last session before today
#   premarket_price — yfinance 1-min bars with prepost=True: today's bars before 9:30 AM ET
#
# Test: python -m backend.data.premarket

from datetime import datetime, time
from zoneinfo import ZoneInfo
import yfinance as yf

from backend.broker.alpaca import is_trading_day

NEW_YORK = ZoneInfo('America/New_York')
PREMARKET_OPEN = time(4, 0)
REGULAR_OPEN = time(9, 30)


def get_premarket_gap(ticker: str) -> dict | None:
    """
    Fetches the pre-market gap for a ticker using yfinance extended-hours bars.

    Args:
        ticker: Stock ticker symbol, e.g. 'NVDA', 'AAPL'.

    Returns:
        During the pre-market session, dict with keys:
            applicable (bool)       — True
            gap_pct (float)         — signed % gap vs prior close (e.g. -0.023 = -2.3%)
            prior_close (float)     — close of the last session before today
            premarket_price (float) — most recent pre-market bar close today (before 9:30 AM ET)
            direction (str)         — 'up' | 'down' | 'flat'
        Outside the pre-market session: {'applicable': False, 'reason': ...} — nothing is fetched.
        None if the fetch fails or returns no data during the pre-market session.
    """
    now = datetime.now(NEW_YORK)
    if not (PREMARKET_OPEN <= now.time() < REGULAR_OPEN and is_trading_day(now.date())):
        return {'applicable': False, 'reason': 'no pre-market session in progress'}

    try:
        # 1. Prior close: the last regular session before today
        df_daily = yf.Ticker(ticker).history(period='5d', interval='1d')
        prior_sessions = df_daily[df_daily.index.date < now.date()]
        if prior_sessions.empty:
            print(f'[premarket] {ticker}: no prior-session daily data returned')
            return None
        prior_close = round(float(prior_sessions['Close'].iloc[-1]), 2)

        # 2. Pre-market price: today's most recent 1-min bar before 9:30 AM ET
        # Index is already America/New_York — no tz conversion needed
        df_1m = yf.Ticker(ticker).history(period='1d', interval='1m', prepost=True)
        premarket_bars = df_1m[(df_1m.index.date == now.date()) & (df_1m.index.time < REGULAR_OPEN)]
        if premarket_bars.empty:
            print(f'[premarket] {ticker}: no pre-market bars returned for today')
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
        'applicable':       True,
        'gap_pct':          gap_pct,
        'prior_close':      prior_close,
        'premarket_price':  premarket_price,
        'direction':        direction,
    }


if __name__ == '__main__':
    result = get_premarket_gap('NVDA')
    if result is None:
        print('[premarket] get_premarket_gap returned None (fetch failed)')
    elif not result['applicable']:
        print(f'[premarket] NVDA: not applicable — {result["reason"]}')
    else:
        print(f'[premarket] ticker:           NVDA')
        print(f'[premarket] prior close:      {result["prior_close"]}')
        print(f'[premarket] pre-market price: {result["premarket_price"]}')
        print(f'[premarket] gap:              {result["gap_pct"]:+.2%} ({result["direction"]})')
