# ⚡ NOW — Active Milestone

> **Purpose:** This is the project's operational document.
> 
> It should immediately answer:
> 
> **What are we trying to achieve?**  
> **What do I personally need to think through or work on now?**  
> **What can the AI work on while I am away?**  
> **What comes next?**
> 
> This document stays updated throughout the development of the milestone.

---

# 🎯 Milestone

## Name

Milestone 3 — Neon PostgreSQL Database & Trade Lifecycle Architecture

## Expected Outcome

A serverless PostgreSQL database (via Neon) storing the complete trading lifecycle across 8 relational tables (`universe_watchlist`, `portfolio_snapshots`, `pipeline_configs`, `pipeline_runs`, `scanned_stocks`, `gate_evaluations`, `order_executions`, and `trades`). Node.js/Express acts as the single data gatekeeper, recording data at explicit lifecycle triggers and verifying persistence directly in Neon.

## Completion Criteria

The milestone is completed when:

- Neon PostgreSQL connection is established via centralized `DATABASE_URL` in the Node.js backend.
- 8 relational tables are created with strongly typed core columns + `payload JSONB` for zero-overhead extensibility.
- Explicit event triggers are implemented: "Load Watchlist" (watchlist sync), "Update Portfolio" (snapshot), "Save Config" (parameter preset), and automated continuous pipeline execution (runs, scans, gates, orders, trades).
- Mandatory DB verification is completed for each individual feature, confirming exact row and column persistence in Neon.
- End-to-end full pipeline execution is verified across all 8 relational tables with 100% data integrity.
- The final review has been approved.

---

# 🧩 Milestone Features

> These are the concrete capabilities required to achieve the milestone outcome.
> 
> Features can be discovered, removed, or changed while we build.

## 🔵 Active Feature

### Feature 04 — Continuous Pipeline Persistence (`pipeline_runs`, `scanned_stocks`, `gate_evaluations`, `order_executions`)

**Expected Outcome:**  
Persist run session metadata, scanned candidates, Gates 1–5 verdicts with LLM reasoning, and generated order tickets under a unified `run_id`.

**Status:** 🟡 In Progress

---

## ⏭️ Next Features

In the expected execution order:

1. **Feature 05 — `trades` Table & Position Lifecycle Reconciliation**  
   Record order fills, track position lifecycle (`OPEN` to `CLOSED`), holding duration, and realized PnL.

2. **Feature 06 — Unified End-to-End Pipeline Verification**  
   Execute full automated pipeline and verify complete relational integrity across all 8 tables in Neon with zero orphaned records.

3. **Feature 07 — Config Version Management, Historical Profile Loader & Execution Run Traceability**  
   Provide a mechanism to browse and load historical portfolio and strategy config presets from `pipeline_configs`, allow switching/activating specific configurations, and ensure strict traceability by explicitly linking the exact `config_id` / version used to each full workflow execution in `pipeline_runs`. Includes the UI history views for saved configs, run history, and portfolio snapshots (decided 2026-10-04).

---

## ✅ Completed Features

- **Feature 01 — Database Infrastructure & Historical Watchlist Tables (`universe_scan_batches` & `universe_watchlist_items`)**  
  Established Node.js connection pool to Neon Database, created 2-table model with `scanned_at` timestamp in Brisbane local time (`Australia/Brisbane`), and implemented automated historical batching on "Load Watchlist". *(Approved by human on 2026-08-28)*

- **Feature 02 — `portfolio_snapshots` Table & Change-Detection Gatekeeper**  
  Created `portfolio_snapshots` table with typed financial columns and `positions_payload` JSONB in Brisbane local time (`Australia/Brisbane`, UTC+10). Implemented Option 1 Change-Detection Gatekeeper preventing duplicate entries when portfolio equity, cash, buying power, and positions remain unchanged. *(Approved by human on 2026-08-30)*

- **Feature 03 — Strategy Tile "Save Config" Button & `pipeline_configs` Table**  
  Created `pipeline_configs` table in Neon Database with Brisbane local timestamp (`Australia/Brisbane`, UTC+10), implemented `configDbService.ts` and Express routes (`GET /api/configs`, `GET /api/configs/active`, `POST /api/configs`), and wired the single "Save Config" button in the Strategy Tile with active preset synchronization. *(Approved by human on 2026-09-02)*


---

# 🧠 Current Focus — Human Work

> This section contains work that requires human reasoning: product decisions, architecture, complex debugging, trade-offs, or deep understanding.
> 
> During the focused work block, this section should tell me **exactly what I need to solve right now**.
> 
> Ideally, there should only be ONE Current Focus at a time.

## Current Objective

