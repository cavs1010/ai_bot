# helpers/fetchers/calendars.py — macro events and per-ticker earnings windows
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 1 run(), get_market_context() in market.py (via get_hours_to_next_macro_event)
#
# Functions:
#   get_upcoming_macro_events(hours_ahead=24)        → [{event, country, time, impact}] | None
#   get_hours_to_next_macro_event()                  → float (hours) | None
#   get_ticker_earnings_window(ticker, days_ahead=1) → {reports_today, reports_tomorrow, report_date, hour} | None
#
# APIs:
#   FairEconomy/ForexFactory economic calendar (free, no key) — impact High/Medium/Low
#   Finnhub earnings calendar (free tier)  — date YYYY-MM-DD, hour 'amc'|'bmo'|'dmh'|''
# No SDK — uses requests directly (consistent with universe_filter.py)
#
# Note: Finnhub's /calendar/economic endpoint moved to a paid plan (returns 403 on
# the free tier), so macro events now come from the free FairEconomy JSON feed
# (the public ForexFactory calendar). Earnings stays on Finnhub's free tier.
#
# Test: python backend/02_intelligence/helpers/calendars.py

import os
import json
import pathlib
import requests
from datetime import date, datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

# FairEconomy publishes the public ForexFactory calendar as free, key-less JSON.
# Only the current-week feed exists; it covers the rest of the calendar week,
# which is enough for the 24h Gate 1 block and best-effort for the 168h lookahead.
ECON_CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'
# The feed 403s without a browser-like User-Agent and rate-limits to 2 requests
# per 5 min per IP. The data is weekly, so the response is cached on disk (shared
# across gate runs) and only refetched every few hours — far under that limit.
_FEED_HEADERS = {'User-Agent': 'Mozilla/5.0'}
_CACHE_PATH = pathlib.Path(__file__).resolve().parent / '.cache' / 'ff_calendar_thisweek.json'
_CACHE_TTL = timedelta(hours=6)


def _read_cache() -> tuple[datetime, list[dict]] | None:
    """Returns (fetched_at, data) from the on-disk cache, or None if missing/unreadable."""
    try:
        blob = json.loads(_CACHE_PATH.read_text())
        return datetime.fromisoformat(blob['fetched_at']), blob['data']
    except Exception:
        return None


def _fetch_econ_calendar() -> list[dict] | None:
    """
    Returns the raw ForexFactory feed, served from the on-disk cache while it is
    fresh (< _CACHE_TTL). On a fetch failure a stale cache is returned if present
    — an old calendar is safer for the gate than none. Returns None only when
    both the network and the cache are unavailable.
    """
    now = datetime.now(timezone.utc)
    cached = _read_cache()
    if cached is not None and now - cached[0] < _CACHE_TTL:
        return cached[1]

    try:
        r = requests.get(ECON_CALENDAR_URL, headers=_FEED_HEADERS, timeout=10)
        r.raise_for_status()
        # The feed has no server-side country filter — it returns the whole world.
        # We only ever use US events, so trim to those before caching.
        data = [e for e in r.json() if e.get('country') == 'USD']
    except Exception as e:
        if cached is not None:
            print(f'[calendars] macro events: using stale cache — fetch failed: {e}')
            return cached[1]
        print(f'[calendars] macro events: fetch failed — {e}')
        return None

    try:
        _CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        _CACHE_PATH.write_text(json.dumps({'fetched_at': now.isoformat(), 'data': data}))
    except Exception as e:
        print(f'[calendars] macro events: cache write failed — {e}')
    return data


def get_upcoming_macro_events(hours_ahead: int = 24) -> list[dict] | None:
    """
    Fetches upcoming US high-impact macro events from the free FairEconomy feed
    (the public ForexFactory economic calendar — no API key required).

    Filtering (all client-side): country=='USD' and impact=='High' (ForexFactory's
    curated flag), then trimmed to the [now, now+hours_ahead] window.
    Feed times are local-with-offset (ISO 8601); they are converted to UTC, and
    the returned `time` field is a UTC string 'YYYY-MM-DD HH:MM:SS' so downstream
    callers (get_hours_to_next_macro_event) can parse it as UTC.

    Note: the feed only spans the current calendar week, so a 168h lookahead is
    truncated at the week boundary — callers treat a short/empty result as
    'no further macro risk known', which is the safe default here.

    Args:
        hours_ahead: How many hours ahead to look. Default 24.

    Returns:
        List of dicts with keys: event (str), country (str), time (str), impact (str).
        Empty list if no matching events in window.
        None on fetch failure.
    """
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(hours=hours_ahead)

    all_events = _fetch_econ_calendar()
    if all_events is None:
        return None

    result = []
    for e in all_events:
        # all_events is already US-only (filtered in _fetch_econ_calendar).
        # Trust ForexFactory's curated High-impact flag — no keyword whitelist.
        if e.get('impact') != 'High':
            continue
        event_name = e.get('title', '')
        try:
            # e.g. '2026-06-12T08:30:00-04:00' → UTC
            event_time = datetime.fromisoformat(e['date']).astimezone(timezone.utc)
        except (ValueError, KeyError):
            continue
        if now <= event_time <= cutoff:
            result.append({
                'event':   event_name,
                'country': 'US',
                'time':    event_time.strftime('%Y-%m-%d %H:%M:%S'),
                'impact':  'high',
            })

    return result


