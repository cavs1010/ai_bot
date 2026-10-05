# =============================================================================
# strategy_config.py — THE STRATEGY DIAL BOARD
# =============================================================================
# This is the single place to see every tunable setting in the stock-selection
# pipeline and what it does. It holds NO values: every value comes from the active
# row of Neon pipeline_configs, which Node passes in the STRATEGY_CONFIG environment
# variable on every run. Change a value in the Strategy Dials screen (saved to Neon)
# and the next run picks it up.
#
# Values are in the units the pipeline uses (fractions: 0.04 = 4%).
# A missing variable or key raises immediately, so a run never uses a guessed value.
#
# Each setting below is annotated with:
#   • WHAT it controls
#   • WHICH pipeline stage uses it
#   • the EFFECT of raising / lowering it
#
# The pipeline runs in this order (and the sections below follow the same order):
#
#   Stage 1  Universe Filter   weekly   large-cap liquid stocks → universe watchlist
#   Stage 2  Momentum Scanner  nightly  scores the watchlist 0–3 → top candidates
#   Gate 1   Hard Threat       rules    blocks on macro/market shocks (no Claude)
#   Gate 2   News Threat       Claude   blocks on catastrophic news      (no dials here)
#   Gate 3   Sentiment         Claude   direction + confidence → pass/block/caution
#   Gate 4   Contradiction     Claude   stock-vs-market divergence       (no dials here)
#   Gate 5   Edge / EV         rules    win-probability + expected value → BUY / SKIP
#   Risk Gate                   rules    Kelly sizing, exposure + drawdown limits
#   Execution                   broker   entry + native trailing stop     (no dials here —
#                                        the trail is derived from atr_stop_multiplier)
#
# In Neon the settings are split into two groups:
#   selection_params — which stocks are picked and pass the gates
#   money_params     — how much money goes in and how much risk is taken
#
# NOT here (on purpose):
#   • Reference lookup tables — SECTOR_ETF_MAP and SOURCE_RELIABILITY_TIERS — live in
#     backend/02_intelligence/constants.py. They are mappings, not dials you tune.
#   • Plumbing defaults (LLM model/temperature/tokens) stay in their own modules;
#     they are implementation details, not strategy.
#   • Secrets / API keys stay in .env.
# =============================================================================

import json
import os

_config = json.loads(os.environ['STRATEGY_CONFIG'])
SELECTION = _config['selection_params']
MONEY = _config['money_params']


# -----------------------------------------------------------------------------
# STAGE 1 — UNIVERSE FILTER  (backend/01_scanner/universe_filter.py)
# -----------------------------------------------------------------------------
# Tier-1 weekly screen. Defines the investable universe: which large-cap, liquid
# US stocks are even allowed onto the watchlist before any scoring happens.
# -----------------------------------------------------------------------------

MIN_AVG_VOLUME = SELECTION['universe']['MIN_AVG_VOLUME']
                                  # shares/day. Liquidity floor — below this our own
                                  # order moves the price against us. Raise → safer fills,
                                  # fewer names; lower → more (thinner) candidates.

MIN_PRICE = SELECTION['universe']['MIN_PRICE']
                                  # USD. Excludes micro-caps and near-zero stocks.
                                  # Raise → cut more low-priced names; lower → admit them.

MIN_ATR_PCT = SELECTION['universe']['MIN_ATR_PCT']
                                  # % of price. Minimum daily range — below this a stock is
                                  # too flat to throw momentum signals. Raise → demand more
                                  # movement; lower → admit calmer stocks.

MAX_ATR_PCT = SELECTION['universe']['MAX_ATR_PCT']
                                  # % of price. Maximum daily range — above this, stop-losses
                                  # get too wide to trade safely. Raise → admit wilder stocks;
                                  # lower → tighter risk, fewer names.

MIN_MARKET_CAP = SELECTION['universe']['MIN_MARKET_CAP']
                                  # USD. Large-cap proxy.
                                  # Raise → mega-cap only; lower → include mid-caps.

EARNINGS_WINDOW_DAYS = SELECTION['universe']['EARNINGS_WINDOW_DAYS']
                                  # days. Exclude stocks reporting earnings within the next
                                  # this-many days — earnings gaps can blow through stop-losses.
                                  # Raise → avoid earnings earlier; lower → less cautious.

SCREENER_LIMIT = SELECTION['universe']['SCREENER_LIMIT']
                                  # rows requested from TradingView before the ATR%/earnings
                                  # filters run. Raise → wider net (slower); lower → faster.

