# 🗺️ Iteration 1 — Roadmap

**Status:** 🔄 active

First full lap of the project (Phase 0 → Phase 11). Work **only** from this file for the current iteration.

- 💡 Ideas for iteration 2 → [iteration-02-ideas.md](iteration-02-ideas.md) (one-line bullets only)
- ⏳ Do not create `iteration-02-roadmap.md` until iteration 1 is complete
- 📌 Index → [master.md](master.md)

## 📍 Where we are & what's next

Phases 0–5 are ✅ done (Phase 4 fully met — see 4.7). Then:

1. **Phase 6** — position trades: entry + native Alpaca trailing stop (last execution piece).
2. **Phase 7** — integration (`bot.py`): wire scan → gates → risk → execute → log.
3. **Phase 8** — dashboard: observe / debug / tune the bot in the browser.
4. **Phase 9** learning → **Phase 10** paper → **Phase 11** live.

> **Restructure (2026-07-06):** dashboard added as a new phase; exit strategy switched to a native trailing stop. Integration moved ahead of the dashboard (a debug cockpit needs a runnable pipeline to show); learning moved after it, with its two log-writers pulled into integration. Old Phase 8→7, 7→9, 9→10, 10→11.

## 🛠️ Development Standards

Every function and module must follow the rules in `.agent_rules/README.md`:
- Type hints, docstring, `None` return on failure, `[module]` print style
- Terminal test via `python backend/<layer_folder>/<module>.py` (e.g. `backend/00_data/data_fetcher.py`)
- Companion Jupyter notebook: `<module>_playground.ipynb` in the same folder

---

## Phase 0 — 🔑 Prerequisites (Before Writing Any Code)

Everything the bot needs to function must be in place before Step 1.

- [x] Install Cursor IDE
- [x] Install Python 3.11+
- [x] Create Alpaca account + generate paper API keys — alpaca.markets (Free)
- [ ] Create Anthropic account + add credit + generate API key — console.anthropic.com (~$10)
- [x] Create Finnhub account + get free API key — finnhub.io (Free; used by Gate 1 + universe filter)
- [x] Create NewsAPI account + get free API key — newsapi.org (Free; fallback only after Alpaca News upgrade)

**Exit criteria:** All API keys saved locally. Cursor and Python confirmed working in terminal.

---

## Phase 1 — 📦 Project Setup

**Goal:** Create the folder structure, virtual environment, install all libraries, and store API keys safely.

- [x] Create project folder and subdirectory structure (`backend/`, `data/`, `logs/`)
- [x] Create and activate a Python virtual environment
- [x] Install all required libraries (`pip install ...`)
- [x] Create `.env` file with all API keys and risk parameters
- [x] Create `.gitignore` to ensure `.env` is never committed

**Exit criteria:** `(venv)` visible in terminal. All libraries installed without errors. `.env` populated.

---

## Phase 2 — 📊 Data Layer

**File:** `backend/00_data/data_fetcher.py`

**Goal:** Give the bot its eyes — working access to price data and news.

- [x] Build `get_stock_data(ticker, period, interval)` — downloads OHLCV data via yfinance (default: 60d daily)
- [x] Create `backend/00_data/data_fetcher_playground.ipynb` — notebook for manual exploration and verification
- [x] Build `get_news_headlines(ticker, days_back, max_results)` — fetches headlines + descriptions via NewsAPI
- [x] Test: run the file directly and confirm Apple price data and headlines print to terminal

**Exit criteria:** 60 rows of price data and at least 1 news headline returned for a test ticker.

---

## Phase 3 — 🔍 Stock Scanner (Two-Tier)

**Files:** `backend/01_scanner/universe_filter.py`, `backend/01_scanner/momentum_scanner.py`

**Goal:** Two-step scan — weekly S&P 500 → watchlist (~60–80), then nightly watchlist → top 10–15 momentum candidates.

**Tier 1 — Universe filter (weekly)**
- [x] Build `universe_filter.py` — queries TradingView screener (market cap > $100B + US filters)
- [x] Apply objective filters (volume, price band, ATR %, earnings window via Finnhub, dynamic price ceiling via Alpaca portfolio value)
- [x] Write output to `data/watchlist.csv`
- [x] Test: run the filter and confirm a watchlist of ~60–80 tickers is saved
- [x] Create `backend/01_scanner/universe_filter_playground.ipynb`

**Tier 2 — Momentum scan (nightly)**
- [x] Build `calculate_momentum_score()` — scores each stock 0–3 using RSI, SMA20, SMA50
- [x] Build `run_scan()` — reads `watchlist.csv`, returns top 10–15 candidates scoring 2 or higher; accepts `min_score` parameter (default 2)
- [x] Test: run the scanner against an existing watchlist and confirm ranked output
- [x] Create `backend/01_scanner/momentum_scanner_playground.ipynb`

**Exit criteria:** Universe filter produces a valid `watchlist.csv`. Momentum scanner returns a ranked shortlist from that watchlist.

> **Addendum (Phase 4.6 follow-on fix):** `run_scan()` originally dropped the `sector`
> column even though the watchlist has it — but Gates 1 and 4 both require
> `candidate['sector']`. Fixed by adding `sector` to `run_scan()`'s output columns, so
> callers no longer need a manual watchlist join to backfill it.

**→ Next:** Each momentum candidate passes into the Intelligence Layer (Phase 4) before reaching the risk gate.

---

## Phase 4 — 🧠 Intelligence Layer (5-Gate System)

**Root folder:** `backend/02_intelligence/`

**Goal:** Each momentum candidate passes through five gates in order. The pipeline stops at the first failure.

**LLM layer:** Use `pydantic-ai` for Gates 2–5 so Claude can be swapped later for GPT/Gemini without rewriting gate logic.

**Organisation rule:**
- **`gate*/gate.py`** — decision logic only (prompts, pass/block rules, parsers). One folder per gate.
- **`helpers/`** — shared functions, split into two sub-folders: `fetchers/` (external API calls) and `logic/` (pure calculations / rule functions). If two or more gates need the same function, it lives here — never duplicated inside a gate folder.
- **`backend/config.py`** — the strategy dial board: every tunable number (universe filter, momentum scanner, gate thresholds `BLOCK_THRESHOLDS`, EV coefficients, `TRADE_LEVEL_PARAMS`, position size). One place to tune the whole pipeline.
- **`constants.py`** — reference **maps** only (`SECTOR_ETF_MAP`, `SOURCE_RELIABILITY_TIERS`) used across multiple gates. Tunable dials moved to `config.py`.

