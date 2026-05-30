# 🗺️ Iteration 1 — Roadmap

**Status:** 🔄 active

First full lap of the project (Phase 0 → Phase 10). Work **only** from this file for the current iteration.

- 💡 Ideas for iteration 2 → [iteration-02-ideas.md](iteration-02-ideas.md) (one-line bullets only)
- ⏳ Do not create `iteration-02-roadmap.md` until iteration 1 is complete
- 📌 Index → [master.md](master.md)

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

**→ Next:** Each momentum candidate passes into the Intelligence Layer (Phase 4) before reaching the risk gate.

---

## Phase 4 — 🧠 Intelligence Layer (5-Gate System)

**Root folder:** `backend/02_intelligence/`

**Goal:** Each momentum candidate passes through five gates in order. The pipeline stops at the first failure.

**LLM layer:** Use `pydantic-ai` for Gates 2–5 so Claude can be swapped later for GPT/Gemini without rewriting gate logic.

**Organisation rule:**
- **`gate*/gate.py`** — decision logic only (prompts, pass/block rules, parsers). One folder per gate.
- **`helpers/`** — shared data fetchers and pure functions, grouped by domain. If two or more gates need the same function, it lives here — never duplicated inside a gate folder.
- **`constants.py`** — thresholds and maps used across multiple gates.

**Reference docs:** `spec/info_source/6. Trading_Bot_Intelligence_Layer_v2.md`, `spec/info_source/7. Trading_Bot_Intelligence_Layer_Install_Guide.md`

**Build order:** Shared helpers (as needed) → Gate 1 → Gate 2 → Gate 3 → Gate 4 → Gate 5 → Pipeline → End-to-end test

### Folder layout

```
backend/02_intelligence/
├── constants.py                     # SECTOR_ETF_MAP, block thresholds, SOURCE_RELIABILITY tiers
├── helpers/                         # shared — gates import from here
│   ├── market.py                    # VIX, SPY, sector ETF snapshots; get_market_context() → Gate 1, Gate 4
│   ├── calendars.py                 # macro events, per-ticker earnings     → Gate 1, Gate 4
│   ├── premarket.py                 # pre-market gap                        → Gate 1
│   ├── filings.py                   # SEC EDGAR 8-K                         → Gate 1
│   ├── portfolio.py                 # daily loss limit check                → Gate 1
│   ├── news.py                      # fetch, classify, format headlines     → Gate 2, Gate 3, Pipeline
│   ├── sentiment_rules.py           # apply_pass_rules (pure logic)         → Gate 3
│   └── trade_levels.py              # stop/target/EV context builders       → Gate 5
├── pipeline/
│   ├── run_pipeline.py
│   └── run_pipeline_playground.ipynb
├── gate1_hard_threat/
│   ├── gate.py                      # imports helpers/market, calendars, premarket, filings, portfolio
│   └── gate1_playground.ipynb
├── gate2_news_threat/
│   ├── gate.py                      # imports helpers/news
│   └── gate2_playground.ipynb
├── gate3_sentiment/
│   ├── gate.py                      # imports helpers/news, helpers/sentiment_rules
│   └── gate3_playground.ipynb
├── gate4_contradiction/
│   ├── gate.py                      # imports helpers/market_context
│   └── gate4_playground.ipynb
└── gate5_signal/
    ├── gate.py                      # imports helpers/trade_levels
    └── gate5_playground.ipynb
```

### Shared helpers — full specification

Each helper returns `None` on failure. Gates decide how to handle missing data (skip check vs block).

#### `constants.py` (maps — not functions)

| Constant | Input (lookup key) | Process | Output | Used by |
|----------|-------------------|---------|--------|---------|
| `SECTOR_ETF_MAP` | sector name, e.g. `"Technology"` | Static map GICS sector → ETF ticker | `"XLK"` | `get_sector_etf_snapshot`, Gate 1, Gate 4 |
| `BLOCK_THRESHOLDS` | threshold name, e.g. `"vix_level"` | Static numeric limits for Gate 1 rules | `30.0`, `-0.015`, etc. | Gate 1 `screen_gate1_hard_threats()` |
| `SOURCE_RELIABILITY_TIERS` | source name pattern | Static map publisher → tier | pattern list per tier | `classify_source`, Gates 2, 3 |

---

