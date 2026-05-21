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
- **Used for:** bracket orders, portfolio value, open positions, daily P&L
- **Paper trading URL:** `https://paper-api.alpaca.markets`
- **Live trading URL:** `https://api.alpaca.markets`
- **Cost:** Free account; no commission on trades
- **Library:** `alpaca-trade-api`

### 🧠 Claude AI (Anthropic)

- **Role:** Intelligence layer — four sequential gate calls per candidate (Gates 2–5)
- **Model used:** `claude-sonnet-4-6`
- **Gate 1 uses no Claude** — hard threat screen runs on rules only (zero API cost)
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

- **Role:** Earnings + economic calendars
- **Used for:** `universe_filter.py` (weekly earnings blackout) and Gate 1 (FOMC/CPI/NFP + per-stock earnings checks)
- **Free tier:** 60 API calls/minute, no credit card required — finnhub.io
- **Library:** `finnhub-python`

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
| `anthropic`        | Claude AI API client (Gates 2–5)             |
| `finnhub-python`   | Economic + earnings calendars (Gate 1)       |
| `feedparser`       | SEC EDGAR RSS parsing (Gate 1)               |
| `newsapi-python`   | NewsAPI client (fallback only)               |
| `requests`         | General HTTP requests                        |

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
├── .env                          # API keys — never commit this
├── backend/
│   ├── 00_data/
│   │   └── data_fetcher.py       # Fetches price data and news headlines
│   ├── bot.py                    # Main entry point — runs the full pipeline
│   ├── 01_scanner/
│   │   ├── universe_filter.py    # Tier 1: weekly S&P 500 → watchlist (~60–80)
│   │   └── momentum_scanner.py   # Tier 2: nightly watchlist → top 10–15
│   ├── 02_intelligence/
│   │   ├── constants.py
│   │   ├── helpers/                  # shared data fetchers — gates import from here
│   │   │   ├── market.py             # VIX, SPY, sector ETF          → Gates 1, 4
│   │   │   ├── calendars.py          # macro + earnings              → Gates 1, 4
│   │   │   ├── premarket.py          # gap check                     → Gate 1
│   │   │   ├── filings.py            # SEC 8-K                       → Gate 1
│   │   │   ├── portfolio.py          # daily loss limit              → Gate 1
│   │   │   ├── news.py               # fetch + classify headlines    → Gates 2, 3, Pipeline
│   │   │   ├── market_context.py     # composed market snapshot      → Gate 4
│   │   │   ├── sentiment_rules.py    # pass/block logic              → Gate 3
│   │   │   └── trade_levels.py       # stop/target + gate summary    → Gate 5
│   │   ├── pipeline/run_pipeline.py
│   │   ├── gate1_hard_threat/gate.py
│   │   ├── gate2_news_threat/gate.py
│   │   ├── gate3_sentiment/gate.py
│   │   ├── gate4_contradiction/gate.py
│   │   └── gate5_signal/gate.py
│   ├── 03_risk/
│   │   └── risk_gate.py          # Validates every trade before execution
│   ├── 04_execution/
│   │   └── alpaca_executor.py    # Places bracket orders via Alpaca
│   └── 05_learning/
│       ├── trade_logger.py       # Logs trades + gate audit trail, Brier score
│       └── threat_memory.py      # Exogenous shock memory + post-loss review
├── data/
│   └── watchlist.csv             # Tier 1 output — refreshed weekly
└── logs/
    ├── gate_audit_log.jsonl      # Every candidate assessed — including gate blocks
    ├── trade_log.jsonl           # Every trade executed (entry + exit)
    ├── failure_log.md            # Human-readable loss diary
    └── threat_memory.jsonl       # Exogenous shock events + graduated rules
```

---

## 🔐 Key Configuration Variables (`.env`)

| Variable                | Default   | Purpose                                    |
| ----------------------- | --------- | ------------------------------------------ |
| `ALPACA_BASE_URL`       | paper URL | Switch to live URL when ready              |
| `MAX_POSITION_SIZE_PCT` | 0.08      | Max 8% of portfolio per trade              |
| `MAX_OPEN_POSITIONS`    | 5         | Hard limit on concurrent positions         |
| `MAX_DAILY_LOSS_PCT`    | 0.03      | Bot stops if daily loss hits 3%            |
| `MAX_DRAWDOWN_PCT`      | 0.08      | Kill switch fires at 8% drawdown from peak |
| `KELLY_FRACTION`        | 0.25      | Quarter-Kelly position sizing              |
| `MIN_EDGE_PCT`          | 0.04      | Minimum 4% edge required to trade          |
| `MAX_HOLD_DAYS`         | 5         | Maximum days to hold any position          |
