# AGENTS.md - Project Rules & Working Protocol

> **System Note**: This file is automatically loaded into the AI system context on every turn. All rules defined here take absolute precedence.

---

## 📐 Rule 0: How Rules Are Added or Changed

Every change to this file MUST follow these steps. Rule 0 follows them too; a rule that breaks Rule 0 is invalid.

1. **Check first**: Search this file before adding. If an existing rule already covers the topic, update that rule instead of adding a new one.
2. **One place**: Each rule is written exactly once, under its tier. No index, summary table, or second copy, here or in any other file. Other files refer to a rule by its number and never restate it.
3. **One number**: Every rule has one global number. A new rule takes the number after the highest existing one. Existing rules are never renumbered.
4. **No contradictions**: Before adding or changing a rule, check it against every other rule. If two would conflict, resolve it in the same change.
5. **Right tier**: Hard stops go in Tier 1, locked architectural contracts in Tier 2, collaboration protocols in Tier 3. Within a tier, rules are listed in number order.
6. **Fixed format**: `N. **Title**: the rule (what MUST or MUST NOT be done).` followed by `*Why:*` with the reason in one or two sentences.
7. **Update references**: When a rule's number or meaning changes, search the repo for `Rule N` and update every reference in the same change.
8. **User approval**: A rule is added or changed only after the user approves its wording.
9. **Only what guides the work**: Write only what an agent needs to act correctly now. No history, change dates, changelogs, or notes about merged or removed rules.

**Core engineering principles**: all agents MUST follow `.agent_rules/karpathy_rules.md` (Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution).

---

## 🗺️ Project Structure

Every file goes in the folder this tree assigns to it. This is the only place in this file that says where files live. Adding a folder or changing what a folder holds requires the user's approval and is updated here.

```text
frontend/src/
├── index.css        # The only token file (@theme) + control looks (@layer components)
├── App.tsx          # Switches between screens
├── components/ui/   # Reusable controls: badge, button, switch, tabs, modal, text-field, dial-field, dial-section, …
├── patterns/        # Recurring combinations of controls, grouped by domain
│   ├── pipeline/    #   Funnel, CandidateTable, ApprovedSignals
│   ├── portfolio/   #   PortfolioSummary
│   ├── trading/     #   OrderToggles, MarketClockBadge
│   ├── strategy/    #   ProposeDiff, DialInfoSheet
│   └── universe/    #   UniverseList
├── screens/         # Full screens that only assemble patterns: LastRun, StrategyDials, DesignSpec
├── hooks/           # Where a screen's live data comes from (fetch, refresh, loading and error state), one hook per
│                    #   data source, so screens and patterns only lay out the values they receive: useLivePortfolio
├── content/         # Text shown to the user, never setting values: dialDescriptions
├── types/           # Shared domain types, one file per domain: telemetry, dials, universe
└── utils/           # Logic only: marketClock, strategyDials, time
```

```text
backend/
├── __init__.py
├── cli.py              # Entry: arguments, stage orchestration and stdout/JSON output
├── config.py           # Reads Node-supplied STRATEGY_CONFIG
├── scanner/
│   ├── universe.py     # TradingView screen; receives portfolio and earnings facts
│   ├── momentum.py     # Scores the supplied universe
│   └── data/           # Generated latest_run.json telemetry
├── intelligence/
│   ├── run.py          # Gates 1–5 sequence, fact gathering and client coordination
│   ├── constants.py    # Fixed lookup tables
│   ├── gates/          # One decision module per gate
│   ├── rules/          # Pure trading calculations and criteria
│   └── utils/          # Shared pure helpers without trading rules
├── risk/
│   └── gate.py         # Trade sizing and account-limit checks
├── data/               # Market, news, calendar, filing and premarket clients
├── llm/
│   └── client.py       # Shared model client
└── broker/
    └── alpaca.py       # Broker account reads and order placement
```

---

## ⛔ TIER 1: Hard Stops

2. 🚫 **Single-Task Focus**: Work only on the single active sub-task in `spec_development/NOW.md`. Never jump ahead to or implement subsequent tasks or features unless the user explicitly says so.
   *Why:* Scope bleed mixes unreviewed work into the active task. When a task is finished, pause and wait for instruction.

3. 🚫 **Human Review Before "Completed"**: Never mark a task, feature, or milestone `✅ Completed` without explicit user confirmation. Until then its status is `🟡 Under Review`.
   *Why:* Final approval is always human.

