# gate1_hard_threat/hard_threat_gate1.py — Hard Threat Screen (rules only, zero Claude cost)
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
# Thresholds from: the active Neon config (selection_params.gate1, money_params daily loss limit)
# No Claude call — first gate, runs in milliseconds
#
# Test: python -m backend.intelligence.gates.hard_threat

from backend.config import BLOCK_THRESHOLDS, MAX_DAILY_LOSS_PCT
from backend.intelligence.constants import SECTOR_ETF_MAP
from backend.data.market import get_vix_snapshot, get_spy_snapshot, get_sector_etf_snapshot
from backend.data.calendars import get_ticker_earnings_window, get_hours_to_next_macro_event
from backend.data.premarket import get_premarket_gap
from backend.data.filings import get_recent_8k_filings
from backend.intelligence.rules.portfolio import check_daily_loss_limit


def get_shared_market_data() -> dict:
    """
    Fetches market-wide signals shared across all Gate 1 screenings in a batch run.

    VIX, SPY, and macro timing are identical for every candidate on a given night.
    Call this once before the candidate loop and pass the result to each
    screen_gate1_hard_threats() call to avoid redundant fetches.

    Returns:
        dict with keys:
            vix         (dict)         — {level, change_pct_today, prior_close}
            spy         (dict)         — {price, change_pct_today, prior_close}
            macro_hours (float | None) — hours to next high-impact US event; None = no event in 7 days
        Raises RuntimeError if VIX, SPY or the macro calendar cannot be fetched: without the
        market backdrop no candidate can be screened, so the run stops.
    """
    vix = get_vix_snapshot()
    if vix is None:
        raise RuntimeError('VIX could not be fetched')
    spy = get_spy_snapshot()
    if spy is None:
        raise RuntimeError('SPY could not be fetched')
    macro_hours = get_hours_to_next_macro_event()   # raises if the calendar cannot be fetched

    return {'vix': vix, 'spy': spy, 'macro_hours': macro_hours}


def _unavailable(check: str) -> dict:
    """A check whose data could not be fetched: it blocks, it never passes by default."""
    return {'passed': False, 'reason': f'{check}_unavailable', 'data': None}


