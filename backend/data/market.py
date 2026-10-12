"""Market snapshots from explicit source symbols; no client coordination."""

import yfinance as yf



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


def get_sector_etf_snapshot(etf_ticker: str) -> dict | None:
    """
    Fetches the sector ETF price and intraday change vs prior close via yfinance.

    Args:
        etf_ticker: Explicit ETF symbol selected by the runner's sector lookup.

    Returns:
        dict with keys:
            etf_ticker (str)          — the ETF used, e.g. 'XLK'
            price (float)             — most recent closing price
            change_pct_today (float)  — signed % change vs prior close (e.g. -0.02 = -2%)
            prior_close (float)       — prior session's closing price
        None if the market-data fetch fails.
    """
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