**Reference docs:** `spec/info_source/6. Trading_Bot_Intelligence_Layer_v2.md`, `spec/info_source/7. Trading_Bot_Intelligence_Layer_Install_Guide.md`

**Build order:** Shared helpers (as needed) → Gate 1 → Gate 2 → Gate 3 → Gate 4 → Gate 5 → Pipeline → End-to-end test

### Folder layout

```
backend/config.py                    # strategy dial board — BLOCK_THRESHOLDS, TRADE_LEVEL_PARAMS, EV, sizing, etc.
backend/02_intelligence/
├── constants.py                     # reference maps only: SECTOR_ETF_MAP, SOURCE_RELIABILITY_TIERS
├── helpers/
│   ├── fetchers/                    # external API calls — shared across gates
│   │   ├── market.py                # VIX, SPY, sector ETF snapshots; get_market_context() → Gate 1, Gate 4
│   │   ├── calendars.py             # macro events, per-ticker earnings     → Gate 1, Gate 4
│   │   ├── premarket.py             # pre-market gap                        → Gate 1
│   │   ├── filings.py               # SEC EDGAR 8-K                         → Gate 1
│   │   └── news.py                  # fetch, classify, format headlines     → Gate 2, Gate 3, Pipeline
│   ├── logic/                       # pure calculations / rule functions — no external calls
│   │   ├── portfolio.py             # daily loss limit check                → Gate 1
│   │   ├── sentiment_rules.py       # apply_pass_rules                      → Gate 3
│   │   ├── ev_rules.py              # apply_edge_rules                      → Gate 5
│   │   └── trade_levels.py          # stop/target + gate summary            → Gate 5
│   └── llm/
│       └── client.py                # build_agent / run_agent (pydantic-ai) → Gate 2, Gate 3, Gate 4
├── pipeline/
│   ├── run_pipeline.py
│   └── run_pipeline_playground.ipynb
├── gate1_hard_threat/
│   ├── gate.py                      # imports helpers/fetchers: market, calendars, premarket, filings; helpers/logic: portfolio
│   └── gate1_playground.ipynb
├── gate2_news_threat/
│   ├── gate.py                      # imports helpers/fetchers/news
│   └── gate2_playground.ipynb
├── gate3_sentiment/
│   ├── gate.py                      # imports helpers/fetchers/news, helpers/logic/sentiment_rules
│   └── gate3_playground.ipynb
├── gate4_contradiction/
│   ├── gate.py                      # imports helpers/fetchers/market (get_market_context)
│   └── gate4_playground.ipynb
└── gate5_signal/
    ├── gate.py                      # imports helpers/logic/trade_levels
    └── gate5_playground.ipynb
```

### Shared helpers — full specification

Each helper returns `None` on failure. Gates decide how to handle missing data (skip check vs block).

#### `constants.py` (maps — not functions) & `config.py` (dials)

| Constant | Lives in | Input (lookup key) | Process | Output | Used by |
|----------|----------|-------------------|---------|--------|---------|
| `SECTOR_ETF_MAP` | `constants.py` | sector name, e.g. `"Technology"` | Static map GICS sector → ETF ticker | `"XLK"` | `get_sector_etf_snapshot`, Gate 1, Gate 4 |
| `SOURCE_RELIABILITY_TIERS` | `constants.py` | source name pattern | Static map publisher → tier | pattern list per tier | `classify_source`, Gates 2, 3 |
| `BLOCK_THRESHOLDS` | `config.py` | threshold name, e.g. `"vix_level"` | Static numeric limits for Gate 1 rules | `30.0`, `-0.015`, etc. | Gate 1 `screen_gate1_hard_threats()` |
| `TRADE_LEVEL_PARAMS` | `config.py` | param name, e.g. `"atr_stop_multiplier"` | Stop/target geometry | `1.5`, `2.0` | Gate 5 `build_trade_levels()` |

---

#### `helpers/fetchers/market.py`

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `get_vix_snapshot()` | — | Fetch `^VIX` via yfinance (today + prior close). Compute absolute level and intraday % change. | `{level: float, change_pct_today: float, prior_close: float}` \| `None` | → Gate 1 `run()` (block rules); → `get_market_context()` (Gate 4 prompt) |
| `get_spy_snapshot()` | — | Fetch `SPY` via yfinance. Compute today's % change vs prior close. | `{price: float, change_pct_today: float, prior_close: float}` \| `None` | → Gate 1 `run()`; → `get_market_context()` |
| `get_sector_etf_snapshot(sector)` | `sector: str` | Look up ETF in `SECTOR_ETF_MAP`. Fetch ETF price via yfinance. Compute today's % change. | `{etf_ticker: str, price: float, change_pct_today: float, prior_close: float}` \| `None` | → Gate 1 `run()` (uses candidate's sector); → `get_market_context()` |

---

#### `helpers/fetchers/calendars.py`

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `get_upcoming_macro_events(hours_ahead=24)` | `hours_ahead: int` | Call the free FairEconomy/ForexFactory feed (no key; disk-cached). Keep US `impact == 'High'` events within window — trust the source's curated flag, no keyword whitelist. | `[{event, country, time, impact}]` \| `None` | → Gate 1 `run()` (block if any in window); → `get_hours_to_next_macro_event()` |
| `get_ticker_earnings_window(ticker, days_ahead=1)` | `ticker: str`, `days_ahead: int` | Call Finnhub earnings calendar for this ticker. Check if report date is today or tomorrow. | `{reports_today: bool, reports_tomorrow: bool, report_date, hour}` \| `None` | → Gate 1 `run()` only |
| `get_hours_to_next_macro_event()` | — | Call `get_upcoming_macro_events()`. Return hours until the nearest high-impact US event. | `float` (hours) \| `None` | → `get_market_context()` → Gate 4 prompt |

---

#### `helpers/fetchers/premarket.py`

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `get_premarket_gap(ticker)` | `ticker: str` | Fetch prior close and pre-market price via yfinance (`prepost=True`). Compute signed gap %. No API key required. | `{gap_pct: float, prior_close: float, premarket_price: float, direction: 'up'\|'down'\|'flat'}` \| `None` | → Gate 1 `run()` only |

---

#### `helpers/fetchers/filings.py`

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `get_recent_8k_filings(ticker, days_back=1)` | `ticker: str`, `days_back: int` | Parse SEC EDGAR RSS feed (feedparser). Filter entries for ticker + form type 8-K within date window. | `[{form_type, filed_at, title, url}]` \| `None` | → Gate 1 `run()` (block if filing today) |

---

