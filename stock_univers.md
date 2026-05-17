Here is the exact, clean Markdown text optimized for a `README.md` file. It focuses entirely on Option 1 (`tradingview-screener`), strips out all non-essential chatter and fallbacks, and keeps the code intact.

You can copy and paste the text block below directly into your file:

```markdown
# Stock Selection Module: Stock Universe Selection v2.0

Automated Two-Tier Filtering System designed to remove human bias and survivorship bias by algorithmically scanning the S&P 500.

## System Architecture

The system uses two sequential filters running on separate schedules to maintain optimal performance and keep downstream AI analysis cost-effective:

1. **Tier 1 — Universe Filter:** Runs once per week (Sunday night). Filters all 503 S&P 500 stocks down to an objective watchlist of 60–80 tradeable candidates.
2. **Tier 2 — Momentum Scan:** Runs every weeknight at 11:00 PM AEST. Scans the active watchlist to extract the top 10–15 strongest moving candidates for final AI sentiment processing.

---

## Watchlist Filter Criteria

| Filter | Rule | Target Mitigation |
| :--- | :--- | :--- |
| **Minimum Volume** | Average daily volume > 1,000,000 shares | Eliminates illiquid stocks to prevent bad order execution. |
| **Price Floor** | Share price > $10 | Eliminates highly volatile penny stocks and micro-caps. |
| **Price Ceiling** | Share price < Dynamic Maximum | Eliminates stocks where a single share exceeds the risk budget. |
| **Volatility Band** | ATR between 1% and 5% of share price | Eliminates stagnant stocks (too flat) or erratic ones (too wild). |
| **Earnings Window** | No earnings announcements in next 5 days | Eliminates binary, unpredictable event risk. |

### Dynamic Price Ceiling Formula
The maximum share price scales dynamically with your capital allocation rules:
* `max_position_dollars = portfolio_value * 0.08` (8% max position size)
* `max_share_price = max_position_dollars * 0.90` (10% safety buffer)

---

## Core Implementation (Option 1: TradingView Screener)

This method performs all mathematical indicator calculations (RSI, ATR, SMAs) server-side on TradingView, minimizing local computing overhead down to a single fast API query.

### 1. Installation
Ensure the screener package is installed in your virtual environment:
```bash
pip install tradingview-screener

```

### 2. Tier 1 Universe Filter Script

Create this file at `backend/scanner/universe_filter.py`:

```python
import os
import json
import pandas as pd
import alpaca_trade_api as tradeapi
from datetime import datetime, timedelta
from dotenv import load_dotenv
from tradingview_screener import Query, col

load_dotenv()

# Configuration Settings
MIN_AVG_VOLUME  = 1_000_000
MIN_PRICE       = 10.0
MIN_ATR_PCT     = 1.0
MAX_ATR_PCT     = 5.0
EARNINGS_WINDOW = 5
WATCHLIST_PATH  = 'data/watchlist.json'

def get_max_share_price():
    max_position_pct = float(os.getenv('MAX_POSITION_SIZE_PCT', 0.08))
    try:
        api = tradeapi.REST(
            key_id     = os.getenv('ALPACA_API_KEY'),
            secret_key = os.getenv('ALPACA_SECRET_KEY'),
            base_url   = os.getenv('ALPACA_BASE_URL'),
        )
        portfolio_value = float(api.get_account().portfolio_value)
        max_position    = portfolio_value * max_position_pct
        max_price       = max_position * 0.90
        return max_price
    except Exception as e:
        print(f'Using fallback execution bounds due to error: {e}')
        return 360.0

def run_tradingview_filter(max_share_price):
    print('Querying TradingView screener server metrics...')
    count, df = (Query()
        .select(
            'name', 'close', 'volume', 'average_volume_10d_calc',
            'ATR', 'RSI', 'SMA20', 'SMA50'
        )
        .where(
            col('index').isin(['S&P 500']),
            col('average_volume_10d_calc') > MIN_AVG_VOLUME,
            col('close') > MIN_PRICE,
            col('close') < max_share_price,
            col('ATR.Percent') > MIN_ATR_PCT,
            col('ATR.Percent') < MAX_ATR_PCT,
        )
        .order_by('volume', ascending=False)
        .limit(200)
        .get_scanner_data()
    )
    return df

def exclude_earnings_stocks(df):
    import yfinance as yf
    safe_rows = []
    cutoff = datetime.now() + timedelta(days=EARNINGS_WINDOW)
    
    for _, row in df.iterrows():
        ticker = row['name']
        try:
            t = yf.Ticker(ticker)
            calendar = t.calendar
            if calendar is None or calendar.empty:
                safe_rows.append(row)
                continue
            date_cols = [c for c in calendar.columns if 'Earnings' in str(c)]
            if not date_cols:
                safe_rows.append(row)
                continue
            earnings_date = pd.Timestamp(calendar[date_cols[0]].iloc[0])
            if pd.isnull(earnings_date) or earnings_date > cutoff:
                safe_rows.append(row)
        except Exception:
            safe_rows.append(row)
            
    return pd.DataFrame(safe_rows).reset_index(drop=True)

