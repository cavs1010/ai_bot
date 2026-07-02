# gate4_contradiction/contradiction_gate4.py — Contradiction Detection (Claude call 3 of 4)
# Phase 4.4 | Intelligence Layer
#
# Function: detect_gate4_contradiction(candidate, gate3_result, market_context)
#   → {passed, contradiction_detected, contradiction_type, risk_level, reason,
#      action: 'PASS'|'BLOCK'|'FLAG_FOR_REVIEW', market_context}
#
# Asks Claude ONE focused question: does the market backdrop contradict taking this
# already-bullish entry right now? Screens two contradictions — DIVERGENCE (stock vs market)
# and BROAD_RISK_OFF (sub-threshold accumulation).
#
# The caller passes market_context in; the gate never fetches (agent_creation_rules §2).
#
# Imports: helpers/llm/client (build_agent, run_agent)
#
# Test: python backend/02_intelligence/gate4_contradiction/contradiction_gate4.py

import sys
import pathlib
from enum import Enum

from pydantic import BaseModel, Field

base = pathlib.Path(__file__).resolve().parents[1]   # → 02_intelligence/
sys.path.insert(0, str(base))

from helpers.llm.client import build_agent, run_agent


class ContradictionType(str, Enum):
    """The contradictions Gate 4 screens for. NONE = the market is consistent with the entry.

    Descriptions live once in CONTRADICTION_DESCRIPTIONS below (single source of truth);
    the system prompt's type list is generated from it.
    """
    DIVERGENCE = 'divergence'
    BROAD_RISK_OFF = 'broad_risk_off'
    NONE = 'none'


# Single source of truth for what each contradiction means. The system prompt is built from this.
CONTRADICTION_DESCRIPTIONS: dict[ContradictionType, str] = {
    ContradictionType.DIVERGENCE:
        'the stock is pushing higher while its own sector or the broad market weakens — '
        'relative strength that may snap back',
    ContradictionType.BROAD_RISK_OFF:
        'VIX, SPY and the sector are each only mildly negative, but together they lean '
        'clearly risk-off, undermining a fresh long',
}

# Coverage guard: every real type (all but NONE) must have a description, or this fails at import.
assert set(CONTRADICTION_DESCRIPTIONS) == set(ContradictionType) - {ContradictionType.NONE}, \
    'CONTRADICTION_DESCRIPTIONS must describe every ContradictionType except NONE'


class RiskLevel(str, Enum):
    """How dangerous the detected contradiction is. Drives the action in code:
    HIGH → BLOCK, MEDIUM/LOW → FLAG_FOR_REVIEW, NONE → PASS."""
    NONE = 'NONE'
    LOW = 'LOW'
    MEDIUM = 'MEDIUM'
    HIGH = 'HIGH'


class Gate4Contradiction(BaseModel):
    """Structured result Claude must return for the contradiction question."""
    contradiction_type: ContradictionType = Field(
        description="The single gray-zone contradiction with the strongest evidence, or 'none' "
                    "if the market backdrop is consistent with the bullish entry."
    )
    risk_level: RiskLevel = Field(
        description='How dangerous the contradiction is: HIGH (block the trade), MEDIUM or LOW '
                    '(flag for human review), or NONE (no contradiction).'
    )
    reason: str = Field(description="One sentence explaining the verdict, or 'NONE' if no contradiction.")


# Type list rendered from the single source of truth above.
_TYPE_LINES = '\n'.join(f'- {c.value}: {desc}' for c, desc in CONTRADICTION_DESCRIPTIONS.items())

SYSTEM_PROMPT = (
    'You are a market-context analyst for a momentum trading bot. The stock in front of you has '
    'ALREADY passed momentum, news-threat and sentiment checks — treat the bullish thesis as '
    'established. Your only job is to judge whether the CURRENT MARKET BACKDROP contradicts '
    'taking this entry right now. The obvious hard threats (VIX spike, broad selloff, imminent '
    'macro event) are already handled upstream, so look only for the gray-zone contradictions '
    f'below:\n{_TYPE_LINES}\n'
    'Return the single strongest contradiction type (or none), a risk level, and a one-sentence '
    "reason. If the market is consistent with the bullish entry, return type 'none', risk NONE, "
    "and reason 'NONE'."
)

