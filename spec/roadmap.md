# Roadmap

## Phase 0 — Prerequisites (Before Writing Any Code)

Everything the bot needs to function must be in place before Step 1.

| Task | Where | Cost |
|------|-------|------|
| Install Cursor IDE | cursor.sh | Free |
| Install Python 3.11+ | python.org/downloads | Free |
| Create Alpaca account + generate paper API keys | alpaca.markets | Free |
| Create Anthropic account + add credit + generate API key | console.anthropic.com | ~$10 |
| Create NewsAPI account + get free API key | newsapi.org | Free |

**Exit criteria:** All five API keys saved locally. Cursor and Python confirmed working in terminal.

---

## Phase 1 — Project Setup

**Goal:** Create the folder structure, virtual environment, install all libraries, and store API keys safely.

Steps:
1. Create project folder and subdirectory structure (`backend/`, `data/`, `logs/`)
2. Create and activate a Python virtual environment
3. Install all required libraries (`pip install ...`)
4. Create `.env` file with all API keys and risk parameters
5. Create `.gitignore` to ensure `.env` is never committed

**Exit criteria:** `(venv)` visible in terminal. All libraries installed without errors. `.env` populated.

---

## Phase 2 — Data Layer

**File:** `backend/data_fetcher.py`

**Goal:** Give the bot its eyes — working access to price data and news.

Steps:
1. Build `get_stock_data(ticker)` — downloads 60 days of OHLCV data via yfinance
2. Build `get_news_headlines(ticker, company_name)` — fetches up to 10 recent headlines via NewsAPI
3. Test: run the file directly and confirm Apple price data and headlines print to terminal

**Exit criteria:** 60 rows of price data and at least 1 news headline returned for a test ticker.

---

## Phase 3 — Momentum Scanner

**File:** `backend/scanner/momentum_scanner.py`

**Goal:** Filter ~500 stocks to the 10–20 best momentum candidates each night.

Steps:
1. Define the stock universe (start with 20 well-known S&P 500 names)
2. Build `calculate_momentum_score(df)` — scores each stock 0–3 using RSI, VWAP, SMA20 vs SMA50
3. Build `run_scan()` — iterates the universe, returns candidates scoring 2 or higher
4. Test: run the scanner and confirm stocks are scored and filtered correctly

**Exit criteria:** Scanner runs across all 20 stocks and returns a ranked candidate list.

---

## Phase 4 — Claude AI Sentiment Analyzer

**File:** `backend/signals/sentiment_analyzer.py`

**Goal:** Add a second independent signal — AI reads the news so you don't have to.

Steps:
1. Build `analyze_sentiment(ticker, company_name)` — fetches headlines and sends them to Claude
2. Parse Claude's JSON response: `sentiment` (bullish/bearish/neutral), `confidence` (0–1), `reasoning`
3. Test: run for one ticker and confirm Claude returns a structured sentiment result

**Exit criteria:** Claude returns a valid sentiment object with confidence score and one-line reasoning.

---

## Phase 5 — Signal Generator

**File:** `backend/signals/signal_generator.py`

**Goal:** Combine momentum and sentiment into a final BUY or SKIP decision using the EV formula.

Steps:
1. Build `generate_signal(candidate)` — maps momentum score to win probability
2. Adjust win probability based on sentiment direction and confidence
3. Apply EV formula: `EV = p × b − (1 − p)`, where `b = 2.0` (2:1 reward-to-risk)
4. Return BUY if edge ≥ 4% and sentiment is not bearish; otherwise SKIP with reason
5. Test: run against a mock candidate and confirm the output structure

**Exit criteria:** Signal generator returns a valid BUY or SKIP decision with all fields populated.

---

## Phase 6 — Risk Gate

**File:** `backend/risk/risk_gate.py`

**Goal:** Build the bouncer. Every trade must pass all checks or it does not happen.