def save_watchlist(df):
    os.makedirs('data', exist_ok=True)
    stocks = []
    for _, row in df.iterrows():
        stocks.append({
            'ticker': row['name'],
            'price':  round(float(row['close']), 2),
            'volume': int(row['average_volume_10d_calc']),
            'atr':    round(float(row['ATR']), 2),
            'rsi':    round(float(row['RSI']), 1),
            'sma20':  round(float(row['SMA20']), 2),
            'sma50':  round(float(row['SMA50']), 2),
        })
        
    output = {
        'generated_at': datetime.now().isoformat(),
        'method':       'tradingview-screener',
        'stock_count':  len(stocks),
        'stocks':       stocks,
    }
    with open(WATCHLIST_PATH, 'w') as f:
        json.dump(output, f, indent=2)

def run_universe_filter():
    max_price = get_max_share_price()
    df = run_tradingview_filter(max_price)
    df = exclude_earnings_stocks(df)
    save_watchlist(df)
    print(f'Universe filter complete. Saved {len(df)} assets.')

if __name__ == '__main__':
    run_universe_filter()

```

### 3. Nightly Tier 2 Momentum Scanner Script

Create or update your file at `backend/scanner/momentum_scanner.py`:

```python
import os
import json
import ta
from backend.data_fetcher import get_stock_data

WATCHLIST_PATH = 'data/watchlist.json'

def load_watchlist():
    if not os.path.exists(WATCHLIST_PATH):
        raise FileNotFoundError('Watchlist source file missing. Execute Tier 1 universe scan first.')
    with open(WATCHLIST_PATH, 'r') as f:
        data = json.load(f)
    return data.get('stocks', [])

def calculate_momentum_score(stock):
    """Evaluates asset structure from pre-calculated metrics."""
    score = 0
    rsi   = stock.get('rsi')
    sma20 = stock.get('sma20')
    sma50 = stock.get('sma50')
    atr   = stock.get('atr', 0)
    price = stock.get('price', 0)

    # Local indicators fallback pipeline
    if not all([rsi, sma20, sma50]):
        try:
            df    = get_stock_data(stock['ticker'])
            rsi   = ta.momentum.RSIIndicator(df['Close']).rsi().iloc[-1]
            sma20 = df['Close'].rolling(20).mean().iloc[-1]
            sma50 = df['Close'].rolling(50).mean().iloc[-1]
            atr   = ta.volatility.AverageTrueRange(df['High'], df['Low'], df['Close']).average_true_range().iloc[-1]
            price = df['Close'].iloc[-1]
        except Exception:
            return 0, 0

    if rsi and 50 < rsi < 70:             score += 1
    if price and sma20 and price > sma20: score += 1
    if sma20 and sma50 and sma20 > sma50: score += 1

    return score, atr

def run_scan():
    watchlist = load_watchlist()
    candidates = []
    
    for stock in watchlist:
        try:
            score, atr = calculate_momentum_score(stock)
            if score >= 2:
                candidates.append({
                    'ticker': stock['ticker'],
                    'score':  score,
                    'price':  stock['price'],
                    'atr':    round(atr, 2)
                })
        except Exception:
            pass
            
    candidates.sort(key=lambda x: x['score'], reverse=True)
    return candidates

if __name__ == '__main__':
    results = run_scan()

```

---

## Task Scheduling

Integrate the automated execution rules into the main orchestrator engine (`backend/bot.py`):

```python
from backend.scanner.universe_filter import run_universe_filter
from apscheduler.schedulers.blocking import BlockingScheduler

if __name__ == '__main__':
    import sys
    
    if '--now' in sys.argv:
        run_bot()  
    elif '--update-watchlist' in sys.argv:
        run_universe_filter()  
    else:
        scheduler = BlockingScheduler()
        
        # Nightly Strategy pipeline: Monday-Friday 11:00 PM AEST (13:00 UTC)
        scheduler.add_job(run_bot, 'cron', hour=13, minute=0)
        
        # Weekly Watchlist Generation: Sunday 10:00 PM AEST (12:00 UTC)
        scheduler.add_job(run_universe_filter, 'cron', day_of_week='sun', hour=12, minute=0)
        
        scheduler.start()

```

---

## Engine Timeline Flow

| Event Execution | Process Target Module | Data Input | Output Endpoint | Est. Runtime |
| --- | --- | --- | --- | --- |
| **Sunday 10:00 PM AEST** | Universe Filter (`tradingview-screener`) | S&P 500 Global Basket | `watchlist.json` (~65 tickers) | ~30 seconds |
| **Mon–Fri 11:00 PM AEST** | Momentum Scan | Active Watchlist File | Top 10–15 Assets Shortlist | ~2 minutes |
| **Mon–Fri 11:00 PM AEST** | AI Sentiment (Claude Agent Execution) | Extracted Shortlist | Binary Buy/Skip Decision Matrix | ~30 seconds |
| **Mon–Fri 11:00 PM AEST** | Risk Gate Validation | Processing Signals | Validated Allocation Targets | <1 second |
| **Mon–Fri 11:30 PM AEST** | Alpaca Bracket Order Execution | Approved Orders Block | Active API Position Bracket Orders | <5 seconds |
| **Market Close Evaluation** | Automated Learning Loop System | Strategy Realized Metrics | Performance Database Updates | <1 second |

```

```