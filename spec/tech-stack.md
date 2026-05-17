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
| AI / Sentiment | Claude AI (Anthropic)      |
| Market Data    | Yahoo Finance via yfinance |
| Stock Universe | TradingView Screener       |
| News Data      | NewsAPI                    |
| Earnings Data  | Finnhub                    |
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

- **Role:** News sentiment analysis — reads headlines and rates them bullish / bearish / neutral
- **Model used:** `claude-sonnet-4-6`
- **Called once** per candidate stock per nightly run
- **Cost:** ~$1–2 per day during paper trading
- **Library:** `anthropic`

### 📰 NewsAPI

- **Role:** Fetches recent headlines for each candidate stock
- **Used for:** supplying raw text to Claude for sentiment analysis
- **Free tier:** 100 requests/day (sufficient for paper trading)
- **Library:** `newsapi-python`
- **Alternatives under review:** see [iteration-02-ideas.md](iteration-02-ideas.md) (do not add long evaluation notes here)

### 📅 Finnhub

- **Role:** Earnings calendar — filters stocks with earnings in the next 5 days from the weekly universe filter
- **Used for:** `get_earnings_tickers()` in `universe_filter.py` — one call per week covering a date range
- **Free tier:** 60 API calls/minute, no credit card required — finnhub.io
- **Library:** `requests` (no dedicated library needed)

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

| Library            | Purpose                   |
| ------------------ | ------------------------- |
| `alpaca-trade-api` | Alpaca broker integration |
| `anthropic`        | Claude AI API client      |
| `newsapi-python`   | NewsAPI client            |
| `requests`         | General HTTP requests     |

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
pip install alpaca-trade-api yfinance pandas numpy requests
pip install anthropic fastapi uvicorn sqlalchemy apscheduler
pip install python-dotenv ta newsapi-python tradingview-screener
```

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
│   ├── 02_signals/
│   │   ├── sentiment_analyzer.py # Claude reads news and scores sentiment
│   │   └── signal_generator.py   # Combines signals, applies EV formula
│   ├── 03_risk/
│   │   └── risk_gate.py          # Validates every trade before execution
│   ├── 04_execution/
│   │   └── alpaca_executor.py    # Places bracket orders via Alpaca
│   └── 05_learning/
│       └── trade_logger.py       # Logs trades, calculates Brier score
├── data/
│   └── watchlist.csv             # Tier 1 output — refreshed weekly
└── logs/
    ├── trade_log.json            # Every trade ever made
    └── failure_log.md            # Human-readable loss diary
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