#### `helpers/logic/portfolio.py`

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `check_daily_loss_limit(portfolio_value, daily_pnl, limit_pct=0.03)` | `portfolio_value: float`, `daily_pnl: float`, `limit_pct: float` | Compute `loss_pct = daily_pnl / portfolio_value`. Compare against limit. No external API. | `{breached: bool, loss_pct: float}` | → Gate 1 `run()` only (receives values from pipeline / Alpaca) |

---

#### `helpers/fetchers/news.py`

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `classify_source(source_name)` | `source_name: str` | Match source name against `SOURCE_RELIABILITY_TIERS`. | `'HIGH'` \| `'MEDIUM'` \| `'LOW'` \| `'DANGEROUS'` | → called inside `fetch_news()`; tags used by Gates 2, 3 prompts |
| `fetch_news(ticker, days_back=2, max_results=5, include_summary=True)` | `ticker: str`, optional window/limit/summary | 1) Alpaca News API. 2) If empty, Finnhub. 3) If still empty, NewsAPI. Run `classify_source()` on each item. | `[{headline, source, reliability, url, published_at, summary}]` \| `None` | → Pipeline calls once; result passed to Gate 2 `run()` and Gate 3 `run()` |
| `format_news_for_prompt(headlines)` | `headlines: list[dict]` | Format each item as `{headline} [Source: X] [Reliability: Y]`. Join into multi-line string. No API. | `str` | → Gate 2 `run()` (Claude prompt); → Gate 3 `run()` (Claude prompt) |

---

#### `helpers/fetchers/market.py` — `get_market_context(sector)`

> Lives in `market.py` alongside the other market helpers. Composes existing functions — no fetch logic of its own.

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `get_market_context(sector)` | `sector: str` | Compose: `get_vix_snapshot()` + `get_spy_snapshot()` + `get_sector_etf_snapshot(sector)` + `get_hours_to_next_macro_event()`. | `{vix: dict, spy: dict, sector: dict, hours_to_next_macro: float}` \| `None` | → Gate 4 `run()` only |

---

#### `helpers/logic/sentiment_rules.py`

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `apply_pass_rules(direction, confidence)` | Claude parsed fields: `direction`, `confidence` (0–10) | Apply static rules: BEARISH → block; NEUTRAL + conf < 6 → block; NEUTRAL + conf ≥ 6 → caution (−25% size); BULLISH + conf < 6 → caution; BULLISH + conf ≥ 6 → pass. Confidence is the single quality knob (Claude folds source reliability into it). No API. | `{passed: bool, caution: bool, size_reduction_pct: int}` | → Gate 3 `evaluate_gate3_sentiment()` (after Claude response parsed); caution flag → Gate 5 / risk gate downstream |

---

#### `helpers/logic/ev_rules.py`

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `apply_edge_rules(score, direction, confidence, caution, reward_risk, min_edge_pct)` | Gate 3 parsed fields + momentum `score` + `reward_risk` from trade levels | Map score/confidence/caution to win probability; compute `EV = (p × R) − (1 − p)`; pass when EV ≥ min edge. Plain scalars in — no gate dicts. No API. | `{win_probability, expected_value, edge, passed, position_confidence}` | → Gate 5 `decide_gate5_signal()` (after trade levels built) |

---

#### `helpers/logic/trade_levels.py`

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `build_trade_levels(candidate)` | `candidate: dict` with `price`, `atr` | Compute stop/target using `TRADE_LEVEL_PARAMS` from `config.py`. Pure math. | `{entry, atr, stop, target, stop_pct, target_pct, reward_risk}` | → Gate 5 `decide_gate5_signal()` |
| `build_gate_summary(gate_results)` | `gate_results: dict` with gate1–4 outputs | Format each prior gate result into readable summary string for audit logging. No API. | `str` | → Gate 5 output + pipeline logger |

---

### Data flow between gates

```
shared = get_shared_market_data()   ← called ONCE before the candidate loop
        │
        ▼ (for each candidate)
┌─ screen_gate1_hard_threats(candidate, shared, ...) ──► fetchers: market, calendars, premarket, filings  +  logic: portfolio
│       │ passed?
│       ▼
│   fetch_news()  ◄── helpers/fetchers/news (called by Pipeline, not Gate 2)
│       │
├─ assess_gate2_news_threat(candidate, headlines) ──► fetchers/news.format ──► Claude threat check
│       │ passed?
│       ▼
├─ evaluate_gate3_sentiment(candidate, headlines) ──► fetchers/news.format + logic/sentiment_rules ──► Claude sentiment
│       │ passed?
│       ▼
├─ detect_gate4_contradiction(candidate, gate3_result) ──► fetchers/market.get_market_context ──► Claude contradiction
│       │ passed? (not FLAG_FOR_REVIEW)
│       ▼
└─ decide_gate5_signal(candidate, all gate_results) ──► logic/trade_levels + logic/ev_rules ──► BUY | SKIP
```

**Convention:** Build a helper module **before** the first gate that needs it. Gates never call external APIs directly.

---

### 4.1 — Gate 1: Hard Threat Screen

**Folder:** `backend/02_intelligence/gate1_hard_threat/`  
**Claude:** No — rules only, zero API cost  
**Runs:** First — before any Claude call

#### Gate functions

`get_shared_market_data()` — call once per batch run; returns shared VIX/SPY/macro dict.  
`screen_gate1_hard_threats(candidate, shared, portfolio_value, daily_pnl)` — call once per candidate.

| | |
|---|---|
| **Input** | `candidate: dict` from momentum scanner (keys: `ticker`, `sector`, …); `shared` from `get_shared_market_data()`; `portfolio_value` and `daily_pnl` from Alpaca |
| **Process** | 1) Unpack shared data + fetch per-ticker data. 2) Evaluate 8 block rules in priority order using `BLOCK_THRESHOLDS` (first match wins). 3) No Claude call. |
| **Output** | `{passed: bool, block_reason: str\|None, checks: dict}` — full raw values in `checks` for audit |
| **Connects from** | Pipeline / momentum scanner (candidate dict); Alpaca executor (portfolio state) |
| **Connects to** | If `passed` → Pipeline continues to `fetch_news()` then Gate 2. If blocked → Pipeline stops, `final_decision = BLOCKED_G1` |

#### Helpers consumed by this gate

