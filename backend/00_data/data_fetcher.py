# backend/00_data/data_fetcher.py
# The bot's eyes — fetches price data and news for each stock.
# Every other module imports from here.
import os
from datetime import datetime, timedelta

import pandas as pd
import yfinance as yf
from dotenv import load_dotenv
from newsapi import NewsApiClient

load_dotenv()


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


def get_news_headlines(ticker: str, days_back: int = 7, max_results: int = 20) -> list[dict] | None:
    """
    Fetches recent English news headlines for a stock ticker via NewsAPI.

    Args:
        ticker:      Stock symbol used as the search query, e.g. 'AAPL'
        days_back:   How many calendar days to look back. Default 7.
                     Free-tier NewsAPI caps at 30 days.
        max_results: Max number of articles to return. Default 20, max 100.

    Returns:
        List of dicts with keys ['headline', 'description', 'source', 'url', 'published_at'],
        sorted newest-first, or None on failure / no results.
    """
    api_key = os.getenv('NEWS_API_KEY')
    if not api_key:
        print(f'[data] {ticker}: no NEWS_API_KEY found in environment')
        return None

    try:
        client = NewsApiClient(api_key=api_key)
        from_date = (datetime.today() - timedelta(days=days_back)).strftime('%Y-%m-%d')
        response = client.get_everything(
            q=ticker,
            from_param=from_date,
            language='en',
            sort_by='publishedAt',
            page_size=max_results,
        )
        articles = response.get('articles', [])
        headlines = [
            {
                'headline':    a['title'],
                'description': a.get('description'),
                'source':      a['source']['name'],
                'url':         a['url'],
                'published_at': a['publishedAt'],
            }
            for a in articles
            # NewsAPI marks deleted articles with this tombstone title
            if a.get('title') and a['title'] != '[Removed]'
        ]
        if not headlines:
            print(f'[data] {ticker}: no headlines found in the last {days_back} days')
            return None
        return headlines
    except Exception as e:
        print(f'[data] {ticker}: fetch failed — {e}')
        return None


if __name__ == '__main__':
    df = get_stock_data('AAPL')
    if df is not None:
        print(f'AAPL: {len(df)} days of price data')
        print(df.tail(3)[['Close', 'Volume']])

    print()
    headlines = get_news_headlines('AAPL')
    if headlines:
        print(f'AAPL: {len(headlines)} headlines fetched')
        for h in headlines[:3]:
            print(f"  {h['published_at'][:10]}: {h['headline']}")
