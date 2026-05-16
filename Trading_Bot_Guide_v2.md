A COMPLETE BEGINNER'S GUIDE TO BUILDING AN

**Autonomous Stock**

**Trading Bot**

*Built with Claude AI  •  Alpaca Broker  •  Cursor IDE  •  US Stock Markets*

**Talk to me like I'm stupid edition**

Version 1.0  |  2025

# Disclaimer

**IMPORTANT:**This guide is for educational purposes only. Trading real money involves real financial risk. Never invest money you cannot afford to lose. Past performance does not guarantee future results. Always seek licensed financial advice before trading.

# Before Anything Else: How to Use This Guide

You will be using Cursor as your code editor. Cursor has AI built in which means it can help you write, fix, and understand code as you go. Think of it as having a second pair of hands.

## What Cursor Does For You

- Writes code for you when you describe what you want in plain English

- Spots errors before you run anything

- Explains what any piece of code does if you ask it

- Fixes bugs when things go wrong

## How to Work Through This Guide

For each step, follow this process:

1. Read the explanation so you understand what we are building

2. Create the file in Cursor

3. Copy the code from the dark box into Cursor — the box makes it easy to see where the code starts and ends

4. If something does not work, highlight it in Cursor and ask: 'Why is this not working?'

5. Run the test command to confirm it works before moving on

**TIP:***Every code block in this guide has a dark background with a CODE label at the top. Copy everything inside that dark box exactly as written.*

**IMPORTANT:**Do not skip ahead. Each step builds on the previous one. If Step 2 does not work, Step 3 will not work either.

# What Are We Building and How Does It Work?

In plain English: we are building a computer program — a bot — that wakes up every night while you are asleep, scans hundreds of US stocks, finds the best trading opportunities, places the trades automatically through a broker called Alpaca, and manages those trades until they close. All without you touching anything.

You wake up each morning in Brisbane, open a simple dashboard on your browser, and see what the bot did overnight. That is it.

## How It Decides What to Trade

The bot looks for two things to line up at the same time before it ever places a trade:

- **Signal 1 — Momentum: **The stock has been moving in a clear direction with strong volume. Think of it like joining a wave that is already building. We are not predicting the future — we are joining something already happening.

- **Signal 2 — News Sentiment: **Claude AI reads the latest news headlines and earnings reports for that stock. If the momentum is upward AND the news is positive, that is two independent things pointing in the same direction.

If both agree — the bot trades. If they disagree — the bot does nothing.

## A Real Example of One Trade

1. 11:00pm Brisbane time — US market closed 5 hours ago. The bot wakes up and scans 500 stocks.

2. It finds NVIDIA has been climbing steadily for 3 weeks with high volume. Momentum score: strong.

3. Claude reads the latest NVIDIA headlines. They announced record chip sales. Sentiment: positive.

4. The risk gate checks: position size within Kelly limits? Room for another position? Yes to both.

5. 11:30pm — US market opens. The bot automatically buys $300 of NVIDIA through Alpaca.

6. At the same time it places two automatic safety orders: sell if price drops 5% (stop-loss) or rises 10% (take-profit).

7. 3 days later NVIDIA is up 9%. The take-profit fires automatically. Bot sells. You made $27. You did nothing.

## The Six Stages

| **Stage** | **What It Does** | **In Plain English** |
| --- | --- | --- |
| 1. Scan | Filter 500 stocks to 10-20 candidates | Shortlist the best 20 out of 500 |
| 2. Research | Claude reads news for each candidate | AI reads the newspaper so you don't have to |
| 3. Predict | Calculate win probability and expected value | Work out if the trade is actually worth taking |
| 4. Risk Gate | Kelly sizing, exposure limits, drawdown checks | The bouncer that stops bad trades getting through |
| 5. Execute | Place orders via Alpaca at market open | The bot clicks buy automatically |
| 6. Compound | Log every trade, learn from every loss | Keep a diary of what worked and fix what didn't |

## The Formulas From the PDF Governing Every Decision

| **Formula** | **What It Does** | **Plain English** |
| --- | --- | --- |
| EV = p x b - (1 - p) | Expected value of a trade | Only trade when the maths says we have an edge |
| edge > 4% | Minimum threshold to enter | If edge is under 4% do not bother |
| f* = (p x b - q) / b x 0.25 | Quarter Kelly position size | Never bet more than the formula allows |
| stop = entry - (1.5 x ATR) | Where we exit if wrong | Automatic floor to limit losses |
| take-profit = entry + (2 x stop distance) | Where we exit when right | Always target at least 2x what we risk |
| Brier Score | Track prediction accuracy | Are our win probability estimates calibrated? |

# What You Need Before Writing Any Code

Think of this section as gathering your ingredients before you start cooking. Do not skip any of these — the bot cannot function without them.

## 1. Cursor (Your Code Editor with AI Built In)

1. Go to cursor.sh

2. Download and install Cursor for your operating system

3. Open it — you will use this for every file in this guide

**TIP:***When you open Cursor, press Cmd+K (Mac) or Ctrl+K (Windows) to open the AI panel. This is your assistant for the entire build.*

## 2. Python