| Helper | Role in this gate |
|--------|-------------------|
| `get_vix_snapshot()` | Shared (pre-fetched); block if level ≥ 30 |
| `get_spy_snapshot()` | Shared (pre-fetched); block if down > 1.5% |
| `get_sector_etf_snapshot(sector)` | Per-ticker; block if sector ETF down > 2% |
| `get_premarket_gap(ticker)` | Per-ticker; block if \|gap\| ≥ 3% |
| `get_hours_to_next_macro_event()` | Shared (pre-fetched); block if event within 2 hours |
| `get_ticker_earnings_window(ticker)` | Per-ticker; block if reports today or tomorrow bmo |
| `get_recent_8k_filings(ticker)` | Per-ticker; block if any 8-K in last 24h |
| `check_daily_loss_limit(...)` | Pure math; block if daily loss ≥ 3% |

> Full Input / Process / Output for each helper → see **Shared helpers — full specification** above.

#### Install (build helpers before `gate.py`)

| Package | Why | Helper file |
|---------|-----|-------------|
| `yfinance` | VIX, SPY, sector ETF, pre-market bars | `helpers/fetchers/market.py`, `helpers/fetchers/premarket.py` |
| `feedparser` | SEC EDGAR 8-K RSS feed | `helpers/fetchers/filings.py` |
| `requests` | Earnings calendar (Finnhub REST) + economic calendar (free ForexFactory feed) | `helpers/fetchers/calendars.py` |

**`.env` keys:** `FINNHUB_API_KEY`

#### Tasks

- [x] Create `constants.py` + `helpers/fetchers/` + `helpers/logic/` folders
- [x] Build `helpers/fetchers/market.py` — `get_vix_snapshot`, `get_spy_snapshot`, `get_sector_etf_snapshot` ✅ · `get_market_context` ✅
- [x] Build `helpers/fetchers/calendars.py` — `get_upcoming_macro_events`, `get_hours_to_next_macro_event` ✅ · `get_ticker_earnings_window` ✅
- [x] Build `helpers/fetchers/premarket.py` — `get_premarket_gap` ✅
- [x] Build `helpers/fetchers/filings.py` — `get_recent_8k_filings` ✅
- [x] Build `helpers/logic/portfolio.py` — `check_daily_loss_limit` ✅
- [x] Build `get_shared_market_data()` + `screen_gate1_hard_threats()` in `gate1_hard_threat/gate.py` ✅
- [x] Test gate: `python backend/02_intelligence/gate1_hard_threat/gate.py` ✅
- [x] Create `gate1_playground.ipynb` ✅

**Exit criteria:** Gate 1 returns pass/block with full `checks` dict. Runs in milliseconds. Zero Claude cost.

---

### 4.2 — Gate 2: News Threat Assessment

**Folder:** `backend/02_intelligence/gate2_news_threat/`  
**Claude:** Yes — call 1 of 4  
**Runs:** After Gate 1 passes

#### Gate function: `assess_gate2_news_threat(candidate, headlines)`

| | |
|---|---|
| **Input** | `candidate: dict` from momentum scanner; `headlines` list from Pipeline (`fetch_news()` — **not fetched inside gate during pipeline run**) |
| **Process** | 1) If standalone test with no headlines → call `fetch_news(ticker)`. 2) If empty headlines → pass with caution (no threat). 3) `format_news_for_prompt(headlines)`. 4) Claude prompt: catastrophic threats only. 5) Parse `THREAT_DETECTED`, `THREAT_CATEGORIES`, `REASON`. |
| **Output** | `{passed: bool, threat_detected: bool, threat_categories: list[str], reason: str, headlines_used: int}` — `threat_categories` is a list because more than one category can fire at once (corrected from an earlier singular `threat_type` in this doc — see implementation in `news_threat_gate2.py`). |
| **Connects from** | Pipeline (after Gate 1 pass) + `helpers/fetchers/news.fetch_news()` |
| **Connects to** | If `passed` → Gate 3 receives **same headlines list**. If blocked → `final_decision = BLOCKED_G2` |

#### Helpers consumed by this gate

| Helper | Role in this gate |
|--------|-------------------|
| `fetch_news(ticker)` | Called by Pipeline before this gate; Gate 2 receives result as input (standalone test may call directly) |
| `format_news_for_prompt(headlines)` | Builds Claude prompt body with reliability tags |
| `classify_source()` | Used inside `fetch_news()` — not called directly by gate |

> Full Input / Process / Output → see **Shared helpers — full specification**.

#### Install (build helpers before `gate.py`)

| Package | Why | Helper file |
|---------|-----|-------------|
| `alpaca-py` | Primary news source (Benzinga, real-time) | `helpers/fetchers/news.py` |
| `requests` | Supplementary company news (Finnhub REST) | `helpers/fetchers/news.py` |
| `newsapi-python` | Fallback when Alpaca returns empty | `helpers/fetchers/news.py` |
| `pydantic-ai` | Provider-flexible LLM threat detection | `gate.py` only |

**`.env` keys:** `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`, `FINNHUB_API_KEY`, `NEWS_API_KEY`, `ANTHROPIC_API_KEY`

#### Tasks

- [x] Build `helpers/fetchers/news.py`✅
  - [x] Add `classify_source(source_name)` using `SOURCE_RELIABILITY_TIERS` with deterministic fallback (`LOW` if no match)✅
  - [x] Add `fetch_news(ticker, days_back=2, max_results=5)` with source priority: Alpaca primary → Finnhub supplement → NewsAPI fallback ✅
  - [x] In `fetch_news()`, normalize each item to a shared schema: `{headline, source, reliability, url, published_at, summary}`✅
  - [x] Cap output to `max_results` via each API's limit param✅
  - [x] Add `format_news_for_prompt(headlines)` to output a stable multiline prompt block with source + reliability tags ✅
- [x] Build shared LLM standard `helpers/llm/client.py` — `build_agent` + `run_agent` (pydantic-ai; cheap Haiku default, per-gate overridable; loop-aware for notebooks) ✅
- [x] Build `assess_gate2_news_threat(candidate, headlines=None)` in `gate2_news_threat/gate.py` ✅
- [x] Test helpers: `python backend/02_intelligence/helpers/fetchers/news.py`✅
- [x] Test gate with mock headlines: no threat → PASS; fraud headline → BLOCK ✅
- [x] Test: `python backend/02_intelligence/gate2_news_threat/gate.py` ✅
- [x] Create `gate2_playground.ipynb` ✅

**Exit criteria:** Binary threat result. YES blocks immediately. Headlines carry reliability tags.

> **Addendum (Phase 4.6 follow-on fix):** `company_name` was removed from this gate — it
> was an optional field with a `.get('company_name', ticker)` fallback that had no real
> data source and always resolved to the ticker anyway. Only `ticker` matters for the
> Claude prompt and the trading decision, so the parameter, fallback, and docstring
> mention were deleted outright rather than kept as dead-weight optionality.

