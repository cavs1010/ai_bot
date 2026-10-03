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
Implement a clean 6-table relational schema with parameter configuration management designed for deterministic auditing and run history:
1. `pipeline_configs` *(Reusable Presets)*: Stores named parameter profiles and gate thresholds created in the UI (`config_id`, `name`, `version`, `is_default`, `risk_per_trade_pct`, `parameters_json`).
2. `pipeline_runs` *(Execution Root)*: Anchors every scan run and freezes the exact parameters used (`run_id`, `config_id` FK, `config_snapshot` frozen JSON, `trigger_type`, `status`, `created_at`).
3. `portfolio_snapshots` *(Financial Context)*: Captures account capital and risk state at the exact moment the scan started (`run_id` FK, `cash_balance`, `buying_power`, `portfolio_value`).
4. `scanned_stocks` *(Passed Universe)*: Stores all candidate stocks that passed universe and momentum filtering (`run_id` FK, `ticker`, `price`, `rel_volume`, `rank`).
5. `gate_evaluations` *(Gate Decisions & LLM Output)*: Records exact pass/fail verdicts, scores, and LLM reasoning for every candidate stock (`run_id` FK, `ticker`, `gate_number`, `passed`, `score`, `reasoning`).
6. `order_executions` *(Broker Orders)*: Links final Alpaca orders and fills directly back to the originating pipeline run and gate reasoning (`run_id` FK, `ticker`, `alpaca_order_id`, `qty`, `limit_price`, `fill_price`, `status`).

**Architectural Decisions:**
- **Hybrid Storage**: Relational columns for fast querying and indexing, combined with structured JSON (`parameters_json` / `config_snapshot`) for flexible scanner and Gate 1–5 threshold tuning.
- **Immutable Freezing**: Parameters are permanently frozen at execution time into `pipeline_runs.config_snapshot`, guaranteeing 100% reproducible and tamper-proof historical audits even if preset profiles change later.

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

### Multi-User Authentication, Role-Based Access, BYO API Keys & Scenario Isolation

**Why it appeared:**  
To support collaborative scenario evaluation and secure the platform, multiple users need dedicated accounts with isolated pipeline configs, separate risk parameters, and private broker/LLM credentials.

**Potential Outcome:**  
- **Authentication & Security Layer**: Secure user login, session management, and role-based access control (e.g., Admin vs. Trader/Viewer).
- **BYO API Keys (Bring-Your-Own-Keys)**: Secure, encrypted per-user storage for external API credentials (Alpaca trading keys, Anthropic Claude, OpenAI, and other LLM/data provider keys).
- **User-Scoped Data Isolation**: Complete partitioning of data via `user_id` foreign keys linking user configs, runs, snapshots, and execution logs.
- **Scenario Evaluation**: Allows multiple users to independently test, run, and compare different parameter presets, gate thresholds, and risk models side-by-side without collision.

**Why it might matter:**  
Provides essential security for public/VPS deployments, guarantees zero credential sharing or API quota contention across users, and enables parallel scenario evaluation with user-isolated trading strategies and broker accounts.

**Related to:**  
Relational Run History, Parameter Configuration & Audit Data Architecture, Dokploy Deployment Security

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