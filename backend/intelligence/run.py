"""The production Gates 1–5 sequence, shared by all pipeline callers."""

from collections.abc import Callable

from backend.config import MIN_EDGE_PCT
from backend.intelligence.gates.hard_threat import screen_gate1_hard_threats
from backend.intelligence.constants import SECTOR_ETF_MAP
from backend.data.market import get_vix_snapshot, get_spy_snapshot, get_sector_etf_snapshot
from backend.data.calendars import get_ticker_earnings_window, get_hours_to_next_macro_event
from backend.data.premarket import get_premarket_gap
from backend.data.filings import get_recent_8k_filings
from backend.data.news import fetch_news
from backend.intelligence.gates.news_threat import assess_gate2_news_threat
from backend.intelligence.gates.sentiment import evaluate_gate3_sentiment
from backend.data.market import get_market_context
from backend.intelligence.gates.contradiction import detect_gate4_contradiction
from backend.intelligence.gates.signal import decide_gate5_signal


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


def get_candidate_facts(candidate: dict) -> dict:
    """Fetch Gate 1 inputs in the production order before evaluating its checks."""
    ticker = candidate['ticker']
    sector = candidate['sector']
    sector_mapped = sector in SECTOR_ETF_MAP
    sector_data = get_sector_etf_snapshot(sector) if sector_mapped else None
    gap_data = get_premarket_gap(ticker)
    earnings_data = get_ticker_earnings_window(ticker)
    filings_data = get_recent_8k_filings(ticker)
    return {
        'sector_mapped': sector_mapped,
        'sector': sector_data,
        'premarket_gap': gap_data,
        'earnings': earnings_data,
        'filings_8k': filings_data,
    }


