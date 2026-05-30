# helpers/news.py — fetch, classify, and format news for Gates 2/3
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Pipeline (fetch once), Gate 2 run(), Gate 3 run()
#
# Test: python backend/02_intelligence/helpers/news.py

import os
import sys
import pathlib
import requests
from datetime import date, datetime, timedelta, timezone

from dotenv import load_dotenv
from newsapi import NewsApiClient

load_dotenv()

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from constants import SOURCE_RELIABILITY_TIERS


def classify_source(source_name: str, url: str | None = None) -> str:
    """
    Maps a publisher (and optional URL for generic Alpaca/benzinga feeds) to a tier.

    Args:
        source_name: Raw source from the API, e.g. 'benzinga', 'Yahoo', 'Reuters'.
        url:         Article URL; used when source is empty or 'benzinga'.

    Returns:
        'HIGH', 'MEDIUM', 'LOW', or 'DANGEROUS'. Unknown → 'LOW'.
    """
    source = (source_name or '').strip().lower()
    texts = []
    if source and source != 'benzinga':
        texts.append(source)
    if url:
        texts.append(url.lower())

    for text in texts:
        for tier in ('DANGEROUS', 'HIGH', 'MEDIUM', 'LOW'):
            for pattern in SOURCE_RELIABILITY_TIERS[tier]:
                if pattern.lower() in text:
                    return tier
    return 'LOW'


def _item(
    headline: str,
    source: str,
    url: str,
    published_at: str,
    summary: str = '',
) -> dict:
    return {
        'headline': headline,
        'source': source or '',
        'reliability': classify_source(source, url),
        'url': url or '',
        'published_at': published_at,
        'summary': (summary or '').strip(),
    }


def fetch_news(
    ticker: str,
    days_back: int = 2,
    max_results: int = 5,
    include_summary: bool = True,
) -> list[dict] | None:
    """
    Fetches recent news for a ticker: Alpaca → Finnhub (if empty) → NewsAPI (if still empty).

    Args:
        ticker:          Stock symbol, e.g. 'NVDA'.
        days_back:       Calendar days to look back. Default 2.
        max_results:     Max articles to return. Default 5. Passed to each API's limit param.
        include_summary: If True, include one-line summary when the API provides it.

    Returns:
        [{headline, source, reliability, url, published_at, summary}] or [] if none found.
        None if every attempted source failed.
    """
    raw: list[dict] = []
    tried = False

    key = os.getenv('ALPACA_API_KEY')
    secret = os.getenv('ALPACA_SECRET_KEY')
    if key and secret:
        tried = True
        try:
            from alpaca.data.historical.news import NewsClient
            from alpaca.data.models.news import NewsSet
            from alpaca.data.requests import NewsRequest

            client = NewsClient(api_key=key, secret_key=secret)
            req = NewsRequest(
                symbols=ticker,
                start=datetime.now(timezone.utc) - timedelta(days=days_back),
                limit=min(max_results, 50),
            )
            news_response = client.get_news(req)
            articles = (
                news_response.data.get('news', [])
                if isinstance(news_response, NewsSet)
                else news_response.get('news', [])
            )
            for article in articles:
                if article.headline:
                    summary = article.summary if include_summary else ''
                    raw.append(_item(
                        article.headline,
                        article.source or 'benzinga',
                        article.url or '',
                        article.created_at.isoformat() if article.created_at else '',
                        summary,
                    ))
        except Exception as e:
            print(f'[news] {ticker}: Alpaca fetch failed — {e}')

    if not raw:
        fh_key = os.getenv('FINNHUB_API_KEY')
        if fh_key:
            tried = True
            try:
                r = requests.get(
                    'https://finnhub.io/api/v1/company-news',
                    params={
                        'symbol': ticker,
                        'from': (date.today() - timedelta(days=days_back)).isoformat(),
                        'to': date.today().isoformat(),
                        'token': fh_key,
                    },
                    timeout=10,
                )
                r.raise_for_status()
                for article in r.json():
                    if len(raw) >= max_results:
                        break
                    headline = article.get('headline', '')
                    if not headline:
                        continue
                    ts = article.get('datetime')
                    published = (
                        datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
                        if ts else ''
                    )
                    raw.append(_item(
                        headline,
                        article.get('source', ''),
                        article.get('url', ''),
                        published,
                        article.get('summary', '') if include_summary else '',
                    ))
            except Exception as e:
                print(f'[news] {ticker}: Finnhub fetch failed — {e}')

    if not raw:
        news_key = os.getenv('NEWS_API_KEY')
        if news_key:
            tried = True
            try:
                response = NewsApiClient(api_key=news_key).get_everything(
                    q=ticker,
                    from_param=(date.today() - timedelta(days=days_back)).isoformat(),
                    language='en',
                    sort_by='publishedAt',
                    page_size=max_results,
                )
                for article in response.get('articles', []):
                    title = article.get('title', '')
                    if title and title != '[Removed]':
                        raw.append(_item(
                            title,
                            article.get('source', {}).get('name', ''),
                            article.get('url', ''),
                            article.get('publishedAt', ''),
                            article.get('description') or '' if include_summary else '',
                        ))
            except Exception as e:
                print(f'[news] {ticker}: NewsAPI fetch failed — {e}')

    if not tried:
        return None
    return raw


def format_news_for_prompt(news_items: list[dict]) -> str:
    """Formats news items for Gate 2/3 LLM prompts. Empty list → ''."""
    lines = []
    for item in news_items:
        line = f"{item['headline']} [Source: {item['source']}] [Reliability: {item['reliability']}]"
        if item.get('summary'):
            line += f" — {item['summary']}"
        lines.append(line)
    return '\n'.join(lines)


if __name__ == '__main__':
    assert classify_source('Reuters') == 'HIGH'
    assert classify_source('benzinga', 'https://www.reuters.com/x') == 'HIGH'
    assert classify_source('Unknown') == 'LOW'
    print('[news] classify_source OK ✅')

    articles = fetch_news('NVDA')
    if articles is None:
        print('[news] NVDA: no API keys or all sources failed')
    elif articles:
        print(f'[news] NVDA: {len(articles)} articles')
        print(format_news_for_prompt(articles[:2]))
    else:
        print('[news] NVDA: no news in window')

    bad = fetch_news('ZZZZINVALID')
    print(f'[news] ZZZZINVALID: {bad!r}')
