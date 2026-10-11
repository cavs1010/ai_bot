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

Milestone 3 — Database Persistence for the Pipeline

## Expected Outcome

A PostgreSQL database storing everything the pipeline does: universe batches (`universe_scan_batches`, `universe_watchlist_items`), `portfolio_snapshots`, strategy presets (`pipeline_configs`), gate definitions (`pipeline_gates`), and each run's `pipeline_runs`, `scanned_stocks`, `gate_evaluations` and `order_executions`. Node.js/Express acts as the single data gatekeeper, recording data at explicit triggers and verifying persistence directly in the database.

## Completion Criteria

The milestone is completed when:

- Neon PostgreSQL connection is established via centralized `DATABASE_URL` in the Node.js backend.
- The pipeline tables listed above are created, with typed columns and a description on each column.
- Explicit event triggers are implemented: "Load Watchlist" (universe batch), "Update Portfolio" (snapshot), "Save Config" (parameter preset), and pipeline execution (runs, scans, gates, orders).
- Mandatory DB verification is completed for each individual feature, confirming exact row and column persistence in the database.
- End-to-end full pipeline execution is verified across all pipeline tables with 100% data integrity.
- The final review has been approved.

---

# 🧩 Milestone Features

> These are the concrete capabilities required to achieve the milestone outcome.
> 
> Features can be discovered, removed, or changed while we build.

## 🔵 Active Feature

No active feature yet: Feature 06 is next.

---

## ⏭️ Next Features

In the expected execution order:

1. **Feature 06 — Unified End-to-End Pipeline Verification**  
   Execute the full pipeline and verify complete relational integrity across all pipeline tables with zero orphaned records.

2. **Feature 07 — Config Version Management, Historical Profile Loader & Execution Run Traceability**  
   Provide a mechanism to browse and load historical portfolio and strategy config presets from `pipeline_configs`, allow switching/activating specific configurations, and ensure strict traceability by explicitly linking the exact `config_id` / version used to each full workflow execution in `pipeline_runs`. Includes the UI history views for saved configs, run history, and portfolio snapshots (decided 2026-10-04).

---

## ✅ Completed Features

- **Feature 01 — Database Infrastructure & Historical Watchlist Tables (`universe_scan_batches` & `universe_watchlist_items`)**  
  Established Node.js connection pool to Neon Database, created 2-table model with `scanned_at` timestamp in Brisbane local time (`Australia/Brisbane`), and implemented automated historical batching on "Load Watchlist". *(Approved by human on 2026-08-28)*

- **Feature 02 — `portfolio_snapshots` Table & Change-Detection Gatekeeper**  
  Created `portfolio_snapshots` table with typed financial columns and `positions_payload` JSONB in Brisbane local time (`Australia/Brisbane`, UTC+10). Implemented Option 1 Change-Detection Gatekeeper preventing duplicate entries when portfolio equity, cash, buying power, and positions remain unchanged. *(Approved by human on 2026-08-30)*

- **Feature 03 — Strategy Tile "Save Config" Button & `pipeline_configs` Table**  
  Created `pipeline_configs` table in Neon Database with Brisbane local timestamp (`Australia/Brisbane`, UTC+10), implemented `configDbService.ts` and Express routes (`GET /api/configs`, `GET /api/configs/active`, `POST /api/configs`), and wired the single "Save Config" button in the Strategy Tile with active preset synchronization. *(Approved by human on 2026-09-02)*

- **Feature 04 — Continuous Pipeline Persistence (`pipeline_runs`, `scanned_stocks`, `gate_evaluations`, `order_executions`)**  
  Each run records its metadata, scanned candidates (linked to the exact universe batch), Gates 1–5 verdicts with the gates' own reasoning, and orders (real Alpaca fills or `SIMULATED`) under one `run_id`, saved in one transaction. Verified with a simulated run and a live paper run. *(Approved by human on 2026-10-09)*


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
- **HTTP Idempotency (Rule 24):** `GET /api/portfolio/live` is strictly read-only; `POST /api/portfolio/snapshots` is used for snapshot recordings.
- **Timezone:** All timestamps stored and formatted in Brisbane local time (`Australia/Brisbane`, UTC+10).

## When This Is Finished...

**Next Current Focus:**  
Feature 06 (Unified End-to-End Pipeline Verification).