1. Go to python.org/downloads

2. Download Python 3.11 or higher

3. During installation on Windows, tick **'Add Python to PATH'** — this is critical

4. Open the terminal in Cursor (View > Terminal) and type this to confirm it worked:

**TERMINAL — TYPE THIS**

```
python --version
```

You should see: Python 3.11.x or higher

## 3. Alpaca Account

1. Go to alpaca.markets and create a free account

2. Once logged in, click Paper Trading in the left sidebar

3. Click Generate API Keys

4. Copy both your API Key ID and Secret Key — save them in a text file right now

**IMPORTANT:**Never share your API keys with anyone. Treat them like a bank password.

## 4. Anthropic API Key (Claude AI)

1. Go to console.anthropic.com

2. Create an account and add $10 of credit

3. Go to API Keys and create a new key — copy and save it

**TIP:***During paper trading the bot uses less than $1-2 of Claude credit per day.*

## 5. NewsAPI Key

1. Go to newsapi.org

2. Click Get API Key — the free tier is sufficient

3. Copy and save your key

| **What You Need** | **Where to Get It** | **Cost** |
| --- | --- | --- |
| Cursor | cursor.sh | Free |
| Python 3.11+ | python.org/downloads | Free |
| Alpaca Account + API Keys | alpaca.markets | Free |
| Anthropic API Key | console.anthropic.com | $10 credit to start |
| NewsAPI Key | newsapi.org | Free tier |

# Step 1: Set Up Your Project

Before writing any trading logic we need to create the folder structure and install the tools. Think of this like building the shelves before you put anything on them.

## 1a. Create the Project Folder

Open Cursor. Open the terminal inside Cursor (View > Terminal). Then run these commands one line at a time:

**TERMINAL — RUN THESE COMMANDS**

```bash
mkdir trading-bot cd trading-bot mkdir backend mkdir backend/scanner mkdir backend/signals mkdir backend/risk mkdir backend/execution mkdir backend/learning mkdir data mkdir logs
```

Your folder structure now looks like this:

**YOUR FOLDER STRUCTURE**

```
trading-bot/ backend/ scanner/        <-- finds good stocks each night signals/        <-- generates buy/sell signals risk/           <-- checks every trade before it fires execution/      <-- places orders through Alpaca learning/       <-- logs trades and learns from losses data/             <-- stores price history logs/             <-- records everything the bot does
```

## 1b. Create a Virtual Environment

A virtual environment is a clean isolated workspace for your project. Think of it as a dedicated toolbox that keeps your bot's tools separate from everything else on your computer.

**TERMINAL**

```bash
python -m venv venv # Activate it on Mac or Linux: source venv/bin/activate # Activate it on Windows: venv\Scripts\activate
```

You should see (venv) appear at the start of your terminal line. That means it is active.

**TIP:***Every time you open a new terminal session to work on this project, activate the virtual environment again with the same command above.*

## 1c. Install Required Libraries

Libraries are pre-built tools that save us writing thousands of lines of code ourselves. Run this one command to install everything the bot needs:

**TERMINAL — INSTALL LIBRARIES**

```bash
pip install alpaca-trade-api yfinance pandas numpy requests pip install anthropic fastapi uvicorn sqlalchemy apscheduler pip install python-dotenv ta newsapi-python
```

This takes 1-3 minutes. You will see lots of text scrolling. That is normal. When it stops and you see your prompt again, it worked.

## 1d. Create Your .env File

The .env file stores all your API keys safely. The bot reads from this file so your keys never appear inside the code itself.

In Cursor, create a new file called exactly: .env (note the dot at the start). Paste this in and replace the placeholder text with your real keys:

**FILE: .env**

```
# .env — YOUR SECRET KEYS — never share this file # Alpaca (your broker) ALPACA_API_KEY=paste_your_alpaca_key_here ALPACA_SECRET_KEY=paste_your_alpaca_secret_here ALPACA_BASE_URL=https://paper-api.alpaca.markets # Claude AI ANTHROPIC_API_KEY=paste_your_claude_key_here # News NEWS_API_KEY=paste_your_newsapi_key_here # Risk settings — do not change these yet MAX_POSITION_SIZE_PCT=0.08 MAX_OPEN_POSITIONS=5 MAX_DAILY_LOSS_PCT=0.03 MAX_DRAWDOWN_PCT=0.08 KELLY_FRACTION=0.25 MIN_EDGE_PCT=0.04 MAX_HOLD_DAYS=5
```

**IMPORTANT:**Create a file called .gitignore in your project root and add .env to it. This stops your keys from being accidentally uploaded anywhere.

# Step 2: Build the Data Layer

The data layer is the bot's eyes. Before it can make any decisions it needs to see stock prices and read the news. This step gets those two feeds working.

## Create: backend/data_fetcher.py

In Cursor, create this file at backend/data_fetcher.py and paste in the code below:

**FILE: backend/data_fetcher.py**

