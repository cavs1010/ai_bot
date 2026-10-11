import os
import sys
import requests
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
from tradingview_screener.query import Query
from tradingview_screener.column import col

load_dotenv()

# Strategy settings come from the active Neon config, passed in by Node
from backend.config import (
    MIN_AVG_VOLUME, MIN_PRICE, MIN_ATR_PCT, MAX_ATR_PCT, MIN_MARKET_CAP,
    EARNINGS_WINDOW_DAYS, SCREENER_LIMIT, MAX_POSITION_SIZE_PCT, PRICE_CEILING_BUFFER,
)

# Live account state comes from the execution layer (one Alpaca client for the whole backend)
from backend.broker.alpaca import get_portfolio_value

# Prefix of the stdout line carrying the filtered universe. Node reads it and saves the
# Neon batch (Rule 20: Python never writes to the database); no file is written.
UNIVERSE_LINE_PREFIX = '__UNIVERSE_JSON__ '


def get_max_share_price() -> float:
    """
    Returns the dynamic maximum share price based on Alpaca portfolio value.

    Returns:
        portfolio_value * MAX_POSITION_SIZE_PCT * PRICE_CEILING_BUFFER.
        Raises if Alpaca is unavailable; there is no fallback ceiling.
    """
    return get_portfolio_value() * MAX_POSITION_SIZE_PCT * PRICE_CEILING_BUFFER


def get_earnings_tickers(days_ahead: int = EARNINGS_WINDOW_DAYS) -> set[str]:
    """
    Fetches tickers with earnings announcements in the next N days from Finnhub.

    Args:
        days_ahead: Number of calendar days to look forward (EARNINGS_WINDOW_DAYS).

    Returns:
        Set of ticker strings with upcoming earnings; empty if none are scheduled.
        Raises if FINNHUB_API_KEY is missing or Finnhub fails: the filter is never skipped.
    """
    key = os.getenv('FINNHUB_API_KEY')
    if not key:
        raise RuntimeError('FINNHUB_API_KEY is not set; the earnings filter cannot run')
    today = datetime.now().strftime('%Y-%m-%d')
    future = (datetime.now() + timedelta(days=days_ahead)).strftime('%Y-%m-%d')
    url = f'https://finnhub.io/api/v1/calendar/earnings?from={today}&to={future}&token={key}'
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return {e['symbol'] for e in r.json()['earningsCalendar']}


def run_universe_filter(max_price: float | None = None, limit: int = SCREENER_LIMIT) -> pd.DataFrame:
    """
    Runs the Tier 1 universe filter: large-cap US stocks → the universe watchlist.

    Args:
        max_price: Upper share-price bound for the screener. When None (default), it is
                   fetched dynamically from Alpaca via get_max_share_price(). Pass a value
                   to bypass the Alpaca call for reproducible runs, notebooks, or tests.
        limit:     Max rows requested from the TradingView screener before the ATR% and
                   earnings filters are applied (SCREENER_LIMIT).

    Returns:
        DataFrame with columns ticker, price, volume, atr, atr_pct, rsi, sma20, sma50, sector;
        empty if no stock matches the screener. Raises if TradingView, Finnhub or Alpaca fail.
    """
    if max_price is None:
        max_price = get_max_share_price()
    print(f'[universe] price ceiling: ${max_price:.2f}')

    print('[universe] querying TradingView screener...')
    _, scanner_df = (Query()
        .select('name', 'close', 'average_volume_10d_calc', 'ATR', 'RSI', 'SMA20', 'SMA50', 'sector')
        .where(
            col('market_cap_basic') > MIN_MARKET_CAP,
            col('country') == 'United States',
            col('is_primary') == True,
            col('subtype') == 'common',
            col('average_volume_10d_calc') > MIN_AVG_VOLUME,
            col('close') > MIN_PRICE,
            col('close') < max_price,
        )
        .order_by('average_volume_10d_calc', ascending=False)
        .limit(limit)
        .get_scanner_data()
    )
    df: pd.DataFrame = pd.DataFrame(scanner_df)

    columns = ['ticker', 'price', 'volume', 'atr', 'atr_pct', 'rsi', 'sma20', 'sma50', 'sector']
    if df.empty:
        print('[universe] TradingView returned 0 records matching screener criteria')
        return pd.DataFrame(columns=columns)

    # ATR (Average True Range) = average daily price move in dollars, e.g. ATR=6.24 means AAPL moves ~$6/day.
    # We convert to a percentage of price so stocks at different price levels are comparable.
    df['atr_pct'] = (df['ATR'] / df['close'] * 100).round(2)
    df = pd.DataFrame(
        df[(df['atr_pct'] >= MIN_ATR_PCT) & (df['atr_pct'] <= MAX_ATR_PCT)].copy()
    )
    print(f'[universe] {len(df)} stocks after ATR% filter ({MIN_ATR_PCT}%–{MAX_ATR_PCT}%)')

    earnings = get_earnings_tickers()
    before = len(df)
    df = pd.DataFrame(df[~df['name'].isin(list(earnings))])
    print(f'[universe] {before - len(df)} stocks removed for upcoming earnings')

    assert df[['RSI', 'SMA20', 'SMA50']].notna().to_numpy().any(axis=0).all(), '[universe] momentum columns missing from TradingView response'

    watchlist: pd.DataFrame = pd.DataFrame(
        df[['name', 'close', 'average_volume_10d_calc', 'ATR', 'atr_pct', 'RSI', 'SMA20', 'SMA50', 'sector']].copy()
    )
    watchlist.columns = columns
    watchlist['price'] = watchlist['price'].round(2)
    watchlist['volume'] = watchlist['volume'].astype(int)
    watchlist['atr'] = watchlist['atr'].round(2)
    watchlist['rsi'] = watchlist['rsi'].round(1)
    watchlist['sma20'] = watchlist['sma20'].round(2)
    watchlist['sma50'] = watchlist['sma50'].round(2)
    return watchlist


if __name__ == '__main__':
    # Load Watchlist: the universe goes to Node on one stdout line; Node saves the Neon batch
    watchlist = run_universe_filter()
    print(UNIVERSE_LINE_PREFIX + watchlist.to_json(orient='records'))
    print(f'[universe] complete: {len(watchlist)} stocks returned to Node')
