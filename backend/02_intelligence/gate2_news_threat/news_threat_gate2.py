# gate2_news_threat/news_threat_gate2.py — News Threat Assessment (Claude call 1 of 4)
# Phase 4.2 | Intelligence Layer
#
# Function: assess_gate2_news_threat(candidate, headlines=None)
#   → {passed, threat_detected, threat_categories, reason, headlines_used}
#
# Asks Claude ONE focused question: is there a catastrophic threat in the news?
# (Not sentiment — that is Gate 3.) Any threat → block.
#
# Imports: helpers/fetchers/news (format_news_for_prompt),
#          helpers/llm/client   (build_agent, run_agent)
#
# Test: python backend/02_intelligence/gate2_news_threat/news_threat_gate2.py

import sys
import pathlib
from enum import Enum

from pydantic import BaseModel, Field

base = pathlib.Path(__file__).resolve().parents[1]   # → 02_intelligence/
sys.path.insert(0, str(base))

from helpers.fetchers.news import format_news_for_prompt
from helpers.llm.client import build_agent, run_agent


class ThreatCategory(str, Enum):
    """The catastrophic-risk categories Gate 2 screens for. NONE = no threat present.

    Human descriptions live once in THREAT_DESCRIPTIONS below (single source of truth);
    the system prompt's category list is generated from it — add a category in both the
    enum and that dict and the prompt updates itself.
    """
    FRAUD_SEC = 'fraud_accounting_sec'
    SHORT_SELLER = 'short_seller_activist'
    REGULATORY = 'regulatory_legal_action'
    FDA_RECALL = 'fda_recall_safety'
    LEADERSHIP = 'leadership_departure_scandal'
    CONTRACT_LOSS = 'major_contract_loss'
    SANCTIONS = 'sanctions_trade_restriction'
    NONE = 'none'


# Single source of truth for what each threat means. The system prompt is built from this.
THREAT_DESCRIPTIONS: dict[ThreatCategory, str] = {
    ThreatCategory.FRAUD_SEC:     'fraud, accounting irregularities, or SEC investigation',
    ThreatCategory.SHORT_SELLER:  'a short-seller attack or activist report targeting this company',
    ThreatCategory.REGULATORY:    'regulatory crackdown, fine, ban, or legal action',
    ThreatCategory.FDA_RECALL:    'FDA rejection, product recall, or safety failure',
    ThreatCategory.LEADERSHIP:    'sudden CEO or senior-leadership departure, or a leadership scandal',
    ThreatCategory.CONTRACT_LOSS: 'loss of a major contract or cancellation by a key customer',
    ThreatCategory.SANCTIONS:     'a geopolitical sanction or trade restriction targeting this company',
}

# Coverage guard: every real category (all but NONE) must have a description, or this fails at import.
assert set(THREAT_DESCRIPTIONS) == set(ThreatCategory) - {ThreatCategory.NONE}, \
    'THREAT_DESCRIPTIONS must describe every ThreatCategory except NONE'


class Gate2Threat(BaseModel):
    """Structured result Claude must return for the threat question."""
    threat_categories: list[ThreatCategory] = Field(
        description="Every threat category with evidence in the headlines (more than one is allowed). "
                    "If there is no catastrophic threat, return exactly ['none']."
    )
    reason: str = Field(description="One sentence explaining the verdict, or 'NONE' if no threat")


# Category list rendered from the single source of truth above.
_CATEGORY_LINES = '\n'.join(f'- {c.value}: {desc}' for c, desc in THREAT_DESCRIPTIONS.items())

SYSTEM_PROMPT = (
    'You are a financial threat detection system. Your only job is to identify catastrophic '
    'risks in news headlines that should stop a trade. You do NOT assess opportunity, upside, '
    'or general sentiment — that is a separate gate. You look only for serious danger in these '
    f'categories:\n{_CATEGORY_LINES}\n'
    'Weigh source reliability: a HIGH-reliability source reporting a threat is far more significant '
    'than a LOW one. Return every category for which there is evidence — there may be more than one. '
    "If there is no catastrophic threat, return exactly ['none'] and set reason to 'NONE'."
)

# Built once at import; reused for every candidate. Cheap Haiku default (helpers/llm/client).
_agent = build_agent(Gate2Threat, SYSTEM_PROMPT)


def _build_gate2_user_prompt(ticker: str, headlines: list[dict]) -> str:
    return (
        f'Analyse these headlines for {ticker}. '
        'Each is tagged with source reliability.\n\n'
        f'{format_news_for_prompt(headlines)}\n\n'
        'Which threat categories, if any, have evidence in these headlines? '
        "Return every category that applies, or ['none'] if there is no catastrophic threat."
    )