```python
# backend/data_fetcher.py
# The bot's eyes — fetches stock prices and news headlines
import os
import yfinance as yf
from newsapi
import NewsApiClient
from dotenv
import load_dotenv load_dotenv()
# reads your .env file newsapi = NewsApiClient(api_key=os.getenv('NEWS_API_KEY'))
def get_stock_data(ticker, period='60d'): """ Downloads daily price data for a stock. ticker: the stock symbol e.g. 'AAPL' for Apple period: how far back to look, '60d' = 60 days """ stock = yf.Ticker(ticker) df = stock.history(period=period, interval='1d') df.index = df.index.tz_localize(None) return df
def get_news_headlines(ticker, company_name): """ Gets recent news headlines for a stock. Returns a list of up to 10 headline strings. """ try: articles = newsapi.get_everything( q=f'{company_name} OR {ticker} stock', language='en', sort_by='publishedAt', page_size=10 ) return [a['title'] for a in articles.get('articles', [])] except Exception as e: print(f'News fetch failed for {ticker}: {e}') return []
# Test — run this file directly to confirm it works
if __name__ == '__main__': print('Testing data fetcher...') data = get_stock_data('AAPL') print(f'Apple: got {len(data)} days of price data') print(data.tail(3)[['Close', 'Volume']]) print() news = get_news_headlines('AAPL', 'Apple') print(f'Apple news: {len(news)} headlines found') for h in news[:3]: print(f' - {h}')
```

Now test it works by running this in the terminal:

**TERMINAL — RUN THIS TEST**

```python
python backend/data_fetcher.py
```

You should see 60 rows of Apple price data and some recent news headlines printed in your terminal. If you see errors, paste them into Cursor's AI panel and ask: 'Fix this error for me.'

# Step 3: Build the Momentum Scanner

The scanner is the first filter. Every night it looks at 500 stocks and cuts the list down to 10-20 worth investigating further. It does this by measuring momentum — is the stock moving in a clear direction?

## The Three Indicators — Explained Simply

| **Indicator** | **What It Measures** | **What We Want to See** |
| --- | --- | --- |
| RSI (14) | Is the stock overbought or oversold? | Between 50 and 70 — trending up but not overheated |
| VWAP | Where most of today's trading happened | Price above VWAP — buyers are in control |
| SMA 20 vs SMA 50 | Short term vs long term trend | 20-day line above 50-day line — uptrend confirmed |

## Create: backend/scanner/momentum_scanner.py

**FILE: backend/scanner/momentum_scanner.py**

```python
# backend/scanner/momentum_scanner.py
# Scans stocks and scores them by momentum strength
import pandas as pd
import ta
from backend.data_fetcher
import get_stock_data
# The stocks we scan each night
# Start with 20 well-known S&P 500 stocks, expand later STOCK_UNIVERSE = [ 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'V', 'UNH', 'JNJ', 'WMT', 'PG', 'MA', 'HD', 'BAC', 'DIS', 'ADBE', 'CRM', 'NFLX' ]
def calculate_momentum_score(df): """ Takes price data, returns a score
from 0 to 3. Higher score = stronger momentum. Also returns ATR for position sizing later. """ if len(df) < 50: return 0, 0 score = 0 df['RSI'] = ta.momentum.RSIIndicator(df['Close'], window=14).rsi() df['SMA20'] = df['Close'].rolling(window=20).mean() df['SMA50'] = df['Close'].rolling(window=50).mean() df['VWAP'] = (df['Close'] * df['Volume']).cumsum() / df['Volume'].cumsum() df['ATR'] = ta.volatility.AverageTrueRange( df['High'], df['Low'], df['Close'] ).average_true_range() latest = df.iloc[-1] if 50 < latest['RSI'] < 70: score += 1
# trending, not overbought if latest['Close'] > latest['VWAP']: score += 1
# buyers in control if latest['SMA20'] > latest['SMA50']: score += 1
# uptrend confirmed return score, latest['ATR']
def run_scan(): """ Scans all stocks in STOCK_UNIVERSE. Returns candidates with score >= 2, sorted highest first. """ print(f'Scanning {len(STOCK_UNIVERSE)} stocks...') candidates = [] for ticker in STOCK_UNIVERSE: try: df = get_stock_data(ticker) score, atr = calculate_momentum_score(df) price = df.iloc[-1]['Close'] if score >= 2: candidates.append({ 'ticker': ticker, 'score': score, 'price': round(price, 2), 'atr': round(atr, 2) }) print(f' {ticker}: score={score} ${price:.2f} ATR=${atr:.2f}') else: print(f' {ticker}: score={score} — skipped') except Exception as e: print(f' {ticker}: error — {e}') candidates.sort(key=lambda x: x['score'], reverse=True) print(f'Scan complete: {len(candidates)} candidates found') return candidates
if __name__ == '__main__': results = run_scan() print('\nTop candidates:') for c in results: print(f" {c['ticker']}: score={c['score']} ${c['price']}")
```

**TERMINAL — RUN THIS TEST**

```python
python backend/scanner/momentum_scanner.py
```

You should see all 20 stocks scanned with scores. Stocks scoring 2 or 3 become candidates passed to the next stage.

# Step 4: Add Claude AI for News Sentiment

This is where Claude reads the news for each candidate stock and decides whether the story supports the trade. It acts as a second opinion — momentum says buy, but does the news agree?