#### `helpers/market.py`

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `get_vix_snapshot()` | — | Fetch `^VIX` via yfinance (today + prior close). Compute absolute level and intraday % change. | `{level: float, change_pct_today: float, prior_close: float}` \| `None` | → Gate 1 `run()` (block rules); → `get_market_context()` (Gate 4 prompt) |
| `get_spy_snapshot()` | — | Fetch `SPY` via yfinance. Compute today's % change vs prior close. | `{price: float, change_pct_today: float, prior_close: float}` \| `None` | → Gate 1 `run()`; → `get_market_context()` |
| `get_sector_etf_snapshot(sector)` | `sector: str` | Look up ETF in `SECTOR_ETF_MAP`. Fetch ETF price via yfinance. Compute today's % change. | `{etf_ticker: str, price: float, change_pct_today: float, prior_close: float}` \| `None` | → Gate 1 `run()` (uses candidate's sector); → `get_market_context()` |

---

#### `helpers/calendars.py`

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `get_upcoming_macro_events(hours_ahead=24)` | `hours_ahead: int` | Call Finnhub economic calendar. Filter US high-impact events matching `MACRO_EVENT_KEYWORDS` (FOMC, CPI, NFP…) within window. | `[{event, country, time, impact}]` \| `None` | → Gate 1 `run()` (block if any in window); → `get_hours_to_next_macro_event()` |
| `get_ticker_earnings_window(ticker, days_ahead=1)` | `ticker: str`, `days_ahead: int` | Call Finnhub earnings calendar for this ticker. Check if report date is today or tomorrow. | `{reports_today: bool, reports_tomorrow: bool, report_date, hour}` \| `None` | → Gate 1 `run()` only |
| `get_hours_to_next_macro_event()` | — | Call `get_upcoming_macro_events()`. Return hours until the nearest high-impact US event. | `float` (hours) \| `None` | → `get_market_context()` → Gate 4 prompt |

---

#### `helpers/premarket.py`

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `get_premarket_gap(ticker)` | `ticker: str` | Fetch prior close and pre-market price via yfinance (`prepost=True`). Compute signed gap %. No API key required. | `{gap_pct: float, prior_close: float, premarket_price: float, direction: 'up'\|'down'\|'flat'}` \| `None` | → Gate 1 `run()` only |

---

#### `helpers/filings.py`

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `get_recent_8k_filings(ticker, days_back=1)` | `ticker: str`, `days_back: int` | Parse SEC EDGAR RSS feed (feedparser). Filter entries for ticker + form type 8-K within date window. | `[{form_type, filed_at, title, url}]` \| `None` | → Gate 1 `run()` (block if filing today) |

---

#### `helpers/portfolio.py`

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `check_daily_loss_limit(portfolio_value, daily_pnl, limit_pct=0.03)` | `portfolio_value: float`, `daily_pnl: float`, `limit_pct: float` | Compute `loss_pct = daily_pnl / portfolio_value`. Compare against limit. No external API. | `{breached: bool, loss_pct: float}` | → Gate 1 `run()` only (receives values from pipeline / Alpaca) |

---

#### `helpers/news.py`

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `classify_source(source_name)` | `source_name: str` | Match source name against `SOURCE_RELIABILITY_TIERS`. | `'HIGH'` \| `'MEDIUM'` \| `'LOW'` \| `'DANGEROUS'` | → called inside `fetch_news()`; tags used by Gates 2, 3 prompts |
| `fetch_news(ticker, days_back=2, max_results=5, include_summary=True)` | `ticker: str`, optional window/limit/summary | 1) Alpaca News API. 2) If empty, Finnhub. 3) If still empty, NewsAPI. Run `classify_source()` on each item. | `[{headline, source, reliability, url, published_at, summary}]` \| `None` | → Pipeline calls once; result passed to Gate 2 `run()` and Gate 3 `run()` |
| `format_news_for_prompt(headlines)` | `headlines: list[dict]` | Format each item as `{headline} [Source: X] [Reliability: Y]`. Join into multi-line string. No API. | `str` | → Gate 2 `run()` (Claude prompt); → Gate 3 `run()` (Claude prompt) |

---

#### `helpers/market.py` — `get_market_context(sector)`

> Lives in `market.py` alongside the other market helpers. Composes existing functions — no fetch logic of its own.

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `get_market_context(sector)` | `sector: str` | Compose: `get_vix_snapshot()` + `get_spy_snapshot()` + `get_sector_etf_snapshot(sector)` + `get_hours_to_next_macro_event()`. | `{vix: dict, spy: dict, sector: dict, hours_to_next_macro: float}` \| `None` | → Gate 4 `run()` only |