---

### 4.3 — Gate 3: Sentiment Quality Check

**Folder:** `backend/02_intelligence/gate3_sentiment/`  
**Claude:** Yes — call 2 of 4  
**Runs:** After Gate 2 passes

#### Gate function: `evaluate_gate3_sentiment(candidate, headlines)`

| | |
|---|---|
| **Input** | `candidate: dict`; same `headlines` list Gate 2 received — Pipeline passes through, **no re-fetch** |
| **Process** | 1) `format_news_for_prompt(headlines)`. 2) Claude prompt: sentiment direction + confidence (different question from Gate 2). 3) Parse `DIRECTION`, `CONFIDENCE`, `KEY_REASON`. 4) `apply_pass_rules()` on parsed values. |
| **Output** | `{passed: bool, direction: str, confidence: int, key_reason: str, caution: bool, size_reduction_pct: int}` |
| **Connects from** | Pipeline (same headlines from `fetch_news()`); Gate 2 must have passed |
| **Connects to** | If `passed` → Gate 4 receives `gate3_result`. `caution` / `size_reduction_pct` → Gate 5 and risk gate downstream. If blocked → `final_decision = BLOCKED_G3` |

#### Helpers consumed by this gate

| Helper | Role in this gate |
|--------|-------------------|
| `format_news_for_prompt(headlines)` | Builds Claude prompt (reliability tags already on headline dicts from fetch) |
| `apply_pass_rules(direction, confidence)` | Converts Claude response → pass/block/caution decision |

> Full Input / Process / Output → see **Shared helpers — full specification**.

#### Install (build helpers before `gate.py`)

| Package | Why | Helper file |
|---------|-----|-------------|
| `pydantic-ai` | Provider-flexible LLM sentiment assessment | `gate.py` only |

**`.env` keys:** `ANTHROPIC_API_KEY`

> No new data packages — headlines come from `helpers/fetchers/news.py` (built for Gate 2).

#### Tasks

- [x] Build `helpers/logic/sentiment_rules.py` — `apply_pass_rules` ✅
- [x] Build `evaluate_gate3_sentiment(candidate, headlines)` in `gate3_sentiment/sentiment_gate3.py` ✅
- [x] Test: bullish headlines → PASS; bearish → BLOCK ✅
- [x] Test: `python backend/02_intelligence/gate3_sentiment/sentiment_gate3.py` ✅
- [x] Create `gate3_playground.ipynb` ✅

**Exit criteria:** Sentiment direction, confidence, and pass/block with caution flag returned.

> **Addendum (Phase 4.6 follow-on fix):** `company_name` was removed from this gate too,
> same reasoning as Gate 2's addendum above.

---

### 4.4 — Gate 4: Contradiction Detection

**Folder:** `backend/02_intelligence/gate4_contradiction/`  
**Claude:** Yes — call 3 of 4  
**Runs:** After Gate 3 passes

#### Gate function: `detect_gate4_contradiction(candidate, gate3_result)`

| | |
|---|---|
| **Input** | `candidate` dict from momentum scanner (score, rsi, volume_ratio, sector, price, atr); `gate3_result` from Gate 3 (direction, confidence, source_reliability) |
| **Process** | 1) `get_market_context(candidate['sector'])` → market snapshot. 2) Build prompt: bullish signals on one side, market context on the other. 3) Claude: "Does anything contradict?" 4) Parse `CONTRADICTION_DETECTED`, `CONTRADICTION_TYPE`, `RISK_LEVEL`, `REASON`. 5) HIGH → block; MEDIUM/LOW → flag for review. |
| **Output** | `{passed: bool, contradiction_detected: bool, contradiction_type: str, risk_level: str, reason: str, action: 'PASS'\|'BLOCK'\|'FLAG_FOR_REVIEW', market_context: dict}` |
| **Connects from** | Gate 3 result + momentum candidate; `get_market_context()` composes Gate 1 market/calendar helpers |
| **Connects to** | If `action == PASS` → Gate 5. If `FLAG_FOR_REVIEW` → `final_decision = FLAGGED_FOR_REVIEW`. If blocked → `final_decision = BLOCKED_G4` |

#### Helpers consumed by this gate

| Helper | Role in this gate |
|--------|-------------------|
| `get_market_context(sector)` | Single call bundles VIX, SPY, sector ETF, macro timing for Claude prompt |
| *(via market_context)* `get_vix_snapshot()` | Composed — not called directly by gate |
| *(via market_context)* `get_spy_snapshot()` | Composed — not called directly by gate |
| *(via market_context)* `get_sector_etf_snapshot(sector)` | Composed — not called directly by gate |
| *(via market_context)* `get_hours_to_next_macro_event()` | Composed — not called directly by gate |

> Full Input / Process / Output → see **Shared helpers — full specification**.

#### Install (build helpers before `gate.py`)

| Package | Why | Helper file |
|---------|-----|-------------|
| `yfinance` | Composed inside `get_market_context` | `helpers/fetchers/market.py` |
| `requests` | Macro timing (via `calendars.py` → free ForexFactory feed) | `helpers/fetchers/market.py` |
| `pydantic-ai` | Provider-flexible LLM contradiction analysis | `gate.py` only |

**`.env` keys:** `FINNHUB_API_KEY`, `ANTHROPIC_API_KEY`

> Requires Gate 1 helpers already built — `helpers/fetchers/market.py` composes `get_market_context` from market + calendars fetchers.

#### Tasks

- [x] Build `get_market_context(sector)` in `helpers/fetchers/market.py` — already built (composes the four snapshots) ✅
- [x] Build `detect_gate4_contradiction(candidate, gate3_result, market_context)` in `gate4_contradiction/contradiction_gate4.py` ✅
- [x] Test: calm market → PASS; gray-zone risk-off / divergence → FLAG or BLOCK ✅
- [x] Test: `python backend/02_intelligence/gate4_contradiction/contradiction_gate4.py` ✅
- [x] Create `gate4_playground.ipynb` ✅