**Deep Session AI Tasks This Unlocks:**  
Deep Session Task 06: end-to-end integrity verification across the pipeline tables.

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
Create `portfolio_snapshots` migration in Neon PostgreSQL, integrate snapshot recording via `POST /api/portfolio/snapshots`, enforce Brisbane local timezone (`Australia/Brisbane`, UTC+10), and implement Option 1 Change-Detection Gatekeeper to avoid redundant snapshot inserts.

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
✅ Completed (Approved on 2026-10-09)

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
✅ Completed (approved by user on 2026-10-09; the `App.tsx` split stays in the Milestone Backlog)


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

None currently.

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

**Status:**  
✅ Resolved by the enabling milestone below (approved by user on 2026-10-09)

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
   - [x] **Audit and fixes done (2026-10-09):** the Python pipeline gets every setting from the active Neon config (`strategy_config.py`, no values); `pipeline_configs` holds them in `selection_params` / `money_params`; invented values and failure-as-pass fallbacks removed across Node, Python and the UI.
   - [x] **Rule added to `AGENTS.md`:** Rule 30, Business Values Live in the Database.
   - [ ] **Pending check — pre-market gap during the pre-market session:** run `venv/Scripts/python.exe backend/02_intelligence/helpers/fetchers/premarket.py` between 6:00 PM and 11:30 PM Brisbane (4:00–9:30 AM New York) on a trading day. Expected: NVDA's pre-market price and its gap against the **previous session's** close (check the close against the daily bars). Already verified: "not applicable" before pre-market and during the regular session.
