# AGENTS.md - Project Rules & Working Protocol

> **System Note**: This file is automatically loaded into the AI system context on every turn. All rules defined here take absolute precedence.

---

## 🧠 Core Engineering Principles (Karpathy Guidelines)
> **Reference File**: See full definitions in `/.agent_rules/karpathy_rules.md`.
1. **Think Before Coding**: Surface assumptions, state tradeoffs, never assume without evidence.
2. **Simplicity First**: Write the minimum surgical code required to solve the problem. Nothing speculative.
3. **Surgical Changes**: Touch only what you must. Match existing codebase style.
4. **Goal-Driven Execution**: Define clear success criteria and make fast, direct modifications.

---

## ⛔ TIER 1: Strictly Prohibited Reflexes (Zero-Tolerance Hard Stops)

1. 🚫 **NO Ad-Hoc Test Scripts & Cluttering `run_command` Executions**:
   - **NEVER** run ad-hoc verification scripts (`node -e`, `tsx -e`, background tasks, temporary evaluators) to verify routine code or config edits.
   - Perform surgical edits directly on the target file. Do not run unsolicited background scripts that clutter the timeline and slow down execution.
2. 🚫 **NO Automatic Full Pipeline Runs**:
   - **NEVER** execute test scripts invoking live LLM/API calls (e.g. `run_pipeline_full.py`) without explicit user permission.
3. 🚫 **NO Premature Code Edits on Questions**:
   - When the user asks a conceptual question, clarification, or "does it make sense?", answer directly and **NEVER** modify code without explicit authorization ("proceed", "implement this").
4. 🚫 **NO Unilateral "Completed" Tags**:
   - Mark tasks as `🟡 Under Review` or `Ready for Review`. Only mark `✅ Completed` after human approval.
5. 🚫 **NO Multi-Feature Jumping or Scope Bleed**:
   - Work strictly on the single active sub-task designated in `spec_development/NOW.md`. Never jump ahead to subsequent features.
6. 🚫 **Zero Text-Simulated Tool Logs (Native Tool Invocation Only)**:
   - **NEVER** output, format, or simulate tool execution logs, transcript headers (e.g., `"The following action was requested:"`), or mock diffs as conversational chat text.
   - All file edits, file readings, and environment interactions MUST strictly be dispatched via native, programmatic platform tool calls.
   - If a tool fails or is interrupted, report the outcome objectively in standard natural language without mimicking platform execution logs.
7. 🚫 **Zero Mock / Hardcoded Fallback Data (Fail-Fast Real Data Discipline)**:
   - **NEVER** inject static mock datasets, hardcoded ticker arrays, or speculative fallback payloads to mask upstream API failures, network blocks, or missing dependencies.
   - All market, scan, and quant data MUST strictly originate from real, live external services (TradingView, Alpaca, Finnhub) or the authoritative Neon PostgreSQL database.
   - When an external API or environment dependency fails, the system MUST fail fast and surface the exact, transparent error so the root cause is resolved immediately.
8. 🚫 **Zero Unverified Environment Claims**:
   - **NEVER** report, assume, or claim that runtime dependencies (Python packages, system tools, environment variables) are installed or operational without concrete verification.

---

## 🏗️ TIER 2: Locked Architectural Contracts (Non-Negotiable)

1. 🦘 **100% TypeScript/Node Neon Database & Brisbane Local Timezone (`Australia/Brisbane`, UTC+10)**:
   - **Neon Database Gatekeeper**: All database operations (queries, tables, migrations, inserts, updates) are 100% strictly in TypeScript / Node.js only connecting to the Neon Database.
   - **Zero Python Database Access**: Python is strictly used for analytical quant calculations and **NEVER** touches the database or imports database modules.
   - **Brisbane Local Timestamps**: All database timestamps across all tables MUST be saved and represented in Brisbane local time (`Australia/Brisbane`, UTC+10 / AEST).
