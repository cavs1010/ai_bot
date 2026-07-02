# 🧰 Tech Stack

> **Stable spec** — update when tools, libraries, paths, or `.env` variables change.  
> 📌 Index → [master.md](master.md) · Rules for edits → [`.agent_rules/spec-development.md`](../.agent_rules/spec-development.md)

---

## 📋 Overview

| Layer          | Tool / Service             |
| -------------- | -------------------------- |
| Language       | Python 3.11+               |
| IDE            | Cursor (with built-in AI)  |
| Broker         | Alpaca (paper + live)      |
| AI / Intelligence | Claude AI (Anthropic) — 5-gate sequential assessment |
| Market Data    | Yahoo Finance via yfinance |
| Stock Universe | TradingView Screener       |
| News Data      | Alpaca News (Benzinga) via alpaca-py; NewsAPI fallback |
| Earnings Data  | Finnhub                    |
| SEC Filings    | SEC EDGAR RSS via feedparser |
| Scheduling     | APScheduler                |
| Backend API    | FastAPI + Uvicorn          |
| Database ORM   | SQLAlchemy                 |
| Environment    | python-dotenv              |

---

## 🌐 External Services & APIs

### 🏦 Alpaca

- **Role:** Brokerage — places and manages all orders
- **Used for:** bracket orders (not yet built), portfolio value, open positions, daily P&L, drawdown from peak (`alpaca_executor.py`)
- **Paper trading URL:** `https://paper-api.alpaca.markets`
- **Live trading URL:** `https://api.alpaca.markets`
- **Cost:** Free account; no commission on trades
- **Library:** `alpaca-trade-api`

### 🧠 Claude AI (Anthropic)

- **Role:** Intelligence layer — three sequential gate calls per candidate (Gates 2–4)
- **Model used:** `claude-haiku-4-5-20251001` (cheap Haiku default; per-gate overridable via `helpers/llm/client.py`)
- **Gates 1 and 5 use no Claude** — hard threat screen (Gate 1) and edge/EV check (Gate 5) run on rules only (zero API cost)
- **Cost:** ~$1–2 per day during paper trading (scales with candidates assessed)
- **Library:** `anthropic`

### 📰 Alpaca News (Benzinga)

- **Role:** Primary news source for Gates 2 and 3 — real-time financial headlines
- **Used for:** threat detection and sentiment quality checks with source tagging
- **Cost:** Free with existing Alpaca trading account
- **Library:** `alpaca-py`

### 📰 NewsAPI

- **Role:** Fallback news source only (replaced by Alpaca News in Phase 4)
- **Free tier:** 100 requests/day
- **Library:** `newsapi-python`

### 📅 Finnhub

- **Role:** Earnings calendar
- **Used for:** `universe_filter.py` (weekly earnings blackout) and Gate 1 (per-stock earnings checks)
- **Free tier:** 60 API calls/minute, no credit card required — finnhub.io
- **Library:** none — called as plain REST over `requests` (the `finnhub-python` SDK is not installed)
- **Note:** its economic calendar moved to a paid plan (403 on free tier) — macro events now come from the FairEconomy feed below.

### 📅 FairEconomy / ForexFactory

- **Role:** Economic (macro) calendar — FOMC, CPI, NFP, etc.
- **Used for:** Gate 1 imminent-macro-event block, via `helpers/fetchers/calendars.py`
- **Endpoint:** `https://nfs.faireconomy.media/ff_calendar_thisweek.json` — free, no API key
- **Filtering:** keep US (`country == "USD"`) events flagged `impact == "High"`; no keyword whitelist
- **Limits:** ~2 requests / 5 min / IP → response is disk-cached (6h TTL) under `calendars.py`; needs a browser `User-Agent`
- **Library:** none — plain `requests`

### 📄 SEC EDGAR

- **Role:** Material event detection — 8-K filings, insider trades
- **Used for:** Gate 1 hard threat screen (8-K RSS feed)
- **Cost:** Free, no API key required
- **Library:** `feedparser`

### 📊 Yahoo Finance

- **Role:** Historical price data (OHLCV)
- **Used for:** RSI, SMA, VWAP, ATR calculations in the nightly momentum scanner
- **Cost:** Free, no API key required
- **Library:** `yfinance`

### 🔍 TradingView Screener

