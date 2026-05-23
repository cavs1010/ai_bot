# gate1_hard_threat/gate.py — Hard Threat Screen (rules only, zero Claude cost)
# Phase 4.1 | Intelligence Layer
#
# Functions:
#   get_shared_market_data()
#       → {vix, spy, macro_hours} | None
#       Call ONCE per batch run (not per ticker) — VIX/SPY/macro are market-wide.
#
#   screen_gate1_hard_threats(candidate, shared, portfolio_value, daily_pnl)
#       → {passed: bool, block_reason: str | None, checks: dict}
#       Call once per candidate. Uses pre-fetched shared data + per-ticker fetches.
#
# Thresholds from: constants.BLOCK_THRESHOLDS
# No Claude call — first gate, runs in milliseconds
#
# Test: python backend/02_intelligence/gate1_hard_threat/gate.py

import sys
import pathlib

base = pathlib.Path(__file__).resolve().parents[1]   # → 02_intelligence/
sys.path.insert(0, str(base))

from constants import BLOCK_THRESHOLDS
from helpers.market    import get_vix_snapshot, get_spy_snapshot, get_sector_etf_snapshot
from helpers.calendars import get_ticker_earnings_window, get_hours_to_next_macro_event
from helpers.premarket import get_premarket_gap
from helpers.filings   import get_recent_8k_filings
from helpers.portfolio import check_daily_loss_limit


def get_shared_market_data() -> dict | None:
    """
    Fetches market-wide signals shared across all Gate 1 screenings in a batch run.

    VIX, SPY, and macro timing are identical for every candidate on a given night.
    Call this once before the candidate loop and pass the result to each
    screen_gate1_hard_threats() call to avoid redundant fetches.

    Returns:
        dict with keys:
            vix         (dict | None)  — {level, change_pct_today, prior_close}
            spy         (dict | None)  — {price, change_pct_today, prior_close}
            macro_hours (float | None) — hours to next high-impact US event; None = no event found
        None if vix, spy, and macro_hours all fail simultaneously.
    """
    vix         = get_vix_snapshot()
    spy         = get_spy_snapshot()
    macro_hours = get_hours_to_next_macro_event()

    if vix is None and spy is None and macro_hours is None:
        print('[gate1] get_shared_market_data: all market fetches failed — returning None')
        return None

    return {'vix': vix, 'spy': spy, 'macro_hours': macro_hours}