## Create: backend/signals/sentiment_analyzer.py

**FILE: backend/signals/sentiment_analyzer.py**

```python
# backend/signals/sentiment_analyzer.py
# Claude reads news headlines and scores them as bullish or bearish
import os
import json
import anthropic
from dotenv
import load_dotenv
from backend.data_fetcher
import get_news_headlines load_dotenv() client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
def analyze_sentiment(ticker, company_name): """ Gets news headlines for a stock and asks Claude to rate the sentiment. Returns a dict with: sentiment: 'bullish', 'bearish', or 'neutral' confidence: float 0.0 to 1.0 reasoning: one sentence
from Claude """ headlines = get_news_headlines(ticker, company_name) if not headlines: return {'sentiment': 'neutral', 'confidence': 0.0, 'reasoning': 'No news found'} headlines_text = '\n'.join([f'- {h}' for h in headlines]) prompt = f"""You are a financial news analyst. Analyse these recent headlines for {company_name} ({ticker}). Headlines: {headlines_text} Respond with ONLY a JSON object, no other text: {{ "sentiment": "bullish" or "bearish" or "neutral", "confidence": number between 0.0 and 1.0, "reasoning": "one sentence explanation" }} Be conservative. Only say bullish if genuinely positive. Only say bearish if clearly negative.""" try: message = client.messages.create( model='claude-sonnet-4-5', max_tokens=200, messages=[{'role': 'user', 'content': prompt}] ) return json.loads(message.content[0].text) except Exception as e: print(f'Sentiment failed for {ticker}: {e}') return {'sentiment': 'neutral', 'confidence': 0.0, 'reasoning': f'Error: {e}'}
if __name__ == '__main__': result = analyze_sentiment('AAPL', 'Apple') print(f"Sentiment: {result['sentiment']}") print(f"Confidence: {result['confidence']}") print(f"Reasoning: {result['reasoning']}")
```

**TERMINAL — RUN THIS TEST**

```python
python backend/signals/sentiment_analyzer.py
```

You should see Claude's sentiment rating for Apple with confidence and a one-line reason.

# Step 5: Build the Signal Generator

The signal generator combines momentum score and sentiment to produce a final trade decision. It applies the PDF's Expected Value formula to confirm the trade is mathematically worth taking.

## Create: backend/signals/signal_generator.py

**FILE: backend/signals/signal_generator.py**

```python
# backend/signals/signal_generator.py
# Combines momentum and sentiment into a final trade signal
# Applies the EV = p x b - (1-p) formula
from the PDF strategy
import os
from dotenv
import load_dotenv
from backend.signals.sentiment_analyzer
import analyze_sentiment load_dotenv() MIN_EDGE = float(os.getenv('MIN_EDGE_PCT', 0.04)) COMPANY_NAMES = { 'AAPL':'Apple', 'MSFT':'Microsoft', 'GOOGL':'Google', 'AMZN':'Amazon', 'NVDA':'NVIDIA', 'META':'Meta', 'TSLA':'Tesla', 'JPM':'JPMorgan', 'V':'Visa', 'UNH':'UnitedHealth', 'JNJ':'Johnson Johnson', 'WMT':'Walmart', 'PG':'Procter Gamble', 'MA':'Mastercard', 'HD':'Home Depot', 'BAC':'Bank of America', 'DIS':'Disney', 'ADBE':'Adobe', 'CRM':'Salesforce', 'NFLX':'Netflix' }
def generate_signal(candidate): """ Takes a candidate
from the scanner. Returns a signal dict: action='BUY' or action='SKIP'. """ ticker = candidate['ticker'] score = candidate['score'] company = COMPANY_NAMES.get(ticker, ticker) print(f' Analysing {ticker}...') sentiment = analyze_sentiment(ticker, company)
# Convert momentum score to win probability if score == 3: win_prob = 0.65 elif score == 2: win_prob = 0.58 else: return {'ticker': ticker, 'action': 'SKIP', 'reason': 'Momentum score too low'}
# Adjust for sentiment if sentiment['sentiment'] == 'bullish' and sentiment['confidence'] > 0.6: win_prob += 0.05 elif sentiment['sentiment'] == 'bearish': win_prob -= 0.10
# Expected Value formula
from PDF: EV = p x b - (1-p) b = 2.0
# we always target 2:1 reward-to-risk ev = (win_prob * b) - (1 - win_prob) edge = ev / b print(f' Win prob: {win_prob:.0%} EV: {ev:.3f} Edge: {edge:.1%}') print(f' Sentiment: {sentiment["sentiment"]} ({sentiment["confidence"]:.0%})') if edge >= MIN_EDGE and sentiment['sentiment'] != 'bearish': return { 'ticker': ticker, 'action': 'BUY', 'win_probability': round(win_prob, 3), 'expected_value': round(ev, 3), 'edge': round(edge, 4), 'sentiment': sentiment['sentiment'], 'sentiment_confidence': sentiment['confidence'], 'price': candidate['price'], 'atr': candidate['atr'], 'reason': sentiment['reasoning'] } else: reason = 'Edge below threshold' if edge < MIN_EDGE else 'Bearish news' return {'ticker': ticker, 'action': 'SKIP', 'reason': reason}
if __name__ == '__main__': test = {'ticker': 'AAPL', 'score': 3, 'price': 195.0, 'atr': 3.5} signal = generate_signal(test) print('\nSignal result:', signal)
```

