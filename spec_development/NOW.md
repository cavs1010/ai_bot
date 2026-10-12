# ⚡ NOW — Active Milestone

> **Purpose:** This is the project's operational document.
> 
> It should immediately answer:
> 
> **What are we trying to achieve?**  
> **What are we working on now?**  
> **What comes next?**
> 
> This document stays updated throughout the development of the milestone.

---

# 🎯 Milestone

## Name

Python Backend Architecture Cleanup

## Expected Outcome

The Python backend follows the package structure and dependency boundaries in
`docs/backend_architecture_primer.md`: one entry point, one intelligence runner,
separate gates and pure rules, and dedicated external clients. Existing production
trading decisions, stdout telemetry and JSON contracts are preserved.

Work only on `dev/bs-clean-up`. Scope is the Python backend; Node changes are limited
to the launch-path wiring required by the new entry point. Node continues to own
database persistence and supply the Neon universe batch to Python. No frontend,
API redesign, database schema changes or new trading features are included.

## Completion Criteria

The milestone is completed when:

- The backend uses the primer's named packages and `backend.…` imports, without repeated module-level `sys.path` manipulation.
- `backend/cli.py` coordinates stages; `backend/intelligence/run.py` owns the single Gates 1–5 sequence.
- Gates receive fetched facts and use rules or the shared LLM client; pure rules make no network calls.
- External clients live in `data/`, `llm/` and `broker/`; the entry supplies broker account figures to scanner and risk stages.
- `backend/config.py` is the only reader of `STRATEGY_CONFIG`; business settings continue to come from the database.
- Production Gate 4 handling, failure behavior, universe input and output contracts remain intact.
- Required Node launch paths point to the new entry, using the existing Python resolver.
- Structural review and appropriate project-owned checks pass; LLM calls and order runs require separate permission under Rule 5.
- Every bug in 🐞 is fixed, or moved to the Milestone Backlog with the user's approval.
- At the end of the milestone work, the verified backend architecture is added to `AGENTS.md` alongside the frontend structure, after approval of the exact wording under Rule 0.
- The final review has been approved.

---

# 🧩 Features

> These are the concrete capabilities required to achieve the milestone outcome.
> 
> Features can be discovered, removed, or changed while we build.

## 🔵 Active Feature

**Feature 03 — Decision and Client Boundaries**

Move data gathering out of gates into the intelligence runner, and broker account
reads out of the scanner into the entry. Keep calculations pure and external
access in clients.

**Active sub-task:** Enforce the approved strict client boundaries: pass settings,
lookup values and premarket session facts from the entry and runner, move shared
source coordination out of clients, and clean obsolete helpers and documentation.
Present this as one reviewable change with verification, then wait for user tests,
review and commit before continuing (Rule 31).

**Agreed boundaries:** Node owns the Neon universe and supplies it on stdin.
Clients receive settings and lookup values as arguments and import no other
application modules; the entry and intelligence runner coordinate external sources.

---

## ⏭️ Next Features

In the expected execution order:

1. **Feature 04 — Architecture and Contract Review**
   Verify the final structure, dependency directions, configuration ownership and Node/Python contracts against the primer and agreed scope.

**Final documentation step:** After implementation, verification and bug resolution,
document the resulting backend architecture in `AGENTS.md`, using the same approach
as its frontend structure. Present the exact wording for user approval under Rule 0
before editing that file. Do this only at the end of the milestone work, before closure.

---

## ✅ Completed Features

**Feature 01 — Python Package Structure** — ✅ Completed. Package moves, imports
and launch paths reviewed and committed; the user verified Load Watchlist.

**Feature 02 — Single Entry and Intelligence Runner** — ✅ Completed. The user
approved and committed the consolidated production gate sequence.

---

# 🐞 Bugs to Fix After the Features

> Bugs found during the milestone that don't block it. They are not fixed when found. After the last feature is done, they are fixed one at a time (root cause first, Rule 8), before the milestone review.
>
> One line per bug: `- [ ] **Short name** — what goes wrong, and where (file or screen).` When fixed, tick the box; write nothing more.

None yet.

---

# 📱 Mobile Iterations

> Small, clearly defined tasks that I can safely send to AI from my phone while away from the computer.
>
> These tasks should not require database inspection, complex testing, architecture decisions, or active supervision.
> *(User defines these tasks when working from mobile.)*

None yet.

---

# 🚧 Blocker & Enabling Milestone

> Use this only when the current milestone cannot reasonably continue until some other work is done first (e.g. the UI branch had to be merged with the database branch before Feature 04 could be tested).
>
> The enabling milestone is that other work: a small, separate piece of work with its own outcome and minimum scope. When it is done, return to the feature it blocked.
>
> Leave this section empty when nothing is blocking.


---

# 🔍 Review

> Before considering a feature or milestone completed, we perform a review.
> 
> AI can assist with the review, but **final approval remains human**.

**Reviewing:** Feature 03 — 🟡 Under Review. Strict client input wiring and cleanup
are ready for verification. The previous Load Watchlist change was tested by the
user and its 90 saved stocks were independently confirmed through Neon MCP.
This batch still needs Load Watchlist and an orders-off pipeline test. Feature 01's
Node type-check errors remain outside this change.

## The Three Review Questions

### 1. Does this match exactly what we decided to build?

**Answer:**  

**Notes:**  

---

### 2. Did the AI introduce anything we did not request or make incorrect assumptions?

**Answer:**  

**Notes:**  

---

### 3. Do I understand what was built well enough to maintain it later?

**Answer:**  

---

## Issues Found

None recorded yet.

## Required Actions

Verify the strict client changes, then obtain user testing, review and commit
before proceeding to Feature 04.

---

# ✅ Milestone Closure

> This section is only completed once the entire milestone passes review.

**Status:** ⬜ Open

**Completion Date:** [Pending Milestone Completion]

## Final Outcome

[To be recorded upon milestone completion]

## Technical Debt / Intentionally Deferred Work

- [To be recorded upon milestone completion]

---

**Once this milestone is approved:**

1. Save this document in `Completed Milestones/`.
2. Create the new `NOW.md` for the milestone chosen from the Milestone Backlog.
3. Begin the next milestone.
