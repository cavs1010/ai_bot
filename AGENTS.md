# AGENTS.md - Project Rules & Working Protocol

> **System Note**: This file is automatically loaded into the AI system context on every turn. All rules defined here take absolute precedence.

---

## 🧠 Core Engineering Principles (Karpathy Guidelines)
> **Reference File**: All agents MUST adhere to the core principles defined in `/.agent_rules/karpathy_rules.md`.
1. **Think Before Coding**: Surface assumptions, don't hide confusion, state tradeoffs before writing code. Never assume without evidence.
2. **Simplicity First**: Write the minimum surgical code required to solve the problem. Nothing speculative.
3. **Surgical Changes**: Touch only what you must. Match existing codebase style.
4. **Goal-Driven Execution**: Define clear success criteria and verify incrementally.

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
   - All Python executions, dependencies, and subprocesses MUST use `.venv/bin/python3` via the unified resolver (`getPythonExecutable()`). Never invoke system Python (`/usr/bin/python3`) or install packages outside `.venv`.
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
   - **File Ceiling**: No single React component file should exceed **300–400 lines**. When a component approaches this threshold or accumulates distinct sub-views/modals/panels, they MUST be extracted into modular files: full screens in `frontend/src/screens/`, patterns in `frontend/src/patterns/<domain>/` (e.g. `pipeline/`, `portfolio/`, `strategy/`), reusable controls in `frontend/src/components/ui/`.
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
7. 🎨 **One File Per Reusable UI Control**:
   - A reusable control (switch, button, input, badge) lives in its own file under `frontend/src/components/ui/`. The screen or pattern that uses it imports that file. Never define the control in the file that consumes it.
   - The control stays agnostic of the screen; the consumer supplies labels, tone, and behavior. Example: `frontend/src/patterns/trading/OrderToggles.tsx` imports `components/ui/switch.tsx` twice.
8. 🗂️ **Shared Domain Types Live in `frontend/src/types/`**:
   - A domain type (data / API contract) used by more than one file lives in `frontend/src/types/<domain>.ts`. Props types (`XxxProps`) and private helper types stay in their component file.
   - Never import a domain type from a component file, never define the same shape twice, and never create a catch-all `types.ts`.

---

## 🤝 TIER 3: Collaboration & Specification Protocols

1. 🗺️ **Consult `spec_development/NOW.md` First**:
   - Always read `spec_development/NOW.md` before answering "What is the focus now?" or detailing active project tasks.
2. 🤝 **Step-by-Step Spec Iteration**:
   - Never pre-fill or finalize spec documents (`NOW.md`) ahead of user input. Present proposed features in conversation first and wait for explicit approval.
3. 💡 **Milestone Backlog Idea Capture**:
   - Every time the user shares a new idea, potential future milestone, or improvement, capture it in `spec_development/Milestone Backlog.md` under `## 💡 Candidates`.
   - Structure the entry using the standard capture format (`Why it appeared`, `Potential Outcome`, `Why it might matter`, `Related to`).
   - Keep active work in `NOW.md` focused and uninterrupted.
4. 📱 **User-Governed Task Separation**:
   - The user exclusively decides what tasks belong to `📱 Mobile Iterations`. Never self-assign tasks to mobile iterations.
5. 🎨 **Single Entry Point UI Controls**:
   - Avoid duplicate or competing interactive buttons/icons for the same action. Use one clean, clearly labeled control.
6. 🔍 **Mandatory Root-Cause Confirmation Before Fixing**:
   - Isolate root causes with evidence, present to user, and wait for confirmation before fixing bugs.

---

## ⚡ Master Rules Index (Quick Reference 1–28)

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
| **27** | UI | **One file per reusable control** under `frontend/src/components/ui/`; consumers import it, never redefine it. |
| **28** | Architecture | **Shared domain types live in `frontend/src/types/<domain>.ts`**; props types stay in their component file. |

---

## 🔄 Protocol for Adding & Updating Lessons

When a new preference, lesson, or rule is identified during a session:
1. **Categorize**: Assign the lesson to a category (`Testing`, `Task Scope`, `Status`, `Specs`, `UI`, `Architecture`, `Database`, `Tools`, `Data`, `Environment`).
2. **Place it in the right tier**: Hard stops go to TIER 1, locked contracts to TIER 2, collaboration protocols to TIER 3.
3. **Add to Detailed Lessons**: Append a formatted entry under `## 📋 Detailed Lessons` using the next free rule number and the template below.
4. **Update the Master Rules Index**: Add a 1-line row with the same number to the `⚡ Master Rules Index`.