> **Lean build (deviation from the spec above):** Gate 4 was built focused on only the two
> contradictions Gate 1 **cannot** already catch — `DIVERGENCE` (stock vs market) and
> `BROAD_RISK_OFF` (sub-threshold accumulation) — dropping `MACRO/SECTOR/TIMING`, which just
> re-check Gate 1's hard thresholds. The gate **fetches nothing**: the caller passes
> `market_context` in (the pipeline reuses Gate 1's already-fetched VIX/SPY/macro + sector ETF),
> and stock technicals are kept out of the prompt. One cheap Haiku call, no redundant API hits.

**Exit criteria:** Correctly returns PASS, FLAG_FOR_REVIEW, or BLOCK based on risk level.

---

### 4.5 — Gate 5: Edge Check + EV (rules only)

**Folder:** `backend/02_intelligence/gate5_signal/`  
**Claude:** No — rules only, zero API cost  
**Runs:** After Gate 4 passes (not flagged)

#### Gate function: `decide_gate5_signal(candidate, gate_results)`

| | |
|---|---|
| **Input** | `candidate` from momentum scanner (`price`, `atr`, `score`, etc.); `gate_results` dict with outputs from Gates 1–4 |
| **Process** | 1) Validate Gate 3 passed + price/ATR present. 2) `build_trade_levels(candidate)` → stop, target, reward:risk. 3) `apply_edge_rules(...)` on Gate 3 fields + momentum score. 4) BUY if EV ≥ `MIN_EDGE_PCT`, else SKIP. 5) `build_gate_summary(gate_results)` for audit. No Claude call. |
| **Output** | `{passed: bool, decision: 'BUY'\|'SKIP', win_probability: float, expected_value: float, edge: float, position_confidence: str, reason: str, trade_levels: dict, gate_summary: str}` |
| **Connects from** | All prior gate results + momentum candidate |
| **Connects to** | If `decision == BUY` → Phase 5 risk gate (`validate_trade()`). If SKIP → `final_decision = SKIP` |

#### Helpers consumed by this gate

| Helper | Role in this gate |
|--------|-------------------|
| `build_trade_levels(candidate)` | Computes entry/stop/target using `TRADE_LEVEL_PARAMS` (from `config.py`) |
| `apply_edge_rules(...)` | Maps Gate 3 + momentum to win probability and EV verdict |
| `build_gate_summary(gate_results)` | Formats Gate 1–4 audit for logging |

> Full Input / Process / Output → see **Shared helpers — full specification**.

#### Install (build helpers before `signal_gate5.py`)

No new packages.

**Config dials (`config.py`):** `MIN_EDGE_PCT` (default 0.04), `TRADE_LEVEL_PARAMS`, EV coefficients. No `.env` keys.

#### Tasks

- [x] Build `helpers/logic/ev_rules.py` — `apply_edge_rules` ✅
- [x] Build `helpers/logic/trade_levels.py` — `build_trade_levels`, `build_gate_summary` ✅
- [x] Build `decide_gate5_signal()` in `gate5_signal/signal_gate5.py` ✅
- [x] Test: strong mock signals → BUY; weak → SKIP ✅
- [x] Test: `python backend/02_intelligence/gate5_signal/signal_gate5.py` ✅
- [x] Create `gate5_playground.ipynb` ✅
- [x] Create `helpers/logic/trade_levels_playground.ipynb` ✅

> **Lean build (deviation from original spec):** Gate 5 was redesigned as a **rules-only edge check**
> instead of a fourth Claude call. Gates 2–4 already structured the qualitative assessment; asking
> Claude to re-synthesize everything for win probability added cost and variance without a new
> question. Win probability is mapped transparently from momentum score + Gate 3 confidence/caution;
> EV and the 4% threshold are pure math. Coefficients in `ev_rules.py` are tunable from paper-
> trading data during weekly review.

**Exit criteria:** Returns BUY or SKIP with win probability, EV, and trade levels. EV below 4% always SKIPs.

---

### 4.6 — Pipeline Orchestrator

**Folder:** `backend/02_intelligence/pipeline/`  
**Claude:** No — wiring only

#### Orchestrator function: `run_pipeline(candidate, portfolio_value, daily_pnl)`

| | |
|---|---|
| **Input** | Full momentum `candidate` dict; live `portfolio_value` and `daily_pnl` from Alpaca |
| **Process** | 1) Gate 1 `run()`. 2) If pass → `fetch_news(ticker)` once. 3) Gate 2 `run(headlines)`. 4) Gate 3 `run(same headlines)`. 5) Gate 4 `run(candidate, gate3_result)`. 6) Gate 5 `run(candidate, all gate_results)`. Stop on first failure. |
| **Output** | `{ticker, gates: {gate1…gate5}, final_decision}` — `final_decision` is `BUY`, `SKIP`, `BLOCKED_G1`…`BLOCKED_G4`, or `FLAGGED_FOR_REVIEW` |
| **Connects from** | Momentum scanner (`run_scan()`); Alpaca account state |
| **Connects to** | Phase 5 risk gate if `final_decision == BUY`; Phase 7 logger for full audit |

#### Helpers consumed by pipeline

| Helper / module | Role |
|-----------------|------|
| `gate1.get_shared_market_data()` | Called once before the candidate loop; result passed to every Gate 1 call |
| `helpers/fetchers/news.fetch_news()` | Called once between Gate 1 and Gate 2; result shared with Gate 3 |
| `gate1_hard_threat.gate.screen_gate1_hard_threats()` | Step 1 |
| `gate2_news_threat.gate.assess_gate2_news_threat()` | Step 3 |
| `gate3_sentiment.gate.evaluate_gate3_sentiment()` | Step 4 |
| `gate4_contradiction.gate.detect_gate4_contradiction()` | Step 5 |
| `gate5_signal.gate.decide_gate5_signal()` | Step 6 |

#### Install

No new packages.

#### Input

```python
candidate = {
  "ticker": "NVDA",
  "sector": "Technology",
  "score": 3,
  "rsi": 64.2,
  "volume_ratio": 2.4,
  "price": 875.50,
  "atr": 12.30,
}
portfolio_value = 10000.0
daily_pnl = 0.0
```

> `company_name` was removed from the candidate schema — only `ticker` matters for the
> gates' Claude prompts and trading logic (see addendum notes near Phase 3 and Phase 4.2/4.3).

#### Tasks

- [x] Build `run_pipeline()` in `pipeline/run_pipeline.py` ✅
- [x] Wire imports from all five gate folders ✅
- [x] Smoke test: `python backend/02_intelligence/pipeline/run_pipeline.py` ✅
- [x] Create `run_pipeline_playground.ipynb` ✅

> **Note:** `run_pipeline()` takes an optional 4th param `shared: dict | None = None` beyond
> the 3-arg signature originally sketched above — a pre-fetched `get_shared_market_data()`
> result, so a future batch caller (Phase 8 `bot.py`) can fetch VIX/SPY/macro once per night
> instead of once per candidate. Defaults to `None` (fetches internally), so the function
> still works standalone. Also: a gate4 result is only present in `gates` when Gate 4 actually
> ran — if `get_market_context()` fails entirely, the pipeline returns `BLOCKED_G4` with no
> `gates['gate4']` entry (block rather than trade blind, matching the LLM-unavailable policy
> already used in Gates 2–4).