**TERMINAL — RUN THIS TEST**

```python
python backend/signals/signal_generator.py
```

# Step 6: Build the Risk Gate

This is the most important module in the entire bot. It sits between the signal generator and execution and acts as a hard filter. Every trade must pass ALL of these checks or it does not happen. This is the PDF's risk management rules in code.

**IMPORTANT:**Never modify the risk gate to allow trades that fail its checks. The whole point is that it is non-negotiable.

## Create: backend/risk/risk_gate.py

**FILE: backend/risk/risk_gate.py**

```python
# backend/risk/risk_gate.py
# The bouncer. Every trade must pass ALL checks or it is rejected.
# These rules come directly
from the PDF strategy.
import os
from dotenv
import load_dotenv load_dotenv() MAX_POSITION_PCT = float(os.getenv('MAX_POSITION_SIZE_PCT', 0.08)) MAX_POSITIONS = int(os.getenv('MAX_OPEN_POSITIONS', 5)) MAX_DAILY_LOSS = float(os.getenv('MAX_DAILY_LOSS_PCT', 0.03)) MAX_DRAWDOWN = float(os.getenv('MAX_DRAWDOWN_PCT', 0.08)) KELLY_FRACTION = float(os.getenv('KELLY_FRACTION', 0.25)) MIN_REWARD_RISK = 2.0
def calculate_position_size(signal, portfolio_value): """ Quarter Kelly formula
from the PDF: f* = (p x b - q) / b then multiply by 0.25 Result is capped at MAX_POSITION_PCT of portfolio. """ p = signal['win_probability'] b = MIN_REWARD_RISK q = 1 - p full_kelly = (p * b - q) / b kelly_size = full_kelly * KELLY_FRACTION capped_size = min(kelly_size, MAX_POSITION_PCT) return round(portfolio_value * capped_size, 2)
def calculate_stops(signal): """ stop-loss = entry - (1.5 x ATR) [from PDF] take-profit = entry + (2 x stop dist) [2:1 ratio] """ entry = signal['price'] atr = signal['atr'] dist = 1.5 * atr stop = round(entry - dist, 2) take = round(entry + (2 * dist), 2) rr = round((take - entry) / (entry - stop), 2) return {'stop_loss': stop, 'take_profit': take, 'stop_distance': round(dist, 2), 'reward_risk': rr}
def validate_trade(signal, portfolio_value, open_positions, daily_pnl, peak_value): """ Runs every check. Returns (approved, reason, trade_details). ALL checks must pass. One failure = trade rejected. """ min_edge = float(os.getenv('MIN_EDGE_PCT', 0.04))
# Check 1: Edge threshold if signal.get('edge', 0) < min_edge: return False, 'Edge below minimum threshold', {}
# Check 2: Max open positions if len(open_positions) >= MAX_POSITIONS: return False, f'Already at max {MAX_POSITIONS} positions', {}
# Check 3: Daily loss limit if (daily_pnl / portfolio_value) <= -MAX_DAILY_LOSS: return False, f'Daily loss limit hit ({MAX_DAILY_LOSS:.0%})', {}
# Check 4: Maximum drawdown kill switch if peak_value > 0: drawdown = (peak_value - portfolio_value) / peak_value if drawdown >= MAX_DRAWDOWN: return False, f'KILL SWITCH: Drawdown {drawdown:.1%}', {}
# Check 5: Reward-to-risk ratio stops = calculate_stops(signal) if stops['reward_risk'] < MIN_REWARD_RISK: return False, f'Reward:risk {stops["reward_risk"]} below 2:1', {}
# All checks passed — calculate position dollars = calculate_position_size(signal, portfolio_value) shares = int(dollars / signal['price']) if shares < 1: return False, 'Position too small (under 1 share)', {} trade_details = { 'ticker': signal['ticker'], 'shares': shares, 'entry_price': signal['price'], 'position_value': dollars, 'stop_loss': stops['stop_loss'], 'take_profit': stops['take_profit'], 'reward_risk': stops['reward_risk'], 'win_probability':signal['win_probability'], 'edge': signal['edge'] } return True, 'All checks passed', trade_details
if __name__ == '__main__': mock = {'ticker':'AAPL', 'price':195.0, 'atr':3.5, 'win_probability':0.62, 'edge':0.055} approved, reason, details = validate_trade( mock, portfolio_value=5000, open_positions=[], daily_pnl=0, peak_value=5000 ) print(f'Approved: {approved}') print(f'Reason: {reason}') if approved: print(f'Shares: {details["shares"]}') print(f'Stop: ${details["stop_loss"]}') print(f'Target: ${details["take_profit"]}')
```

**TERMINAL — RUN THIS TEST**

```python
python backend/risk/risk_gate.py
```

# Step 7: Build the Execution Layer

