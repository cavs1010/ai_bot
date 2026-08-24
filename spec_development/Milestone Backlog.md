# 📥 Milestone Backlog

> **Purpose:** Capture potential future milestones discovered while building without interrupting the current work.
> 
> Items here are **candidates**, not commitments.
> 
> They only enter `Roadmap.md` after being reviewed and intentionally selected.

---

## 💡 Candidates

### Relational Run History, Parameter Configuration & Audit Data Architecture (Portfolio, Configs, Scans, Gates & Executions)

**Why it appeared:**  
Currently, universe watchlists, gate decisions, price zones, execution results, and runtime parameter thresholds exist ephemerally in memory or runtime logs. Debugging why a stock was included in the universe or rejected by a specific gate requires re-running expensive LLM calls or APIs. Furthermore, parameter adjustments (scanner thresholds, sentiment cutoffs, EV ratios, risk percentages) must be dynamically customizable yet strictly tied to historical runs so past executions remain 100% reproducible and explainable.

**Potential Outcome:**  
Implement a clean relational schema with parameter configuration management designed for deterministic auditing and run history:
1. `pipeline_configs`: Parameter presets and profiles (config ID, name, version, is_active/is_default, top-level risk columns, and structured `parameters_json` for fine-grained scanner & Gate 1–5 threshold tuning).
2. `pipeline_runs`: Root execution record (run ID, foreign key `config_id`, immutable `config_snapshot` JSON freezing parameters at execution time, start/end timestamps, trigger type, status, environment).
3. `portfolio_snapshots`: Financial & risk context at run start (cash balance, buying power, active positions).
4. `scanned_stocks`: Candidate stocks passing universe & momentum scanner with exact debug filter metrics (price, 20d avg volume, relative volume, market cap, rank).
5. `gate_evaluations`: Granular decisions per gate (Gates 1–5) storing exact evaluated inputs, thresholds, scores (threat prob, sentiment score, EV ratio, trade zones), and LLM reasoning.
6. `order_executions`: Broker execution lifecycle linked directly to approved candidate stocks (Alpaca order ID, qty, limit price, fill price, status).

**Architectural Decision (Hybrid Column + JSON Pattern):**
- **Typed Columns**: Use for top-level identifiers, indexing, and high-level risk bounds (`config_id`, `name`, `version`, `risk_per_trade_pct`, `max_position_size_pct`).
- **Structured JSON (`parameters_json` / `config_snapshot`)**: Use for nested, evolving scanner thresholds and Gate 1–5 parameters (`min_rvol_20d`, `min_momentum_score`, `gate2_threat_cutoff`, `gate3_sentiment_cutoff`, `gate5_min_ev_ratio`), validated via Pydantic/Zod schemas at the application boundary.
- **Immutable Freezing**: Freezes the exact parameter snapshot into `pipeline_runs.config_snapshot` at the moment of execution so modifying a preset profile tomorrow never retroactively alters past audit trails.

**Why it might matter:**  
Provides 100% deterministic auditing and instant historical run analysis in the UI without re-querying APIs. Allows historical threshold tuning, A/B parameter performance comparisons, risk review, and complete explainability from parameter configuration to broker order execution.

**Related to:**  
[[Watchlist Generation & Dry-Run Pipeline Execution with Real-Time Funnel Telemetry]]

---

### Autonomous Nightly Execution Engine & Daemon

**Why it appeared:**  
Currently, the pipeline and order executions are initiated interactively via UI triggers. To operate as an unattended, hands-free trading bot, the system needs an autonomous background daemon/scheduler capable of orchestrating the entire lifecycle without human intervention.

**Potential Outcome:**  
Implement a background execution daemon/scheduler with market clock awareness (NYSE trading calendar, holidays, pre-market timing at 8:00 AM / 9:15 AM ET, and market open execution at 9:30 AM ET), fail-safe dead-man checks, and automated alerting (e.g., Discord/Telegram webhooks) for staged orders and fills.

**Why it might matter:**  
Fulfills the core objective of an autonomous, automated nightly trading system that scans, filters, sizes risk, and submits orders reliably without requiring manual clicks or open browser sessions.

**Related to:**  
[[Watchlist Generation & Dry-Run Pipeline Execution with Real-Time Funnel Telemetry]]

---

# 🔍 Backlog Review

> Review this section **after completing a milestone**, not while doing focused work.

For each candidate:

### Is this still relevant?

Yes / No

### Is it important enough to become a milestone?

Yes / No

### Does it need to happen soon?

Yes / No

### Decision

- → Add to `Roadmap.md`
    
- → Keep in Backlog
    
- → Merge with another Milestone
    
- → Discard
    

---

# 🔄 Workflow

### 💡 While Building

`Discover something → Capture it here → Return to Current Focus`

**Do not redesign the Roadmap in the middle of focused work.**

### 🏁 After Completing a Milestone

`Finish Milestone → Review Backlog → Re-evaluate priorities → Choose next Milestone → Update Roadmap → Create Now.md`

---

## ⚡ Capture Rule

When an idea appears, spend **as little time as possible** documenting it.

Capture:

**Problem → Potential Outcome → Why it matters**

Then return to what you were doing.