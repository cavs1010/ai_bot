# helpers/fetchers/market.py — market snapshots and context bundle
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 1 run() (snapshots), Gate 4 run() (get_market_context)
#
# Raw fetchers (no dependencies):
#   get_vix_snapshot()               → {level, change_pct_today, prior_close} | None
#   get_spy_snapshot()               → {price, change_pct_today, prior_close}  | None
#   get_sector_etf_snapshot(sector)  → {etf_ticker, price, change_pct_today, prior_close} | None
#
# Composed bundle (imports from calendars.py):
#   get_market_context(sector)       → {vix, spy, sector, hours_to_next_macro} | None  [TODO — build after calendars.py]
#
# Test: python backend/02_intelligence/helpers/market.py

import sys
import pathlib

import yfinance as yf

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))  # 02_intelligence/ — for constants
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))       # fetchers/ — for calendars
from constants import SECTOR_ETF_MAP
from calendars import get_hours_to_next_macro_event


def _fetch_closes(ticker: str, label: str) -> tuple[float, float] | None:
    """
    Fetches the two most recent daily closing prices for a ticker via yfinance.

    Args:
        ticker: yfinance ticker symbol, e.g. '^VIX', 'SPY', 'XLK'.
        label:  human-readable label used in print messages, e.g. 'VIX'.

    Returns:
        (current_close, prior_close) as floats, or None on failure.
    """
    try:
        df = yf.Ticker(ticker).history(period='5d', interval='1d')
        if len(df) < 2:
            print(f'[market] {label}: insufficient data returned (need ≥ 2 rows)')
            return None
        return round(float(df['Close'].iloc[-1]), 2), round(float(df['Close'].iloc[-2]), 2)
    except Exception as e:
        print(f'[market] {label}: fetch failed — {e}')
        return None


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
        None on fetch failure or insufficient data.
    """
    closes = _fetch_closes('^VIX', 'VIX')
    if closes is None:
        return None
    level, prior_close = closes
    return {
        'level':            level,
        'change_pct_today': round((level - prior_close) / prior_close, 4),
        'prior_close':      prior_close,
    }


def get_spy_snapshot() -> dict | None:
    """
    Fetches the SPY price and intraday change vs prior close via yfinance.

    Args:
        None

    Returns:
        dict with keys:
            price (float)             — most recent closing price
            change_pct_today (float)  — signed % change vs prior close (e.g. -0.02 = -2%)
            prior_close (float)       — prior session's closing price
        None on fetch failure or insufficient data.
    """
    closes = _fetch_closes('SPY', 'SPY')
    if closes is None:
        return None
    price, prior_close = closes
    return {
        'price':            price,
        'change_pct_today': round((price - prior_close) / prior_close, 4),
        'prior_close':      prior_close,
    }


def get_sector_etf_snapshot(sector: str) -> dict | None:
    """
    Fetches the sector ETF price and intraday change vs prior close via yfinance.

    Args:
        sector: TradingView sector name, e.g. 'Electronic Technology'.
                Must match a key in constants.SECTOR_ETF_MAP.

    Returns:
        dict with keys:
            etf_ticker (str)          — the ETF used, e.g. 'XLK'
            price (float)             — most recent closing price
            change_pct_today (float)  — signed % change vs prior close (e.g. -0.02 = -2%)
            prior_close (float)       — prior session's closing price
        None if sector is unknown or fetch fails.
    """
    etf_ticker = SECTOR_ETF_MAP.get(sector)
    if not etf_ticker:
        print(f"[market] sector ETF: unknown sector '{sector}'")
        return None
    closes = _fetch_closes(etf_ticker, etf_ticker)
    if closes is None:
        return None
    price, prior_close = closes
    return {
        'etf_ticker':       etf_ticker,
        'price':            price,
        'change_pct_today': round((price - prior_close) / prior_close, 4),
        'prior_close':      prior_close,
    }


def get_market_context(sector: str) -> dict | None:
    """
    Composes a market snapshot bundle used by Gate 4 contradiction detection.

    Calls four existing helpers and bundles their results. Individual keys may be
    None if their respective fetch fails — Gate 4 handles partial data gracefully.
    Returns None only if all three market-data components (vix, spy, sector) fail.

    Args:
        sector: TradingView sector name, e.g. 'Electronic Technology'.
                Passed through to get_sector_etf_snapshot().

    Returns:
        dict with keys:
            vix (dict | None)                  — {level, change_pct_today, prior_close}
            spy (dict | None)                  — {price, change_pct_today, prior_close}
            sector (dict | None)               — {etf_ticker, price, change_pct_today, prior_close}
            hours_to_next_macro (float | None) — hours to nearest high-impact US event;
                                                 None = no event found in 7 days (normal)
        None if vix, spy, and sector all fail simultaneously.
    """
    vix         = get_vix_snapshot()
    spy         = get_spy_snapshot()
    sector_data = get_sector_etf_snapshot(sector)
    hours_macro = get_hours_to_next_macro_event()

    if vix is None and spy is None and sector_data is None:
        print('[market] get_market_context: all market data failed — returning None')
        return None

    return {
        'vix':                vix,
        'spy':                spy,
        'sector':             sector_data,
        'hours_to_next_macro': hours_macro,
    }


if __name__ == '__main__':
    vix = get_vix_snapshot()
    if vix:
        print(f'[market] VIX level:        {vix["level"]}')
        print(f'[market] VIX prior close:  {vix["prior_close"]}')
        print(f'[market] VIX change today: {vix["change_pct_today"]:+.2%}')
    else:
        print('[market] VIX: snapshot returned None')

    print()

    spy = get_spy_snapshot()
    if spy:
        print(f'[market] SPY price:        {spy["price"]}')
        print(f'[market] SPY prior close:  {spy["prior_close"]}')
        print(f'[market] SPY change today: {spy["change_pct_today"]:+.2%}')
    else:
        print('[market] SPY: snapshot returned None')

    print()

    etf = get_sector_etf_snapshot('Electronic Technology')
    if etf:
        print(f'[market] Sector ETF:       {etf["etf_ticker"]}')
        print(f'[market] ETF price:        {etf["price"]}')
        print(f'[market] ETF prior close:  {etf["prior_close"]}')
        print(f'[market] ETF change today: {etf["change_pct_today"]:+.2%}')
    else:
        print('[market] sector ETF: snapshot returned None')

    print()
    result = get_sector_etf_snapshot('Unknown Sector')
    assert result is None, 'Expected None for unknown sector'
    print('[market] unknown sector correctly returned None ✅')

    print()

    ctx = get_market_context('Electronic Technology')
    if ctx:
        vix_str   = f"level={ctx['vix']['level']}" if ctx['vix'] else 'None'
        spy_str   = f"price={ctx['spy']['price']}" if ctx['spy'] else 'None'
        sec_str   = f"etf={ctx['sector']['etf_ticker']}" if ctx['sector'] else 'None'
        macro_str = f"{ctx['hours_to_next_macro']}h" if ctx['hours_to_next_macro'] is not None else 'None (no events)'
        print(f'[market] context vix:            {vix_str}')
        print(f'[market] context spy:            {spy_str}')
        print(f'[market] context sector:         {sec_str}')
        print(f'[market] context hours_to_macro: {macro_str}')
    else:
        print('[market] get_market_context: returned None')

    print()
    ctx_bad = get_market_context('Unknown Sector')
    assert ctx_bad is not None, 'Expected dict even for unknown sector'
    assert ctx_bad['sector'] is None, 'Expected sector=None for unknown sector'
    print('[market] unknown sector correctly returns dict with sector=None ✅')
