# Mission

## What We Are Building

An autonomous stock trading bot that runs overnight while you sleep, scans hundreds of US stocks, identifies high-probability trading opportunities, and places and manages trades automatically through a brokerage account — without requiring any manual intervention.

You wake up each morning, open a browser dashboard, and review what the bot did. That is the entire interaction required.

---

## Why It Exists

Traditional retail trading fails for two consistent reasons: emotion and inconsistency. Traders override systems during drawdowns, chase recent winners, and abandon strategies before they have time to prove themselves.

This bot exists to remove those failure modes. Every decision is governed by math, not feeling. Every trade must pass a defined edge threshold, a position sizing formula, and a multi-check risk gate before a single dollar is deployed. The bot cannot panic. It cannot get greedy. It cannot deviate from the rules.

The second reason is leverage of time. US markets are open while you are asleep in Australia. A bot that works those hours — and works them systematically — converts idle time into compounding opportunity.

---

## How It Works

The bot runs a six-stage pipeline every night:

| Stage | Name | What It Does |
|-------|------|--------------|
| 1 | Scan | Filters ~500 US stocks to 10–20 momentum candidates |
| 2 | Research | Claude AI reads recent news for each candidate |
| 3 | Predict | Calculates win probability and expected value using the EV formula |
| 4 | Risk Gate | Applies Kelly sizing, exposure limits, and drawdown checks |
| 5 | Execute | Places bracket orders (buy + stop-loss + take-profit) via Alpaca |
| 6 | Compound | Logs every trade and calculates prediction accuracy (Brier score) |

A trade only reaches execution when two independent signals agree: momentum (the stock is trending with volume) and sentiment (Claude's reading of the news is positive). If either signal is absent or contradictory, the bot does nothing.

---

## How We Learn From Errors

The bot logs every trade — wins and losses — to a structured trade log and a human-readable failure log. Once a week, you export that log and review it with Claude. This is a deliberate, manual process:

- You bring the data. Claude identifies patterns.
- You decide what to adjust. Claude does not adjust itself.

This approach is intentional. Automated parameter tuning requires hundreds of trades before the patterns are statistically meaningful. Passive review keeps a human in the loop during the period when sample sizes are too small to trust automation.

The weekly review asks: what did the losing trades have in common? Was sentiment confidence systematically low on losses? Did a specific sector underperform? Is the Brier score improving or degrading? Answers to those questions drive manual threshold adjustments — not code that changes itself.

---

## The Decision Rules (Non-Negotiable)

| Rule | Value | Purpose |
|------|-------|---------|
| Minimum edge per trade | > 4% | Only trade when the math says we have an advantage |
| Position size | Quarter-Kelly formula | Never overexpose on a single bet |
| Stop-loss | Entry − (1.5 × ATR) | Automatic floor on every loss |
| Take-profit | Entry + (2 × stop distance) | Always target at least 2:1 reward-to-risk |
| Max open positions | 5 | Concentrated enough to matter, diversified enough to survive |
| Daily loss limit | 3% of portfolio | Hard stop on a bad day |
| Drawdown kill switch | 8% from peak | Full halt if the system is underperforming |

---

## Success Criteria

The bot is considered ready for live money when it meets **all six** of the following over a minimum of 100 paper trades:

- Win rate consistently above 55%
- Brier score below 0.25 (predictions are calibrated)
- Profit factor above 1.5
- Maximum drawdown never exceeded 8% during the paper period
- Sharpe ratio above 1.0
- Minimum 3 months of paper trading completed

No single criterion is sufficient. All six must be met simultaneously before live capital is deployed.

---

## Long-Term Vision

The goal is not to beat the market on day one. The goal is to build a disciplined, evidence-based system that can be verified, iterated on, and scaled incrementally. Performance data drives every decision — not intuition, not headlines, not a good week.

The scaling path: paper trading → $1,000 live → $2,500 → $5,000 → data review before going further. Each step requires meeting the same criteria that qualified the previous step.

---

*Built with Claude AI · Alpaca Broker · Python · US Stock Markets*
