# AGENTS.md - Project Rules & Working Protocol

> **System Note**: This file is automatically loaded into the AI system context on every turn. All rules defined here take absolute precedence.

---

## 🧠 Core Engineering Principles (Karpathy Guidelines)
All agents MUST adhere to the core principles defined in `/.agent_rules/karpathy_rules.md`:
1. **Think Before Coding**: Surface assumptions, don't hide confusion, state tradeoffs before writing code.
2. **Simplicity First**: Write the minimum surgical code required to solve the problem. Nothing speculative.
3. **Surgical Changes**: Touch only what you must. Match existing codebase style.
4. **Goal-Driven Execution**: Define clear success criteria and verify incrementally.

---

## 🎯 Scope Principles
1. **Active Milestone Isolation**: Keep all active development strictly bound to `spec_development/NOW.md`. Never inject out-of-scope features or premature tasks into active code.
2. **Milestone Backlog Idea Capture**: Every time the user shares a new idea, potential future milestone, or improvement:
   - Capture and fill `spec_development/Milestone Backlog.md` under `## 💡 Candidates`.
   - Structure the entry using the standard capture format (`Why it appeared`, `Potential Outcome`, `Why it might matter`, `Related to`).
   - Keep current active execution in `spec_development/NOW.md` focused and uninterrupted.

---

## ⚡ Quick Pre-Flight Checklist
Before starting any turn or task, verify these core constraints:

1. 🚫 **[Testing / Pipelines]** **NO Automatic Full Pipeline Runs**: Never run scripts invoking live LLM/API calls (e.g. `run_pipeline_full.py`) without explicit user permission.
2. 🚫 **[Task Scope]** **Single-Task Focus**: Never execute or preview subsequent tasks (e.g., AI Task 02) until the active task is approved and user commands next step.
3. 🟡 **[Status & Reviews]** **No Unilateral "Completed" Tags**: Mark tasks as `🟡 Under Review` or `Ready for Review`. Only mark `✅ Completed` after human approval.
4. 🤝 **[Specs / Collaboration]** **Step-by-Step Spec Iteration**: Never pre-fill or finalize spec documents (`NOW.md`) ahead of user input. Collaborate step-by-step.
5. 🎨 **[UI Controls]** **Single Entry Point**: Avoid redundant buttons or icons for the same action. Use one clean, clearly labeled control.
6. 🗺️ **[Specs / Focus]** **Consult `spec_development/NOW.md` First**: Always read `spec_development/NOW.md` before answering "What is the focus now?" or detailing active project tasks.
7. 🔇 **[Tool Usage / Clean Logs]** **Minimize Unsolicited Tool Calls**: Avoid running unneeded background diagnostic tools that clutter the timeline. Keep responses direct and clean.
8. 🔍 **[Debugging / Root Cause]** **Mandatory Root-Cause Confirmation Before Fixing**: Never implement fixes or patches based on assumptions. Isolate the exact root cause, present the evidence to the user, and wait for user confirmation ("Yes, that's the root cause") before proceeding with fixes.
9. 🐍 **[Runtime / Python]** **100% Virtual Environment Consistency**: All Python executions, dependencies, and subprocesses MUST use `.venv/bin/python3` via the unified resolver (`getPythonExecutable()`). Never invoke system Python (`/usr/bin/python3`) or install packages outside `.venv`.
10. ✋ **[Authorization / Queries]** **Answer First & Wait for Authorization**: When the user asks a conceptual question, clarification, or asks "does it make sense?", answer directly and NEVER modify code prematurely without explicit authorization to proceed.
11. 🧠 **[Architecture / Simplicity]** **Deep Thinking Over Reflexive Complexity**: Never default to the first reflex idea. Step back, evaluate first principles, and seek the simplest, most efficient, and cleanest solution before proposing or coding.
12. ❓ **[Specs / Context]** **Clarify Unknown Context First**: At any development stage, if critical context, requirements, or user preferences are unspecified, ask clarifying questions before proposing specs or solutions.
13. 🎯 **[Architecture / Contracts]** **Strict Single Source of Truth & Zero Speculative Fallbacks**: Never use speculative fallback operators (e.g. `A || B`), duplicate aliases, or defensive guessing across contracts, schemas, or configs. Enforce one authoritative definition directly.
14. 📦 **[Runtime / Dependencies]** **Explicit User Authorization & Justification for New Python Dependencies**: Never install new Python packages or modify dependency declarations without first explaining what the package is, what it does, and why it is required, and waiting for explicit user authorization.

---

## 🔄 Protocol for Adding & Updating Lessons

When a new preference, lesson, or rule is identified during a session:
1. **Categorize**: Assign the lesson to a category (`Testing`, `Task Scope`, `Status`, `Specs`, `UI`, `Architecture`).
2. **Add to Detailed Lessons**: Append a formatted entry under `## Detailed Lessons` using the template below.
3. **Update Quick Checklist**: Add a 1-line bullet to the `⚡ Quick Pre-Flight Checklist` at the top.

### Standard Lesson Template:
```markdown
### Lesson X: [Title]
- **Category**: [Testing | Task Scope | Status | Specs | UI | Architecture]
- **Rule**: [Strict short directive - what MUST or MUST NOT be done]
- **Guideline**: [Practical context and rationale]
```

---

## 📋 Detailed Lessons

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

### Lesson 7: Minimal Unsolicited Tool Usage & Clean Response Flow
- **Category**: Tool Usage / Clean Logs
- **Rule**: Never invoke unnecessary or speculative background diagnostic tools (such as redundant file viewers, linters, or test curl commands) that stream tool logs into the chat timeline.
- **Guideline**: Focus strictly on requested actions and respond directly, keeping the user's interface clean and free of background system noise.

### Lesson 8: Mandatory Root-Cause Identification & User Confirmation Before Fixing
- **Category**: Architecture / Debugging
- **Rule**: When an error or failure occurs, you MUST identify and isolate the exact root cause (via reproduction and inspectable traces) before attempting any code changes or proposing patches. Communicate the findings and root cause clearly to the user, and DO NOT modify code until the user explicitly confirms: "Yes, that's the root cause".
- **Guideline**: Speculative patches, symptom masking, and premature edits without verified root-cause analysis waste iterations and destabilize the codebase.

### Lesson 9: Strict Single Python Runtime & Unified Virtual Environment Resolver
- **Category**: Architecture / Runtime
- **Rule**: All Python scripts, subprocess executions (in `server.ts`), quant pipelines, and package installations MUST use the single dedicated virtual environment (`.venv/bin/python3`). Never use or mix with system `python3` (`/usr/bin/python3`).
- **Guideline**: Mixed environments cause missing package errors (`ModuleNotFoundError`), broken pipes, and corrupted IPC. The centralized `getPythonExecutable()` resolver in `server.ts` is the single source of truth.

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

### Lesson 14: Explicit User Authorization & Justification for New Python Dependencies
- **Category**: Runtime / Dependencies
- **Rule**: Never install or introduce new Python packages or modify dependency declarations without first explaining to the user:
  1. What the package is
  2. What capability it provides
  3. Why it is strictly required
  And waiting for explicit user authorization before running any installation commands.
- **Guideline**: Speculative or unannounced package installations introduce dependency conflicts, bloat runtime environments, and undermine deployment predictability. Explicit human control must govern all runtime dependencies.


