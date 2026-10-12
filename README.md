# 🤖 ai_bot

Autonomous stock trading bot — scans US markets overnight, scores momentum candidates, and (eventually) places trades via Alpaca. Built in Python.

📌 Active milestone → [`spec_development/NOW.md`](spec_development/NOW.md)

---

## 📋 Prerequisites

| Requirement | Notes |
|-------------|-------|
| 🐍 **Python 3.11+** | Project uses 3.12 in `venv/` |
| 💻 **Cursor** (or any IDE) | Recommended for AI-assisted development |
| 🏦 **Alpaca** paper account | [alpaca.markets](https://alpaca.markets) — free paper trading keys |
| 🧠 **Anthropic** API key | [console.anthropic.com](https://console.anthropic.com) — for sentiment (Phase 4+) |
| 📰 **NewsAPI** key | [newsapi.org](https://newsapi.org) — free tier (100 req/day) |
| 📅 **Finnhub** key | [finnhub.io](https://finnhub.io) — free tier, earnings calendar |

> 🔓 **No key needed:** Yahoo Finance price data (`yfinance`) and TradingView screener work without API keys.

---

## 🚀 Quick Start (Install)

Run everything from the **project root** (`ai_bot/`).

### 📦 How dependencies work

| File / folder | Role |
|---------------|------|
| [`requirements.txt`](requirements.txt) | **Committed to git** — lists every library the project needs |
| `venv/` | **Local only** (gitignored) — your isolated Python environment where those libraries get installed |

You create `venv/` once on your machine, then install everything from `requirements.txt`. You never pip-install packages one by one.

### 1️⃣ Clone & enter the repo

```bash
git clone <your-repo-url> ai_bot
cd ai_bot
```

### 2️⃣ Create & activate a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows
```

✅ You should see `(venv)` in your terminal prompt.

### 3️⃣ Install all dependencies (one command)

```bash
pip install -r requirements.txt
```

That's it — all project dependencies are installed.

### 4️⃣ Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and uncomment/fill in the keys you have:

| Variable | Required for | Module |
|----------|--------------|--------|
| `ALPACA_API_KEY` | Dynamic price ceiling | `backend/cli.py` |
| `ALPACA_SECRET_KEY` | Dynamic price ceiling | `backend/cli.py` |
| `ALPACA_BASE_URL` | Paper vs live broker | `backend/cli.py` |
| `NEWS_API_KEY` | News headlines | `backend/data/news.py` |
| `FINNHUB_API_KEY` | Earnings filter | `backend/cli.py` |
| `ANTHROPIC_API_KEY` | Sentiment analysis | `backend/llm/client.py` |

> ⚠️ **Never commit `.env`** — it is gitignored. Only `.env.example` is tracked.

> 🎛️ **Strategy tuning** is stored in Neon and supplied by Node to
[`backend/config.py`](backend/config.py). Change settings through the app; secrets stay in `.env`.

---

## 🧪 How to Test

Start the app from the project root with `npm run dev`. To choose another HTTP port,
use `PORT=3022 npm run dev`.

1. Click **Load Watchlist**. Confirm the stock list and timestamp refresh without an
   error. Node supplies the active strategy settings, starts `cli.py --load-watchlist`,
   and saves the returned universe batch to Neon.
2. For pipeline verification, turn **Place Orders** off before starting the run.
   Confirm candidate progress, gate results and the final summary appear. A run
   may block candidates on live market conditions; it need not produce a BUY.
   This test makes LLM calls and requires separate permission under Rule 5.

Alpaca and Finnhub credentials are required for Load Watchlist. Missing settings,
credentials or failed data sources stop the affected operation; there are no
substitute price ceilings or skipped earnings filters.

Module self-checks are available only where documented in the source. AI agents
follow Rules 5, 7 and 9 in [AGENTS.md](AGENTS.md).

## 📁 Project Structure

See the [backend architecture primer](docs/backend_architecture_primer.md) for the
Python package layout and dependency boundaries. The universe lives in Neon;
`backend/scanner/data/latest_run.json` holds the latest telemetry output.

---

## 📚 More Docs

- 🗺️ [Active milestone](spec_development/NOW.md)
- 💡 [Milestone backlog](spec_development/Milestone%20Backlog.md)
- 🎨 [Design system primer](docs/design_system_primer.md)
