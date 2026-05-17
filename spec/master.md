# 📌 Iterations (master)

**Current iteration:** 1

> This file is the **index only**. Detailed work lives in each iteration's roadmap.  
> Ideas for a future iteration = one-line bullets in `iteration-XX-ideas.md` until the previous iteration is finished.

---

## 📚 Stable spec

| File | Purpose |
|------|---------|
| [🎯 mission.md](mission.md) | Why we build this, pipeline, non-negotiable rules, success criteria |
| [🧰 tech-stack.md](tech-stack.md) | Tools, APIs, libraries, folders, `.env` variables |

These files change **rarely**. See [`.agent_rules/spec-development.md`](../.agent_rules/spec-development.md) §8 before editing them.

---

## 🚀 Iterations

| Iteration | Status | 🗺️ Roadmap | 💡 Ideas (next lap) |
|-----------|--------|------------|---------------------|
| 1 | 🔄 **active** | [iteration-01-roadmap.md](iteration-01-roadmap.md) | → [iteration-02-ideas.md](iteration-02-ideas.md) |
| 2 | ⏳ not started | *(create `iteration-02-roadmap.md` when iteration 1 is done)* | [iteration-02-ideas.md](iteration-02-ideas.md) |

---

## 🔁 Workflow

1. **Active iteration** → follow `iteration-0N-roadmap.md` only.
2. **Later phase, same iteration** → add a note under that phase in the active roadmap.
3. **Next iteration** → append one short bullet to `iteration-0(N+1)-ideas.md`. Do **not** write a full roadmap for N+1 until iteration N is complete.
4. **Iteration N done** → mark N `✅ done` here, draft `iteration-0(N+1)-roadmap.md` from the ideas file, set **Current iteration** to N+1.

---

## 🤖 Agent instructions

Before coding or planning:

1. Read this file → confirm **Current iteration**.
2. Read the active `iteration-0N-roadmap.md`.
3. Use [🎯 mission.md](mission.md) and [🧰 tech-stack.md](tech-stack.md) for strategy and tooling context — do not treat them as task checklists.

Do **not** implement items from `iteration-02-ideas.md` while current iteration is 1 unless the user asks to **capture an idea**.

Full rules: [`.agent_rules/spec-development.md`](../.agent_rules/spec-development.md)