**Exit criteria:** Single entry point for the rest of the bot. Full audit trail on every candidate.

---

### 4.7 — End-to-end intelligence test

- [x] Run real candidates through the full gate sequence with live portfolio state — done live in `backend/full_pipeline_playground.ipynb`
- [x] Confirm gate audit output for both PASS and BLOCK cases — verified (BNY: pass G1/G2, block G3 on low confidence; APH: block G1 on sector)
- [x] Verify Claude API cost stays within budget (≤ ~3 Claude calls × candidates; Gate 5 rules-only)

> **Verified via** `full_pipeline_playground.ipynb` — an executed live run of the whole funnel (74 universe → 15 scanned → 10 processed → 2 BUY → 2 risk-approved) with real PASS/BLOCK audits and sized trades. It **inlines** the orchestration rather than calling `run_pipeline()`, so the behaviour is proven; the thin `run_pipeline()` wrapper itself is first exercised in Phase 7 (`bot.py` calls it directly). `run_pipeline_playground.ipynb` also has cells to push live `run_scan()` candidates through `run_pipeline()` directly if you want the wrapper proven inside a notebook first.

**Phase 4 exit criteria:** ✅ Met — the intelligence layer runs end-to-end on real momentum candidates; only `final_decision == "BUY"` proceeds to the risk gate.

**⚠️ Important:** Claude is never asked one big question. Each gate asks one focused question with a structured answer. Hedging is not acceptable.

---

## Phase 5 — 🛡️ Risk Gate

**File:** `backend/03_risk/risk_gate.py`

**Goal:** Build the bouncer. Every trade must pass all checks or it does not happen. Runs **after** the intelligence layer returns `BUY`.