Steps:
1. Build `calculate_position_size(signal, portfolio_value)` — Quarter-Kelly formula, capped at 8%
2. Build `calculate_stops(signal)` — stop at entry − (1.5 × ATR), target at 2× stop distance
3. Build `validate_trade(...)` — runs five sequential checks:
   - Edge above minimum threshold
   - Open positions below maximum
   - Daily loss limit not hit
   - Drawdown kill switch not triggered
   - Reward-to-risk ratio ≥ 2:1
4. Test: run against a mock signal and confirm approved trades include correct share count and stops

**Exit criteria:** Risk gate correctly approves valid trades and rejects trades that fail any single check.

**Important:** Never modify the risk gate to allow trades that fail its checks. The whole point is that it is non-negotiable.

---

## Phase 7 — Execution Layer

**File:** `backend/execution/alpaca_executor.py`

**Goal:** Place bracket orders through Alpaca — buy, stop-loss, and take-profit in one instruction.

Steps:
1. Build `get_portfolio_value()`, `get_open_positions()`, `get_daily_pnl()` — live account state
2. Build `place_bracket_order(trade_details)` — submits a bracket order to Alpaca
3. Test: run the file and confirm it connects to your paper account and prints portfolio value (no orders placed at this stage)

**Exit criteria:** Portfolio value prints correctly. Alpaca connection confirmed.

---

## Phase 8 — Learning Loop

**File:** `backend/learning/trade_logger.py`

**Goal:** Log every trade and track prediction accuracy so the system can improve over time.

Steps:
1. Build `log_trade(trade_details, action)` — appends every trade to `logs/trade_log.json`
2. Build `log_failure(trade_details, reason)` — writes every loss to `logs/failure_log.md` with context
3. Build `calculate_brier_score()` — measures how calibrated the win probability estimates are
4. Build `get_performance_summary()` — prints win rate, trade count, and Brier score to terminal
5. Test: log a mock trade and confirm it appears correctly in both log files

**Weekly review ritual (not code):**
- Every Sunday, export the trade log
- Paste it into a Claude conversation and ask: "What patterns do you see in the losing trades?"
- Look for: low sentiment confidence on losses, specific sectors underperforming, Brier score trend
- Make manual threshold adjustments based on findings — do not automate this until you have 200+ trades

**Exit criteria:** Both log files write correctly. Brier score calculates when 5+ closed trades exist.

---

## Phase 9 — Full Pipeline Integration

**File:** `backend/bot.py`

**Goal:** Wire all modules together into one pipeline that runs on a nightly schedule.

Steps:
1. Import all modules and define the `run_bot()` function
2. Implement the six-stage pipeline in sequence: Scan → Research → Predict → Risk Gate → Execute → Log
3. Add the `--now` flag for immediate test runs (bypasses scheduler)
4. Configure APScheduler to run at 11:00pm AEST (13:00 UTC) nightly
5. Test with `python backend/bot.py --now` — confirm all six stages run without errors

**Exit criteria:** Full pipeline runs end-to-end in test mode. Paper orders placed and logged correctly.

---

## Phase 10 — Paper Trading (Minimum 8 Weeks)

**Goal:** Prove the strategy works before any real money is involved.

| Week | Focus | What to Check |
|------|-------|---------------|
| 1–2 | Run nightly, review each morning | Are signals making sense? Any obvious errors? |
| 3–4 | Let it run, start tracking metrics | Win rate above 50%? Brier score below 0.30? |
| 5–6 | Weekly Claude review of trade log | Is sentiment adding value over momentum alone? |
| 7–8 | Full performance review | All six go-live criteria met? |

**Go-live criteria (all six required, minimum 100 trades):**
- Win rate consistently above 55%
- Brier score below 0.25
- Profit factor above 1.5
- Max drawdown never exceeded 8%
- Sharpe ratio above 1.0
- Minimum 3 months of paper trading

---

## Phase 11 — Live Trading (Phased)

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

**Do not skip stages. Do not scale on emotion. One good month is not a sample size.**