# Built once at import; reused for every candidate. Cheap Haiku default (helpers/llm/client).
_agent = build_agent(Gate4Contradiction, SYSTEM_PROMPT)


def _format_market_for_prompt(market_context: dict) -> str:
    """Renders the market_context dict into prompt lines, skipping any signal that failed to
    fetch (a sub-key may be None even when the bundle is present — get_market_context's contract)."""
    lines = []
    vix = market_context.get('vix')
    if vix:
        lines.append(f"- VIX: {vix['level']} ({vix['change_pct_today']:+.2%} today)")
    spy = market_context.get('spy')
    if spy:
        lines.append(f"- SPY: {spy['change_pct_today']:+.2%} today")
    sector = market_context.get('sector')
    if sector:
        lines.append(f"- Sector ETF {sector['etf_ticker']}: {sector['change_pct_today']:+.2%} today")
    hours = market_context.get('hours_to_next_macro')
    if hours is not None:
        lines.append(f"- Hours to next major macro event: {hours}")
    return '\n'.join(lines) if lines else '- (no market signals available)'


def _build_gate4_user_prompt(ticker: str, sector: str, direction: str,
                             confidence: int, market_context: dict) -> str:
    return (
        f'{ticker} is a bullish momentum entry candidate in the {sector} sector.\n'
        f'News sentiment: {direction} (confidence {confidence}/10).\n\n'
        f'Current market context:\n{_format_market_for_prompt(market_context)}\n\n'
        'Does anything in this market context contradict or undermine the bullish entry right now?'
    )


def detect_gate4_contradiction(candidate: dict, gate3_result: dict, market_context: dict) -> dict:
    """
    Gate 4 — asks Claude whether the market backdrop contradicts an already-bullish entry.

    Third of four LLM gates; runs after Gate 3 passes. The caller supplies market_context; the
    gate only assesses, it does not fetch.

    Unlike Gates 2 and 3 this is not binary: a contradiction does not always block. The action
    is derived in code from Claude's risk_level — HIGH blocks, MEDIUM/LOW flags for human
    review, and no contradiction passes — so the verdict can never contradict the risk level.

    Args:
        candidate:      Momentum scanner dict. Required keys: 'ticker', 'sector'. Its technical
                        fields are intentionally not used — they don't change whether the market
                        is hostile.
        gate3_result:   Gate 3 output. Required keys: 'direction' (str), 'confidence' (int 0-10).
        market_context: Bundle in get_market_context() shape:
                        {vix, spy, sector, hours_to_next_macro}. Individual sub-keys may be None
                        (a single failed fetch); the gate formats whatever is present.

    Returns:
        dict with keys:
            passed                 (bool)      — True only when action == 'PASS'.
            contradiction_detected (bool)      — True if Claude flagged any contradiction.
            contradiction_type     (str)       — the ContradictionType value, or 'none'.
            risk_level             (str)       — 'NONE' / 'LOW' / 'MEDIUM' / 'HIGH'.
            reason                 (str)       — one-sentence reason, or 'NONE' / 'llm_unavailable'.
            action                 (str)       — 'PASS' / 'FLAG_FOR_REVIEW' / 'BLOCK'.
            market_context         (dict)      — the context assessed, echoed for the audit log.

    Prints:
        One line to stdout with the verdict — this is the `[gate4] …` line you see in logs:
            `[gate4] <ticker>: passed — no contradiction (risk=<level>)` — cleared.
            `[gate4] <ticker>: <ACTION> — <type>: <reason>`             — <ACTION> is BLOCK or
                                                                          FLAG_FOR_REVIEW.
            `[gate4] <ticker>: LLM unavailable — blocking …`            — no API key → blocks by design.
    """
    ticker = candidate['ticker']
    sector = candidate['sector']
    direction = gate3_result['direction']
    confidence = gate3_result['confidence']

    prompt = _build_gate4_user_prompt(ticker, sector, direction, confidence, market_context)
    result = run_agent(_agent, prompt)

    # LLM unavailable → cannot confirm the market isn't contradicting the entry. For a money
    # decision, block rather than trade blind (same stricter policy as Gates 2 & 3).
    if result is None:
        print(f'[gate4] {ticker}: LLM unavailable — blocking (cannot assess contradiction)')
        return {
            'passed': False,
            'contradiction_detected': False,
            'contradiction_type': 'none',
            'risk_level': 'NONE',
            'reason': 'llm_unavailable',
            'action': 'BLOCK',
            'market_context': market_context,
        }

    contradiction_detected = result.contradiction_type is not ContradictionType.NONE

    # Action is keyed off risk_level so it can never disagree with how dangerous Claude judged
    # the contradiction. HIGH blocks; a milder contradiction is flagged for a human; anything
    # else (including a type with NONE risk) proceeds.
    if result.risk_level is RiskLevel.HIGH:
        action = 'BLOCK'
    elif result.risk_level in (RiskLevel.MEDIUM, RiskLevel.LOW):
        action = 'FLAG_FOR_REVIEW'
    else:
        action = 'PASS'

    if action == 'PASS':
        print(f'[gate4] {ticker}: passed — no contradiction (risk={result.risk_level.value})')
    else:
        print(f'[gate4] {ticker}: {action} — {result.contradiction_type.value} '
              f'risk={result.risk_level.value}: {result.reason}')

    return {
        'passed': action == 'PASS',
        'contradiction_detected': contradiction_detected,
        'contradiction_type': result.contradiction_type.value,
        'risk_level': result.risk_level.value,
        'reason': result.reason,
        'action': action,
        'market_context': market_context,
    }