---

#### `helpers/sentiment_rules.py`

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `apply_pass_rules(direction, confidence, source_reliability)` | Claude parsed fields: `direction`, `confidence` (0–10), `source_reliability` | Apply static rules: BEARISH → block; NEUTRAL + conf < 6 → block; NEUTRAL + conf ≥ 6 → caution (−25% size); BULLISH + LOW source → caution; BULLISH + MEDIUM/HIGH → pass. No API. | `{passed: bool, caution: bool, size_reduction_pct: int}` | → Gate 3 `run()` (after Claude response parsed); caution flag → Gate 5 / risk gate downstream |

---

#### `helpers/trade_levels.py`

| Function | Input | Process | Output | Connects to |
|----------|-------|---------|--------|-------------|
| `build_trade_levels(candidate)` | `candidate: dict` with `price`, `atr` | Compute stop = entry − (1.5 × ATR), target = entry + (2 × stop distance), reward:risk ratio. Pure math. | `{entry, atr, stop, target, stop_pct, target_pct, reward_risk}` | → Gate 5 `run()` (Claude prompt + output dict) |
| `build_gate_summary(gate_results)` | `gate_results: dict` with gate1–4 outputs | Format each prior gate result into readable summary string for Claude. No API. | `str` | → Gate 5 `run()` (Claude prompt) |

---

### Data flow between gates