5. 🚫 **No LLM or Order Runs Without Permission**: Never run anything that makes LLM calls or places orders (e.g. `backend/cli.py`) without explicit user permission. Read-only market-data calls need no permission.
   *Why:* They spend real API tokens or act on the trading account.

7. 🚫 **No Unrequested One-Off Scripts**: Never run one-off scripts (`node -e`, `tsx -e`, `python -c`, temporary evaluators) or speculative diagnostics without the user's approval. The project's own checks — the type checker and a module's documented self-test — may be run when they produce the evidence Rules 8 and 26 require.
   *Why:* Unrequested scripts clutter the user's timeline; evidence must come from checks the project already owns.

10. 🚫 **Answer First, Edit Only When Authorized**: When the user asks a question, a clarification, or "does it make sense?", answer it and do not modify files. Edit only after explicit authorization ("proceed", "implement this", "go ahead").
    *Why:* Conceptual alignment must come before execution; editing while the user is checking understanding bypasses their control.

14. 🚫 **No New Dependencies Without Approval**: Never install or add packages (Python or npm) or change dependency declarations without first explaining what the package is, what it provides, and why it is strictly required, then waiting for explicit approval.
    *Why:* Unannounced packages cause conflicts, bloat, and unpredictable deployments.

22. 🚫 **Native Tool Calls Only**: Never output, format, or simulate tool logs, transcript headers (e.g. `"The following action was requested:"`), or mock diffs as chat text. All file and environment actions go through real tool calls. If a tool fails, report it in plain language.
    *Why:* Simulated logs are indistinguishable from real actions and mislead the user.

25. 🚫 **Zero Mock or Fallback Data**: Never inject mock datasets or fallback payloads to mask API failures, network blocks, or missing dependencies. Data comes only from live external services or the database. When a value is missing or a source fails, fail fast with the exact error.
    *Why:* Fake data hides the root cause and makes results untrustworthy.

26. 🚫 **Zero Unverified Environment Claims**: Never claim that runtime dependencies (Python packages, system tools, environment variables) are installed or working without concrete verification.
    *Why:* Unverified claims send debugging in the wrong direction.

---

## 🏗️ TIER 2: Locked Architectural Contracts

4. 🎛️ **Single Entry Point UI Controls**: Never create duplicate or competing buttons/icons for the same action. Use one clearly labeled control (e.g. "View List →").
   *Why:* Competing controls make behavior unpredictable.

9. 🐍 **Single Python Runtime**: All Python executions, subprocesses, and package installs MUST use the project virtual environment via the `getPythonExecutable()` resolver. Never use system Python or install outside the virtual environment.
   *Why:* Mixed environments cause `ModuleNotFoundError`, broken pipes, and corrupted IPC.

13. 🎯 **Single Source of Truth**: Every parameter, identifier, contract, and setting has exactly ONE authoritative definition. Never add fallback chains (`A || B`), duplicate aliases, dual naming, or defensive guessing.
    *Why:* Fallbacks hide misconfigurations and create competing versions of the truth.

20. 🦘 **Database via Node Only, Brisbane Time**: All database operations happen in TypeScript/Node. Python never touches the database or imports database modules; it only does analytical calculations. Every database timestamp is saved and shown in Brisbane local time (`Australia/Brisbane`, UTC+10).
    *Why:* One gatekeeper keeps data access auditable; one timezone keeps timestamps comparable across tables.