2. 🐍 **Strict Virtual Environment Resolver**:
   - All Python executions, dependencies, and subprocesses MUST use `.venv/bin/python3` via the unified resolver (`getPythonExecutable()`). Never invoke system Python (`/usr/bin/python3`).
3. 🎯 **Strict Single Source of Truth & Zero Speculative Fallbacks**:
   - Never use speculative fallback operators (e.g. `A || B`), duplicate aliases, or defensive guessing across contracts, schemas, or configs. Enforce one authoritative definition directly.
4. 🗄️ **Zero Runtime DDL / Create-Once Database Discipline**:
   - **Create-Once Cloud Schema**: Persistent cloud database tables and schemas in Neon PostgreSQL are created once.
   - **Zero Runtime DDL**: NEVER embed `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE`, or runtime table-creation migrations inside application startup (`server.ts`) or inside database query services (`ensureTable()`).
   - **Declarative Schema Files**: `schema.ts` files must strictly define TypeScript interfaces and data contracts, never executable SQL DDL routines.
   - **Pure DML Services**: Database services must strictly perform direct DML queries (`SELECT`, `INSERT`, `UPDATE`), assuming the schema is authoritative and already provisioned.
   - **Direct SQL Delivery for User Execution**: All schema adjustments, table creations, or DDL migrations must be provided as clean, copy-pasteable SQL code blocks directly in conversation for the user to execute in the Neon console. Never attempt automated runtime or MCP-based DDL executions.
5. 🗂️ **Frontend Component Modularity, Proactive Decomposition & File Ceiling**:
   - **Upfront Modularity Question (Mandatory Before Coding)**: Before creating or adding UI code, ALWAYS evaluate whether the target file will become monolithic and whether components/hooks should be extracted immediately. NEVER accumulate code into existing files or `App.tsx` with the intention of refactoring "later".
   - **File Ceiling**: No single React component file should exceed **300–400 lines**. When a component approaches this threshold or accumulates distinct sub-views/modals/panels, they MUST be extracted into modular components under `frontend/src/components/<domain>/`.
   - **Zero Inlined Static Fixtures**: Static mock datasets, telemetries, or large default configurations must NEVER reside inside component files (`App.tsx`); they must be placed in `frontend/src/fixtures/` or `frontend/src/config/`.
   - **No App.tsx Appending**: New tabs, complex modals, or full-screen overlays must be developed in dedicated component files and imported into `App.tsx` as lean, declarative tags.
   - **Zero Deferred Modular Debt**: Component extraction is part of the initial feature implementation turn, not a deferred milestone cleanup task.
6. 🌐 **Standard HTTP Verb Semantics & REST State Mutation Discipline**:
   - **`GET` (Strict Read-Only & Idempotent)**: Must never trigger database writes, subprocess executions, state mutations, or side-effects. Safe for cached reads and polling.
   - **`POST` (Resource Creation & Job Initiation)**: Explicitly creates new records (`INSERT INTO ...`), provisions new resources, or initiates asynchronous workflow jobs.
   - **`PUT` / `PATCH` (Resource Updates)**: Used for complete (`PUT`) or partial (`PATCH`) updates to existing records (`UPDATE ... WHERE id = ...`).
   - **`DELETE` (Resource Removal)**: Used for explicit record removal or soft-deletion (`DELETE FROM ...` or `UPDATE ... SET deleted_at = ...`).
   - **Asynchronous Job Lifecycle Pattern**: Any long-running or streamed operation MUST decouple state creation from progress observation:
     1. Mutating call (`POST`, `PUT`, `PATCH`, or `DELETE`) to create/update state and launch processing.
     2. Dedicated read-only stream or query endpoint (`GET .../stream` or `GET .../status`) for live progress subscription.

---

## 🤝 TIER 3: Collaboration & Specification Protocols

1. 🗺️ **Consult `spec_development/NOW.md` First**:
   - Always read `spec_development/NOW.md` before answering "What is the focus now?" or detailing active project tasks.