def get_hours_to_next_macro_event() -> float | None:
    """
    Returns the number of hours until the nearest upcoming US high-impact macro event.

    Looks up to 7 days ahead. Returns None if no events found in that window
    or if the fetch fails — callers should treat None as 'no upcoming macro risk known'.

    Args:
        None

    Returns:
        float — hours until the nearest event (e.g. 3.5 = three and a half hours away).
        None on fetch failure or no events found within 7 days.
    """
    events = get_upcoming_macro_events(hours_ahead=168)  # 7 days
    if not events:
        # Both None (fetch failed) and [] (no events) return None here.
        # Gate 4 prompt treats None as 'no macro risk on horizon'.
        return None

    now = datetime.now(timezone.utc)
    event_times = [
        datetime.strptime(e['time'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc)
        for e in events
    ]
    nearest = min(event_times)
    hours = (nearest - now).total_seconds() / 3600
    return round(hours, 1)


def get_ticker_earnings_window(ticker: str, days_ahead: int = 1) -> dict | None:
    """
    Checks whether a ticker has an upcoming earnings report within days_ahead calendar days.

    Args:
        ticker:     Stock ticker symbol, e.g. 'AAPL', 'NVDA'.
        days_ahead: How many calendar days ahead to look. Default 1 (today + tomorrow).

    Returns:
        dict with keys:
            reports_today    (bool)     — True if earnings are scheduled today
            reports_tomorrow (bool)     — True if earnings are scheduled tomorrow
            report_date      (str|None) — nearest report date as 'YYYY-MM-DD', or None if none found
            hour             (str|None) — when the earnings are released:
                                 'amc' = after market close (after 4 PM ET)
                                 'bmo' = before market open (before 9:30 AM ET)
                                 'dmh' = during market hours
                                 None  = unknown timing or no report found
        No earnings in window returns the dict with False/None values — not None.
        None on fetch failure or missing FINNHUB_API_KEY.
    """
    key = os.getenv('FINNHUB_API_KEY')
    if not key:
        print(f'[calendars] {ticker}: FINNHUB_API_KEY not set')
        return None

    today     = date.today()
    tomorrow  = today + timedelta(days=1)
    date_from = today.isoformat()
    date_to   = (today + timedelta(days=days_ahead)).isoformat()

    try:
        r = requests.get(
            'https://finnhub.io/api/v1/calendar/earnings',
            params={'from': date_from, 'to': date_to, 'symbol': ticker, 'token': key},
            timeout=10,
        )
        r.raise_for_status()
        calendar = r.json().get('earningsCalendar', [])
    except Exception as e:
        print(f'[calendars] {ticker}: earnings fetch failed — {e}')
        return None

    reports_today    = any(e['date'] == date_from for e in calendar)
    reports_tomorrow = any(e['date'] == tomorrow.isoformat() for e in calendar)

    report_date = None
    hour        = None
    if calendar:
        nearest     = min(calendar, key=lambda e: e['date'])
        report_date = nearest['date']
        hour        = nearest.get('hour') or None  # empty string → None

    return {
        'reports_today':    reports_today,
        'reports_tomorrow': reports_tomorrow,
        'report_date':      report_date,
        'hour':             hour,
    }


if __name__ == '__main__':
    print('=== get_upcoming_macro_events(hours_ahead=24) ===')
    events_24h = get_upcoming_macro_events(hours_ahead=24)
    if events_24h is None:
        print('[calendars] fetch failed')
    elif not events_24h:
        print('[calendars] no high-impact US macro events in the next 24 hours')
    else:
        for e in events_24h:
            print(f"  {e['time']} UTC  {e['event']}  [{e['impact']}]")

    print()
    print('=== get_upcoming_macro_events(hours_ahead=168) ===')
    events_7d = get_upcoming_macro_events(hours_ahead=168)
    if events_7d:
        for e in events_7d:
            print(f"  {e['time']} UTC  {e['event']}  [{e['impact']}]")
    else:
        print('[calendars] no events or fetch failed')

    print()
    print('=== get_hours_to_next_macro_event() ===')
    hours = get_hours_to_next_macro_event()
    if hours is not None:
        print(f'[calendars] next macro event in {hours} hours')
    else:
        print('[calendars] no upcoming macro event found within 7 days (or fetch failed)')

    print()
    print('=== get_ticker_earnings_window("AAPL", days_ahead=90) ===')
    window = get_ticker_earnings_window('AAPL', days_ahead=90)
    if window is None:
        print('[calendars] fetch failed')
    else:
        print(f'  reports_today:    {window["reports_today"]}')
        print(f'  reports_tomorrow: {window["reports_tomorrow"]}')
        print(f'  report_date:      {window["report_date"]}')
        print(f'  hour:             {window["hour"]}')

    print()
    print('=== get_ticker_earnings_window("ZZZZINVALID") ===')
    bad = get_ticker_earnings_window('ZZZZINVALID')
    assert bad is not None, 'Expected dict (not None) for unknown ticker'
    assert bad['reports_today'] is False
    assert bad['reports_tomorrow'] is False
    assert bad['report_date'] is None
    print(f'[calendars] unknown ticker correctly returned empty dict ✅  {bad}')