21. 🗄️ **Zero Runtime DDL, Approved DDL via the Database MCP**: Application code (`server.ts`, services, `schema.ts`) never runs DDL (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE`, `ensureTable()`); services only run DML (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) and `schema.ts` only holds TypeScript types. Schema changes are run by the AI through the database provider's MCP tool, only after showing the exact SQL and getting explicit approval for that specific change; then verify the result in the database and update `schema.ts` in the same change.
    *Why:* The live schema and the TypeScript contract must stay one source of truth, and every schema change must be human-approved.

23. 🗂️ **Frontend Modularity & File Ceiling**: Before adding UI code, decide whether the target file will become monolithic and extract components in the same change, never "later". No component file exceeds 400 lines. New tabs, modals, and overlays live in their own files and are imported into `App.tsx` as lean tags. Large static constants never live inside component files.
    *Why:* Deferred extraction turns into permanent monoliths.

24. 🌐 **HTTP Verb Semantics**: `GET` is strictly read-only (no DB writes, subprocesses, or side effects). `POST` creates records or starts jobs. `PUT`/`PATCH` update existing records. `DELETE` removes records. Long-running work is started by a mutating call and observed through a separate read-only `GET .../stream` or `GET .../status`.
    *Why:* Mutating `GET`s fire on reloads, prefetches, and polling.

27. 🎨 **One File Per Reusable UI Control**: A reusable control (switch, button, input, badge) lives in its own file, and consumers import it, never redefine it. The control stays agnostic of the screen; the consumer supplies labels, tone, and behavior.
    *Why:* One definition per control keeps the design system consistent. Example: `OrderToggles` imports `Switch` twice.

28. 🗂️ **Shared Domain Types**: A domain type (data or API contract) used by more than one file lives in the shared types file for its domain. Props types (`XxxProps`) and private helper types stay in their component file. Never import a domain type from a component file, never define the same shape twice, never create a catch-all `types.ts`.
    *Why:* Applies Rule 13 to frontend types. Example: `Candidate` and `RunState` live in the telemetry types file; `CandidateTableProps` stays in `CandidateTable.tsx`.

30. 🗄️ **Business Values Live in the Database**: Strategy settings, thresholds, limits, defaults and presets that drive trading decisions are stored in the database and read from there; market data comes from live APIs. Code holds only UI text, design tokens, type contracts, environment/path configuration, fixed lookup tables (e.g. sector → ETF) and implementation settings (e.g. the LLM model) — never a business value, not even as a default.
    *Why:* A value written in code silently disagrees with the one in the database; with one home, changing a setting in the app changes what the pipeline actually does.

32. **Python Backend Dependency Boundaries**: Python modules MUST use `backend.…` imports without modifying `sys.path`. The entry coordinates stages and supplies broker facts; the intelligence runner owns the Gates 1–5 sequence and coordinates data clients. Gates may use rules, utilities, configuration and the shared LLM client, but MUST NOT import data or broker clients. Rules and utilities MUST remain pure. Clients MUST receive strategy settings and lookup inputs as arguments and MUST NOT import other application modules. Follow the dependency directions in `docs/backend_architecture_primer.md`.
    *Why:* Explicit inputs keep external access separate from trading decisions and make dependencies auditable.

---

## 🤝 TIER 3: Collaboration Protocols

1. 🤝 **Specs Only With User Approval**: Never pre-fill, complete, or finalize spec documents (e.g. `NOW.md`) ahead of the user. Present proposed features and milestone changes in chat first, wait for explicit approval, then document only the concise final decision.
   *Why:* Specs record the user's decisions, not the AI's guesses.

6. 🗺️ **Consult `NOW.md` First**: Before answering "what is the focus now?" or any project-state question, read `spec_development/NOW.md`.
   *Why:* `NOW.md` is the single source of truth for milestones and tasks.

8. 🔍 **Root Cause Before Fixing**: When something fails, isolate the exact root cause with evidence (reproduction, traces), present it to the user, and change no code until the user confirms it.
   *Why:* Speculative patches mask symptoms and destabilize the codebase.

12. ❓ **Ask When Context Is Missing**: If a requirement, constraint, or preference is unspecified, ask the user before proposing specs or solutions.
    *Why:* Proposals built on assumptions waste iterations.

17. 📱 **User Governs Mobile Iterations**: Only the user decides which tasks belong in `📱 Mobile Iterations`. Never self-assign tasks there.
    *Why:* Mobile tasks depend on the user's availability and judgment.

19. 🧱 **Honor Agreed Architecture**: Follow the architecture and commitments already agreed with the user. No mid-stream pivots without the user's approval.
    *Why:* Silent pivots invalidate decisions the user has already reviewed.

29. 💡 **Capture Ideas in the Backlog**: When the user shares a new idea, future milestone, or improvement, add it to `spec_development/Milestone Backlog.md` under `## 💡 Candidates` using the capture format (`Why it appeared`, `Potential Outcome`, `Why it might matter`, `Related to`). Keep `NOW.md` focused on active work.
    *Why:* Ideas are kept without interrupting the active task.

31. 🧾 **One Change at a Time, the User Commits**: Make one reviewable change, report exactly what changed (each file and what the edit does), then stop. The user reviews the diff, stages and commits it, and says when to continue. Never stage or commit.
    *Why:* The user reviews every diff and owns the commit history.
