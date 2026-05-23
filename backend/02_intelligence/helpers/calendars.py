# helpers/calendars.py — macro events and per-ticker earnings windows
# Phase 4 | Intelligence Layer | Shared helper
# Used by: Gate 1 run(), get_market_context() in market.py (via get_hours_to_next_macro_event)
#
# Functions:
#   get_upcoming_macro_events(hours_ahead=24)        → [{event, country, time, impact}] | None
#   get_hours_to_next_macro_event()                  → float (hours) | None
#   get_ticker_earnings_window(ticker, days_ahead=1) → {reports_today, reports_tomorrow, report_date, hour} | None
#
# APIs:
#   Finnhub economic calendar  — times UTC, impact 'low'|'medium'|'high'
#   Finnhub earnings calendar  — date YYYY-MM-DD, hour 'amc'|'bmo'|'dmh'|''
# No SDK — uses requests directly (consistent with universe_filter.py)
#
# Test: python backend/02_intelligence/helpers/calendars.py

import os
import sys
import pathlib
import requests
from datetime import date, datetime, timezone, timedelta
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
