# =============================================================================
# config.py — THE STRATEGY DIAL BOARD
# =============================================================================
# This is the single place to adjust every tunable number in the stock-selection
# pipeline. Change a value here and the whole system picks it up — you never have
# to hunt through individual modules.
#
# Each constant below is annotated with:
#   • WHAT it controls
#   • WHICH pipeline stage uses it
#   • the EFFECT of raising / lowering it
#
# The pipeline runs in this order (and the sections below follow the same order):
#
#   Stage 1  Universe Filter   weekly   ~60–80 large-cap liquid stocks → watchlist.csv
#   Stage 2  Momentum Scanner  nightly  scores the watchlist 0–3 → top candidates
#   Gate 1   Hard Threat       rules    blocks on macro/market shocks (no Claude)
#   Gate 2   News Threat       Claude   blocks on catastrophic news      (no dials here)
#   Gate 3   Sentiment         Claude   direction + confidence → pass/block/caution
#   Gate 4   Contradiction     Claude   stock-vs-market divergence       (no dials here)
#   Gate 5   Edge / EV         rules    win-probability + expected value → BUY / SKIP
#
# NOT here (on purpose):
#   • Reference lookup tables — SECTOR_ETF_MAP and SOURCE_RELIABILITY_TIERS — live in
#     backend/02_intelligence/constants.py. They are mappings, not dials you tune.
#   • Plumbing defaults (news/price lookback windows, LLM model/temperature/tokens)
#     stay in their own modules; they are implementation details, not strategy.
#   • Secrets / API keys stay in .env.
# =============================================================================


# -----------------------------------------------------------------------------
# STAGE 1 — UNIVERSE FILTER  (backend/01_scanner/universe_filter.py)
# -----------------------------------------------------------------------------
# Tier-1 weekly screen. Defines the investable universe: which large-cap, liquid
# US stocks are even allowed onto the watchlist before any scoring happens.
# -----------------------------------------------------------------------------

MIN_AVG_VOLUME = 1_000_000        # shares/day. Liquidity floor — below this our own
                                  # order moves the price against us. Raise → safer fills,
                                  # fewer names; lower → more (thinner) candidates.

MIN_PRICE = 10.0                  # USD. Excludes micro-caps and near-zero stocks.
                                  # Raise → cut more low-priced names; lower → admit them.

MIN_ATR_PCT = 1.0                 # % of price. Minimum daily range — below this a stock is
                                  # too flat to throw momentum signals. Raise → demand more
                                  # movement; lower → admit calmer stocks.

MAX_ATR_PCT = 5.0                 # % of price. Maximum daily range — above this, stop-losses
                                  # get too wide to trade safely. Raise → admit wilder stocks;
                                  # lower → tighter risk, fewer names.

MIN_MARKET_CAP = 100_000_000_000  # USD ($100B). Large-cap proxy (~70 names, validated).
                                  # Raise → mega-cap only; lower → include mid-caps.

EARNINGS_WINDOW_DAYS = 5          # days. Exclude stocks reporting earnings within this many
                                  # days — earnings gaps can blow through stop-losses.
                                  # Raise → avoid earnings earlier; lower → less cautious.

SCREENER_LIMIT = 200              # rows requested from TradingView before the ATR%/earnings
                                  # filters run. Raise → wider net (slower); lower → faster.

MAX_POSITION_SIZE_PCT = 0.08      # fraction of portfolio. Largest single position allowed (8%).
                                  # Feeds the dynamic share-price ceiling (below) and Phase 5
                                  # sizing. Raise → bigger bets / pricier stocks; lower → smaller.
                                  # (Moved here from .env so it lives on the board.)

PRICE_CEILING_BUFFER = 0.90       # fraction. Safety haircut on the max share price:
                                  # ceiling = portfolio × MAX_POSITION_SIZE_PCT × PRICE_CEILING_BUFFER.
                                  # The 0.90 leaves headroom so a full position fits under the cap.
                                  # Raise toward 1.0 → admit pricier stocks; lower → more headroom.


# -----------------------------------------------------------------------------
# STAGE 2 — MOMENTUM SCANNER  (backend/01_scanner/momentum_scanner.py)
# -----------------------------------------------------------------------------
# Tier-2 nightly scan. Scores each watchlist stock 0–3 (one point each for: RSI in
# the momentum zone, price > SMA20, SMA20 > SMA50) and returns the strongest names.
# -----------------------------------------------------------------------------

TOP_N = 15                        # max candidates returned from the scan. Raise → feed more
                                  # names into the (paid) Claude gates; lower → tighter funnel.

