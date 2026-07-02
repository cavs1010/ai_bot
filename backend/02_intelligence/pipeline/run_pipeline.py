# pipeline/run_pipeline.py — Pipeline Orchestrator (wiring only, no Claude)
# Phase 4.6 | Intelligence Layer
#
# Function: run_pipeline(candidate, portfolio_value, daily_pnl, shared=None)
#   → {ticker, gates: {gate1..gate5}, final_decision}
#
# final_decision values: 'BUY' | 'SKIP' | 'BLOCKED_G1' | 'BLOCKED_G2' | 'BLOCKED_G3' | 'BLOCKED_G4' | 'FLAGGED_FOR_REVIEW'
#
# Flow:
#   1. Gate 1 screen_gate1_hard_threats()
#   2. If pass → fetch_news(ticker)  ← called once here, shared with Gates 2 & 3
#   3. Gate 2 assess_gate2_news_threat(headlines)
#   4. Gate 3 evaluate_gate3_sentiment(same headlines)
#   5. get_market_context(sector) → Gate 4 detect_gate4_contradiction()
#   6. Gate 5 decide_gate5_signal()
#   Stop on first failure.
#
# Test: python backend/02_intelligence/pipeline/run_pipeline.py

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))   # → 02_intelligence/

from gate1_hard_threat.hard_threat_gate1 import get_shared_market_data, screen_gate1_hard_threats
from helpers.fetchers.news import fetch_news
from gate2_news_threat.news_threat_gate2 import assess_gate2_news_threat
from gate3_sentiment.sentiment_gate3 import evaluate_gate3_sentiment
from helpers.fetchers.market import get_market_context
from gate4_contradiction.contradiction_gate4 import detect_gate4_contradiction
from gate5_signal.signal_gate5 import decide_gate5_signal


def run_pipeline(
    candidate: dict,
    portfolio_value: float,
    daily_pnl: float,
    shared: dict | None = None,
) -> dict:
    """
    Runs one candidate through Gates 1-5 in order, stopping at the first failure.

    Single entry point for the rest of the bot (risk gate, nightly loop, logger). Fetches
    news once and reuses it for Gates 2 and 3; builds market context once for Gate 4 —
    gates never fetch their own data (agent_creation_rules.md §2).

    Args:
        candidate:       Momentum scanner dict. Required keys: 'ticker', 'sector', 'price',
                          'atr'. Optional: 'score' (defaults inside Gate 5).
        portfolio_value: Total portfolio value at start of day (dollars).
        daily_pnl:       Realized + unrealized P&L for today (dollars, negative = loss).
        shared:          Pre-fetched market-wide data from get_shared_market_data(). Pass
                          this when calling run_pipeline() in a loop over many candidates
                          so VIX/SPY/macro are fetched once per batch, not once per
                          candidate. Defaults to None, which fetches internally so the
                          function also works standalone.

    Returns:
        dict with keys:
            ticker         (str)  — candidate['ticker'], echoed for convenience.
            gates          (dict) — one key per gate that actually ran (e.g. 'gate1',
                                     'gate2', ...); gates never reached after an earlier
                                     block are simply absent.
            final_decision (str)  — one of 'BUY', 'SKIP', 'BLOCKED_G1', 'BLOCKED_G2',
                                     'BLOCKED_G3', 'BLOCKED_G4', 'FLAGGED_FOR_REVIEW'.
    """
    ticker = candidate['ticker']
    gates: dict = {}

    if shared is None:
        shared = get_shared_market_data()

    g1 = screen_gate1_hard_threats(candidate, shared, portfolio_value, daily_pnl)
    gates['gate1'] = g1
    if not g1['passed']:
        return {'ticker': ticker, 'gates': gates, 'final_decision': 'BLOCKED_G1'}

    headlines = fetch_news(ticker) or []

    g2 = assess_gate2_news_threat(candidate, headlines)
    gates['gate2'] = g2
    if not g2['passed']:
        return {'ticker': ticker, 'gates': gates, 'final_decision': 'BLOCKED_G2'}

    g3 = evaluate_gate3_sentiment(candidate, headlines)
    gates['gate3'] = g3
    if not g3['passed']:
        return {'ticker': ticker, 'gates': gates, 'final_decision': 'BLOCKED_G3'}

    # No gate4 entry if market context is unavailable — Gate 4 never ran. Block rather than
    # trade blind, matching the LLM-unavailable policy already used in Gates 2-4.
    market_context = get_market_context(candidate['sector'])
    if market_context is None:
        return {'ticker': ticker, 'gates': gates, 'final_decision': 'BLOCKED_G4'}

    g4 = detect_gate4_contradiction(candidate, g3, market_context)
    gates['gate4'] = g4
    if g4['action'] == 'BLOCK':
        return {'ticker': ticker, 'gates': gates, 'final_decision': 'BLOCKED_G4'}
    if g4['action'] == 'FLAG_FOR_REVIEW':
        return {'ticker': ticker, 'gates': gates, 'final_decision': 'FLAGGED_FOR_REVIEW'}

    g5 = decide_gate5_signal(candidate, {'gate1': g1, 'gate2': g2, 'gate3': g3, 'gate4': g4})
    gates['gate5'] = g5
    return {'ticker': ticker, 'gates': gates, 'final_decision': g5['decision']}


if __name__ == '__main__':
    candidate = {
        'ticker': 'AAPL',
        'sector': 'Electronic Technology',
        'price': 200.0,
        'atr': 5.0,
        'score': 3,
    }
    valid_decisions = {
        'BUY', 'SKIP', 'BLOCKED_G1', 'BLOCKED_G2', 'BLOCKED_G3', 'BLOCKED_G4', 'FLAGGED_FOR_REVIEW',
    }

    print('=== Happy path — AAPL, calm portfolio ===')
    result = run_pipeline(candidate, portfolio_value=100_000, daily_pnl=0.0)
    print(f"ticker:         {result['ticker']}")
    print(f"gates ran:      {list(result['gates'].keys())}")
    print(f"final_decision: {result['final_decision']}")
    assert result['ticker'] == candidate['ticker']
    assert result['final_decision'] in valid_decisions
    print('[pipeline] happy-path contract verified ✅')

    print()

    print('=== Forced block — daily loss of -5% exceeds the 3% limit ===')
    # No network call required to trigger this — mirrors hard_threat_gate1.py's own smoke test.
    blocked = run_pipeline(candidate, portfolio_value=100_000, daily_pnl=-5_000)
    assert blocked['final_decision'] == 'BLOCKED_G1', \
        f"Expected BLOCKED_G1, got: {blocked['final_decision']}"
    assert blocked['gates']['gate1']['block_reason'] == 'loss_limit'
    assert 'gate2' not in blocked['gates'], 'pipeline should have stopped at Gate 1'
    print(f"final_decision: {blocked['final_decision']}  "
          f"block_reason: {blocked['gates']['gate1']['block_reason']}")
    print('[pipeline] forced loss_limit block correctly triggered ✅')