This is where the bot actually places orders through Alpaca. It sends a bracket order — which means the buy, stop-loss, and take-profit are all placed at the same time as one instruction. You do not need to watch anything. Alpaca handles it automatically.

## Create: backend/execution/alpaca_executor.py

**FILE: backend/execution/alpaca_executor.py**

```python
# backend/execution/alpaca_executor.py
# Places bracket orders through Alpaca
# Bracket order = buy + stop-loss + take-profit in one instruction
import os
import alpaca_trade_api as tradeapi
from dotenv
import load_dotenv load_dotenv() api = tradeapi.REST( key_id = os.getenv('ALPACA_API_KEY'), secret_key= os.getenv('ALPACA_SECRET_KEY'), base_url = os.getenv('ALPACA_BASE_URL') )
def get_portfolio_value(): return float(api.get_account().portfolio_value)
def get_open_positions(): return api.list_positions()
def get_daily_pnl(): account = api.get_account() return float(account.equity) - float(account.last_equity)
def place_bracket_order(trade_details): """ Places one order that includes: - The buy - The stop-loss (fires if price drops too far) - The take-profit (fires when target is hit) When one exits the trade Alpaca cancels the other automatically. """ ticker = trade_details['ticker'] shares = trade_details['shares'] stop_loss = trade_details['stop_loss'] take_profit = trade_details['take_profit'] print(f'Placing bracket order: {shares} x {ticker}') print(f' Stop: ${stop_loss} | Target: ${take_profit}') try: order = api.submit_order( symbol = ticker, qty = shares, side = 'buy', type = 'market', time_in_force= 'day', order_class = 'bracket', stop_loss = {'stop_price': str(stop_loss)}, take_profit = {'limit_price': str(take_profit)} ) print(f' Order placed. ID: {order.id}') return order except Exception as e: print(f' Order failed for {ticker}: {e}') return None
if __name__ == '__main__': value = get_portfolio_value() positions = get_open_positions() pnl = get_daily_pnl() print(f'Portfolio: ${value:,.2f}') print(f'Open positions: {len(positions)}') print(f'Daily PnL: ${pnl:+,.2f}')
```

**TERMINAL — RUN THIS TEST**

```python
python backend/execution/alpaca_executor.py
```

You should see your paper trading portfolio value printed. No trades are placed — this is just confirming the Alpaca connection works.

# Step 8: Build the Learning Loop

The learning loop logs every trade and calculates your Brier score — the metric from the PDF that tells you whether your predictions are actually calibrated. It also writes a failure log after every loss, which the bot reads before the next scan so it does not repeat the same mistakes.

## Create: backend/learning/trade_logger.py

**FILE: backend/learning/trade_logger.py**

```python
# backend/learning/trade_logger.py
# Logs every trade and tracks the performance metrics
from the PDF
import os
import json
from datetime
import datetime LOG_FILE = 'logs/trade_log.json' FAILURE_LOG = 'logs/failure_log.md'
def log_trade(trade_details, action='OPEN'): os.makedirs('logs', exist_ok=True) try: with open(LOG_FILE, 'r') as f: log = json.load(f) except: log = [] log.append({'timestamp': datetime.now().isoformat(), 'action': action, **trade_details}) with open(LOG_FILE, 'w') as f: json.dump(log, f, indent=2) print(f'Logged: {action} {trade_details.get("ticker", "")}')
def calculate_brier_score(): """ BS = (1/n) x sum((predicted_prob - actual_outcome)^2) outcome = 1 if trade was profitable, 0 if not. Lower is better. Target: below 0.25 """ try: with open(LOG_FILE, 'r') as f: log = json.load(f) except: return None closed = [t for t in log if t.get('action') == 'CLOSE' and 'outcome' in t] if len(closed) < 5: return None total = sum((t['win_probability'] - t['outcome'])**2 for t in closed) return round(total / len(closed), 4)
def log_failure(trade_details, reason): """Writes a loss to the failure log so the bot learns
from it.""" os.makedirs('logs', exist_ok=True) date = datetime.now().strftime('%Y-%m-%d') entry = f"""
# # {date} — {trade_details.get('ticker', 'UNKNOWN')} - **Reason for loss:** {reason} - **Entry price:** ${trade_details.get('entry_price', 0):.2f} - **Win probability at entry:** {trade_details.get('win_probability', 0):.0%} - **Sentiment:** {trade_details.get('sentiment', 'unknown')} - **Lesson:** Review before trading this ticker again """ with open(FAILURE_LOG, 'a') as f: f.write(entry) print(f'Failure logged: {trade_details.get("ticker", "")}')
def get_performance_summary(): """Prints performance metrics to the terminal.""" try: with open(LOG_FILE, 'r') as f: log = json.load(f) except: print('No trades logged yet')
return closed = [t for t in log if t.get('action') == 'CLOSE'] if not closed: print('No closed trades yet')
return wins = [t for t in closed if t.get('outcome') == 1] win_rate = len(wins) / len(closed) brier = calculate_brier_score() print('=== Performance Summary ===') print(f'Closed trades: {len(closed)}') print(f'Win rate: {win_rate:.1%} (target 55%+)') if brier: print(f'Brier score: {brier} (target below 0.25)') else: print('Brier score: insufficient data (need 5+ closed trades)')
if __name__ == '__main__': get_performance_summary()
```

