# 💡 Iteration 2 — Ideas

**Not a roadmap** — one-line bullets only.

Captured during iteration 1. When iteration 1 is finished, use this list to draft `iteration-02-roadmap.md`.

📌 Index → [master.md](master.md)

---

- Evaluate Tiingo (tiingo.com) as a NewsAPI alternative — richer financial news, dedicated stock news endpoint; decide before Phase 4 if NewsAPI quality proves insufficient

- Finnhub earnings filter: use the `hour` field (`"bmo"` / `"amc"`) to exclude stocks only during the actual risk window instead of a flat 5-day ban — reduces false-positive exclusions
- Finnhub earnings filter: pass `epsEstimate` and `revenueEstimate` to Claude as additional context for sentiment analysis alongside news headlines

- ✅ **Built in iteration 1 (Phase 6)** — no longer deferred. Trailing-stop exit replaces the fixed +2:1 target so winners can run; **use Alpaca's native trailing stop**, NOT a custom monitoring loop. The bullets below record the design decisions that carried into the Phase 6 build. One deviation from them: `trail_percent` is derived per-candidate from `trade_levels['stop_pct']`, not read from a fixed config dial — a flat 1.5% would have been far tighter than the ATR stop the EV and Kelly sizing assumed (see the Phase 6 addendum in the roadmap).
- Decision made: go with Alpaca native `trailing_stop` order (`trail_percent`, e.g. 1.5) — Alpaca tracks the high-water mark and ratchets the stop broker-side, so no intraday polling loop / `active_positions` tracker is needed (confirmed in docs.alpaca.markets/us/docs/orders-at-alpaca)
- Deliberately dropped: the source strategy's two-phase trail (hold a −2% stop until +3% gain, then start trailing). Alpaca has no activation-price/profit-threshold param — its trail starts the instant the order is submitted. Accepting single-phase (trail from entry) keeps this to one order parameter
- Trade-off to validate in paper trading: a trail-from-entry exits on early noise that a two-phase trail would ride through — worth exiting sooner if early dips usually keep falling, worse if they usually recover. Measure on our universe before reconsidering the two-phase version
- Structural consequence: Alpaca does NOT support a trailing stop as a bracket/OCO leg (single orders only) — so we can't pair native trailing stop + fixed take-profit in one bracket. Consistent with trailing (let winners run, no fixed target); `target`/`reward_risk` in trade_levels.py then survive only for EV/sizing, not as an exit
- Phase 6 executor work shrinks to: place entry, then place a standalone `trailing_stop` order with `trail_percent` from config — no runtime/monitoring service required

- Two-phase trail: hold a fixed stop until the trade is +3% up, then start trailing — decide from Phase 10 paper data whether trail-from-entry exits on early noise that a two-phase trail would have ridden through (Alpaca has no activation-price param, so this needs a custom monitoring loop; only worth it if the data says so)
- Recalibrate the EV/Kelly `reward_risk` input from realized paper trades — the 2.0 is inherited from the take-profit design that Phase 6 removed, and no target order is placed any more
- Overnight gap protection: trailing stops don't trigger outside regular hours, so evaluate whether to cap exposure (smaller size, or exit before the close) on names with elevated gap risk

<!-- Add new ideas below (one line each) -->