Implement Feature 04: Continuous Pipeline Persistence. Create table schemas for `pipeline_runs`, `scanned_stocks`, `gate_evaluations`, and `order_executions` in Neon PostgreSQL (Brisbane local time UTC+10), implement pipeline database service in Node.js, and persist run session metadata, scanned candidates, Gates 1–5 verdicts with LLM reasoning, and generated order tickets under a unified `run_id`.

## Questions to Resolve

- Coordinate payload shapes from Python pipeline runner outputs with `scanned_stocks`, `gate_evaluations`, and `order_executions` schema records.
- Ensure automated continuous pipeline executions store structured reasoning logs without blocking the live execution stream.

## Decisions Made

- **Database Engine:** Neon Serverless PostgreSQL.
- **Architecture:** Node.js/Express as single database gatekeeper (Approach A).
- **Schema Design:** 8 relational tables with typed columns + `payload JSONB`.
- **UI Controls:** Single new UI button added ("Save Config" in Strategy tile); all analysis/trading steps run as a continuous, automated sequence.
- **Snapshot Change-Detection (Option 1):** Skips inserting duplicate rows if total equity, cash, buying power, and positions are unchanged.
- **HTTP Idempotency (Rule 24):** `GET /api/portfolio/live` is strictly read-only; `POST /api/portfolio/snapshot` is used for snapshot recordings.
- **Timezone:** All timestamps stored and formatted in Brisbane local time (`Australia/Brisbane`, UTC+10).

## When This Is Finished...

**Next Current Focus:**  
Feature 05 (`trades` Table & Position Lifecycle Reconciliation).

**Deep Session AI Tasks This Unlocks:**  
Deep Session Task 05: Position lifecycle reconciliation & trade execution logging.

**Mobile Iterations This Unlocks:**  
[To be defined by user based on mobile availability and workflow.]

---

# 🤖 AI Work

> Tasks that can be delegated to AI after the necessary human decisions have been made.
>
> AI work is separated by where and how it can safely be executed.

---

## 🖥️ Deep Session AI Tasks

> AI tasks that require me to be at the computer because they involve testing, database access, debugging, integrations, architecture, or active supervision.

### Task 01 — Database Infrastructure Setup & `universe_watchlist` Table

**Objective:**  
Set up PostgreSQL client in Node.js, configure connection pooling with `DATABASE_URL`, create the `universe_watchlist` table schema, and wire the "Load Watchlist" backend route to sync tickers to Neon with direct verification.

**Status:**  
✅ Completed (Approved on 2026-08-28)

---

### Task 02 — `portfolio_snapshots` Table & Change-Detection Gatekeeper

**Objective:**  
Create `portfolio_snapshots` migration in Neon PostgreSQL, integrate snapshot recording via `POST /api/portfolio/snapshot`, enforce Brisbane local timezone (`Australia/Brisbane`, UTC+10), and implement Option 1 Change-Detection Gatekeeper to avoid redundant snapshot inserts.

**Status:**  
✅ Completed (Approved on 2026-08-30)

---

### Task 03 — `pipeline_configs` Table & Strategy Tile "Save Config"

**Objective:**  
Create `pipeline_configs` table in Neon PostgreSQL with Brisbane local timestamp (`Australia/Brisbane`, UTC+10), implement `configDbService.ts` and Express routes (`GET /api/configs`, `GET /api/configs/active`, `POST /api/configs`), and integrate the single "Save Config" button in the Strategy Tile.

**Context / Human Decisions:**  
- Store configuration presets in `pipeline_configs` table with versioning and `is_default` flag.
- Default configuration preset seeded if table is empty.
- Strategy Tile receives a clean, single "Save Config" button with immediate feedback.

**Status:**  
✅ Completed (Approved on 2026-09-02)

---

### Task 04 — Continuous Pipeline Persistence (`pipeline_runs`, `scanned_stocks`, `gate_evaluations`, `order_executions`)

**Objective:**  
Implement pipeline run persistence service in Node.js to record execution runs, scanned candidates, Gates 1–5 verdicts with full LLM reasoning payloads, and generated order tickets in Neon under a unified `run_id` with Brisbane local timestamps.

**Status:**  
🟡 In Progress

---

### Task 07 — Config Version Management, Historical Profile Loader & Execution Run Traceability

**Objective:**  
Provide API endpoints and UI workflow to browse, inspect, and load previous configuration versions/presets, and guarantee that whenever a full pipeline workflow is executed, the specific `config_id` / config version is permanently linked to the execution in `pipeline_runs`.

**Status:**  
⬜ Ready

---

## 📱 Mobile Iterations

> Small, clearly defined tasks that I can safely send to AI from my phone while away from the computer.
>
> These tasks should not require database inspection, complex testing, architecture decisions, or active supervision.
> *(User defines these tasks when working from mobile.)*

### Iteration 01 — Dead Artifacts & Broken Route Cleanup

**Objective:**  
Remove dead files and broken endpoint references across the backend and root directory.