MAX_POSITION_SIZE_PCT = MONEY['position_size']['MAX_POSITION_SIZE_PCT']
                                  # fraction of portfolio. Largest single position allowed.
                                  # Feeds the dynamic share-price ceiling (below) and Phase 5
                                  # sizing. Raise → bigger bets / pricier stocks; lower → smaller.

PRICE_CEILING_BUFFER = MONEY['position_size']['PRICE_CEILING_BUFFER']
                                  # fraction. Safety haircut on the max share price:
                                  # ceiling = portfolio × MAX_POSITION_SIZE_PCT × PRICE_CEILING_BUFFER.
                                  # Below 1.0 it leaves headroom so a full position fits under the cap.
                                  # Raise toward 1.0 → admit pricier stocks; lower → more headroom.


# -----------------------------------------------------------------------------
# STAGE 2 — MOMENTUM SCANNER  (backend/01_scanner/momentum_scanner.py)
# -----------------------------------------------------------------------------
# Tier-2 nightly scan. Scores each watchlist stock 0–3 (one point each for: RSI in
# the momentum zone, price > SMA20, SMA20 > SMA50) and returns the strongest names.
# -----------------------------------------------------------------------------

TOP_N = SELECTION['scanner']['TOP_N']
                                  # max candidates returned from the scan. Raise → feed more
                                  # names into the (paid) Claude gates; lower → tighter funnel.

MIN_SCORE = SELECTION['scanner']['MIN_SCORE']
                                  # minimum momentum score (0–3) to survive the scan. 2 = at
                                  # least two of three criteria met. Raise to 3 → only the
                                  # strongest; lower → looser.

RSI_MIN = SELECTION['scanner']['RSI_MIN']
                                  # lower bound of the RSI momentum zone (point #1 of the score).
RSI_MAX = SELECTION['scanner']['RSI_MAX']
                                  # upper bound — above this is considered overbought.
                                  # The band [RSI_MIN, RSI_MAX] is "rising but not yet stretched."
                                  # Widen → award the RSI point more often; narrow → stricter.


# -----------------------------------------------------------------------------
# GATE 1 — HARD THREAT SCREEN  (backend/02_intelligence/gate1_hard_threat/)
# -----------------------------------------------------------------------------
# First gate. Pure rules, zero Claude cost. Blocks a candidate outright if the
# market/macro backdrop is dangerous. First matching rule wins (fail fast).
# Kept as a dict because the gate code indexes it by key.
# The daily loss check uses MAX_DAILY_LOSS_PCT from the risk section (one rule, one value).
# -----------------------------------------------------------------------------

BLOCK_THRESHOLDS: dict[str, float] = {
    'vix_level':         SELECTION['gate1']['vix_level'],
                                  # CBOE VIX at/above this = elevated fear → block.
                                  #   Raise → tolerate more fear; lower → block sooner.
    'spy_change_pct':    SELECTION['gate1']['spy_change_pct'],
                                  # SPY down more than this on the day = broad market stress → block.
                                  #   More negative → tolerate bigger drops before blocking.
    'sector_change_pct': SELECTION['gate1']['sector_change_pct'],
                                  # Sector ETF down more than this on the day = sector stress → block.
                                  #   More negative → tolerate bigger sector drops.
    'premarket_gap_pct': SELECTION['gate1']['premarket_gap_pct'],
                                  # |pre-market gap| at/above this = price instability → block.
                                  #   Raise → tolerate bigger gaps; lower → block sooner.
    'macro_hours':       SELECTION['gate1']['macro_hours'],
                                  # high-impact macro event within this many hours → block.
                                  #   Raise → stay out longer around events; lower → less cautious.
}

# Gate 1 threat-screen lookback/lookahead windows (block-decision inputs):
EARNINGS_THREAT_DAYS = SELECTION['gate1']['EARNINGS_THREAT_DAYS']
                                  # days ahead to look for earnings. 1 = block if the stock
                                  # reports today or tomorrow (overnight-gap risk). Distinct from
                                  # the universe filter's EARNINGS_WINDOW_DAYS (a coarser
                                  # pre-screen). Raise → avoid earnings further out; lower → less cautious.

FILING_LOOKBACK_DAYS = SELECTION['gate1']['FILING_LOOKBACK_DAYS']
                                  # days back to scan for SEC 8-K filings. 1 = today + yesterday;
                                  # a recent 8-K (material disclosure) blocks the candidate.
                                  # Raise → treat older filings as a threat; lower → only the freshest.


# -----------------------------------------------------------------------------
# GATES 2 & 3 — NEWS INPUTS  (backend/02_intelligence/helpers/fetchers/news.py)
# -----------------------------------------------------------------------------
# How much news the news-threat (Gate 2) and sentiment (Gate 3) Claude calls get to
# read. These shape the evidence both gates reason over, not a numeric pass/fail line.
# -----------------------------------------------------------------------------