- **Role:** Tier 1 universe filter — scans the S&P 500 with server-side indicator calculations
- **Used for:** weekly watchlist generation (volume, price band, ATR %, dynamic price ceiling)
- **Schedule:** Sunday night (before the nightly trading week)
- **Library:** `tradingview-screener`

---

## 🐍 Python Libraries

### 📊 Data & Analysis

| Library    | Purpose                                    |
| ---------- | ------------------------------------------ |
| `pandas`   | DataFrame manipulation for price data      |
| `numpy`    | Numerical calculations                     |
| `yfinance` | Downloads historical OHLCV price data      |
| `ta`       | Technical indicators — RSI, SMA, VWAP, ATR |
| `tradingview-screener` | Tier 1 S&P 500 universe filter (server-side metrics) |

### 🔌 API Clients

| Library            | Purpose                                      |
| ------------------ | -------------------------------------------- |
| `alpaca-trade-api` | Alpaca broker integration (orders, account)  |
| `alpaca-py`        | Alpaca News API + pre-market data            |
| `anthropic`        | Claude AI API client (Gates 2–4, via pydantic-ai) |
| `pydantic-ai`      | Provider-flexible LLM agent layer — `helpers/llm/client.py` |
| `feedparser`       | SEC EDGAR RSS parsing (Gate 1)               |
| `newsapi-python`   | NewsAPI client (fallback only)               |
| `requests`         | Finnhub earnings/news + ForexFactory econ calendar REST; general HTTP |

### 🖥️ Backend & Scheduling

| Library       | Purpose                                 |
| ------------- | --------------------------------------- |
| `fastapi`     | REST API for the dashboard              |
| `uvicorn`     | ASGI server to run FastAPI              |
| `sqlalchemy`  | ORM for trade log persistence           |
| `apscheduler` | Schedules weekly watchlist refresh + nightly bot runs |

### 🧩 Utilities

| Library         | Purpose                             |
| --------------- | ----------------------------------- |
| `python-dotenv` | Loads API keys from the `.env` file |

---

## 📥 Install Command

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

All dependencies (including Jupyter) are pinned in [`requirements.txt`](../requirements.txt) at the project root.

---

## 📁 Project File Structure

```
trading-bot/
├── .env                          # API keys / secrets — never commit this
├── backend/
│   ├── config.py                 # 🎛️ Strategy dial board — every tunable number (see §🔐)
│   ├── full_pipeline_playground.ipynb  # cross-cutting demo: Stage 1 → Stage 2 → Gates 1–5
│   ├── 00_data/
│   │   └── data_fetcher.py       # Fetches price data and news headlines
│   ├── bot.py                    # Main entry point — runs the full pipeline
│   ├── 01_scanner/
│   │   ├── universe_filter.py    # Tier 1: weekly S&P 500 → watchlist (~60–80)
│   │   ├── momentum_scanner.py   # Tier 2: nightly watchlist → top 10–15
│   │   └── data/
│   │       └── watchlist.csv     # Tier 1 output — refreshed weekly
│   ├── 02_intelligence/
│   │   ├── constants.py          # reference maps only: SECTOR_ETF_MAP, SOURCE_RELIABILITY_TIERS
│   │   ├── helpers/
│   │   │   ├── fetchers/                 # external API calls — shared across gates
│   │   │   │   ├── market.py             # VIX, SPY, sector ETF, get_market_context() → Gates 1, 4
│   │   │   │   ├── calendars.py          # macro + earnings              → Gates 1, 4
│   │   │   │   ├── premarket.py          # gap check                     → Gate 1
│   │   │   │   ├── filings.py            # SEC 8-K                       → Gate 1
│   │   │   │   └── news.py               # fetch + classify headlines    → Gates 2, 3, Pipeline
│   │   │   ├── logic/                    # pure calculations / rule functions
│   │   │   │   ├── portfolio.py          # daily loss limit              → Gate 1
│   │   │   │   ├── sentiment_rules.py    # apply_pass_rules              → Gate 3
│   │   │   │   ├── ev_rules.py           # apply_edge_rules              → Gate 5
│   │   │   │   └── trade_levels.py       # stop/target + gate summary    → Gate 5
│   │   │   └── llm/
│   │   │       └── client.py             # build_agent / run_agent (pydantic-ai) → Gates 2–4
│   │   ├── pipeline/run_pipeline.py
│   │   ├── gate1_hard_threat/hard_threat_gate1.py
│   │   ├── gate2_news_threat/news_threat_gate2.py
│   │   ├── gate3_sentiment/sentiment_gate3.py
│   │   ├── gate4_contradiction/contradiction_gate4.py
│   │   └── gate5_signal/signal_gate5.py
│   ├── 03_risk/
│   │   └── risk_gate.py          # Validates every trade before execution (Quarter-Kelly sizing +
│   │                             #   open-positions/daily-loss/drawdown/reward:risk checks)
│   ├── 04_execution/
│   │   └── alpaca_executor.py    # Live account state (portfolio value, positions, daily P&L,
│   │                             #   drawdown); bracket order placement not yet built
│   └── 05_learning/
│       ├── trade_logger.py       # Logs trades + gate audit trail, Brier score
│       └── threat_memory.py      # Exogenous shock memory + post-loss review
└── logs/
    ├── gate_audit_log.jsonl      # Every candidate assessed — including gate blocks
    ├── trade_log.jsonl           # Every trade executed (entry + exit)
    ├── failure_log.md            # Human-readable loss diary
    └── threat_memory.jsonl       # Exogenous shock events + graduated rules
```