**Instruction:**  
1. Remove obsolete root files `get-pip.py` and `bun.lock`.
2. Remove deprecated `backend/04_execution/get_live_portfolio.py` (migrated to TypeScript `AlpacaService.ts`).
3. Remove non-existent script reference `PATHS.pipelineFastScript` in `server/config/paths.ts` and its associated Express route `GET /api/run/pipeline-fast` in `server/routes/scannerRoutes.ts`.

**Status:**  
✅ Completed

### Iteration 02 — TypeScript Server Scope & Rule File Deduplication

**Objective:**  
Ensure full TypeScript compilation coverage for the backend and eliminate redundant rule files.

**Instruction:**  
1. Update root `tsconfig.json` to include `"server/**/*"` alongside `"server.ts"`.
2. Clean up redundant rule files while explicitly preserving `.agent_rules/karpathy_rules.md` (and `AGENTS.md`).

**Status:**  
✅ Completed

### Iteration 03 — Frontend Modularity & Component Architecture

**Objective:**  
Split the monolithic `frontend/src/App.tsx` into a layered architecture that follows `docs/design_system_primer.md`: one token file, one file per reusable control, patterns grouped by domain, and screens that only assemble.

**Agreed Architecture:** see the Project Structure section in `AGENTS.md`.

**Done:**
- [x] Controls, patterns and screens extracted into the Project Structure folders; patterns use token names.
- [x] UI wired to the Neon endpoints: run = `POST /api/pipeline/runs` + `GET …/stream`; portfolio sync = `POST /api/portfolio/snapshots`; Propose → Confirm = `POST /api/configs`.

**Not done (moved to Milestone Backlog):**
- [ ] Move data/API logic out of `App.tsx` (currently ~730 lines; 400-line ceiling).
- [x] Fast Replay removed (button and its front-end logic): it called `/api/pipeline/replay`, a route that never existed.

**Status:**  
🟡 Under Review


### Iteration 04 — Python Playground & Scratchpad Cleanup

**Objective:**  
Clean up or archive the 19 interactive notebook files across backend subdirectories.

**Instruction:**  
1. Archive or remove unused `*_playground.ipynb` notebooks in `backend/00_data/`, `backend/01_scanner/`, `backend/02_intelligence/`, `backend/03_risk/`, `backend/04_execution/`, and root `backend/full_pipeline_playground.ipynb`.

**Status:**  
✅ Completed (All 19 playground notebooks verified removed; confirmed clean by user on 2026-09-03)

---

# 💡 Discovered Ideas

> New ideas that appear while building are captured here.
> 
> **A new idea is NOT implemented automatically.**
> 
> First, we decide whether it is necessary to complete the current milestone.

## Live Position PnL Sync Reconciliation

**Description:**  
Automated background reconciliation routine that checks Alpaca filled orders on a schedule to automatically update closed `trades` rows and record exact realized PnL.

**Is this required to achieve the current milestone outcome?**  
No (handled in Feature 05 / future refinement).

**Decision:**
- Move to Roadmap / future

**Reason:**  
Feature 05 will implement the core lifecycle trigger; continuous background polling daemon can be enhanced in a future milestone.

--- 

# 🚧 Blockers & Enabling Milestones

> Use this when the current Milestone becomes blocked or unnecessarily expensive to continue without completing another piece of work first.

## Current Blocker

**Problem:**  
UI work was done on a separate local branch (`hygiene/repo-cleanup`) while the database work landed on `main`. The two branches carried different UIs, and the local UI still called removed endpoints (e.g. `/api/run/trigger`).

**Impact:**  
Feature 04 cannot be verified end to end from the UI until both branches are reconciled.

**Can I reasonably continue without solving it?**  
No

---

## 🛠️ Enabling Milestone

**Milestone:**  
Reconcile UI branch with DB main (branch `merge/ui-with-db`)

**Outcome:**  
One branch that keeps the local UI and design system, runs on the DB backend from `main`, and has one merged `AGENTS.md`.

**Minimum Scope:**  
- Backend and Neon DB layer taken from `main` unchanged (plus the local venv resolver fix and `dotenv`).
- Local UI wired to the DB endpoints (runs, portfolio snapshots, config saves).
- Frontend follows the Project Structure section in `AGENTS.md`.
- `AGENTS.md` merged: cloud tiers + restored detailed lessons and lesson protocol.
- Repo-cleanup leftovers recorded in `Milestone Backlog.md`, not built here.
- History views (saved configs, run history, snapshots) are **not** in scope; they belong to Feature 07.