MIN_SCORE = 2                     # minimum momentum score (0–3) to survive the scan. 2 = at
                                  # least two of three criteria met. Raise to 3 → only the
                                  # strongest; lower → looser.

RSI_MIN = 50                      # lower bound of the RSI momentum zone (point #1 of the score).
RSI_MAX = 70                      # upper bound — above this is considered overbought.
                                  # The band [RSI_MIN, RSI_MAX] is "rising but not yet stretched."
                                  # Widen → award the RSI point more often; narrow → stricter.


# -----------------------------------------------------------------------------
# GATE 1 — HARD THREAT SCREEN  (backend/02_intelligence/gate1_hard_threat/)
# -----------------------------------------------------------------------------
# First gate. Pure rules, zero Claude cost. Blocks a candidate outright if the
# market/macro backdrop is dangerous. First matching rule wins (fail fast).
# Kept as a dict because the gate code indexes it by key.
# -----------------------------------------------------------------------------

BLOCK_THRESHOLDS: dict[str, float] = {
    'vix_level':          30.0,   # CBOE VIX at/above this = elevated fear → block.
                                  #   Raise → tolerate more fear; lower → block sooner.
    'spy_change_pct':    -0.015,  # SPY down > 1.5% on the day = broad market stress → block.
                                  #   More negative → tolerate bigger drops before blocking.
    'sector_change_pct': -0.02,   # Sector ETF down > 2% on the day = sector stress → block.
                                  #   More negative → tolerate bigger sector drops.
    'premarket_gap_pct':  0.03,   # |pre-market gap| ≥ 3% = price instability → block.
                                  #   Raise → tolerate bigger gaps; lower → block sooner.
    'macro_hours':         2.0,   # high-impact macro event within this many hours → block.
                                  #   Raise → stay out longer around events; lower → less cautious.
    'loss_limit_pct':      0.03,  # portfolio down ≥ 3% today = hard stop, block all new buys.
                                  #   Raise → allow a deeper daily drawdown before halting.
}

# Gate 1 threat-screen lookback/lookahead windows (block-decision inputs):
EARNINGS_THREAT_DAYS = 1          # days ahead to look for earnings. 1 = block if the stock
                                  # reports today or tomorrow (overnight-gap risk). Distinct from
                                  # the universe filter's EARNINGS_WINDOW_DAYS (=5, a coarser
                                  # pre-screen). Raise → avoid earnings further out; lower → less cautious.

FILING_LOOKBACK_DAYS = 1          # days back to scan for SEC 8-K filings. 1 = today + yesterday;
                                  # a recent 8-K (material disclosure) blocks the candidate.
                                  # Raise → treat older filings as a threat; lower → only the freshest.


# -----------------------------------------------------------------------------
# GATES 2 & 3 — NEWS INPUTS  (backend/02_intelligence/helpers/fetchers/news.py)
# -----------------------------------------------------------------------------
# How much news the news-threat (Gate 2) and sentiment (Gate 3) Claude calls get to
# read. These shape the evidence both gates reason over, not a numeric pass/fail line.
# -----------------------------------------------------------------------------

NEWS_LOOKBACK_DAYS = 2            # calendar days of news history to fetch per candidate.
                                  # Raise → more context (and older, possibly stale, headlines);
                                  # lower → only the freshest news.

NEWS_MAX_RESULTS = 5              # max headlines passed to Claude per candidate. Raise → more
                                  # evidence per call (higher token cost); lower → cheaper, narrower.


# -----------------------------------------------------------------------------
# GATE 3 — SENTIMENT QUALITY  (backend/02_intelligence/helpers/logic/sentiment_rules.py)
# -----------------------------------------------------------------------------
# Third gate. Claude returns a direction (BULLISH/BEARISH/NEUTRAL) + confidence 0–10;
# these dials turn that into pass / block / caution.
# -----------------------------------------------------------------------------

MIN_CONFIDENCE = 6                # Gate 3 conviction floor (0–10). Below it a directional call
                                  # is treated as weak: NEUTRAL→block, BULLISH→pass-but-cautious.
                                  # Raise → demand stronger conviction; lower → admit weaker reads.
                                  # NOTE: CONFIDENCE_BASELINE in Gate 5 (below) shares this value
                                  # of 6 on purpose — both encode "the Gate 3 conviction floor" —
                                  # but they are kept as two named dials so either can move alone.

CAUTION_SIZE_REDUCTION_PCT = 25   # % position-size cut applied whenever a pass is flagged caution.
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

WIN_PROB_BASE = 0.35              # baseline win probability before any adjustments (35%).
                                  # Raise → everything looks better; lower → more conservative.