if __name__ == '__main__':
    candidate = {'ticker': 'NVDA', 'sector': 'Electronic Technology'}
    bullish = {'direction': 'BULLISH', 'confidence': 8}
    keys = {'passed', 'contradiction_detected', 'contradiction_type',
            'risk_level', 'reason', 'action', 'market_context'}

    # Wiring check at zero API cost — TestModel returns a schema-valid Gate4Contradiction.
    from pydantic_ai.models.test import TestModel
    calm_fixture = {
        'vix': {'level': 14.5, 'change_pct_today': -0.01, 'prior_close': 14.6},
        'spy': {'price': 540.0, 'change_pct_today': 0.004, 'prior_close': 537.8},
        'sector': {'etf_ticker': 'XLK', 'price': 230.0, 'change_pct_today': 0.006, 'prior_close': 228.6},
        'hours_to_next_macro': 30.0,
    }
    with _agent.override(model=TestModel()):
        wiring = detect_gate4_contradiction(candidate, bullish, calm_fixture)
    assert set(wiring) == keys, f'unexpected keys: {set(wiring)}'
    assert wiring['action'] in {'PASS', 'FLAG_FOR_REVIEW', 'BLOCK'}
    print(f'[gate4] TestModel wiring OK ✅ → action={wiring["action"]}')

    # Live happy path — calm real market. Eyeball; do not assert a verdict on live data.
    from helpers.fetchers.market import get_market_context
    print('\n=== Case 1: live market context, bullish candidate → eyeball (expect PASS on a calm day) ===')
    live_ctx = get_market_context('Electronic Technology')
    if live_ctx:
        print(detect_gate4_contradiction(candidate, bullish, live_ctx))
    else:
        print('[gate4] live market context unavailable — skipping live case')

    # Negative path — synthetic risk-off fixture (deterministic input, Claude judges).
    # Sector clearly down, VIX elevated but below Gate 1's 30, SPY soft: a gray-zone selloff.
    print('\n=== Case 2: synthetic risk-off fixture → expect a contradiction ===')
    risk_off_fixture = {
        'vix': {'level': 26.0, 'change_pct_today': 0.18, 'prior_close': 22.0},
        'spy': {'price': 528.0, 'change_pct_today': -0.012, 'prior_close': 534.4},
        'sector': {'etf_ticker': 'XLK', 'price': 221.0, 'change_pct_today': -0.018, 'prior_close': 225.0},
        'hours_to_next_macro': 30.0,
    }
    r2 = detect_gate4_contradiction(candidate, bullish, risk_off_fixture)
    print(r2)
    assert r2['contradiction_detected'] is True, \
        f'risk-off fixture should flag a contradiction, got: {r2}'
    assert r2['action'] in {'BLOCK', 'FLAG_FOR_REVIEW'}, \
        f'risk-off fixture should not PASS, got action={r2["action"]}'
    print('\n[gate4] wiring + risk-off-contradiction checks passed ✅')