def assess_gate2_news_threat(candidate: dict, headlines: list[dict]) -> dict:
    """
    Gate 2 — asks Claude whether the news carries a catastrophic threat (block if yes).

    First of four LLM gates; runs after Gate 1 passes. The caller (pipeline) fetches news
    once and passes the same headlines to every gate that needs them (Gate 2, Gate 3) — the
    gate does not fetch, so the gates stay consistent and the news API is hit once per candidate.

    Args:
        candidate: Momentum scanner dict. Required key: 'ticker'.
        headlines: News from fetch_news(), passed in by the caller. Empty list → no news to
                   assess. Each item is a dict with keys: 'headline' (str), 'source' (str),
                   'reliability' (str: HIGH/MEDIUM/LOW/DANGEROUS), and optional 'summary' (str).

    Returns:
        dict with keys:
            passed            (bool)      — False only when a threat is detected or the LLM is unavailable.
            threat_detected   (bool)      — True if Claude flagged any catastrophic threat.
            threat_categories (list[str]) — the matching ThreatCategory values, or [] if none.
            reason            (str)       — one-sentence reason, or 'NONE' / 'llm_unavailable'.
            headlines_used    (int)       — number of headlines sent to Claude.

    Prints:
        One line to stdout with the verdict — this is the `[gate2] …` line you see in logs:
            `[gate2] <ticker>: passed — no threat across N headlines` — cleared.
            `[gate2] <ticker>: no headlines — passing (no threat)`    — nothing to assess.
            `[gate2] <ticker>: BLOCKED — <threats>: <reason>`         — catastrophic story found.
            `[gate2] <ticker>: LLM unavailable — blocking …`          — no API key → blocks by design.
    """
    ticker = candidate['ticker']

    # No news to assess → no threat. (Doc §4 Gate 2: "treats no news as no threat — proceeds".)
    if not headlines:
        print(f'[gate2] {ticker}: no headlines — passing (no threat)')
        return {
            'passed': True,
            'threat_detected': False,
            'threat_categories': [],
            'reason': 'NONE',
            'headlines_used': 0,
        }

    prompt = _build_gate2_user_prompt(ticker, headlines)
    result = run_agent(_agent, prompt)

    # LLM unavailable → cannot confirm the news is safe. For a money decision, block rather
    # than trade blind. (Deliberately stricter than Gate 1's pass-on-missing-data, because
    # the news threat cannot be screened any other way.)
    if result is None:
        print(f'[gate2] {ticker}: LLM unavailable — blocking (cannot assess threat)')
        return {
            'passed': False,
            'threat_detected': False,
            'threat_categories': [],
            'reason': 'llm_unavailable',
            'headlines_used': len(headlines),
        }

    # Real threats = every returned category except the NONE sentinel. threat_detected is
    # derived from this list so the verdict can never contradict the categories.
    threats = [c.value for c in result.threat_categories if c is not ThreatCategory.NONE]
    threat_detected = bool(threats)

    if threat_detected:
        print(f'[gate2] {ticker}: BLOCKED — {", ".join(threats)}: {result.reason}')
    else:
        print(f'[gate2] {ticker}: passed — no threat across {len(headlines)} headlines')

    return {
        'passed': not threat_detected,
        'threat_detected': threat_detected,
        'threat_categories': threats,
        'reason': result.reason,
        'headlines_used': len(headlines),
    }


if __name__ == '__main__':
    # Live Claude calls (one per case). Requires ANTHROPIC_API_KEY in .env.
    candidate = {'ticker': 'NVDA'}

    print('=== Case 1: benign headlines → expect PASS ===')
    benign = [
        {'headline': 'NVIDIA unveils next-gen GPU lineup at annual conference',
         'source': 'Reuters', 'reliability': 'HIGH', 'summary': ''},
        {'headline': 'Analysts raise NVIDIA price target on strong data-center demand',
         'source': 'CNBC', 'reliability': 'MEDIUM', 'summary': ''},
    ]
    r1 = assess_gate2_news_threat(candidate, headlines=benign)
    print(r1)

    print('\n=== Case 2: fraud headline → expect BLOCK ===')
    fraud = [
        {'headline': 'SEC charges NVIDIA executives with accounting fraud, opens formal investigation',
         'source': 'Bloomberg', 'reliability': 'HIGH', 'summary': ''},
        {'headline': 'Short seller alleges NVIDIA overstated revenue in scathing report',
         'source': 'Reuters', 'reliability': 'HIGH', 'summary': ''},
    ]
    r2 = assess_gate2_news_threat(candidate, headlines=fraud)
    print(r2)

    print('\n=== Case 3: empty headlines → pass with no LLM call ===')
    r3 = assess_gate2_news_threat(candidate, headlines=[])
    print(r3)

    # Contract + behavioural checks.
    for r in (r1, r2, r3):
        assert set(r) == {'passed', 'threat_detected', 'threat_categories', 'reason', 'headlines_used'}
        assert isinstance(r['threat_categories'], list)
    assert r2['passed'] is False and r2['threat_detected'] is True, \
        f'fraud case should BLOCK, got: {r2}'
    # The fraud case carries two distinct threats — the list should capture both.
    assert {'fraud_accounting_sec', 'short_seller_activist'} <= set(r2['threat_categories']), \
        f'fraud case should flag fraud_accounting_sec AND short_seller_activist, got: {r2["threat_categories"]}'
    assert r3 == {'passed': True, 'threat_detected': False,
                  'threat_categories': [], 'reason': 'NONE', 'headlines_used': 0}
    print('\n[gate2] contract + multi-threat-block + empty-pass checks passed ✅')