```
shared = get_shared_market_data()   ← called ONCE before the candidate loop
        │
        ▼ (for each candidate)
┌─ screen_gate1_hard_threats(candidate, shared, ...) ──► helpers: market, calendars, premarket, filings, portfolio
│       │ passed?
│       ▼
│   fetch_news()  ◄── helpers/news (called by Pipeline, not Gate 2)
│       │
├─ assess_gate2_news_threat(candidate, headlines) ──► helpers/news.format ──► Claude threat check
│       │ passed?
│       ▼
├─ evaluate_gate3_sentiment(candidate, headlines) ──► helpers/news.format + sentiment_rules ──► Claude sentiment
│       │ passed?
│       ▼
├─ detect_gate4_contradiction(candidate, gate3_result) ──► helpers/market_context ──► Claude contradiction
│       │ passed? (not FLAG_FOR_REVIEW)
│       ▼
└─ decide_gate5_signal(candidate, all gate_results) ──► helpers/trade_levels ──► Claude EV ──► BUY | SKIP
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
| `yfinance` | VIX, SPY, sector ETF, pre-market bars | `helpers/market.py`, `helpers/premarket.py` |
| `feedparser` | SEC EDGAR 8-K RSS feed | `helpers/filings.py` |
| `finnhub-python` | Economic + earnings calendars | `helpers/calendars.py` |

**`.env` keys:** `FINNHUB_API_KEY`

#### Tasks

- [x] Create `constants.py` + `helpers/` folder (no `__init__.py` — digit-prefix folders can't be Python packages)
- [x] Build `helpers/market.py` — `get_vix_snapshot`, `get_spy_snapshot`, `get_sector_etf_snapshot` ✅ · `get_market_context` ✅
- [x] Build `helpers/calendars.py` — `get_upcoming_macro_events`, `get_hours_to_next_macro_event` ✅ · `get_ticker_earnings_window` ✅
- [x] Build `helpers/premarket.py` — `get_premarket_gap` ✅
- [x] Build `helpers/filings.py` — `get_recent_8k_filings` ✅
- [x] Build `helpers/portfolio.py` — `check_daily_loss_limit` ✅
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
| **Process** | 1) If standalone test with no headlines → call `fetch_news(ticker)`. 2) If empty headlines → pass with caution (no threat). 3) `format_news_for_prompt(headlines)`. 4) Claude prompt: catastrophic threats only. 5) Parse `THREAT_DETECTED`, `THREAT_TYPE`, `REASON`. |
| **Output** | `{passed: bool, threat_detected: bool, threat_type: str, reason: str, headlines_used: int}` |
| **Connects from** | Pipeline (after Gate 1 pass) + `helpers/news.fetch_news()` |
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
| `alpaca-py` | Primary news source (Benzinga, real-time) | `helpers/news.py` |
| `finnhub-python` | Supplementary company news | `helpers/news.py` |
| `newsapi-python` | Fallback when Alpaca returns empty | `helpers/news.py` |
| `pydantic-ai` | Provider-flexible LLM threat detection | `gate.py` only |

**`.env` keys:** `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`, `FINNHUB_API_KEY`, `NEWS_API_KEY`, `ANTHROPIC_API_KEY`

#### Tasks

- [x] Build `helpers/news.py`
  - [x] Add `classify_source(source_name)` using `SOURCE_RELIABILITY_TIERS` with deterministic fallback (`LOW` if no match)
  - [x] Add `fetch_news(ticker, days_back=2, max_results=5)` with source priority: Alpaca primary → Finnhub supplement → NewsAPI fallback
  - [x] In `fetch_news()`, normalize each item to a shared schema: `{headline, source, reliability, url, published_at, summary}`
  - [x] Cap output to `max_results` via each API's limit param
  - [x] Add `format_news_for_prompt(headlines)` to output a stable multiline prompt block with source + reliability tags
- [ ] Build `run()` in `gate2_news_threat/gate.py`
- [x] Test helpers: `python backend/02_intelligence/helpers/news.py`
- [ ] Test gate with mock headlines: no threat → PASS; fraud headline → BLOCK
- [ ] Test: `python backend/02_intelligence/gate2_news_threat/gate.py`
- [ ] Create `gate2_playground.ipynb`

**Exit criteria:** Binary threat result. YES blocks immediately. Headlines carry reliability tags.

---

### 4.3 — Gate 3: Sentiment Quality Check

**Folder:** `backend/02_intelligence/gate3_sentiment/`  
**Claude:** Yes — call 2 of 4  
**Runs:** After Gate 2 passes

#### Gate function: `evaluate_gate3_sentiment(candidate, headlines)`

| | |
|---|---|
| **Input** | `candidate: dict`; same `headlines` list Gate 2 received — Pipeline passes through, **no re-fetch** |
| **Process** | 1) `format_news_for_prompt(headlines)`. 2) Claude prompt: sentiment direction + confidence (different question from Gate 2). 3) Parse `DIRECTION`, `CONFIDENCE`, `SOURCE_RELIABILITY`, `KEY_REASON`. 4) `apply_pass_rules()` on parsed values. |
| **Output** | `{passed: bool, direction: str, confidence: int, source_reliability: str, key_reason: str, caution: bool, size_reduction_pct: int}` |
| **Connects from** | Pipeline (same headlines from `fetch_news()`); Gate 2 must have passed |
| **Connects to** | If `passed` → Gate 4 receives `gate3_result`. `caution` / `size_reduction_pct` → Gate 5 and risk gate downstream. If blocked → `final_decision = BLOCKED_G3` |

#### Helpers consumed by this gate

| Helper | Role in this gate |
|--------|-------------------|
| `format_news_for_prompt(headlines)` | Builds Claude prompt (reliability tags already on headline dicts from fetch) |
| `apply_pass_rules(direction, confidence, source_reliability)` | Converts Claude response → pass/block/caution decision |

> Full Input / Process / Output → see **Shared helpers — full specification**.

#### Install (build helpers before `gate.py`)

| Package | Why | Helper file |
|---------|-----|-------------|
| `pydantic-ai` | Provider-flexible LLM sentiment assessment | `gate.py` only |

**`.env` keys:** `ANTHROPIC_API_KEY`

> No new data packages — headlines come from `helpers/news.py` (built for Gate 2).

#### Tasks

- [ ] Build `helpers/sentiment_rules.py`
- [ ] Build `run()` in `gate3_sentiment/gate.py`
- [ ] Test: bullish headlines → PASS; bearish → BLOCK
- [ ] Test: `python backend/02_intelligence/gate3_sentiment/gate.py`
- [ ] Create `gate3_playground.ipynb`

**Exit criteria:** Sentiment direction, confidence, and pass/block with caution flag returned.

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
| `yfinance` | Composed inside `market_context` | `helpers/market_context.py` |
| `finnhub-python` | Macro timing | `helpers/market_context.py` |
| `pydantic-ai` | Provider-flexible LLM contradiction analysis | `gate.py` only |

**`.env` keys:** `FINNHUB_API_KEY`, `ANTHROPIC_API_KEY`

> Requires Gate 1 helpers (`market.py`, `calendars.py`) already built — `market_context.py` composes them.

#### Tasks

- [ ] Build `get_market_context(sector)` in `helpers/market.py` (stub exists — compose `get_vix_snapshot`, `get_spy_snapshot`, `get_sector_etf_snapshot`, `get_hours_to_next_macro_event`)
- [ ] Build `run()` in `gate4_contradiction/gate.py`
- [ ] Test: calm market → PASS; sector selling scenario → FLAG or BLOCK
- [ ] Test: `python backend/02_intelligence/gate4_contradiction/gate.py`
- [ ] Create `gate4_playground.ipynb`

**Exit criteria:** Correctly returns PASS, FLAG_FOR_REVIEW, or BLOCK based on risk level.

---

### 4.5 — Gate 5: Final Signal + EV

**Folder:** `backend/02_intelligence/gate5_signal/`  
**Claude:** Yes — call 4 of 4  
**Runs:** After Gate 4 passes (not flagged)

#### Gate function: `decide_gate5_signal(candidate, gate_results)`

| | |
|---|---|
| **Input** | `candidate` from momentum scanner (`price`, `atr`, `score`, etc.); `gate_results` dict with outputs from Gates 1–4 |
| **Process** | 1) `build_trade_levels(candidate)` → stop, target, reward:risk. 2) `build_gate_summary(gate_results)` → prior gate summary for prompt. 3) Claude final prompt with hardcoded EV formula. 4) Parse `WIN_PROBABILITY`, `EXPECTED_VALUE`, `DECISION`, `POSITION_CONFIDENCE`, `REASON`. 5) Hard cap: EV < `MIN_EDGE_PCT` → force SKIP in code. |
| **Output** | `{passed: bool, decision: 'BUY'\|'SKIP', win_probability: float, expected_value: float, edge: float, position_confidence: str, reason: str, trade_levels: dict}` |
| **Connects from** | All prior gate results + momentum candidate |
| **Connects to** | If `decision == BUY` → Phase 5 risk gate (`validate_trade()`). If SKIP → `final_decision = SKIP` |

#### Helpers consumed by this gate

| Helper | Role in this gate |
|--------|-------------------|
| `build_trade_levels(candidate)` | Computes entry/stop/target for Claude prompt and output dict |
| `build_gate_summary(gate_results)` | Formats Gate 1–4 audit into Claude prompt context |

> Full Input / Process / Output → see **Shared helpers — full specification**.

#### Install (build helpers before `gate.py`)

| Package | Why | Helper file |
|---------|-----|-------------|
| `pydantic-ai` | Provider-flexible LLM final BUY/SKIP decision | `gate.py` only |

**`.env` keys:** `ANTHROPIC_API_KEY`, `MIN_EDGE_PCT` (default 0.04)

#### Tasks

- [ ] Build `helpers/trade_levels.py`
- [ ] Build `run()` in `gate5_signal/gate.py`
- [ ] Test: strong mock signals → BUY; weak → SKIP
- [ ] Test: `python backend/02_intelligence/gate5_signal/gate.py`
- [ ] Create `gate5_playground.ipynb`

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
| `helpers/news.fetch_news()` | Called once between Gate 1 and Gate 2; result shared with Gate 3 |
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
  "company_name": "NVIDIA Corporation",
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

#### Tasks

- [ ] Build `run_pipeline()` in `pipeline/run_pipeline.py`
- [ ] Wire imports from all five gate folders
- [ ] Smoke test: `python backend/02_intelligence/pipeline/run_pipeline.py`
- [ ] Create `run_pipeline_playground.ipynb`

**Exit criteria:** Single entry point for the rest of the bot. Full audit trail on every candidate.

---

### 4.7 — End-to-end intelligence test

- [ ] Run `run_scan()` → pass top 3 candidates through `run_pipeline()` with live portfolio state
- [ ] Confirm gate audit output for both PASS and BLOCK cases
- [ ] Verify Claude API cost stays within budget (max ~4 calls × candidates assessed per night)

**Phase 4 exit criteria:** Intelligence layer runs end-to-end on real momentum candidates. Only `final_decision == "BUY"` proceeds to the risk gate.

**⚠️ Important:** Claude is never asked one big question. Each gate asks one focused question with a structured answer. Hedging is not acceptable.

---

## Phase 5 — 🛡️ Risk Gate

**File:** `backend/03_risk/risk_gate.py`

**Goal:** Build the bouncer. Every trade must pass all checks or it does not happen. Runs **after** the intelligence layer returns `BUY`.

- [ ] Build `calculate_position_size(signal, portfolio_value)` — Quarter-Kelly formula, capped at 8%
- [ ] Build `calculate_stops(signal)` — stop at entry − (1.5 × ATR), target at 2× stop distance
- [ ] Build `validate_trade(...)` — runs five sequential checks:
  - [ ] Edge above minimum threshold
  - [ ] Open positions below maximum
  - [ ] Daily loss limit not hit
  - [ ] Drawdown kill switch not triggered
  - [ ] Reward-to-risk ratio ≥ 2:1
- [ ] Test: run against a mock Gate 5 BUY output and confirm approved trades include correct share count and stops
- [ ] Create `backend/03_risk/risk_gate_playground.ipynb`

**Exit criteria:** Risk gate correctly approves valid trades and rejects trades that fail any single check.

**⚠️ Important:** Never modify the risk gate to allow trades that fail its checks. The whole point is that it is non-negotiable.

---

## Phase 6 — ⚡ Execution Layer

**File:** `backend/04_execution/alpaca_executor.py`

**Goal:** Place bracket orders through Alpaca — buy, stop-loss, and take-profit in one instruction.

- [ ] Build `get_portfolio_value()`, `get_open_positions()`, `get_daily_pnl()` — live account state
- [ ] Build `place_bracket_order(trade_details)` — submits a bracket order to Alpaca
- [ ] Test: run the file and confirm it connects to your paper account and prints portfolio value (no orders placed at this stage)
- [ ] Create `backend/04_execution/alpaca_executor_playground.ipynb`

**Exit criteria:** Portfolio value prints correctly. Alpaca connection confirmed.

---

## Phase 7 — 📝 Learning Loop

**Files:** `backend/05_learning/trade_logger.py`, `backend/05_learning/threat_memory.py`

**Goal:** Log every trade, every gate audit trail, and learn from exogenous shocks.

- [ ] Build `log_gate_result(audit)` — append every pipeline run to `logs/gate_audit_log.jsonl` (including blocked candidates)
- [ ] Build `log_trade(trade_details, action)` — append every executed trade to `logs/trade_log.jsonl`
- [ ] Build `log_failure(trade_details, reason)` — writes every loss to `logs/failure_log.md` with context
- [ ] Build `calculate_brier_score()` — measures how calibrated Gate 5 win probability estimates are
- [ ] Build `get_performance_summary()` — prints win rate, trade count, and Brier score to terminal
- [ ] Build `threat_memory.py` — log Category B/D losses; post-loss Claude review; graduate repeated patterns into Gate 1 rules
- [ ] Test: log a mock gate audit and mock trade; confirm both JSONL files write correctly
- [ ] Create `backend/05_learning/trade_logger_playground.ipynb`

**Weekly review ritual (not code):**
- Every Sunday, export the trade log and gate audit log
- Paste into a Claude conversation and ask: "What patterns do you see in the losing trades and gate blocks?"
- Look for: Gate 1 blocking too many winners, Gate 4 missing contradictions, low Gate 3 confidence on losses
- Make manual threshold adjustments based on findings — do not automate this until you have 200+ trades

**Exit criteria:** Gate audit and trade logs write correctly. Brier score calculates when 5+ closed trades exist.

---

## Phase 8 — 🔗 Full Pipeline Integration

**File:** `backend/bot.py`

**Goal:** Wire all modules together into one pipeline that runs on a nightly schedule.

- [ ] Import all modules and define the `run_bot()` function
- [ ] Implement the nightly pipeline: Scan → Intelligence Layer (5 gates) → Risk Gate → Execute → Log
- [ ] Loop momentum candidates through `run_pipeline()`; only `BUY` results proceed to `validate_trade()`
- [ ] Add `--now` for immediate test runs and `--update-watchlist` for manual Tier 1 runs
- [ ] Configure APScheduler: weekly universe filter (Sunday) + nightly bot run (Mon–Fri, 11:00 PM AEST)
- [ ] Test with `python backend/bot.py --now` — confirm scan, intelligence layer, risk gate, and logging all run without errors

**Exit criteria:** Full pipeline runs end-to-end in test mode. Gate audits and paper orders logged correctly.

---

## Phase 9 — 📋 Paper Trading (Minimum 8 Weeks)

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

## Phase 10 — 💰 Live Trading (Phased)

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