def run_pipeline(
    candidate: dict,
    portfolio_value: float,
    daily_pnl: float,
    shared: dict,
    *,
    on_log: Callable[[str], None],
    on_update: Callable[[dict], None],
) -> dict:
    """Evaluate one candidate and return its gate results and final decision.

    Shared market facts come from the batch entry. News is fetched once per
    candidate for Gates 2 and 3. Callbacks report progress without formatting
    stdout; the entry owns the streaming protocol.

    Preserve production policy: blocks stop immediately, unavailable news or
    market context blocks the candidate, and Gate 4 flags warn and continue.
    """
    ticker = candidate['ticker']
    sector = candidate['sector']

    # Gate 1 — Hard Threat Screen
    facts = get_candidate_facts(candidate)
    g1 = screen_gate1_hard_threats(candidate, shared, facts, portfolio_value, daily_pnl)
    if not g1['passed']:
        reason = g1['block_reason']
        decision = f"BLOCKED_G1:{reason}"
        on_log(f"[gate1] {ticker}: BLOCKED — reason: {reason}")
        on_update({
            "final_decision": decision,
            "notes": f"Gate 1: {reason}"
        })
        return {'ticker': ticker, 'gates': {'gate1': g1}, 'final_decision': decision}
    on_log(f"[gate1] {ticker}: Passed hard threat rules.")
    on_update({
        "final_decision": "PASSED_G1",
        "notes": "Gate 1 passed"
    })

    # Gate 2 & 3 News Fetch and Evaluation
    on_log(f"[gate2] Fetching recent news headlines for {ticker}...")
    headlines = fetch_news(ticker)
    if headlines is None:
        # No news source answered: Gate 2 cannot assess the stock, so it is blocked (never "no news")
        g2 = {'passed': False, 'reason': 'news_unavailable', 'news_provider': None}
        on_log(f"[gate2] {ticker}: BLOCKED — news could not be fetched from any source.")
        on_update({
            "final_decision": "BLOCKED_G2:news_unavailable",
            "notes": "Gate 2 blocked: news could not be fetched from any source"
        })
        return {'ticker': ticker, 'gates': {'gate1': g1, 'gate2': g2}, 'final_decision': "BLOCKED_G2:news_unavailable"}
    on_log(f"[gate2] Fetched {len(headlines)} headlines.")

    g2 = assess_gate2_news_threat(candidate, headlines)
    # Which news API supplied the headlines; a window with no news has no provider
    g2['news_provider'] = headlines[0]['provider'] if headlines else None
    if not g2['passed']:
        on_log(f"[gate2] {ticker}: BLOCKED — catastrophic news event flagged by Claude.")
        on_update({
            "final_decision": "BLOCKED_G2",
            "notes": "Gate 2 news block: catastrophic news event flagged"
        })
        return {'ticker': ticker, 'gates': {'gate1': g1, 'gate2': g2}, 'final_decision': "BLOCKED_G2"}
    on_log(f"[gate2] {ticker}: Passed news safety checks.")
    on_update({
        "final_decision": "PASSED_G2",
        "notes": "Gate 2 passed"
    })

    # Gate 3 — Sentiment Analysis (Claude)
    on_log(f"[gate3] Running AI sentiment analyzer on {ticker}...")
    g3 = evaluate_gate3_sentiment(candidate, headlines)
    if not g3['passed']:
        on_log(f"[gate3] {ticker}: BLOCKED — Sentiment direction is NEUTRAL/BEARISH or confidence low ({g3.get('confidence')}/10).")
        on_update({
            "final_decision": "BLOCKED_G3",
            "g3_direction": g3.get('direction'),
            "g3_confidence": g3.get('confidence'),
            "notes": f"Gate 3 AI sentiment block: {g3.get('direction')} ({g3.get('confidence')}/10)"
        })
        return {'ticker': ticker, 'gates': {'gate1': g1, 'gate2': g2, 'gate3': g3}, 'final_decision': "BLOCKED_G3"}
    on_log(f"[gate3] {ticker}: Passed. AI Sentiment: {g3.get('direction')} (Confidence: {g3.get('confidence')}/10)")
    on_update({
        "final_decision": "PASSED_G3",
        "g3_direction": g3.get('direction'),
        "g3_confidence": g3.get('confidence'),
        "notes": f"Gate 3 passed ({g3.get('direction')}, {g3.get('confidence')}/10)"
    })

    # Gate 4 — Contradiction Check (Claude)
    on_log(f"[gate4] Loading market backdrop for contradiction analysis...")
    market_context = get_market_context(sector)
    if market_context is None:
        # Gate 4 cannot assess without the backdrop; this block is its outcome
        g4 = {'action': 'BLOCK', 'reason': 'unable to fetch market backdrop metrics', 'market_context': None}
        on_log(f"[gate4] {ticker}: BLOCKED — unable to fetch market backdrop metrics.")
        on_update({
            "final_decision": "BLOCKED_G4:no_market_context",
            "notes": "Gate 4 blocked: unable to fetch market context"
        })
        return {'ticker': ticker, 'gates': {'gate1': g1, 'gate2': g2, 'gate3': g3, 'gate4': g4}, 'final_decision': "BLOCKED_G4:no_market_context"}

    g4 = detect_gate4_contradiction(candidate, g3, market_context)
    if g4['action'] == 'BLOCK':
        on_log(f"[gate4] {ticker}: BLOCKED — direct market-vs-stock contradiction found: {g4.get('reason')}")
        on_update({
            "final_decision": "BLOCKED_G4",
            "notes": f"Gate 4 blocked: {g4.get('reason')}"
        })
        return {'ticker': ticker, 'gates': {'gate1': g1, 'gate2': g2, 'gate3': g3, 'gate4': g4}, 'final_decision': "BLOCKED_G4"}
    elif g4['action'] == 'FLAG_FOR_REVIEW':
        # Automated environment auto-approves flags but logs the warning
        on_log(f"[gate4] {ticker}: FLAGGED FOR REVIEW (Auto-Approved) — {g4.get('reason')}")

    on_log(f"[gate4] {ticker}: Passed divergence verification.")

    # Gate 5 — Expected Value (EV) calculation
    g5 = decide_gate5_signal(candidate, {'gate1': g1, 'gate2': g2, 'gate3': g3, 'gate4': g4})
    tl = g5.get('trade_levels')
    if g5['decision'] != 'BUY':
        on_log(f"[gate5] {ticker}: SKIP — calculated EV {g5.get('expected_value'):.1%} is below strategy hurdle ({MIN_EDGE_PCT:.1%}).")
        on_update({
            "final_decision": g5['decision'],
            "ev": round(g5['expected_value'], 3) if g5.get('expected_value') is not None else None,
            "win_prob": round(g5['win_probability'], 3) if g5.get('win_probability') is not None else None,
            "position_confidence": g5.get('position_confidence'),
            "trade_levels": tl,
            "notes": f"Gate 5 SKIP: EV {g5.get('expected_value'):.1%} below threshold"
        })
        return {'ticker': ticker, 'gates': {'gate1': g1, 'gate2': g2, 'gate3': g3, 'gate4': g4, 'gate5': g5}, 'final_decision': g5['decision']}

    on_log(f"[gate5] {ticker}: BUY SIGNAL generated! EV={g5.get('expected_value'):.1%}, Entry=${tl['entry']:.2f}, Stop=${tl['stop']:.2f}, Target=${tl['target']:.2f}, R:R={tl['reward_risk']:.1f}")
    on_update({
        "final_decision": "BUY",
        "ev": round(g5['expected_value'], 3),
        "win_prob": round(g5['win_probability'], 3),
        "position_confidence": g5.get('position_confidence'),
        "trade_levels": tl,
        "notes": f"Gate 5 BUY Signal generated (EV {g5.get('expected_value'):.1%})"
    })

    return {
        'ticker': ticker,
        'gates': {'gate1': g1, 'gate2': g2, 'gate3': g3, 'gate4': g4, 'gate5': g5},
        'final_decision': g5['decision'],
    }