def screen_gate1_hard_threats(
    candidate: dict,
    shared: dict | None,
    portfolio_value: float,
    daily_pnl: float,
) -> dict:
    """
    Runs 8 hard-threat checks for one candidate before any Claude calls are made.

    Applies rule-based blocks using market, calendar, and portfolio data.
    A failed fetch for any individual check causes that check to pass —
    only confirmed threats block, not missing data.

    Args:
        candidate:       Momentum scanner output dict. Required keys: 'ticker', 'sector'.
        shared:          Pre-fetched market-wide data from get_shared_market_data().
                         Pass None if the batch fetch failed — all shared checks degrade gracefully.
        portfolio_value: Total portfolio value at start of day (dollars).
        daily_pnl:       Realized + unrealized P&L for today (dollars, negative = loss).

    Returns:
        dict with keys:
            passed       (bool)     — False if any check failed.
            block_reason (str|None) — Name of the first failing check; None if all passed.
            checks       (dict)     — Per-check result dicts, each with at minimum {passed: bool}
                                      plus the raw data used to make the decision.
    """
    ticker = candidate['ticker']
    sector = candidate['sector']

    # ── STEP 1: Unpack shared + fetch per-ticker data ─────────────────────────
    # Shared signals are the same for all candidates — unpacked, not re-fetched.
    vix_data    = shared['vix']         if shared else None
    spy_data    = shared['spy']         if shared else None
    macro_hours = shared['macro_hours'] if shared else None

    # Per-ticker: each stock has its own sector ETF, pre-market price, earnings date, filings.
    sector_data   = get_sector_etf_snapshot(sector)
    gap_data      = get_premarket_gap(ticker)
    earnings_data = get_ticker_earnings_window(ticker)
    filings_data  = get_recent_8k_filings(ticker)

    # ── STEP 2: Evaluate checks in priority order ─────────────────────────────
    checks = {}

    # CHECK 1 — Daily loss limit
    # Pure math, never fails. Run first — cheapest check, no fetch required.
    loss = check_daily_loss_limit(portfolio_value, daily_pnl, BLOCK_THRESHOLDS['loss_limit_pct'])
    checks['loss_limit'] = {
        'passed':   not loss['breached'],
        'breached': loss['breached'],
        'loss_pct': loss['loss_pct'],
    }

    # CHECK 2 — VIX level
    # Block on absolute VIX level, not the daily change — the level is what signals market fear.
    if vix_data is None:
        checks['vix'] = {'passed': True, 'data': None}
    else:
        checks['vix'] = {
            'passed':           vix_data['level'] < BLOCK_THRESHOLDS['vix_level'],
            'level':            vix_data['level'],
            'change_pct_today': vix_data['change_pct_today'],
            'prior_close':      vix_data['prior_close'],
        }

    # CHECK 3 — SPY daily change
    # Threshold is a negative number (e.g. -0.015). change_pct_today > threshold = market is OK.
    if spy_data is None:
        checks['spy'] = {'passed': True, 'data': None}
    else:
        checks['spy'] = {
            'passed':           spy_data['change_pct_today'] > BLOCK_THRESHOLDS['spy_change_pct'],
            'price':            spy_data['price'],
            'change_pct_today': spy_data['change_pct_today'],
            'prior_close':      spy_data['prior_close'],
        }

    # CHECK 4 — Sector ETF daily change
    # Per-ticker: sector differs per candidate even when VIX and SPY are the same.
    if sector_data is None:
        checks['sector'] = {'passed': True, 'data': None}
    else:
        checks['sector'] = {
            'passed':           sector_data['change_pct_today'] > BLOCK_THRESHOLDS['sector_change_pct'],
            'etf_ticker':       sector_data['etf_ticker'],
            'change_pct_today': sector_data['change_pct_today'],
            'prior_close':      sector_data['prior_close'],
        }

    # CHECK 5 — Pre-market gap
    # Use absolute value — a large gap in either direction signals price instability.
    if gap_data is None:
        checks['premarket_gap'] = {'passed': True, 'data': None}
    else:
        checks['premarket_gap'] = {
            'passed':          abs(gap_data['gap_pct']) < BLOCK_THRESHOLDS['premarket_gap_pct'],
            'gap_pct':         gap_data['gap_pct'],
            'direction':       gap_data['direction'],
            'prior_close':     gap_data['prior_close'],
            'premarket_price': gap_data['premarket_price'],
        }

    # CHECK 6 — Imminent macro event
    # None = no high-impact event found in the next 7 days = safe to proceed.
    # Only block when a confirmed event is within the threshold window.
    if macro_hours is None:
        checks['macro_event'] = {'passed': True, 'hours_to_next_macro': None}
    else:
        checks['macro_event'] = {
            'passed':              macro_hours > BLOCK_THRESHOLDS['macro_hours'],
            'hours_to_next_macro': macro_hours,
        }

    # CHECK 7 — Earnings window
    # Block if the ticker reports today (any hour) — earnings make the signal unreliable.
    # Block tomorrow only if bmo (before market open) — that release precedes our trade window.
    # Tomorrow amc is safe: earnings come after today's close, so we trade before them.
    if earnings_data is None:
        checks['earnings'] = {'passed': True, 'data': None}
    else:
        earnings_blocked = (
            earnings_data['reports_today']
            or (earnings_data['reports_tomorrow'] and earnings_data['hour'] == 'bmo')
        )
        checks['earnings'] = {
            'passed':           not earnings_blocked,
            'reports_today':    earnings_data['reports_today'],
            'reports_tomorrow': earnings_data['reports_tomorrow'],
            'hour':             earnings_data['hour'],
            'report_date':      earnings_data['report_date'],
        }

    # CHECK 8 — Recent 8-K filings
    # Any 8-K filed in the last 24h = material event (merger, restructuring, leadership change)
    # → today's signal is unreliable. None = fetch failed → pass. [] = no filings → pass.
    if filings_data is None:
        checks['filings_8k'] = {'passed': True, 'data': None}
    else:
        checks['filings_8k'] = {
            'passed':       len(filings_data) == 0,
            'filing_count': len(filings_data),
            'filings':      filings_data,
        }

    # ── STEP 3: Determine result ──────────────────────────────────────────────
    # Walk checks in priority order. First failure becomes block_reason.
    priority_order = [
        'loss_limit', 'vix', 'spy', 'sector',
        'premarket_gap', 'macro_event', 'earnings', 'filings_8k',
    ]
    block_reason = next(
        (name for name in priority_order if not checks[name]['passed']),
        None,
    )
    passed = block_reason is None

    if passed:
        print(f'[gate1] {ticker}: passed all {len(priority_order)} checks')
    else:
        print(f'[gate1] {ticker}: BLOCKED — {block_reason}')

    return {
        'passed':       passed,
        'block_reason': block_reason,
        'checks':       checks,
    }


if __name__ == '__main__':
    # Fetch shared data once — as the pipeline would before its candidate loop
    print('=== get_shared_market_data() ===')
    shared = get_shared_market_data()
    if shared:
        vix_str   = f'level={shared["vix"]["level"]}'   if shared['vix']   else 'None'
        spy_str   = f'price={shared["spy"]["price"]}'   if shared['spy']   else 'None'
        macro_str = f'{shared["macro_hours"]}h away'    if shared['macro_hours'] is not None else 'None (no event)'
        print(f'[gate1] vix:         {vix_str}')
        print(f'[gate1] spy:         {spy_str}')
        print(f'[gate1] macro_hours: {macro_str}')
    else:
        print('[gate1] shared data returned None — all market fetches failed')

    print()

    # Test 1: Happy path — small loss, calm market day
    print('=== screen_gate1_hard_threats — AAPL, happy path ===')
    candidate = {'ticker': 'AAPL', 'sector': 'Electronic Technology'}
    result = screen_gate1_hard_threats(candidate, shared, portfolio_value=100_000, daily_pnl=-500)
    print(f'passed:       {result["passed"]}')
    print(f'block_reason: {result["block_reason"]}')
    for name, check in result['checks'].items():
        status = '✅ PASS' if check['passed'] else '❌ BLOCK'
        print(f'  {status}  {name}')

    # Verify structural contract: 8 checks, each has 'passed' key
    assert len(result['checks']) == 8, f'Expected 8 checks, got {len(result["checks"])}'
    for name, check in result['checks'].items():
        assert 'passed' in check, f"check '{name}' missing 'passed' key"
    print('[gate1] structure contract verified ✅')

    print()

    # Test 2: Forced block — daily loss of -5% exceeds the 3% limit
    # This does NOT require any network call to trigger.
    print('=== screen_gate1_hard_threats — forced loss_limit block ===')
    blocked = screen_gate1_hard_threats(candidate, shared, portfolio_value=100_000, daily_pnl=-5_000)
    assert blocked['passed'] is False
    assert blocked['block_reason'] == 'loss_limit', \
        f'Expected loss_limit block, got: {blocked["block_reason"]}'
    print(f'[gate1] loss_limit block correctly triggered ✅  block_reason={blocked["block_reason"]}')
