# helpers/fetchers/filings.py — SEC EDGAR 8-K filings via RSS feed (feedparser)
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 1 run()
#
# Functions:
#   get_recent_8k_filings(ticker, days_back=1) → [{form_type, filed_at, title, url}] | None
#
# Data source:
#   SEC EDGAR company search atom feed — no API key required.
#   SEC fair-access policy requires a descriptive User-Agent on every request.
#
# Test: python backend/02_intelligence/helpers/filings.py

import sys
import pathlib
import datetime
import feedparser

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))

# SEC fair-access policy: identify the application and contact email in User-Agent
feedparser.USER_AGENT = 'ai-trading-bot/1.0 cavs1010@gmail.com'

_EDGAR_URL = (
    'https://www.sec.gov/cgi-bin/browse-edgar'
    '?action=getcompany&CIK={ticker}&type=8-K'
    '&dateb=&owner=include&count=40&search_text=&output=atom'
)


def get_recent_8k_filings(ticker: str, days_back: int = 1) -> list[dict] | None:
    """
    Fetches recent 8-K filings for a ticker from the SEC EDGAR atom feed.

    Args:
        ticker:    Stock ticker symbol, e.g. 'AAPL', 'NVDA'.
        days_back: How many calendar days back to include. Default 1 (today + yesterday).
                   Use 0 for today only.

    Returns:
        List of dicts with keys:
            form_type (str) — '8-K' or '8-K/A' (SEC prefix-matches both on type=8-K)
            filed_at  (str) — filing date as 'YYYY-MM-DD'
            title     (str) — e.g. '8-K  - Current report' or '8-K/A [Amend]  - Current report'
            url       (str) — link to filing index on SEC.gov
        Empty list if no filings found within the window.
        None on fetch failure or non-200 HTTP status.
    """
    url = _EDGAR_URL.format(ticker=ticker)

    try:
        feed = feedparser.parse(url)
    except Exception as e:
        print(f'[filings] {ticker}: fetch failed — {e}')
        return None

    if feed.status != 200:
        print(f'[filings] {ticker}: SEC EDGAR returned HTTP {feed.status}')
        return None

    cutoff = datetime.date.today() - datetime.timedelta(days=days_back)

    result = []
    for entry in feed.entries:
        filing_date_str = entry.get('filing-date', '')
        try:
            filing_date = datetime.date.fromisoformat(filing_date_str)
        except ValueError:
            continue
        if filing_date >= cutoff:
            result.append({
                'form_type': entry.get('filing-type', '8-K'),
                'filed_at':  filing_date_str,
                'title':     entry.get('title', '').strip(),
                'url':       entry.get('link', ''),
            })

    return result


if __name__ == '__main__':
    # Happy path — recent window (30 days) to guarantee results
    print('=== get_recent_8k_filings("AAPL", days_back=30) ===')
    filings_30d = get_recent_8k_filings('AAPL', days_back=30)
    if filings_30d is None:
        print('[filings] fetch failed')
    elif not filings_30d:
        print('[filings] no 8-K filings in the past 30 days')
    else:
        for f in filings_30d:
            print(f"  {f['filed_at']}  {f['form_type']}  {f['title']}")
            print(f"           {f['url']}")

    print()

    # Default window (1 day)
    print('=== get_recent_8k_filings("AAPL") — default days_back=1 ===')
    filings_1d = get_recent_8k_filings('AAPL')
    if filings_1d is None:
        print('[filings] fetch failed')
    elif not filings_1d:
        print('[filings] no 8-K filings in the past 1 day (expected on non-filing days)')
    else:
        for f in filings_1d:
            print(f"  {f['filed_at']}  {f['form_type']}  {f['title']}")
            print(f"           {f['url']}")

    print()

    # No-results path — unknown ticker returns [] (SEC returns 200 with 0 entries)
    print('=== get_recent_8k_filings("ZZZZINVALID") ===')
    bad = get_recent_8k_filings('ZZZZINVALID')
    assert bad == [], f'Expected empty list for unknown ticker, got: {bad}'
    print('[filings] unknown ticker correctly returned [] ✅')