### Standard Lesson Template:
```markdown
### Lesson X: [Title]
- **Category**: [Testing | Task Scope | Status | Specs | UI | Architecture | Database | Tools | Data | Environment]
- **Rule**: [Strict short directive - what MUST or MUST NOT be done]
- **Guideline**: [Practical context and rationale]
```

---

## 📋 Detailed Lessons

> Lesson numbers match the Master Rules Index. Lessons without a detailed entry are fully described by their tier entry above.

### Lesson 1: Step-by-Step Interactive Specs & Code Updates
- **Category**: Specs / Collaboration
- **Rule**: Never pre-fill, complete, or finalize specification documents (like `spec_development/NOW.md`) or code implementations ahead of time when working together.
- **Guideline**: Wait for explicit confirmation and input from the user at each step before making updates.

### Lesson 2: Strict Single-Task Focus & No Unsolicited Task Execution
- **Category**: Task Scope
- **Rule**: Never execute, implement, or mark as completed subsequent tasks or features unless explicitly instructed by the user.
- **Guideline**: Focus strictly on the single active task requested. When finished, pause and wait for explicit instruction before touching next tasks.

### Lesson 3: Human Review Before Marking Tasks or Features as Completed
- **Category**: Status & Reviews
- **Rule**: Never mark a task, feature, or milestone as "Completed" (or `✅ Completed`) in specification or tracking documents without explicit user confirmation.
- **Guideline**: Set status to `🟡 Under Review` or `Ready for Review`, present the result, and wait for human review/approval.

### Lesson 4: Single Clear Entry Point & Minimalist UI Controls
- **Category**: UI / UX
- **Rule**: Avoid creating duplicate, competing, or redundant interactive buttons/icons for the same action on a component or card.
- **Guideline**: Consolidate triggers into one clearly labeled, predictable button (e.g. "View List →") instead of scattering multiple clickable icons.

### Lesson 5: Explicit Authorization Before Running Full Pipeline Tests
- **Category**: Testing / Pipelines
- **Rule**: Never execute full pipeline test scripts or live integration routines (e.g., `run_pipeline_full.py`) automatically without explicit permission.
- **Guideline**: Full pipeline testing invokes real LLM API calls consuming quota and tokens. Always request permission prior to execution.

### Lesson 6: Always Consult `spec_development/NOW.md` for Focus & Project State
- **Category**: Specs / Collaboration
- **Rule**: Whenever asked "What is the focus now?", "What are we working on?", or similar project state queries, always read `spec_development/NOW.md` first before answering.
- **Guideline**: `spec_development/NOW.md` is the single source of truth for milestones, human focus, and AI tasks. Never invent or assume next steps without referencing it.

### Lesson 7: Minimal Unsolicited Tool Usage, Zero Ad-Hoc Test Scripts & Clean Response Flow
- **Category**: Tool Usage / Clean Logs
- **Rule**: Never invoke unnecessary or speculative background diagnostic tools (such as redundant file viewers, linters, or test curl commands) or ad-hoc verification scripts (`node -e`, `tsx -e`, temporary evaluators) that stream tool logs into the chat timeline.
- **Guideline**: Focus strictly on requested actions, make direct surgical edits, and respond directly, keeping the user's interface clean and free of background system noise.

### Lesson 8: Mandatory Root-Cause Identification & User Confirmation Before Fixing
- **Category**: Architecture / Debugging
- **Rule**: When an error or failure occurs, you MUST identify and isolate the exact root cause (via reproduction and inspectable traces) before attempting any code changes or proposing patches. Communicate the findings and root cause clearly to the user, and DO NOT modify code until the user explicitly confirms: "Yes, that's the root cause".
- **Guideline**: Speculative patches, symptom masking, and premature edits without verified root-cause analysis waste iterations and destabilize the codebase.

### Lesson 9: Strict Single Python Runtime & Unified Virtual Environment Resolver
- **Category**: Architecture / Runtime
- **Rule**: All Python scripts, subprocess executions (in `server.ts`), quant pipelines, and package installations MUST use the single dedicated virtual environment (`.venv/bin/python3`). Never use or mix with system `python3` (`/usr/bin/python3`).
- **Guideline**: Mixed environments cause missing package errors (`ModuleNotFoundError`), broken pipes, and corrupted IPC. The centralized `getPythonExecutable()` resolver in `server/config/paths.ts` is the single source of truth.