MOMENTUM_SCORE_MIN = 2            # the momentum-score range the component scales across.
MOMENTUM_SCORE_MAX = 3            # candidates reaching Gate 5 already scored ≥ MIN_SCORE (2).
MOMENTUM_COMPONENT = 0.10         # win-prob added across that range: score 2 → +0.05, 3 → +0.15.
                                  # Raise → reward momentum more; lower → less.

CONFIDENCE_BASELINE = 6           # confidence at/below which the confidence bonus is zero.
                                  # Shares the value of MIN_CONFIDENCE (Gate 3) by design.
CONFIDENCE_COMPONENT = 0.25       # max win-prob added for confidence: conf 6 → +0, conf 10 → +0.25.
                                  # Raise → reward high-confidence reads more; lower → less.

CAUTION_PENALTY = 0.08            # win-prob subtracted when Gate 3 flagged caution.
                                  # Raise → punish cautious setups harder; lower → softer.

NEUTRAL_DIRECTION_PENALTY = 0.05  # win-prob subtracted when direction is NEUTRAL (no clear edge).
                                  # Raise → penalize neutral reads harder; lower → softer.

WIN_PROB_FLOOR = 0.30             # win probability is clamped to never go below this (30%)...
WIN_PROB_CEILING = 0.70           # ...nor above this (70%). Tightening the band makes EV less
                                  # sensitive to the inputs; widening it makes it more sensitive.

POSITION_CONFIDENCE_HIGH = 0.55   # win-prob ≥ this → label position confidence "HIGH".
POSITION_CONFIDENCE_MEDIUM = 0.45 # win-prob ≥ this (and < HIGH) → "MEDIUM"; below → "LOW".
                                  # These labels feed Phase 5 sizing. Raise → fewer HIGH/MEDIUM.

MIN_EDGE_PCT = 0.04               # minimum expected value to issue a BUY (4%). The master
                                  # selectivity knob: raise → fewer, higher-conviction buys;
                                  # lower → more buys. (Moved here from .env so it lives on the board.)


# -----------------------------------------------------------------------------
# TRADE LEVELS — shared by Gate 5 and the Phase 5 risk gate
# (backend/02_intelligence/helpers/logic/trade_levels.py)
# -----------------------------------------------------------------------------
# Stop/target geometry applied once a BUY is decided. Kept as a dict because the
# trade-level code indexes it by key.
#
#   stop   = entry − (atr_stop_multiplier × ATR)
#   target = entry + (target_rr_multiple × stop_distance)   → reward:risk ratio
# -----------------------------------------------------------------------------

TRADE_LEVEL_PARAMS: dict[str, float] = {
    'atr_stop_multiplier': 1.5,   # stop distance = this × ATR. Raise → wider stops (more room,
                                  # bigger risk per share); lower → tighter stops.
    'target_rr_multiple':  2.0,   # target distance = this × stop distance → ~2:1 reward:risk.
                                  # Raise → demand more reward per unit risk; lower → closer targets.
}


# -----------------------------------------------------------------------------
# PHASE 5 — RISK GATE  (backend/03_risk/risk_gate.py)
# -----------------------------------------------------------------------------
# Final gate before execution. Sizes the position (Quarter-Kelly) and runs the
# last-mile checks right before an order would be placed: open-position count,
# daily loss limit, and drawdown kill switch. Reuses Gate 1's loss-limit helper
# and Gate 5's trade_levels/EV output rather than recomputing them — this gate
# adds only what those upstream gates don't already cover.
# (Moved here from .env so these live on the board, same as MAX_POSITION_SIZE_PCT
# and MIN_EDGE_PCT above.)
# -----------------------------------------------------------------------------

MAX_OPEN_POSITIONS = 5            # max concurrent open positions across the whole portfolio.
                                  # Raise → more diversification, more names tracked; lower →
                                  # more concentrated, easier to monitor.

MAX_DAILY_LOSS_PCT = 0.03         # portfolio down ≥ 3% today = hard stop on new buys. Mirrors
                                  # BLOCK_THRESHOLDS['loss_limit_pct'] above (same 3% rule,
                                  # re-checked here with live P&L right before execution).

MAX_DRAWDOWN_PCT = 0.08           # halt all new buys if equity is down ≥ 8% from its peak.
                                  # Raise → tolerate deeper drawdowns before halting; lower →
                                  # halt sooner.

KELLY_FRACTION = 0.25             # fraction of full Kelly used for sizing (Quarter-Kelly).
                                  # Raise → bigger bets, more variance; lower → smaller, steadier.

MIN_REWARD_RISK = 2.0             # minimum reward:risk ratio required to approve a trade.
                                  # TRADE_LEVEL_PARAMS already targets ~2:1 by construction; this
                                  # is the final guard, not a recompute.