NEWS_LOOKBACK_DAYS = SELECTION['news']['NEWS_LOOKBACK_DAYS']
                                  # calendar days of news history to fetch per candidate.
                                  # Raise → more context (and older, possibly stale, headlines);
                                  # lower → only the freshest news.

NEWS_MAX_RESULTS = SELECTION['news']['NEWS_MAX_RESULTS']
                                  # max headlines passed to Claude per candidate. Raise → more
                                  # evidence per call (higher token cost); lower → cheaper, narrower.


# -----------------------------------------------------------------------------
# GATE 3 — SENTIMENT QUALITY  (backend/02_intelligence/helpers/logic/sentiment_rules.py)
# -----------------------------------------------------------------------------
# Third gate. Claude returns a direction (BULLISH/BEARISH/NEUTRAL) + confidence 0–10;
# these dials turn that into pass / block / caution.
# -----------------------------------------------------------------------------

MIN_CONFIDENCE = SELECTION['gate3']['MIN_CONFIDENCE']
                                  # Gate 3 conviction floor (0–10). Below it a directional call
                                  # is treated as weak: NEUTRAL→block, BULLISH→pass-but-cautious.
                                  # Raise → demand stronger conviction; lower → admit weaker reads.
                                  # NOTE: CONFIDENCE_BASELINE in Gate 5 (below) usually shares this
                                  # value — both encode "the Gate 3 conviction floor" — but they
                                  # are kept as two named dials so either can move alone.

CAUTION_SIZE_REDUCTION_PCT = MONEY['position_size']['CAUTION_SIZE_REDUCTION_PCT']
                                  # % position-size cut applied whenever a pass is flagged caution.
                                  # Raise → trim cautious positions harder; lower → trim less.


# -----------------------------------------------------------------------------
# GATE 5 — EDGE / EXPECTED VALUE  (backend/02_intelligence/helpers/logic/ev_rules.py)
# -----------------------------------------------------------------------------
# Final gate. Pure math, zero Claude cost. Maps the momentum score + Gate 3 sentiment
# to a win probability, computes expected value, and decides BUY vs SKIP.
#
#   win_prob = WIN_PROB_BASE + momentum component + confidence component
#              − caution penalty − neutral penalty,  clamped to [FLOOR, CEILING]
#   EV       = (win_prob × reward_risk) − (1 − win_prob)
#   decision = BUY if EV ≥ MIN_EDGE_PCT else SKIP
#
# These coefficients are meant to be tuned from paper-trading results in weekly review.
# -----------------------------------------------------------------------------

WIN_PROB_BASE = SELECTION['gate5']['WIN_PROB_BASE']
                                  # baseline win probability before any adjustments.
                                  # Raise → everything looks better; lower → more conservative.

MOMENTUM_SCORE_MIN = SELECTION['gate5']['MOMENTUM_SCORE_MIN']
                                  # the momentum-score range the component scales across.
MOMENTUM_SCORE_MAX = SELECTION['gate5']['MOMENTUM_SCORE_MAX']
                                  # candidates reaching Gate 5 already scored ≥ MIN_SCORE.
MOMENTUM_COMPONENT = SELECTION['gate5']['MOMENTUM_COMPONENT']
                                  # win-prob added across that range: the lowest score gets half
                                  # of it, the highest score gets one and a half times it.
                                  # Raise → reward momentum more; lower → less.

CONFIDENCE_BASELINE = SELECTION['gate5']['CONFIDENCE_BASELINE']
                                  # confidence at/below which the confidence bonus is zero.
                                  # Usually shares the value of MIN_CONFIDENCE (Gate 3) by design.
CONFIDENCE_COMPONENT = SELECTION['gate5']['CONFIDENCE_COMPONENT']
                                  # max win-prob added for confidence, reached at confidence 10.
                                  # Raise → reward high-confidence reads more; lower → less.

CAUTION_PENALTY = SELECTION['gate5']['CAUTION_PENALTY']
                                  # win-prob subtracted when Gate 3 flagged caution.
                                  # Raise → punish cautious setups harder; lower → softer.

NEUTRAL_DIRECTION_PENALTY = SELECTION['gate5']['NEUTRAL_DIRECTION_PENALTY']
                                  # win-prob subtracted when direction is NEUTRAL (no clear edge).
                                  # Raise → penalize neutral reads harder; lower → softer.

WIN_PROB_FLOOR = SELECTION['gate5']['WIN_PROB_FLOOR']
                                  # win probability is clamped to never go below this...