### Lesson 10: Answer First & Require Explicit Authorization Before Code Changes
- **Category**: Task Scope / Collaboration
- **Rule**: When the user asks a conversational question, conceptual query, or asks "does it make sense?", DO NOT modify code or execute edits. Answer the question directly and wait for explicit authorization ("Proceed", "Implement this", "Go ahead") before touching any files.
- **Guideline**: Conceptual alignment must always precede execution. Prematurely editing code when the user is checking understanding violates collaboration trust and bypasses human control.

### Lesson 11: Deep Architectural Thinking & Zero-Bloat Solutions Over Reflexive Suggestions
- **Category**: Architecture / Simplicity
- **Rule**: Never propose or implement the first complex or boilerplate pattern that comes to mind. Always step back, analyze the underlying problem from first principles, and seek the most efficient, clean, minimal, and direct solution before suggesting an approach or writing code.
- **Guideline**: Reflexive suggestions often default to heavy mechanisms (e.g., redundant API polling, background servers, unrequested intervals, extra layers) when simple, deterministic logic, mathematical calculation, or existing lifecycle events can solve the problem with zero overhead. Rigorously evaluate simplicity, performance, and maintainability first.

### Lesson 12: Clarify Unknown Context Before Proposing Specs
- **Category**: Specs / Collaboration
- **Rule**: At any stage of development, if critical context, requirements, constraints, or user preferences are unspecified, you MUST stop and ask clarifying questions first. NEVER assume requirements or jump straight into detailed speculative proposals.
- **Guideline**: Building specifications or solutions on unverified assumptions wastes iterations and leads to misaligned architecture. Always identify missing context and align with the user first.

### Lesson 13: Strict Single Source of Truth & Zero Speculative Fallback Branches
- **Category**: Architecture / Simplicity
- **Rule**: Never introduce speculative fallback chains, secondary aliases, or defensive "just-in-case" branch operators (`||`, dual-naming, or loose conditional fallbacks) across any contract, schema, configuration, or API interface. Every parameter, identifier, and contract MUST have exactly ONE authoritative definition.
- **Guideline**: Defensive fallbacks blur system contracts, hide misconfigurations, create multiple competing paths of truth, and produce downstream noise. When an interface or key is defined, enforce that exact contract directly and fail explicitly if missing.

### Lesson 14: Explicit User Authorization & Justification for New Dependencies
- **Category**: Runtime / Dependencies
- **Rule**: Never install or introduce new packages (Python or npm) or modify dependency declarations without first explaining to the user:
  1. What the package is
  2. What capability it provides
  3. Why it is strictly required
  And waiting for explicit user authorization before running any installation commands.
- **Guideline**: Speculative or unannounced package installations introduce dependency conflicts, bloat runtime environments, and undermine deployment predictability. Explicit human control must govern all runtime dependencies.

### Lesson 27: One File Per Reusable UI Control
- **Category**: UI
- **Rule**: A reusable UI control (switch, button, input, badge) MUST live in its own file under `frontend/src/components/ui/`. The pattern or screen that uses it imports that file. Never define the control inside the file that consumes it.
- **Guideline**: The control stays agnostic of the screen. It knows how the piece looks and how it turns on or off. The consumer supplies the labels, tone, and behavior. Example: `Switch` is `frontend/src/components/ui/switch.tsx`; `frontend/src/patterns/trading/OrderToggles.tsx` imports it twice and only passes the live-trades and market-hours cases.

### Lesson 28: Shared Domain Types Live in `frontend/src/types/`
- **Category**: Architecture
- **Rule**: A domain type (one that describes data, such as the backend/API contract) used by more than one file MUST live in `frontend/src/types/<domain>.ts`, grouped by domain. Component props types (`XxxProps`) and private helper types MUST stay in the file that uses them. Never import a domain type from a component file, never define the same shape twice, and never create a single catch-all `types.ts`.
- **Guideline**: Colocate a type until a second file needs it; once it describes shared data, move it to `types/`. This keeps one source of truth for the contract (Lesson 13) and stops components depending on sibling components just for a type. Example: `Candidate`, `FunnelCounts`, `PortfolioSnapshot` and `Telemetry` live in `frontend/src/types/telemetry.ts`; `App.tsx`, `screens/LastRun.tsx` and the `patterns/` components all import from there, while `CandidateTableProps` stays inside `CandidateTable.tsx`.