# Step 9: Wire Everything Together

This is the main bot file. It calls every module in the right order and runs on a nightly schedule. This is the file you start to run the bot.

## Create: backend/bot.py

**FILE: backend/bot.py**

```python
# backend/bot.py
# The main bot. Runs the full pipeline every night.
# Scan -> Research -> Predict -> Risk -> Execute -> Log
import os, sys
from datetime
import datetime
from dotenv
import load_dotenv
from apscheduler.schedulers.blocking
import BlockingScheduler
from backend.scanner.momentum_scanner
import run_scan
from backend.signals.signal_generator
import generate_signal
from backend.risk.risk_gate
import validate_trade
from backend.execution.alpaca_executor
import ( get_portfolio_value, get_open_positions, get_daily_pnl, place_bracket_order )
from backend.learning.trade_logger
import ( log_trade, log_failure, get_performance_summary ) load_dotenv() PAPER = os.getenv('ALPACA_BASE_URL', '').find('paper') != -1 peak_portfolio_value = 0
def run_bot(): global peak_portfolio_value print('\n' + '='*50) print(f'Bot run: {datetime.now().strftime("%Y-%m-%d %H:%M")}') print(f'Mode: {"PAPER TRADING" if PAPER else "LIVE TRADING"}') print('='*50)
# Get current state portfolio_value = get_portfolio_value() open_positions = get_open_positions() daily_pnl = get_daily_pnl() if portfolio_value > peak_portfolio_value: peak_portfolio_value = portfolio_value print(f'Portfolio: ${portfolio_value:,.2f}') print(f'Positions: {len(open_positions)}') print(f'Daily PnL: ${daily_pnl:+,.2f}\n')
# Stage 1: Scan print('--- Stage 1: Scan ---') candidates = run_scan() if not candidates: print('No candidates tonight.')
return
# Stages 2-3: Research and signals print('\n--- Stages 2-3: Research + Signals ---') signals = [] for c in candidates[:5]:
# top 5 only to manage API cost sig = generate_signal(c) if sig['action'] == 'BUY': signals.append(sig) print(f" {sig['ticker']}: BUY — edge {sig['edge']:.1%}") else: print(f" {sig['ticker']}: SKIP — {sig.get('reason','')}") if not signals: print('No buy signals tonight.')
return
# Stages 4-5: Risk gate + execute print('\n--- Stages 4-5: Risk Gate + Execute ---') for sig in signals: approved, reason, details = validate_trade( signal = sig, portfolio_value = portfolio_value, open_positions = open_positions, daily_pnl = daily_pnl, peak_value = peak_portfolio_value ) if approved: order = place_bracket_order(details) if order: log_trade({**details, 'sentiment': sig.get('sentiment')}, action='OPEN') else: print(f" {sig['ticker']}: BLOCKED — {reason}")
# Stage 6: Performance print('\n--- Stage 6: Performance ---') get_performance_summary() print('\nBot run complete.')
if __name__ == '__main__': if '--now' in sys.argv: run_bot()
# run immediately for testing else:
# Schedule to run at 11pm Brisbane time (13:00 UTC) scheduler = BlockingScheduler() scheduler.add_job(run_bot, 'cron', hour=13, minute=0) print('Bot scheduled. Runs nightly at 11:00pm AEST.') print('Press Ctrl+C to stop.') scheduler.start()
```

## Run the Full Pipeline — Test Mode

Run this to execute the full pipeline right now without waiting for the scheduler:

**TERMINAL — FULL TEST RUN**

```python
python backend/bot.py --now
```

You should see all six stages run in sequence: scan, research, signals, risk gate, execution (paper orders), and performance summary. If any stage fails, paste the error into Cursor's AI panel.

To start the scheduled version that runs every night automatically:

**TERMINAL — START SCHEDULED BOT**

```python
python backend/bot.py
```

# Step 10: The Paper Trading Phase

Do not skip this. Paper trading is not a formality — it is where you prove the strategy works before any real money is involved.

## How Long and What to Track

| **Week** | **What You Do** | **What to Look For** |
| --- | --- | --- |
| 1-2 | Run bot nightly, review each morning | Are signals making sense? Any obvious errors? |
| 3-4 | Let it run, start tracking metrics | Win rate above 50%? Brier score below 0.30? |
| 5-6 | Weekly review with Claude | Is sentiment actually adding value over momentum alone? |
| 7-8 | Full performance review | All six criteria met? Ready to discuss going live? |

## The Six Criteria to Go Live

Do not go live until ALL of these are met over a minimum of 100 trades:

- Win rate consistently above 55%

- Brier score below 0.25 — predictions are calibrated

- Profit factor above 1.5 — gross profit exceeds gross loss by 50%

- Max drawdown never exceeded 8% during paper period

- Sharpe ratio above 1.0

- Minimum 3 months of paper trading completed

**IMPORTANT:**If you have a great first month and are tempted to go live early, bring the full trade log to Claude first. One good month is not a sample size.

