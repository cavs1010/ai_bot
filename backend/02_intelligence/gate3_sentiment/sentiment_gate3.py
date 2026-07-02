# gate3_sentiment/sentiment_gate3.py — Sentiment Quality Check (Claude call 2 of 4)
# Phase 4.3 | Intelligence Layer
#
# Function: evaluate_gate3_sentiment(candidate, headlines)
#   → {passed, direction, confidence, key_reason, caution, size_reduction_pct}
#
# Asks Claude ONE focused question: is the news sentiment bullish, and how confident?
# (Not threat detection — that is Gate 2.) Confidence is the single quality signal: the
# headlines carry [Reliability: …] tags in the prompt, so Claude folds source quality into
# its confidence rather than reporting it separately. The pass/block/caution verdict is then
# derived in code by helpers/logic/sentiment_rules.apply_pass_rules.
#
# Reuses the SAME headlines Gate 2 received — the pipeline fetches once, the gate never re-fetches.
#
# Imports: helpers/fetchers/news    (format_news_for_prompt),
#          helpers/llm/client       (build_agent, run_agent),
#          helpers/logic/sentiment_rules (apply_pass_rules)
#
# Test: python backend/02_intelligence/gate3_sentiment/sentiment_gate3.py

import sys
import pathlib
from enum import Enum

from pydantic import BaseModel, Field

base = pathlib.Path(__file__).resolve().parents[1]   # → 02_intelligence/
sys.path.insert(0, str(base))

from helpers.fetchers.news import format_news_for_prompt
from helpers.llm.client import build_agent, run_agent
from helpers.logic.sentiment_rules import apply_pass_rules


class Direction(str, Enum):
    """Overall news-sentiment direction for the candidate. Values are self-explanatory."""
    BULLISH = 'BULLISH'
    BEARISH = 'BEARISH'
    NEUTRAL = 'NEUTRAL'


class Gate3Sentiment(BaseModel):
    """Structured result Claude must return for the sentiment question."""
    direction: Direction = Field(
        description='Overall sentiment of the news for this stock: BULLISH, BEARISH, or NEUTRAL.'
    )
    confidence: int = Field(
        ge=0, le=10,
        description='How confident you are in that direction, 0 (none) to 10 (certain). '
                    'Weigh the source reliability tagged on each headline into this number.'
    )
    key_reason: str = Field(description='One sentence explaining the sentiment call.')


SYSTEM_PROMPT = (
    'You are a financial news sentiment analyst. Your only job is to judge whether the news '
    'sentiment supports a bullish momentum entry in this stock. Read the headlines and return: the overall '
    'direction (BULLISH, BEARISH, or NEUTRAL), your confidence from 0 to 10, and a one-sentence '
    'reason. Each headline is tagged with source reliability — let unreliable sources lower your '
    'confidence rather than reporting reliability separately.'
)

# Built once at import; reused for every candidate. Cheap Haiku default (helpers/llm/client).
_agent = build_agent(Gate3Sentiment, SYSTEM_PROMPT)


def _build_gate3_user_prompt(ticker: str, headlines: list[dict]) -> str:
    return (
        f'Analyse these headlines for {ticker}. '
        'Each is tagged with source reliability.\n\n'
        f'{format_news_for_prompt(headlines)}\n\n'
        'What is the overall sentiment direction, your confidence (0-10), and why?'
    )