1. **Verify writes** — User performs each UI action; AI checks the resulting rows in Neon (columns, Brisbane timestamps, shared `run_id`). Order: Load Watchlist → Portfolio sync → Save Config → Pipeline run (live LLM calls; only on explicit go-ahead).
   - [x] **Writes verified in Neon (2026-10-09):** Load Watchlist (batch #25, 93 rows), Save Config (`pipeline_configs` v4), Portfolio sync (unchanged state reuses snapshot #18), Pipeline run (run `9b93dea5…`: 6 candidates, real gate reasoning, 2 `SIMULATED` orders, linked to the exact batch scanned). All timestamp columns now store Brisbane local time.
   - [x] **Before the pipeline run — the universe comes only from Neon:** Node passes the latest Neon universe batch to Python (as it already passes the strategy config), Python scans exactly that batch, `universe.json` is deleted, and any universe rebuild creates a Neon batch. Why: the universe currently exists twice (`universe.json` and the Neon batch) and the two can disagree, which breaks Rule 13.
2. **Decide reads** — UI reads from Neon for the watchlist and the strategy config (dials load from `GET /api/configs/active`). Decide whether these gaps are fixed here or in Feature 07: Last Run screen (`GET /api/run/latest` reads a JSON file, not Neon), portfolio (shows Alpaca live, not snapshots).
   - [x] **Decided (2026-10-09):** the run screen is for executing — it shows only what happens in the current session (nothing until Load Watchlist or a run) and no longer loads the previous run. The header portfolio stays live from Alpaca. Viewing previous runs and portfolio snapshots belongs to Feature 07's history views.
3. **Rule 24 audit & fix (with Rule 13 check)** — Audit every `GET` route in `server/routes/` for side effects (DB writes, subprocesses, state changes) and list duplicate route aliases/mounts that break Rule 13. Present findings with file:line evidence; fix only after user confirmation (Rule 8). Known so far: `GET /api/universe/generate` and `GET /api/universe/refresh` trigger a refresh; duplicates `POST /api/portfolio/snapshot` vs `/snapshots`, `pipelineRouter` also mounted at `/api/run`, `configRouter` mounted at both `/api/configs` and `/api`.
   - [x] **Fixed (2026-10-09):** removed `GET /api/universe/generate` and `GET /api/universe/refresh` (the only GET routes with side effects), `POST /api/universe/refresh`, `POST /api/portfolio/snapshot`, and the duplicate `/api/run` and `/api` router mounts; the config router is mounted once at `/api/configs`.

**Return To:**  
Feature 04

**Status:**  
✅ Completed (approved by user on 2026-10-09)

---

# 🔍 Review

> Before considering a feature or milestone completed, we perform a review.
> 
> AI can assist with the review, but **final approval remains human**.

**Reviewing:** Enabling Milestone — Reconcile UI branch with DB main *(review prepared 2026-10-09)*

## Status

✅ Approved by the user on 2026-10-09.

## Scope Check

| Minimum scope item | Result |
|---|---|
| Backend and DB layer taken from `main` unchanged | ⚠️ Deliberately not met: the approved verification plan (steps 0–3) changed the backend |
| UI wired to the DB endpoints | ✅ Runs, snapshots, config save **and load**, universe — verified with real rows |
| Frontend follows the Project Structure | 🟡 Folders ✅; `App.tsx` ~730 lines vs the 400-line ceiling (in Milestone Backlog) |
| `AGENTS.md` merged | ✅ Restructured by user decision: Rule 0, each rule written once, Project Structure section, Rule 30, provider-neutral wording |
| Repo-cleanup leftovers recorded in the backlog | ✅ |
| History views out of scope | ✅ Left to Feature 07 |
| Verification plan steps 0–3 | ✅ Except the pending pre-market check |

## The Three Review Questions

### 1. Does this match exactly what we decided to build?

**Answer:** Yes for the outcome; the scope grew through user-approved decisions.

**Notes:** Approved additions: strategy config redesign (`selection_params` / `money_params`, column descriptions); Python reads every setting from the database (`strategy_config.py`, no values); universe stored only in the database (`universe.json` deleted); invented values and failure-as-pass fallbacks removed across Node, Python and the UI; simulated buys saved as `SIMULATED`; all timestamps in Brisbane local time; Rule 24 / Rule 13 route cleanup; Fast Replay removed; the run screen shows only the current session.

---

### 2. Did the AI introduce anything we did not request or make incorrect assumptions?

**Answer:** Yes, several mistakes — each caught and corrected during the milestone.

**Notes:** `config.py` split into 11 files without its explanations (reverted to the `strategy_config.py` board); unnecessary checks in `configDbService` (removed); `$1` type bug in Save Config (caught by the user's test); New York time misread from Git Bash UTC output (false alarm on the pre-market check); system `python` used once to edit a file (Rule 9 breach); a misread instruction nearly changed `design_system_primer.md` (not changed). Additions beyond the immediate ask (`hooks/`, `utils/time.ts`, Gate 5 raising instead of inventing a SKIP, stream line buffering, `fetch_news` "answered" fix) were flagged before being built and approved.

---

### 3. Do I understand what was built well enough to maintain it later?

**Answer:** Yes — "I completely understand what we did."

---

## Issues Found

None blocking. Open:

1. Pending check: pre-market gap during the pre-market session (step 0).
2. `App.tsx` ~730 lines (Milestone Backlog: finish the `App.tsx` split).
3. `GET /api/pipeline/runs/:id/gate-evaluations` calls a service method that does not exist (unused; Feature 07).
4. A run's results are not saved in one transaction.
5. `latest_run.json` is still a file handoff from Python to Node for run results.
6. Duplicate old pipeline `backend/02_intelligence/pipeline/run_pipeline.py` (Rule 13).
7. Leftover `|| null` defaults and repeated `DATABASE_URL` checks in `universeDbService`, `portfolioDbService` and the `pipelineDbService` readers.
8. `docs/backend_architecture_primer.md` describes a target layout the repo does not have yet, names the dial board `config.py` (now `strategy_config.py`) and says the scanner writes `universe.json` (deleted).
9. Strategy questions (not code): the EV threshold barely filters; Gate 4 `FLAG_FOR_REVIEW` is auto-approved; `mode = LIVE` names paper orders.

## Required Actions

- Return to Feature 04 and decide whether issues 3 and 4 are fixed as part of its review.

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
  - Added dedicated endpoint `POST /api/portfolio/snapshots` for manual/explicit snapshot recordings, while `GET /api/portfolio/live` remains pure read-only.
- **Deduplication Guards**:
  - Implemented a 5-second deduplication threshold in `PortfolioDbService` to prevent duplicate row creation from accidental double-clicks or rapid consecutive events.
- **Brisbane Local Timezone (`Australia/Brisbane`, UTC+10)**:
  - All database timestamps across all tables (`snapshot_at`, `created_at`) are saved and returned in Brisbane local time.

## Technical Debt / Intentionally Deferred Work

- [To be recorded upon milestone completion]

## Next Milestone

Chosen from the Milestone Backlog when this milestone is approved; the backlog has no fixed order.

---

**Once this milestone is approved:**

1. Save this document in `Completed Milestones/`.
2. Create the new `NOW.md` for the milestone chosen from the Milestone Backlog.
3. Begin the next milestone.
