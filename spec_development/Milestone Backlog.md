# 📥 Milestone Backlog

> **Purpose:** Capture potential future milestones discovered while building without interrupting the current work.
> 
> Items here are **candidates**, not commitments.
> 
> They only enter `Roadmap.md` after being reviewed and intentionally selected.

---

## 💡 Candidates

### Database Integration for Pipeline Execution History & Telemetry

**Why it appeared:**  
Currently, universe watchlists, pipeline telemetry, candidate decisions, and execution results exist ephemerally in memory or intermediate JSON files without durable long-term storage across sessions or restarts.

**Potential Outcome:**  
Connect the trading system to a dedicated persistent database to record every pipeline execution run, snapshot candidate status across all 5 intelligence gates, store risk metrics, and maintain a queryable audit log of historical trade orders.

**Why it might matter:**  
Enables historical run comparison, performance tracking over time, post-trade audits, data resilience across server restarts, and a future historical runs analytics view in the UI.

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