2. 🤝 **Step-by-Step Spec Iteration**:
   - Never pre-fill or finalize spec documents (`NOW.md`) ahead of user input. Present proposed features in conversation first and wait for explicit approval.
3. 💡 **Milestone Backlog Idea Capture**:
   - When new ideas appear, record them cleanly in `spec_development/Milestone Backlog.md` under `## 💡 Candidates`. Keep active work in `NOW.md` uninterrupted.
4. 📱 **User-Governed Task Separation**:
   - The user exclusively decides what tasks belong to `📱 Mobile Iterations`. Never self-assign tasks to mobile iterations.
5. 🎨 **Single Entry Point UI Controls**:
   - Avoid duplicate or competing interactive buttons/icons for the same action. Use one clean, clearly labeled control.
6. 🔍 **Mandatory Root-Cause Confirmation Before Fixing**:
   - Isolate root causes with evidence, present to user, and wait for confirmation before fixing bugs.

---

## ⚡ Master Rules Index (Quick Reference 1–26)

| Rule | Area | Directive Summary |
|---|---|---|
| **1** | Specs | Step-by-step interactive spec updates; never pre-fill ahead of user. |
| **2** | Scope | Strict single-task focus; never execute subsequent tasks unsolicited. |
| **3** | Status | Human review required before marking any task `✅ Completed`. |
| **4** | UI | Single clear entry point; avoid duplicate/competing buttons or icons. |
| **5** | Testing | Explicit user authorization required before running full pipeline scripts. |
| **6** | Specs | Always consult `spec_development/NOW.md` first for current project state. |
| **7** | Tools | **Zero ad-hoc test scripts / background clutter.** Make direct surgical edits only. |
| **8** | Debugging | Identify root cause with evidence; wait for user confirmation before fixing. |
| **9** | Runtime | 100% Python venv consistency (`.venv/bin/python3`); zero system Python usage. |
| **10** | Scope | Answer questions first; require explicit user authorization before editing code. |
| **11** | Architecture | Deep thinking over reflexive complexity; seek the simplest, cleanest solution. |
| **12** | Specs | Clarify unknown context and requirements before proposing specs. |
| **13** | Contracts | Strict single source of truth; zero speculative fallbacks (`||` / aliases). |
| **14** | Dependencies | Explain and get explicit authorization before adding any new dependencies. |
| **15** | Specs | Document concise final decisions only on explicit command; omit chatter bloat. |
| **16** | Specs | Present milestone feature proposals in chat first; wait for user approval. |
| **17** | Scope | User exclusively governs task separation (Deep Session vs. Mobile Iterations). |
| **18** | Scope | Strict active sub-task focus; no premature multi-feature jumping. |
| **19** | Architecture | Honor agreed architecture and commitments; zero mid-stream pivots. |
| **20** | Database | 100% TypeScript/Node Neon database; zero Python DB; Brisbane local timezone (`+10`). |
| **21** | Database | **Zero runtime DDL / Direct SQL Delivery.** Tables created in Neon by user; provide copy-pasteable SQL in chat; `schema.ts` is pure TS types; services are pure DML. |
| **22** | Tools | **Zero text-simulated tool logs.** Must use native programmatic tool calls only; never mimic tool outputs in chat text. |
| **23** | Architecture | **Frontend Modularity & Proactive Decomposition.** Mandatory upfront check; max 300–400 lines; zero deferred debt; no inlined fixtures or App.tsx appending. |
| **24** | Architecture | **HTTP Verb Semantics & State Discipline.** Strict REST methods: `GET` (read-only), `POST` (create), `PUT`/`PATCH` (update), `DELETE` (remove). Decoupled job lifecycle. |
| **25** | Data | **Zero Mock / Fallback Data.** Never mask failures with dummy payloads; enforce fail-fast real data from live APIs. |
| **26** | Environment | **Zero Unverified Claims.** Truthful dependency reporting; never claim setup is active without concrete verification. |
