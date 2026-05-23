# helpers/calendars.py — macro events and per-ticker earnings windows
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 1 run(), get_market_context() in market.py (via get_hours_to_next_macro_event)
#
# Functions:
#   get_upcoming_macro_events(hours_ahead=24)        → [{event, country, time, impact}] | None
#   get_hours_to_next_macro_event()                  → float (hours) | None
#   get_ticker_earnings_window(ticker, days_ahead=1) → {reports_today, reports_tomorrow, ...} | None  [TODO]
#
# API: Finnhub economic calendar — times are UTC, impact is 'low'|'medium'|'high'
# No SDK — uses requests directly (consistent with universe_filter.py)
#
# Test: python backend/02_intelligence/helpers/calendars.py

import os
import sys
import pathlib
import requests
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from constants import MACRO_EVENT_KEYWORDS


def get_upcoming_macro_events(hours_ahead: int = 24) -> list[dict] | None:
    """
    Fetches upcoming US high-impact macro events from the Finnhub economic calendar.

    Server-side: filters by country=US and date range (from today to cutoff).
    Client-side: filters by impact=='high' and MACRO_EVENT_KEYWORDS match.
    Note: Finnhub ignores the `impact` query param — it must be filtered locally.
    All times from Finnhub are UTC.

    Args:
        hours_ahead: How many hours ahead to look. Default 24.

    Returns:
        List of dicts with keys: event (str), country (str), time (str), impact (str).
        Empty list if no matching events in window.
        None on fetch failure or missing API key.
    """
    key = os.getenv('FINNHUB_API_KEY')
    if not key:
        print('[calendars] macro events: FINNHUB_API_KEY not set')
        return None

    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(hours=hours_ahead)
    date_from = now.strftime('%Y-%m-%d')
    date_to = cutoff.strftime('%Y-%m-%d')

    try:
        r = requests.get(
            'https://finnhub.io/api/v1/calendar/economic',
            params={'from': date_from, 'to': date_to, 'country': 'US', 'token': key},
            timeout=10,
        )
        r.raise_for_status()
        all_events = r.json().get('economicCalendar', [])
    except Exception as e:
        print(f'[calendars] macro events: fetch failed — {e}')
        return None

    result = []
    for e in all_events:
        # impact param is ignored by Finnhub — must filter locally
        if e.get('impact') != 'high':
            continue
        event_name = e.get('event', '')
        if not any(kw.lower() in event_name.lower() for kw in MACRO_EVENT_KEYWORDS):
            continue
        try:
            event_time = datetime.strptime(e['time'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        if now <= event_time <= cutoff:
            result.append({
                'event':   event_name,
                'country': e['country'],
                'time':    e['time'],
                'impact':  e['impact'],
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


# get_ticker_earnings_window(ticker, days_ahead=1) → TODO


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
