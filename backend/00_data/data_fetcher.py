# backend/00_data/data_fetcher.py
# The bot's eyes — fetches price data and news for each stock.
# Every other module imports from here.
import pandas as pd
import yfinance as yf


def get_stock_data(ticker: str, period: str = '60d', interval: str = '1d') -> pd.DataFrame | None:
    """
    Downloads OHLCV price data for a stock via Yahoo Finance.

    Args:
        ticker:   Stock symbol, e.g. 'AAPL'
        period:   Lookback window. Default '60d' covers SMA50 + weekend buffer.
                  Examples: '1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max'
        interval: Bar size. Default '1d' (daily).
                  Examples: '1m', '5m', '15m', '30m', '1h', '1d', '1wk', '1mo'

    Returns:
        DataFrame with columns [Open, High, Low, Close, Volume], or None on failure.
    """
    try:
        df = yf.Ticker(ticker).history(period=period, interval=interval)
        if df.empty:
            print(f'[data] {ticker}: no data returned')
            return None
        # yfinance returns tz-aware timestamps; ta library requires tz-naive
        df.index = df.index.tz_convert(None)
        return df
    except Exception as e:
        print(f'[data] {ticker}: fetch failed — {e}')
        return None


if __name__ == '__main__':
    df = get_stock_data('AAPL')
    if df is not None:
        print(f'AAPL: {len(df)} days of price data')
        print(df.tail(3)[['Close', 'Volume']])