def evaluate_gate3_sentiment(candidate: dict, headlines: list[dict]) -> dict:
    """
    Gate 3 — asks Claude the news-sentiment direction + confidence, then applies the pass rules.

    Second of four LLM gates; runs after Gate 2 passes on the SAME headlines list. The caller
    (pipeline) fetches news once and passes it to every gate that needs it, so Gate 2 and Gate 3
    assess an identical dataset. Confidence is the single quality signal — Claude folds source
    reliability (the headlines are tagged) into it. The pass/block/caution verdict comes from
    apply_pass_rules.

    Args:
        candidate: Momentum scanner dict. Required key: 'ticker'.
        headlines: News from fetch_news(), passed in by the caller. Each item is a dict with
                   keys: 'headline' (str), 'source' (str), 'reliability' (str:
                   HIGH/MEDIUM/LOW/DANGEROUS), and optional 'summary' (str). Empty list → block
                   (no news = no bullish sentiment to confirm).

    Returns:
        dict with keys:
            passed             (bool) — from apply_pass_rules; False on empty news or LLM failure.
            direction          (str)  — Direction value on the LLM path, '' on early returns.
            confidence         (int)  — Claude's 0-10 confidence, 0 on early returns.
            key_reason         (str)  — one-sentence reason, or 'no_headlines' / 'llm_unavailable'.
            caution            (bool) — from apply_pass_rules; passing but size should be cut.
            size_reduction_pct (int)  — 25 when caution, else 0.

    Prints:
        One line to stdout with the verdict — this is the `[gate3] …` line you see in logs:
            `[gate3] <ticker>: passed — <DIRECTION> conf=<n>`         — cleared; `(caution)`
                                                                        after 'passed' = size cut.
            `[gate3] <ticker>: BLOCKED — <DIRECTION> …`               — direction/confidence failed.
            `[gate3] <ticker>: no headlines — blocking …`             — can't confirm sentiment.
            `[gate3] <ticker>: LLM unavailable — blocking …`          — no API key → blocks by design.
    """
    ticker = candidate['ticker']

    # No news → no bullish sentiment to confirm. Gate 3 is a quality-confirmation gate, so it
    # blocks (unlike Gate 2, which treats no-news as no-threat and passes). No LLM call here.
    if not headlines:
        print(f'[gate3] {ticker}: no headlines — blocking (cannot confirm sentiment)')
        return {
            'passed': False,
            'direction': '',
            'confidence': 0,
            'key_reason': 'no_headlines',
            'caution': False,
            'size_reduction_pct': 0,
        }

    prompt = _build_gate3_user_prompt(ticker, headlines)
    result = run_agent(_agent, prompt)

    # LLM unavailable → cannot confirm the sentiment supports an entry. For a money decision,
    # block rather than trade blind (same stricter policy as Gate 2 — sentiment can't be
    # screened any other way).
    if result is None:
        print(f'[gate3] {ticker}: LLM unavailable — blocking (cannot assess sentiment)')
        return {
            'passed': False,
            'direction': '',
            'confidence': 0,
            'key_reason': 'llm_unavailable',
            'caution': False,
            'size_reduction_pct': 0,
        }

    verdict = apply_pass_rules(result.direction.value, result.confidence)

    if verdict['passed']:
        flag = ' (caution)' if verdict['caution'] else ''
        print(f'[gate3] {ticker}: passed{flag} — {result.direction.value} conf={result.confidence}')
    else:
        print(f'[gate3] {ticker}: BLOCKED — {result.direction.value} '
              f'conf={result.confidence}: {result.key_reason}')

    return {
        'passed': verdict['passed'],
        'direction': result.direction.value,
        'confidence': result.confidence,
        'key_reason': result.key_reason,
        'caution': verdict['caution'],
        'size_reduction_pct': verdict['size_reduction_pct'],
    }


if __name__ == '__main__':
    candidate = {'ticker': 'NVDA'}
    keys = {'passed', 'direction', 'confidence', 'key_reason', 'caution', 'size_reduction_pct'}

    # Wiring check at zero API cost — TestModel returns a schema-valid Gate3Sentiment.
    from pydantic_ai.models.test import TestModel
    wired = [
        {'headline': 'NVIDIA beats earnings', 'source': 'Reuters', 'reliability': 'HIGH', 'summary': ''},
    ]
    with _agent.override(model=TestModel()):
        wiring = evaluate_gate3_sentiment(candidate, headlines=wired)
    assert set(wiring) == keys
    print(f'[gate3] TestModel wiring OK ✅ → {wiring}')

    # Live Claude calls (require ANTHROPIC_API_KEY). Eyeball — do not assert on LLM output.
    print('\n=== Case 1: bullish headlines → expect PASS ===')
    bullish = [
        {'headline': 'NVIDIA beats earnings, raises guidance on record data-center demand',
         'source': 'Reuters', 'reliability': 'HIGH', 'summary': ''},
        {'headline': 'Analysts hike NVIDIA price targets after blowout quarter',
         'source': 'CNBC', 'reliability': 'MEDIUM', 'summary': ''},
    ]
    print(evaluate_gate3_sentiment(candidate, headlines=bullish))

    print('\n=== Case 2: bearish headlines → expect BLOCK ===')
    bearish = [
        {'headline': 'NVIDIA shares slide as demand outlook darkens and orders are cut',
         'source': 'Bloomberg', 'reliability': 'HIGH', 'summary': ''},
        {'headline': 'Analysts downgrade NVIDIA, warn of margin pressure ahead',
         'source': 'Reuters', 'reliability': 'HIGH', 'summary': ''},
    ]
    print(evaluate_gate3_sentiment(candidate, headlines=bearish))

    # Empty headlines → deterministic BLOCK, no LLM call.
    print('\n=== Case 3: empty headlines → block with no LLM call ===')
    r3 = evaluate_gate3_sentiment(candidate, headlines=[])
    assert r3 == {'passed': False, 'direction': '', 'confidence': 0,
                  'key_reason': 'no_headlines', 'caution': False, 'size_reduction_pct': 0}
    print(r3)
    print('\n[gate3] contract + empty-block checks passed ✅')
