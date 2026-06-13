import os
import requests
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
from tradingview_screener import Query, col

load_dotenv()

MIN_AVG_VOLUME    = 1_000_000           # shares/day — below this, order fills move the price against us
MIN_PRICE         = 10.0                # USD — excludes micro-caps and near-zero stocks
MIN_ATR_PCT       = 1.0                 # % of price — below this, stock is too flat to produce momentum signals
MAX_ATR_PCT       = 5.0                 # % of price — above this, stop-losses become too wide to trade safely
MIN_MARKET_CAP    = 100_000_000_000     # $100B — proxy for large-cap US universe (~70 stocks, validated)
EARNINGS_WINDOW_DAYS = 5               # days — exclude stocks with earnings: gaps can blow through stop-losses
WATCHLIST_PATH    = 'data/watchlist.csv'


def get_max_share_price() -> float:
    """
    Returns the dynamic maximum share price based on Alpaca portfolio value.

    Returns:
        portfolio_value * MAX_POSITION_SIZE_PCT * 0.90, or 360.0 as fallback.
    """
    try:
        import alpaca_trade_api as tradeapi
        from alpaca_trade_api.common import URL
        key_id = os.getenv('ALPACA_API_KEY')
        secret_key = os.getenv('ALPACA_SECRET_KEY')
        base_url = os.getenv('ALPACA_BASE_URL')
        if not key_id or not secret_key or not base_url:
            raise ValueError('Alpaca credentials not set')
        api = tradeapi.REST(
            key_id=key_id,
            secret_key=secret_key,
            base_url=URL(base_url),
        )
        portfolio_value = float(str(api.get_account().portfolio_value))
        max_position_pct = float(os.getenv('MAX_POSITION_SIZE_PCT', 0.08))
        return portfolio_value * max_position_pct * 0.90
    except Exception as e:
        print(f'[universe] Alpaca unavailable, using fallback ceiling $360.00: {e}')
        return 360.0


def get_earnings_tickers(days_ahead: int = EARNINGS_WINDOW_DAYS) -> set[str] | None:
    """
    Fetches tickers with earnings announcements in the next N days from Finnhub.

    Args:
        days_ahead: Number of calendar days to look forward. Default 5.

    Returns:
        Set of ticker strings with upcoming earnings, or None on failure.
    """
    try:
        key = os.getenv('FINNHUB_API_KEY')
        if not key:
            print('[universe] FINNHUB_API_KEY not set, skipping earnings filter')
            return None
        today = datetime.now().strftime('%Y-%m-%d')
        future = (datetime.now() + timedelta(days=days_ahead)).strftime('%Y-%m-%d')
        url = f'https://finnhub.io/api/v1/calendar/earnings?from={today}&to={future}&token={key}'
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        return {e['symbol'] for e in r.json().get('earningsCalendar', [])}
    except Exception as e:
        print(f'[universe] Finnhub unavailable, skipping earnings filter: {e}')
        return None


def save_watchlist(df: pd.DataFrame) -> None:
    """
    Saves the filtered stock universe to data/watchlist.csv.

    Args:
        df: DataFrame with columns ticker, price, volume, atr, atr_pct, rsi, sma20, sma50, sector.

    Returns:
        None
    """
    os.makedirs('data', exist_ok=True)
    df.to_csv(WATCHLIST_PATH, index=False)
    print(f'[universe] saved {len(df)} tickers to {WATCHLIST_PATH}')


def run_universe_filter() -> int | None:
    """
    Runs the Tier 1 universe filter: large-cap US stocks → watchlist.csv.

    Returns:
        Count of stocks saved, or None on failure.
    """
    max_price = get_max_share_price()
    print(f'[universe] price ceiling: ${max_price:.2f}')

    try:
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
            .limit(200)
            .get_scanner_data()
        )
        df: pd.DataFrame = pd.DataFrame(scanner_df)
    except Exception as e:
        print(f'[universe] TradingView query failed: {e}')
        return None

    # ATR (Average True Range) = average daily price move in dollars, e.g. ATR=6.24 means AAPL moves ~$6/day.
    # We convert to a percentage of price so stocks at different price levels are comparable.
    # A $300 stock with ATR $6 and a $30 stock with ATR $6 have very different risk profiles.
    df['atr_pct'] = (df['ATR'] / df['close'] * 100).round(2)
    df = pd.DataFrame(
        df[(df['atr_pct'] >= MIN_ATR_PCT) & (df['atr_pct'] <= MAX_ATR_PCT)].copy()
    )
    print(f'[universe] {len(df)} stocks after ATR% filter ({MIN_ATR_PCT}%–{MAX_ATR_PCT}%)')

    earnings = get_earnings_tickers()
    if earnings:
        before = len(df)
        df = df[~df['name'].isin(list(earnings))]
        removed = before - len(df)
        if removed:
            print(f'[universe] {removed} stocks removed for upcoming earnings')

    assert df[['RSI', 'SMA20', 'SMA50']].notna().any().all(), '[universe] momentum columns missing from TradingView response'

    watchlist: pd.DataFrame = pd.DataFrame(
        df[['name', 'close', 'average_volume_10d_calc', 'ATR', 'atr_pct', 'RSI', 'SMA20', 'SMA50', 'sector']].copy()
    )
    watchlist.columns = ['ticker', 'price', 'volume', 'atr', 'atr_pct', 'rsi', 'sma20', 'sma50', 'sector']
    watchlist['price'] = watchlist['price'].round(2)
    watchlist['volume'] = watchlist['volume'].astype(int)
    watchlist['atr'] = watchlist['atr'].round(2)
    watchlist['rsi'] = watchlist['rsi'].round(1)
    watchlist['sma20'] = watchlist['sma20'].round(2)
    watchlist['sma50'] = watchlist['sma50'].round(2)

    save_watchlist(watchlist)
    return len(watchlist)


if __name__ == '__main__':
    result = run_universe_filter()
    if result is not None:
        print(f'[universe] complete: {result} stocks saved to data/watchlist.csv')