WIN_PROB_CEILING = SELECTION['gate5']['WIN_PROB_CEILING']
                                  # ...nor above this. Tightening the band makes EV less
                                  # sensitive to the inputs; widening it makes it more sensitive.

POSITION_CONFIDENCE_HIGH = SELECTION['gate5']['POSITION_CONFIDENCE_HIGH']
                                  # win-prob ≥ this → label position confidence "HIGH".
POSITION_CONFIDENCE_MEDIUM = SELECTION['gate5']['POSITION_CONFIDENCE_MEDIUM']
                                  # win-prob ≥ this (and < HIGH) → "MEDIUM"; below → "LOW".
                                  # These labels feed Phase 5 sizing. Raise → fewer HIGH/MEDIUM.

MIN_EDGE_PCT = SELECTION['gate5']['MIN_EDGE_PCT']
                                  # minimum expected value to issue a BUY. The master
                                  # selectivity knob: raise → fewer, higher-conviction buys;
                                  # lower → more buys.


# -----------------------------------------------------------------------------
# TRADE LEVELS — shared by Gate 5, the Phase 5 risk gate, and the Phase 6 executor
# (backend/02_intelligence/helpers/logic/trade_levels.py)
# -----------------------------------------------------------------------------
# Stop/target geometry applied once a BUY is decided. Kept as a dict because the
# trade-level code indexes it by key.
#
#   stop   = entry − (atr_stop_multiplier × ATR)
#   target = entry + (target_rr_multiple × stop_distance)   → reward:risk ratio
#
# There is no separate TRAIL_PERCENT dial. The broker-side trailing stop is derived
# from stop_pct (= atr_stop_multiplier × ATR / entry), so the stop that gets placed is
# the same distance the EV and Kelly sizing were computed from. A second dial would let
# the two drift apart — the decision layer and the execution layer describing different
# trades. Tune the trail by tuning atr_stop_multiplier.
# -----------------------------------------------------------------------------

TRADE_LEVEL_PARAMS: dict[str, float] = {
    'atr_stop_multiplier': MONEY['trade_risk']['atr_stop_multiplier'],
                                  # stop distance = this × ATR. Raise → wider stops (more room,
                                  # bigger risk per share); lower → tighter stops. Also sets the
                                  # trailing stop's trail_percent — see note above.
    'target_rr_multiple':  MONEY['trade_risk']['target_rr_multiple'],
                                  # target distance = this × stop distance → reward:risk.
                                  # Raise → demand more reward per unit risk; lower → closer targets.
                                  # No take-profit order is placed (the trailing stop replaced it),
                                  # so this is an ASSUMPTION feeding EV (ev_rules.py) and Kelly
                                  # sizing (risk_gate.py) — validate it against realized winners in
                                  # paper trading rather than trusting it.
}


# -----------------------------------------------------------------------------
# PHASE 5 — RISK GATE  (backend/03_risk/risk_gate.py)
# -----------------------------------------------------------------------------
# Final gate before execution. Sizes the position (Quarter-Kelly) and runs the
# last-mile checks right before an order would be placed: open-position count,
# daily loss limit, and drawdown kill switch. Reuses Gate 1's loss-limit helper
# and Gate 5's trade_levels/EV output rather than recomputing them — this gate
# adds only what those upstream gates don't already cover.
# -----------------------------------------------------------------------------

MAX_OPEN_POSITIONS = MONEY['portfolio_limits']['MAX_OPEN_POSITIONS']
                                  # max concurrent open positions across the whole portfolio.
                                  # Raise → more diversification, more names tracked; lower →
                                  # more concentrated, easier to monitor.

MAX_DAILY_LOSS_PCT = MONEY['portfolio_limits']['MAX_DAILY_LOSS_PCT']
                                  # portfolio down at/beyond this today = hard stop on new buys.
                                  # Checked twice with the same value: in Gate 1 and again here
                                  # with live P&L right before execution.

MAX_DRAWDOWN_PCT = MONEY['portfolio_limits']['MAX_DRAWDOWN_PCT']
                                  # halt all new buys if equity is down at/beyond this from its peak.
                                  # Raise → tolerate deeper drawdowns before halting; lower →
                                  # halt sooner.

KELLY_FRACTION = MONEY['position_size']['KELLY_FRACTION']
                                  # fraction of full Kelly used for sizing (0.25 = Quarter-Kelly).
                                  # Raise → bigger bets, more variance; lower → smaller, steadier.

MIN_REWARD_RISK = MONEY['trade_risk']['MIN_REWARD_RISK']
                                  # minimum reward:risk ratio required to approve a trade.
                                  # TRADE_LEVEL_PARAMS already targets it by construction; this
                                  # is the final guard, not a recompute.
