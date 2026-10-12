# news.py — fetch and normalize news with caller-supplied windows and source patterns
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Pipeline (fetch once), Gate 2 run(), Gate 3 run()
#

import os
import requests
from datetime import date, datetime, timedelta, timezone

from dotenv import load_dotenv
from newsapi import NewsApiClient

load_dotenv()


def classify_source(source_name: str, reliability_tiers: dict[str, list[str]], url: str | None = None) -> str:
    """
    Maps a publisher (and optional URL for generic Alpaca/benzinga feeds) to a tier.

    Args:
        source_name: Raw source from the API, e.g. 'benzinga', 'Yahoo', 'Reuters'.
        reliability_tiers: Source patterns supplied by the runner.
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
            for pattern in reliability_tiers[tier]:
                if pattern.lower() in text:
                    return tier
    return 'LOW'


def _item(
    provider: str,
    headline: str,
    source: str,
    url: str,
    published_at: str,
    summary: str,
    reliability_tiers: dict[str, list[str]],
) -> dict:
    return {
        'provider': provider,   # news API that returned this headline: alpaca | finnhub | newsapi
        'headline': headline,
        'source': source or '',
        'reliability': classify_source(source, reliability_tiers, url),
        'url': url or '',
        'published_at': published_at,
        'summary': (summary or '').strip(),
    }


def fetch_news(
    ticker: str,
    days_back: int,
    max_results: int,
    reliability_tiers: dict[str, list[str]],
    include_summary: bool = True,
) -> list[dict] | None:
    """
    Fetches recent news for a ticker: Alpaca → Finnhub (if empty) → NewsAPI (if still empty).

    Args:
        ticker:          Stock symbol, e.g. 'NVDA'.
        days_back:       Calendar days to look back, supplied from the strategy configuration.
        max_results:     Max articles to return, supplied from the strategy configuration.
        reliability_tiers: Source-name and URL lookup patterns supplied by the runner.
        include_summary: If True, include one-line summary when the API provides it.

    Returns:
        [{provider, headline, source, reliability, url, published_at, summary}], or [] if the
        sources that answered have no news in the window.
        None if no source answered (no keys set, or every attempted source failed) — never
        reported as "no news".
    """
    raw: list[dict] = []
    answered = False   # True once any source responds successfully, even with zero articles

    key = os.getenv('ALPACA_API_KEY')
    secret = os.getenv('ALPACA_SECRET_KEY')
    if key and secret:
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
                        'alpaca',
                        article.headline,
                        article.source or 'benzinga',
                        article.url or '',
                        article.created_at.isoformat() if article.created_at else '',
                        summary,
                        reliability_tiers,
                    ))
            answered = True
        except Exception as e:
            print(f'[news] {ticker}: Alpaca fetch failed — {e}')

    if not raw:
        fh_key = os.getenv('FINNHUB_API_KEY')
        if fh_key:
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
                        'finnhub',
                        headline,
                        article.get('source', ''),
                        article.get('url', ''),
                        published,
                        article.get('summary', '') if include_summary else '',
                        reliability_tiers,
                    ))
                answered = True
            except Exception as e:
                print(f'[news] {ticker}: Finnhub fetch failed — {e}')

    if not raw:
        news_key = os.getenv('NEWS_API_KEY')
        if news_key:
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
                            'newsapi',
                            title,
                            article.get('source', {}).get('name', ''),
                            article.get('url', ''),
                            article.get('publishedAt', ''),
                            article.get('description') or '' if include_summary else '',
                            reliability_tiers,
                        ))
                answered = True
            except Exception as e:
                print(f'[news] {ticker}: NewsAPI fetch failed — {e}')

    if not answered:
        return None
    return raw
