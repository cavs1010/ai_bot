---
name: agent-creation-standards
description: How to build an LLM agent (a Claude/pydantic-ai gate) in this project. Use when adding or editing any function that calls an LLM, so every agent shares one structured, testable pattern.
---

# Agent Creation Standards

How to build an **LLM agent** here — a function that asks Claude one focused question and returns a structured answer (the intelligence-layer gates 2–5). One pattern, reused.

**Before you build:**

1. Follow [`karpathy_rules.md`](./karpathy_rules.md) — simplicity, surgical changes, ask when unclear. These rules apply *while* you create an agent.
2. Follow [`function_definition_rules.md`](./function_definition_rules.md) — an agent **is a fetcher-kind function** (external I/O). Its module shape, docstring, `__main__`, and companion notebook all come from that doc; this doc only adds what is agent-specific.

Reference implementation: `backend/02_intelligence/gate2_news_threat/news_threat_gate2.py`.

---

## 1. Use the shared client — never hand-roll the LLM call

All agents go through `backend/02_intelligence/helpers/llm/client.py`:

- `build_agent(output_type, system_prompt, *, model=, temperature=)` — build **once at module load**, reuse per call.
- `run_agent(agent, user_prompt)` — one call → validated output, or `None` on any failure.

Do not import `pydantic_ai`/`anthropic` directly in a gate, and do not build the agent inside the per-call function. `run_agent` already wraps the call in the fetcher contract (`try/except` → `None`), so the gate does not repeat it.

---

## 2. Anatomy of an agent module

```
1. Output model    — a pydantic BaseModel; one field per answer, each with Field(description=...)
2. System prompt    — the agent's fixed instruction (what to look for, what NOT to)
3. _agent           — build_agent(OutputModel, SYSTEM_PROMPT) at module level
4. assess_…() func  — fetch/accept inputs → build user prompt → run_agent → map to result dict
```

The public function follows `function_definition_rules.md` §4 (type hints, Args/Returns, explicit return contract). Keep the model **flat and small** — a few short fields the caller actually uses.

**The agent receives its inputs; it does not fetch them.** The pipeline fetches shared data (e.g. news) **once per candidate** and passes the same data to every gate that needs it (Gate 2 *and* Gate 3 consume news). A gate that fetches its own inputs double-hits the API and can assess a *different* dataset than the next gate — inconsistent and nondeterministic. So: caller fetches structured data → passes it in; the gate only assesses. Prompt-formatting, by contrast, stays *inside* the gate (each gate frames the same data for its own question).

---

## 3. Structured output, single source of truth

- **Let the model fill a schema**, don't parse free text. Constrain values: use an `Enum` (or `Literal`) for any fixed taxonomy; use a `list` when more than one answer can apply at once.
- **Derive, don't duplicate.** If a taxonomy appears in both the schema and the prompt, define it **once** (e.g. an enum + a `{member: description}` dict) and **generate** the prompt's list from it. Guard with an assert that every member has a description. Never maintain the same list in two places.
- **Derive the verdict** (e.g. `passed`) from the structured fields, so it can never contradict them.

---

## 4. Model and cost

- Default to the **cheap model** (`DEFAULT_MODEL`, Haiku) while building.
- Each agent may trade cost for quality per gate via `build_agent(..., model=...)` — this is the only knob; don't add config layers.
- Use `temperature=0.0` (the default) for stable structured answers unless there's a reason not to.

---

## 5. Failure policy is the caller's decision — state it

`run_agent` returns `None` when the LLM is unreachable. The agent function decides what that means **and documents why**:

- A check that can be screened no other way may **block** on `None` (don't act blind) — stricter than data fetchers that pass on missing data.
- Put the reason in a one-line comment and the result (`reason='llm_unavailable'`).

---

## 6. Verification — real data for the path, fixtures for the negative

LLM calls cost money and live inputs vary, so split the two jobs:

| Goal | Input | Assertion |
|------|-------|-----------|
| Wiring works (zero cost) | `agent.override(model=TestModel())` | output is the expected type |
| Real behaviour / happy path | **real** inputs (call the real fetcher, real tickers) | print and eyeball — do **not** assert an exact verdict on live data; it's flaky |
| Negative path (e.g. must block) | a **synthetic fixture** with the known condition | hard `assert` the verdict |

You cannot summon a real "threat" headline on demand — so the *only* deterministic way to test a block is a labelled synthetic fixture. Conversely, fabricating the happy path proves nothing about the real pipeline — use real data there. Label each clearly (`# synthetic — deterministic block` / `# live — real news`).

Companion notebook (required, see `function_definition_rules.md` §9) must include a **multi-input, real-data** cell so real variation is visible.

---

## 7. Definition of Done

In addition to `function_definition_rules.md` §10:

- [ ] Goes through `build_agent` / `run_agent` — no direct SDK calls, agent built once at module load
- [ ] Output is a structured pydantic model; any fixed taxonomy is single-sourced (§3)
- [ ] `None`-from-LLM behaviour is chosen and documented (§5)
- [ ] Wiring tested with `TestModel`; negative path asserted on a fixture; real-data path demonstrated
