import pandas as pd
from tradingview_screener.query import Query
from tradingview_screener.column import col

# Strategy settings come from the active Neon config, passed in by Node
from backend.config import (
    MIN_AVG_VOLUME, MIN_PRICE, MIN_ATR_PCT, MAX_ATR_PCT, MIN_MARKET_CAP,
    SCREENER_LIMIT, MAX_POSITION_SIZE_PCT, PRICE_CEILING_BUFFER,
)


def get_max_share_price(portfolio_value: float) -> float:
    """
    Returns the maximum share price from the live portfolio value supplied by the entry.

    Returns:
        portfolio_value * MAX_POSITION_SIZE_PCT * PRICE_CEILING_BUFFER.
    """
    return portfolio_value * MAX_POSITION_SIZE_PCT * PRICE_CEILING_BUFFER


def run_universe_filter(portfolio_value: float, earnings_tickers: set[str], limit: int = SCREENER_LIMIT) -> pd.DataFrame:
    """
    Runs the Tier 1 universe filter: large-cap US stocks → the universe watchlist.

    Args:
        portfolio_value: Live Alpaca portfolio value, fetched by the entry. Used to
                         calculate the upper share-price bound with the strategy dials.
        earnings_tickers: Fetched upcoming earnings symbols supplied by the entry.
        limit:     Max rows requested from the TradingView screener before the ATR% and
                   earnings filters are applied (SCREENER_LIMIT).

    Returns:
        DataFrame with columns ticker, price, volume, atr, atr_pct, rsi, sma20, sma50, sector;
        empty if no stock matches the screener. Raises if TradingView fails.
    """
    max_price = get_max_share_price(portfolio_value)
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

    before = len(df)
    df = pd.DataFrame(df[~df['name'].isin(list(earnings_tickers))])
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