**Verification Plan** *(agreed 2026-10-05)*:
0. **Hard-coded value audit** — Business data and business configuration (thresholds, dial defaults, gate definitions, ticker lists, risk limits, seed presets, fallback payloads) must come from Neon, or a live API for market data, never from values written in code. Code may only hold UI copy, design tokens, type contracts, and environment/path config. Includes checking that the Python pipeline receives its config from Node (active `pipeline_configs` row) rather than its own constants or files. Present findings with file:line evidence; fix only after user confirmation (Rule 8). When complete, add it to `AGENTS.md` under the next free rule number (per Rule 0) (Rule 25 stays for mock/fallback data; no overlap).
   - [ ] **Pending check — pre-market gap during the pre-market session:** run `venv/Scripts/python.exe backend/02_intelligence/helpers/fetchers/premarket.py` between 6:00 PM and 11:30 PM Brisbane (4:00–9:30 AM New York) on a trading day. Expected: NVDA's pre-market price and its gap against the **previous session's** close (check the close against the daily bars). Already verified: "not applicable" before pre-market and during the regular session.
1. **Verify writes** — User performs each UI action; AI checks the resulting rows in Neon (columns, Brisbane timestamps, shared `run_id`). Order: Load Watchlist → Portfolio sync → Save Config → Pipeline run (live LLM calls; only on explicit go-ahead).
   - [ ] **Before the pipeline run — the universe comes only from Neon:** Node passes the latest Neon universe batch to Python (as it already passes the strategy config), Python scans exactly that batch, `universe.json` is deleted, and any universe rebuild creates a Neon batch. Why: the universe currently exists twice (`universe.json` and the Neon batch) and the two can disagree, which breaks Rule 13.
2. **Decide reads** — UI reads from Neon for the watchlist and the strategy config (dials load from `GET /api/configs/active`). Decide whether these gaps are fixed here or in Feature 07: Last Run screen (`GET /api/run/latest` reads a JSON file, not Neon), portfolio (shows Alpaca live, not snapshots).
3. **Rule 24 audit & fix (with Rule 13 check)** — Audit every `GET` route in `server/routes/` for side effects (DB writes, subprocesses, state changes) and list duplicate route aliases/mounts that break Rule 13. Present findings with file:line evidence; fix only after user confirmation (Rule 8). Known so far: `GET /api/universe/generate` and `GET /api/universe/refresh` trigger a refresh; duplicates `POST /api/portfolio/snapshot` vs `/snapshots`, `pipelineRouter` also mounted at `/api/run`, `configRouter` mounted at both `/api/configs` and `/api`.

**Return To:**  
Feature 04

**Status:**  
🟡 Under Review

---

# 🔍 Review

> Before considering a feature or milestone completed, we perform a review.
> 
> AI can assist with the review, but **final approval remains human**.

## Status

🟡 Under Review

## The Three Review Questions

### 1. Does this match exactly what we decided to build?

**Answer:** Under Review

**Notes:** Milestone 3 specification matches the approved 8-table relational architecture and single-data-gatekeeper design.

---

### 2. Did the AI introduce anything we did not request or make incorrect assumptions?

**Answer:** Under Review

**Notes:** Scope strictly bound to 8 tables, 1 new button ("Save Config"), and direct Neon persistence verification.

---

### 3. Do I understand what was built well enough to maintain it later?

**Answer:** Under Review

**Notes:** Architecture and table schemas documented and aligned with user.

---

## Issues Found

- None.

## Required Actions

- User authorization to start Deep Session Task 01 (Database Infrastructure & `universe_watchlist` Table).

---

# ✅ Milestone Closure

> This section is only completed once the entire milestone passes review.

**Status:** ⬜ Open

**Completion Date:** [Pending Milestone Completion]

## Final Outcome

[To be recorded upon milestone completion]

## Important Decisions & Lessons Learned

- **Strict HTTP Verb Discipline & Idempotency (Rule 24)**:
  - `GET` requests must be strictly read-only and idempotent. Never trigger database writes, snapshot creations, or state mutations on a `GET` request.
  - All state mutations (e.g. creating portfolio snapshots, saving configs, executing trades) must explicitly use `POST`, `PUT`/`PATCH`, or `DELETE`.
  - Added dedicated endpoint `POST /api/portfolio/snapshot` for manual/explicit snapshot recordings, while `GET /api/portfolio/live` remains pure read-only.
- **Deduplication Guards**:
  - Implemented a 5-second deduplication threshold in `PortfolioDbService` to prevent duplicate row creation from accidental double-clicks or rapid consecutive events.
- **Brisbane Local Timezone (`Australia/Brisbane`, UTC+10)**:
  - All database timestamps across all tables (`snapshot_at`, `created_at`) are saved and returned in Brisbane local time.

## Technical Debt / Intentionally Deferred Work

- [To be recorded upon milestone completion]

## Next Milestone

[Milestone 4 — Backtest Engine & Strategy Analytics]

---

**Once this milestone is approved:**

1. Save this document in `Completed Milestones/`.
2. Update `Roadmap.md`.
3. Create the new `Now.md`.
4. Begin the next milestone.