> **Slimmed scope (deviation from the original spec above the line, kept here for history):**
> the original Phase 5 spec was written before Gate 1 and Gate 5 got their lean-build
> redesigns (see their addendums earlier in this doc). It's now largely redundant with
> what those gates already compute:
> - **Daily loss limit** — already enforced in Gate 1 via `check_daily_loss_limit()`.
>   Reused here (not reimplemented) with fresh, execution-time `daily_pnl`.
> - **Reward:risk ≥ 2:1** — already computed by Gate 5's `build_trade_levels()` and is
>   guaranteed by construction (`atr_stop_multiplier=1.5`, `target_rr_multiple=2.0`).
>   Reused as a final guard, not recomputed.
> - **Edge above minimum threshold** — already gated by Gate 5's `apply_edge_rules()`
>   against `MIN_EDGE_PCT`. Reused via `signal['decision'] == 'BUY'`, not recomputed.
> - **`calculate_stops(signal)`** — dropped entirely. Stop/target math lives in one place
>   (`trade_levels.py`); this gate reads `signal['trade_levels']`, it doesn't reimplement it.
>
> What's genuinely net-new and actually built: **Quarter-Kelly position sizing**, the
> **open-positions-count check**, and the **drawdown kill switch**. `validate_trade()`
> needed live open-position count, portfolio value, and daily P&L from Alpaca — nothing
> fetched that yet (nominally Phase 6's job) — so `get_portfolio_value()`,
> `get_open_positions()`, `get_daily_pnl()`, and `get_drawdown_pct()` were pulled forward
> into `backend/04_execution/alpaca_executor.py` now. Phase 6 below is scoped down
> accordingly — see its note.

- [x] Build `calculate_position_size(signal, portfolio_value)` — Quarter-Kelly formula (`KELLY_FRACTION` × full Kelly), capped at `MAX_POSITION_SIZE_PCT`
- [x] Build `validate_trade(ticker, signal, portfolio_value, daily_pnl, open_positions_count, drawdown_pct)` — runs five checks, returns full audit `checks` dict:
  - [x] Edge above minimum threshold (reused from Gate 5's `signal['decision']`)
  - [x] Open positions below `MAX_OPEN_POSITIONS` (new)
  - [x] Daily loss limit not hit (reused from Gate 1's `check_daily_loss_limit()`)
  - [x] Drawdown kill switch not triggered against `MAX_DRAWDOWN_PCT` (new)
  - [x] Reward-to-risk ratio ≥ `MIN_REWARD_RISK` (reused from Gate 5's `trade_levels`)
- [x] Test: `python backend/03_risk/risk_gate.py` — mock Gate 5 BUY signal, happy path + one failure path per check
- [x] Create `backend/03_risk/risk_gate_playground.ipynb`
- [x] End-to-end test against the live paper account (real `portfolio_value`/`open_positions`/`daily_pnl`/`drawdown_pct` from `alpaca_executor.py` through `validate_trade()`) — approved trade with correct share count

**Exit criteria:** Risk gate correctly approves valid trades and rejects trades that fail any single check. ✅ Met.

**⚠️ Important:** Never modify the risk gate to allow trades that fail its checks. The whole point is that it is non-negotiable.

---

## Phase 6 — ⚡ Execution Layer

**File:** `backend/04_execution/alpaca_executor.py`

**Goal:** Position a trade — place the entry and a broker-side exit that protects it. The last execution piece before the bot can trade.

**Exit strategy — native trailing stop** (decision pulled forward from [iteration-02-ideas.md](iteration-02-ideas.md)): Alpaca can't pair a trailing stop with a fixed take-profit in one bracket, so execution is **two orders** — entry, then a standalone `trailing_stop` (`trail_percent` from config). Alpaca ratchets the stop broker-side, so there is **no monitoring loop** to build. `target` / `reward_risk` from `trade_levels.py` stay for EV/sizing only.

> Already built (pulled forward into Phase 5): `get_portfolio_value()`, `get_open_positions()`, `get_daily_pnl()`, `get_drawdown_pct()`. Only order placement remains.

- [ ] Add `TRAIL_PERCENT` dial to `config.py` (e.g. 1.5)
- [ ] Build `position_trade(trade_details)` — place entry (share count from risk gate), confirm fill, attach a standalone `trailing_stop`; return an order audit
- [ ] Test: place a paper entry + trailing stop on one ticker; confirm both orders appear in the Alpaca paper dashboard
- [x] Create `backend/04_execution/alpaca_executor_playground.ipynb`

**Exit criteria:** The bot positions a real paper trade — entry filled, trailing stop attached — returning a full order audit. No monitoring loop.

---

## Phase 7 — 🔗 Full Pipeline Integration

**File:** `backend/bot.py`

**Goal:** Wire every module into one runnable pipeline — Scan → 5 Gates → Risk Gate → Execute → Log — so the bot runs end-to-end headless. This is the substrate the Phase 8 dashboard triggers and observes.

> **Moved ahead of the dashboard** (was Phase 8): a debug cockpit needs a runnable, logged pipeline to show. The two log *writers* are pulled forward here from Phase 9 for the same reason; learning *analytics* stay in Phase 9.

- [ ] Smoke-test `run_pipeline()` directly once (the wrapper `bot.py` calls) — its behaviour is already proven by Phase 4.7's inlined live run; this just confirms the wrapper itself
- [ ] Build `log_gate_result(audit)` → `logs/gate_audit_log.jsonl` and `log_trade(trade_details, action)` → `logs/trade_log.jsonl` in `backend/05_learning/trade_logger.py` (writers only)
- [ ] Build `run_bot()` — Scan → `run_pipeline()` per candidate → only `BUY` → `validate_trade()` → `position_trade()` → log
- [ ] Add flags: `--now` (immediate run), `--update-watchlist` (manual Tier 1)
- [ ] Configure APScheduler — weekly universe filter (Sunday) + nightly run (Mon–Fri, 11:00 PM AEST); may stay off during bring-up and be triggered manually
- [ ] Test: `python backend/bot.py --now` runs scan → gates → risk → execute → log without errors (paper)

**Exit criteria:** One entry point runs the full pipeline. Every candidate writes a gate audit line; every paper trade is logged.

---

## Phase 8 — 🖥️ Dashboard (Control & Debug Cockpit)

**Files:** `backend/api/` (FastAPI) · `frontend/` (dashboard UI — framework TBD when this phase starts)

**Goal:** A browser cockpit to **observe, debug, and tune** the bot during bring-up — see what it's doing and understand each adjustment. The end goal stays full automation; this is the instrument that gets us there, not a permanent manual terminal.

> **Design rule — propose-and-confirm, not a fiddle board.** Config edits are explicit, logged, and confirmed. The mission's discipline holds: manual threshold changes only, no self-tuning until 200+ trades.

- [ ] Build `backend/api/` (FastAPI) — endpoints: last/live run audit (reads `gate_audit_log.jsonl`), trades (`trade_log.jsonl`), account state (existing Alpaca getters), config GET, config PATCH (validated + logs old→new), "run now" trigger for `run_bot(--now)`
- [ ] **Observability view** — per candidate, which gate passed/blocked and *why*; funnel counts (universe → scan → gates → BUY); open positions + account state
- [ ] **Tuning view** — read/adjust `config.py` dials (thresholds, sizing, edge, trail %) via propose-and-confirm
- [ ] **Operational controls** — pause/resume scheduler, run now, force watchlist refresh, kill switch, manually close a position
- [ ] Test: trigger a run from the browser, watch every gate decision render, adjust one dial and confirm it persists, close a paper position from the controls

**Exit criteria:** From the browser you can trigger a run, watch every gate decision and block reason, see positions/account state, deliberately adjust any dial, and hit the kill switch.

---

## Phase 9 — 📝 Learning Loop (analytics)

**Files:** `backend/05_learning/trade_logger.py`, `backend/05_learning/threat_memory.py`

**Goal:** Turn the logs into calibration signal — measure prediction quality and learn from exogenous shocks.

> The two log writers (`log_gate_result`, `log_trade`) were built in Phase 7. What remains is the analytics on top of them.

- [ ] Build `log_failure(trade_details, reason)` — every loss to `logs/failure_log.md` with context
- [ ] Build `calculate_brier_score()` — how calibrated Gate 5 win-probability estimates are
- [ ] Build `get_performance_summary()` — win rate, trade count, Brier score (surfaced in the dashboard)
- [ ] Build `threat_memory.py` — log Category B/D losses; post-loss Claude review; graduate repeated patterns into Gate 1 rules
- [ ] Test: compute a Brier score on 5+ mock closed trades; confirm `failure_log.md` writes
- [ ] Create `backend/05_learning/trade_logger_playground.ipynb`

**Weekly review ritual (not code):**
- Every Sunday, export the trade log and gate audit log
- Paste into a Claude conversation and ask: "What patterns do you see in the losing trades and gate blocks?"
- Look for: Gate 1 blocking too many winners, Gate 4 missing contradictions, low Gate 3 confidence on losses
- Make manual threshold adjustments based on findings — do not automate this until you have 200+ trades

**Exit criteria:** Brier score calculates when 5+ closed trades exist; failure log and performance summary populate the dashboard.

---

## Phase 10 — 📋 Paper Trading (Minimum 8 Weeks)

**Goal:** Prove the strategy works before any real money is involved.

| Week | Focus | What to Check |
|------|-------|---------------|
| 1–2 | Run nightly, review each morning | Are gate decisions making sense? Any obvious errors? |
| 3–4 | Let it run, start tracking metrics | Win rate above 50%? Brier score below 0.30? |
| 5–6 | Weekly Claude review of trade + gate audit logs | Is the 5-gate system blocking threats that would have lost? |
| 7–8 | Full performance review | All six go-live criteria met? Gate calibration analysis complete? |

**Monthly gate calibration (from Paper Trading Protocol v3):**
- Gate 1 block rate: above 60% = too tight; below 10% = too loose
- Gate 4 accuracy: did flagged contradictions actually predict losses?
- False blocks: trades blocked by gates that would have won

**Go-live criteria (all six required, minimum 100 trades):**
- [ ] Win rate consistently above 55%
- [ ] Brier score below 0.25
- [ ] Profit factor above 1.5
- [ ] Max drawdown never exceeded 8%
- [ ] Sharpe ratio above 1.0
- [ ] Minimum 3 months of paper trading

---

## Phase 11 — 💰 Live Trading (Phased)

**Goal:** Deploy real capital incrementally, gated by continued performance.

The only change to go live is one line in `.env`:

```
# Change this:
ALPACA_BASE_URL=https://paper-api.alpaca.markets

# To this:
ALPACA_BASE_URL=https://api.alpaca.markets
```

| Stage | Max Exposure | Condition to Proceed |
|-------|-------------|---------------------|
| Live 1 | $1,000 | 4 weeks live, drawdown under 4%, win rate holding |
| Live 2 | $2,500 | 8 weeks cumulative, all metrics still on target |
| Live 3 | $5,000 | 3 months live, all six criteria still met |
| Scale up | Review with Claude first | Same criteria, minimum 6 months extended timeframe |

**⚠️ Do not skip stages. Do not scale on emotion. One good month is not a sample size.**