---

## 🔐 Key Configuration Variables

Configuration is split in two: **strategy dials** live on the documented board
`backend/config.py`; **secrets** live in `.env`.

### 🎛️ Strategy dials — `backend/config.py`

The single place to tune the pipeline (each constant is annotated in the file). Selected knobs:

| Variable                | Default   | Stage / Purpose                            |
| ----------------------- | --------- | ------------------------------------------ |
| `MIN_MARKET_CAP`        | 100e9     | Universe filter — large-cap floor ($100B)  |
| `TOP_N`                 | 15        | Momentum scanner — max candidates to gates |
| `MIN_SCORE`             | 2         | Momentum scanner — min score (0–3) to pass |
| `BLOCK_THRESHOLDS`      | dict      | Gate 1 — VIX/SPY/sector/gap/macro/loss limits |
| `MIN_CONFIDENCE`        | 6         | Gate 3 — sentiment conviction floor        |
| `MIN_EDGE_PCT`          | 0.04      | Gate 5 — minimum 4% EV required to BUY      |
| `MAX_POSITION_SIZE_PCT` | 0.08      | Max 8% of portfolio per trade              |
| `TRADE_LEVEL_PARAMS`    | dict      | Gate 5 / Phase 5 — ATR stop × 1.5, R:R × 2.0 |
| `MAX_OPEN_POSITIONS`    | 5         | Phase 5 risk gate — max concurrent positions |
| `MAX_DAILY_LOSS_PCT`    | 0.03      | Phase 5 risk gate — daily loss hard stop (re-checks Gate 1's rule with live P&L) |
| `MAX_DRAWDOWN_PCT`      | 0.08      | Phase 5 risk gate — drawdown kill switch    |
| `KELLY_FRACTION`        | 0.25      | Phase 5 risk gate — Quarter-Kelly sizing    |
| `MIN_REWARD_RISK`       | 2.0       | Phase 5 risk gate — final reward:risk guard |

> `BLOCK_THRESHOLDS` and `TRADE_LEVEL_PARAMS` moved here from `constants.py`;
> `MAX_POSITION_SIZE_PCT`, `MIN_EDGE_PCT`, and the Phase 5 risk dials moved here from
> `.env`. Reference **maps** (`SECTOR_ETF_MAP`, `SOURCE_RELIABILITY_TIERS`) stay in
> `02_intelligence/constants.py`.

### 🔑 Secrets & runtime — `.env`

| Variable                | Default   | Purpose                                    |
| ----------------------- | --------- | ------------------------------------------ |
| `ALPACA_API_KEY` / `ALPACA_SECRET_KEY` | — | Broker + Alpaca News auth      |
| `ALPACA_BASE_URL`       | paper URL | Switch to live URL when ready              |
| `ANTHROPIC_API_KEY`     | —         | Claude API (Gates 2–4)                     |
| `FINNHUB_API_KEY`       | —         | Earnings calendar + news fallback          |
| `NEWS_API_KEY`          | —         | NewsAPI fallback                           |

> `MAX_HOLD_DAYS` is not yet wired anywhere — it belongs to position-management logic
> that hasn't been built (a later phase's exit-timing rule, not part of the Phase 5 risk
> gate's five checks). Left as a commented-out placeholder in `.env.example` until a
> module actually reads it.
