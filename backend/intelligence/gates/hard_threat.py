"""Gate 1 hard-threat decisions from fetched facts; no network access."""

from backend.config import BLOCK_THRESHOLDS, MAX_DAILY_LOSS_PCT
from backend.intelligence.rules.portfolio import check_daily_loss_limit


def _unavailable(check: str) -> dict:
    """A check whose data could not be fetched: it blocks, it never passes by default."""
    return {'passed': False, 'reason': f'{check}_unavailable', 'data': None}


def screen_gate1_hard_threats(
    candidate: dict,
    shared: dict,
    facts: dict,
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
        shared:          Pre-fetched market-wide VIX, SPY and macro data.
        facts:           Pre-fetched sector mapping, sector ETF, gap, earnings and filings.
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

    # ── STEP 1: Unpack shared + per-ticker facts ─────────────────────────
    # Shared signals are the same for all candidates — unpacked, not re-fetched.
    vix_data    = shared['vix']
    spy_data    = shared['spy']
    macro_hours = shared['macro_hours']

    # Per-ticker facts are supplied by the intelligence runner.
    sector_mapped = facts['sector_mapped']
    sector_data   = facts['sector']
    gap_data      = facts['premarket_gap']
    earnings_data = facts['earnings']
    filings_data  = facts['filings_8k']

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
