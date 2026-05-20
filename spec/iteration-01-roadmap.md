# 🗺️ Iteration 1 — Roadmap

**Status:** 🔄 active

First full lap of the project (Phase 0 → Phase 11). Work **only** from this file for the current iteration.

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
- [ ] Create Alpaca account + generate paper API keys — alpaca.markets (Free)
- [ ] Create Anthropic account + add credit + generate API key — console.anthropic.com (~$10)
- [ ] Create NewsAPI account + get free API key — newsapi.org (Free)

**Exit criteria:** All five API keys saved locally. Cursor and Python confirmed working in terminal.

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
- [ ] Test: run the scanner against an existing watchlist and confirm ranked output
- [x] Create `backend/01_scanner/momentum_scanner_playground.ipynb`

**Exit criteria:** Universe filter produces a valid `watchlist.csv`. Momentum scanner returns a ranked shortlist from that watchlist.

---

## Phase 4 — 🧠 Claude AI Sentiment Analyzer

**File:** `backend/02_signals/sentiment_analyzer.py`

**Goal:** Add a second independent signal — AI reads the news so you don't have to.

- [ ] Build `analyze_sentiment(ticker, company_name)` — fetches headlines and sends them to Claude
- [ ] Parse Claude's JSON response: `sentiment` (bullish/bearish/neutral), `confidence` (0–1), `reasoning`
- [ ] Test: run for one ticker and confirm Claude returns a structured sentiment result
- [ ] Create `backend/02_signals/sentiment_analyzer_playground.ipynb`

**Exit criteria:** Claude returns a valid sentiment object with confidence score and one-line reasoning.

---

## Phase 5 — 📈 Signal Generator

**File:** `backend/02_signals/signal_generator.py`

**Goal:** Combine momentum and sentiment into a final BUY or SKIP decision using the EV formula.

- [ ] Build `generate_signal(candidate)` — maps momentum score to win probability
- [ ] Adjust win probability based on sentiment direction and confidence
- [ ] Apply EV formula: `EV = p × b − (1 − p)`, where `b = 2.0` (2:1 reward-to-risk)
- [ ] Return BUY if edge ≥ 4% and sentiment is not bearish; otherwise SKIP with reason
- [ ] Test: run against a mock candidate and confirm the output structure
- [ ] Create `backend/02_signals/signal_generator_playground.ipynb`

**Exit criteria:** Signal generator returns a valid BUY or SKIP decision with all fields populated.

---

## Phase 6 — 🛡️ Risk Gate

**File:** `backend/03_risk/risk_gate.py`

**Goal:** Build the bouncer. Every trade must pass all checks or it does not happen.

- [ ] Build `calculate_position_size(signal, portfolio_value)` — Quarter-Kelly formula, capped at 8%
- [ ] Build `calculate_stops(signal)` — stop at entry − (1.5 × ATR), target at 2× stop distance
- [ ] Build `validate_trade(...)` — runs five sequential checks:
  - [ ] Edge above minimum threshold
  - [ ] Open positions below maximum
  - [ ] Daily loss limit not hit
  - [ ] Drawdown kill switch not triggered
  - [ ] Reward-to-risk ratio ≥ 2:1
- [ ] Test: run against a mock signal and confirm approved trades include correct share count and stops
- [ ] Create `backend/03_risk/risk_gate_playground.ipynb`

**Exit criteria:** Risk gate correctly approves valid trades and rejects trades that fail any single check.

**⚠️ Important:** Never modify the risk gate to allow trades that fail its checks. The whole point is that it is non-negotiable.

---

## Phase 7 — ⚡ Execution Layer

**File:** `backend/04_execution/alpaca_executor.py`

**Goal:** Place bracket orders through Alpaca — buy, stop-loss, and take-profit in one instruction.

- [ ] Build `get_portfolio_value()`, `get_open_positions()`, `get_daily_pnl()` — live account state
- [ ] Build `place_bracket_order(trade_details)` — submits a bracket order to Alpaca
- [ ] Test: run the file and confirm it connects to your paper account and prints portfolio value (no orders placed at this stage)
- [ ] Create `backend/04_execution/alpaca_executor_playground.ipynb`

**Exit criteria:** Portfolio value prints correctly. Alpaca connection confirmed.

---

## Phase 8 — 📝 Learning Loop

**File:** `backend/05_learning/trade_logger.py`

**Goal:** Log every trade and track prediction accuracy so the system can improve over time.

- [ ] Build `log_trade(trade_details, action)` — appends every trade to `logs/trade_log.json`
- [ ] Build `log_failure(trade_details, reason)` — writes every loss to `logs/failure_log.md` with context
- [ ] Build `calculate_brier_score()` — measures how calibrated the win probability estimates are
- [ ] Build `get_performance_summary()` — prints win rate, trade count, and Brier score to terminal
- [ ] Test: log a mock trade and confirm it appears correctly in both log files
- [ ] Create `backend/05_learning/trade_logger_playground.ipynb`

**Weekly review ritual (not code):**
- Every Sunday, export the trade log
- Paste it into a Claude conversation and ask: "What patterns do you see in the losing trades?"
- Look for: low sentiment confidence on losses, specific sectors underperforming, Brier score trend
- Make manual threshold adjustments based on findings — do not automate this until you have 200+ trades

**Exit criteria:** Both log files write correctly. Brier score calculates when 5+ closed trades exist.

---

## Phase 9 — 🔗 Full Pipeline Integration

**File:** `backend/bot.py`

**Goal:** Wire all modules together into one pipeline that runs on a nightly schedule.

- [ ] Import all modules and define the `run_bot()` function
- [ ] Implement the six-stage pipeline in sequence: Scan → Research → Predict → Risk Gate → Execute → Log
- [ ] Add `--now` for immediate test runs and `--update-watchlist` for manual Tier 1 runs
- [ ] Configure APScheduler: weekly universe filter (Sunday) + nightly bot run (Mon–Fri, 11:00 PM AEST)
- [ ] Test with `python backend/bot.py --now` — confirm all six stages run without errors

**Exit criteria:** Full pipeline runs end-to-end in test mode. Paper orders placed and logged correctly.

---

## Phase 10 — 📋 Paper Trading (Minimum 8 Weeks)

**Goal:** Prove the strategy works before any real money is involved.

| Week | Focus | What to Check |
|------|-------|---------------|
| 1–2 | Run nightly, review each morning | Are signals making sense? Any obvious errors? |
| 3–4 | Let it run, start tracking metrics | Win rate above 50%? Brier score below 0.30? |
| 5–6 | Weekly Claude review of trade log | Is sentiment adding value over momentum alone? |
| 7–8 | Full performance review | All six go-live criteria met? |

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