def screen_gate1_hard_threats(
    candidate: dict,
    shared: dict,
    portfolio_value: float,
    daily_pnl: float,
) -> dict:
    """
    Runs 8 hard-threat checks for one candidate before any Claude calls are made.

    Applies rule-based blocks using market, calendar, and portfolio data.
    A check whose data could not be fetched blocks the candidate with reason
    '<check>_unavailable' — missing data is never treated as safe.

    Args:
        candidate:       Momentum scanner output dict. Required keys: 'ticker', 'sector'.
        shared:          Pre-fetched market-wide data from get_shared_market_data().
        portfolio_value: Total portfolio value at start of day (dollars).
        daily_pnl:       Realized + unrealized P&L for today (dollars, negative = loss).

    Returns:
        dict with keys:
            passed       (bool)     — False if any check failed.
            block_reason (str|None) — Reason of the first failing check; None if all passed.
            checks       (dict)     — Per-check result dicts, each with {passed: bool, reason: str|None}
                                      plus the raw data used to make the decision.

    Prints:
        One line to stdout with the verdict — this is the `[gate1] …` line you see in logs:
            `[gate1] <ticker>: passed all N checks`   — cleared every check.
            `[gate1] <ticker>: BLOCKED — <reason>`    — <reason> is the first failing check's reason
                                                        (e.g. sector, vix, premarket_gap_unavailable).
    """
    ticker = candidate['ticker']
    sector = candidate['sector']

    # ── STEP 1: Unpack shared + fetch per-ticker data ─────────────────────────
    # Shared signals are the same for all candidates — unpacked, not re-fetched.
    vix_data    = shared['vix']
    spy_data    = shared['spy']
    macro_hours = shared['macro_hours']

    # Per-ticker: each stock has its own sector ETF, pre-market price, earnings date, filings.
    sector_mapped = sector in SECTOR_ETF_MAP
    sector_data   = get_sector_etf_snapshot(sector) if sector_mapped else None
    gap_data      = get_premarket_gap(ticker)
    earnings_data = get_ticker_earnings_window(ticker)
    filings_data  = get_recent_8k_filings(ticker)

    # ── STEP 2: Evaluate checks in priority order ─────────────────────────────
    checks = {}

    # CHECK 1 — Daily loss limit
    # Pure math, never fails. Run first — cheapest check, no fetch required.
    loss = check_daily_loss_limit(portfolio_value, daily_pnl, MAX_DAILY_LOSS_PCT)
    checks['loss_limit'] = {
        'passed':   not loss['breached'],
        'reason':   'loss_limit' if loss['breached'] else None,
        'breached': loss['breached'],
        'loss_pct': loss['loss_pct'],
    }

    # CHECK 2 — VIX level
    # Block on absolute VIX level, not the daily change — the level is what signals market fear.
    vix_ok = vix_data['level'] < BLOCK_THRESHOLDS['vix_level']
    checks['vix'] = {
        'passed':           vix_ok,
        'reason':           None if vix_ok else 'vix',
        'level':            vix_data['level'],
        'change_pct_today': vix_data['change_pct_today'],
        'prior_close':      vix_data['prior_close'],
    }

    # CHECK 3 — SPY daily change
    # Threshold is a negative number (e.g. -0.015). change_pct_today > threshold = market is OK.
    spy_ok = spy_data['change_pct_today'] > BLOCK_THRESHOLDS['spy_change_pct']
    checks['spy'] = {
        'passed':           spy_ok,
        'reason':           None if spy_ok else 'spy',
        'price':            spy_data['price'],
        'change_pct_today': spy_data['change_pct_today'],
        'prior_close':      spy_data['prior_close'],
    }

    # CHECK 4 — Sector ETF daily change
    # Per-ticker: sector differs per candidate even when VIX and SPY are the same.
    if not sector_mapped:
        checks['sector'] = {'passed': False, 'reason': 'sector_unmapped', 'sector': sector}
    elif sector_data is None:
        checks['sector'] = _unavailable('sector')
    else:
        sector_ok = sector_data['change_pct_today'] > BLOCK_THRESHOLDS['sector_change_pct']
        checks['sector'] = {
            'passed':           sector_ok,
            'reason':           None if sector_ok else 'sector',
            'etf_ticker':       sector_data['etf_ticker'],
            'change_pct_today': sector_data['change_pct_today'],
            'prior_close':      sector_data['prior_close'],
        }

    # CHECK 5 — Pre-market gap
    # Only exists during the pre-market session; outside it the check does not apply.
    # Use absolute value — a large gap in either direction signals price instability.
    if gap_data is None:
        checks['premarket_gap'] = _unavailable('premarket_gap')
    elif not gap_data['applicable']:
        checks['premarket_gap'] = {
            'passed':         True,
            'reason':         None,
            'not_applicable': True,
            'why':            gap_data['reason'],
        }
    else:
        gap_ok = abs(gap_data['gap_pct']) < BLOCK_THRESHOLDS['premarket_gap_pct']
        checks['premarket_gap'] = {
            'passed':          gap_ok,
            'reason':          None if gap_ok else 'premarket_gap',
            'gap_pct':         gap_data['gap_pct'],
            'direction':       gap_data['direction'],
            'prior_close':     gap_data['prior_close'],
            'premarket_price': gap_data['premarket_price'],
        }

    # CHECK 6 — Imminent macro event
    # None = the calendar was fetched and has no high-impact event in the next 7 days.
    # Only block when a confirmed event is within the threshold window.
    macro_ok = macro_hours is None or macro_hours > BLOCK_THRESHOLDS['macro_hours']
    checks['macro_event'] = {
        'passed':              macro_ok,
        'reason':              None if macro_ok else 'macro_event',
        'hours_to_next_macro': macro_hours,
    }

    # CHECK 7 — Earnings window
    # Block if the ticker reports today (any hour) — earnings make the signal unreliable.
    # Block tomorrow only if bmo (before market open) — that release precedes our trade window.
    # Tomorrow amc is safe: earnings come after today's close, so we trade before them.
    if earnings_data is None:
        checks['earnings'] = _unavailable('earnings')
    else:
        earnings_blocked = (
            earnings_data['reports_today']
            or (earnings_data['reports_tomorrow'] and earnings_data['hour'] == 'bmo')
        )
        checks['earnings'] = {
            'passed':           not earnings_blocked,
            'reason':           'earnings' if earnings_blocked else None,
            'reports_today':    earnings_data['reports_today'],
            'reports_tomorrow': earnings_data['reports_tomorrow'],
            'hour':             earnings_data['hour'],
            'report_date':      earnings_data['report_date'],
        }

    # CHECK 8 — Recent 8-K filings
    # Any 8-K filed in the last 24h = material event (merger, restructuring, leadership change)
    # → today's signal is unreliable. [] = no filings → pass.
    if filings_data is None:
        checks['filings_8k'] = _unavailable('filings_8k')
    else:
        filings_ok = len(filings_data) == 0
        checks['filings_8k'] = {
            'passed':       filings_ok,
            'reason':       None if filings_ok else 'filings_8k',
            'filing_count': len(filings_data),
            'filings':      filings_data,
        }

    # ── STEP 3: Determine result ──────────────────────────────────────────────
    # Walk checks in priority order. First failure's reason becomes block_reason.
    priority_order = [
        'loss_limit', 'vix', 'spy', 'sector',
        'premarket_gap', 'macro_event', 'earnings', 'filings_8k',
    ]
    block_reason = next(
        (checks[name]['reason'] for name in priority_order if not checks[name]['passed']),
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
    shared = get_shared_market_data()   # raises if VIX, SPY or the macro calendar fail
    macro_str = f'{shared["macro_hours"]}h away' if shared['macro_hours'] is not None else 'None (no event in 7 days)'
    print(f'[gate1] vix:         level={shared["vix"]["level"]}')
    print(f'[gate1] spy:         price={shared["spy"]["price"]}')
    print(f'[gate1] macro_hours: {macro_str}')

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
        assert 'reason' in check, f"check '{name}' missing 'reason' key"
    print('[gate1] structure contract verified ✅')

    print()

    # Test 3: Sector missing from SECTOR_ETF_MAP blocks as sector_unmapped (never passes)
    print('=== screen_gate1_hard_threats — unmapped sector ===')
    unmapped = screen_gate1_hard_threats({'ticker': 'AAPL', 'sector': 'Not A Sector'}, shared,
                                         portfolio_value=100_000, daily_pnl=-500)
    assert unmapped['checks']['sector']['reason'] == 'sector_unmapped'
    assert unmapped['passed'] is False
    print('[gate1] unmapped sector correctly blocked ✅')

    print()

    # Test 2: Forced block — daily loss of -5% exceeds the 3% limit
    # This does NOT require any network call to trigger.
    print('=== screen_gate1_hard_threats — forced loss_limit block ===')
    blocked = screen_gate1_hard_threats(candidate, shared, portfolio_value=100_000, daily_pnl=-5_000)
    assert blocked['passed'] is False
    assert blocked['block_reason'] == 'loss_limit', \
        f'Expected loss_limit block, got: {blocked["block_reason"]}'
    print(f'[gate1] loss_limit block correctly triggered ✅  block_reason={blocked["block_reason"]}')