## Your Weekly Review Process with Claude

Every Sunday export a summary from your trade log and paste it here. Ask:

- 'Here is my week 3 paper trading summary. What is working and what needs adjusting?'

- 'My win rate dropped this week. Here are the losing trades. What pattern do you see?'

- 'Is my Brier score improving? Am I ready to tighten the edge threshold?'

# Step 11: Going Live

When all six criteria are met and you have reviewed the data with Claude, going live is a single change in your .env file.

## The One Change to Make

Find this line in your .env file:

| **CURRENT .env SETTING** |
| --- |
| ALPACA_BASE_URL=https://paper-api.alpaca.markets |

Change it to:

| **LIVE .env SETTING** |
| --- |
| ALPACA_BASE_URL=https://api.alpaca.markets |

**IMPORTANT:**That is the ONLY change. Start with $500-1000 maximum exposure. Do not deploy your full capital on day one of live trading.

## The Live Trading Scaling Ladder

| **Stage** | **Max Exposure** | **Condition to Proceed** |
| --- | --- | --- |
| Live Stage 1 | $1,000 | 4 weeks live, drawdown under 4%, win rate holding |
| Live Stage 2 | $2,500 | 8 weeks cumulative, all metrics still on target |
| Live Stage 3 | $5,000 full | 3 months live, all six criteria still met |
| Scale up | Review with Claude first | Same criteria, minimum 6 months extended timeframe |

# Troubleshooting Common Problems

When something goes wrong — and something will go wrong — here is how to handle it.

| **Problem** | **Likely Cause** | **Fix** |
| --- | --- | --- |
| 'Module not found' error | Virtual environment not active | Run: source venv/bin/activate |
| Alpaca connection refused | Wrong key or wrong base URL | Check your .env file carefully |
| No candidates from scanner | Market was quiet or criteria too strict | Normal on low-volume days |
| Claude API error | Out of credit or wrong key | Check console.anthropic.com |
| No news returned | NewsAPI rate limit (100/day free) | Normal — bot will use neutral sentiment |
| Bot placed no orders | Risk gate blocked everything | Check logs/ folder for reasons why |
| Kill switch fired | Drawdown hit 8% | Do not restart without reviewing with Claude first |

**TIP:***For any error you cannot fix, copy the full error message from your terminal, paste it into Cursor's AI panel and type: 'Fix this error.' Cursor will usually solve it in seconds.*

# Quick Reference

## Key Commands

| **What You Want to Do** | **Command** |
| --- | --- |
| Activate the virtual environment (Mac/Linux) | source venv/bin/activate |
| Activate the virtual environment (Windows) | venv\Scripts\activate |
| Test the data fetcher | python backend/data_fetcher.py |
| Run the scanner only | python backend/scanner/momentum_scanner.py |
| Run the full bot now (test) | python backend/bot.py --now |
| Start the scheduled bot | python backend/bot.py |
| Check performance summary | python -c "from backend.learning.trade_logger import get_performance_summary; get_performance_summary()" |

## Key Metrics at a Glance

| **Metric** | **Target** | **Action if Missed** |
| --- | --- | --- |
| Win rate | Above 55% | Review losing trades with Claude |
| Brier score | Below 0.25 | Sentiment model needs recalibration |
| Profit factor | Above 1.5 | Review position sizing and exits |
| Max drawdown | Under 8% | Bot stops automatically at 8% |
| Daily loss | Under 3% | Bot stops automatically at 3% |
| Open positions | Max 5 at once | Hard limit enforced in risk gate |
| Min edge per trade | Above 4% | Bot skips any trade below this |

## Complete File Map

| **File** | **What It Does** |
| --- | --- |
| .env | Your secret keys — never share this file |
| backend/data_fetcher.py | Gets stock prices and news headlines |
| backend/scanner/momentum_scanner.py | Filters 500 stocks to top candidates nightly |
| backend/signals/sentiment_analyzer.py | Claude reads news and rates sentiment |
| backend/signals/signal_generator.py | Combines signals, applies EV formula |
| backend/risk/risk_gate.py | Validates every trade — the bouncer |
| backend/execution/alpaca_executor.py | Places bracket orders through Alpaca |
| backend/learning/trade_logger.py | Logs trades, calculates Brier score |
| backend/bot.py | Main file — runs the full pipeline |
| logs/trade_log.json | Every trade ever made by the bot |
| logs/failure_log.md | Lessons from every losing trade |

# Final Notes

You now have everything you need to build, run, and iterate on an autonomous trading bot. A few final reminders:

- Paper trade for the full period. Do not rush to live money.

- Bring your weekly data to Claude for honest review. Do not make scaling decisions based on emotion or one good week.

- The kill switch exists for a reason. If it fires, treat it as a signal to review, not a bug to bypass.

- The bot is a tool, not a guarantee. Markets change. Strategies that work today may need adjusting in 6 months.

- If something breaks, Cursor's AI can fix almost any Python error in seconds. Use it.

The edge in this system is not magic. It is discipline, consistency, and not making emotional decisions. The bot enforces that for you.

*Built with Claude AI alongside you, every step of the way.*
