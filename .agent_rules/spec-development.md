# Agent Rules — Spec & Iteration Development

These rules govern how `spec/` is structured, updated, and read. **Follow them exactly** so every agent keeps the same format and workflow.

Reference before planning or coding: read [`spec/master.md`](../spec/master.md) first, then the active iteration roadmap.

Also follow [`function_definition_rules.md`](./function_definition_rules.md) when writing code.

---

## 1. Core concepts

| Term | Meaning |
|------|---------|
| **Iteration** | One full lap of the project (start → finish). Iteration 1 = build the whole bot once. Iteration 2 = second full lap, more precise. |
| **Phase** | A step *inside* the active iteration roadmap (Phase 0, Phase 1, …). |
| **Roadmap** | Detailed plan for one iteration: phases, tasks, exit criteria. |
| **Ideas file** | Short bullets for the *next* iteration only — not a roadmap yet. |

**You are never on two iterations at once.** `master.md` → **Current iteration** is the source of truth.

---

## 2. File layout (`spec/` — flat, no subfolders)

| File | When it exists | Purpose |
|------|----------------|---------|
| `master.md` | Always | Index: current iteration, links, workflow summary |
| `mission.md` | Always | Stable: why, non-negotiable rules, success criteria |
| `tech-stack.md` | Always | Stable: tools, libraries, folder layout |
| `iteration-01-roadmap.md` | Iteration 1 | Full build plan for lap 1 |
| `iteration-02-ideas.md` | While on iteration 1 | One-line ideas for lap 2 only |
| `iteration-02-roadmap.md` | **After** iteration 1 is done | Full build plan for lap 2 (drafted from ideas) |
| `iteration-03-ideas.md` | While on iteration 2 | One-line ideas for lap 3 |
| … | … | Same pattern |

### Naming rules (mandatory)

- Use **two digits**: `01`, `02`, not `1`, `2`.
- Roadmap: `iteration-NN-roadmap.md`
- Ideas: `iteration-NN-ideas.md`
- **Never** create `spec/roadmap.md` (removed — use `master.md`).
- **Never** use subfolders under `spec/iterations/`.

---

## 3. Where to put information

| Situation | Put it here |
|-----------|-------------|
| Starting a session / which iteration is active | `master.md` → **Current iteration** |
| Task for the current lap | Active `iteration-NN-roadmap.md` under the right **Phase** |
| Reminder for a **later phase** in the *same* iteration | Note under that phase in the **active roadmap** |
| Improvement for the **next full iteration** | One bullet in `iteration-0(N+1)-ideas.md` |
| Iteration N finished | Update `master.md`; **create** `iteration-0(N+1)-roadmap.md` from ideas file |

### Do not

- Write a full `iteration-0(N+1)-roadmap.md` while iteration N is still active.
- Put long idea lists in `master.md` (links only in master).
- Implement items from an ideas file unless the user asks to **capture** an idea.
- Duplicate the same idea in both roadmap and ideas file.

### Foundation exception

If a mistake breaks the contract for all later work (wrong data shape, wrong API surface), fix it in the **current** iteration — do not defer to the ideas file.

---

## 4. Emoji conventions (use consistently)

Use emojis in spec files for scanability. **Do not** change meanings between files.

| Emoji | Meaning |
|-------|---------|
| 📌 | Master index / current iteration |
| 🗺️ | Iteration roadmap |
| 💡 | Ideas file (not a roadmap) |
| 🔄 | Status: active |
| ✅ | Status: done |
| ⏳ | Status: not started / planned |
| 📚 | Stable spec (`mission`, `tech-stack`) |
| 🛠️ | Development standards / tooling |
| 🤖 | Agent instructions |
| ⚠️ | Important warning (non-negotiable) |
| 🔑 | Prerequisites / API keys |
| 📦 | Project setup |
| 📊 | Data layer |
| 🔍 | Scanner |
| 🧠 | AI / sentiment |
| 📈 | Signals / EV |
| 🛡️ | Risk gate |
| ⚡ | Execution / broker |
| 📝 | Logging / learning |
| 🔗 | Pipeline integration |
| 📋 | Paper trading |
| 💰 | Live trading |
| 🎯 | `mission.md` (stable) |
| 🧰 | `tech-stack.md` (stable) |
| 🏗️ | What we are building |
| 💡 | Why / purpose (mission) — not the ideas file |
| ⚙️ | How it works / pipeline |
| 📖 | Learning / review process |
| 🏁 | Success / go-live criteria |
| 🔭 | Long-term vision |
| 🌐 | External services section |
| 🏦 | Alpaca |
| 📰 | NewsAPI |
| 📅 | Finnhub |
| 🐍 | Python libraries section |
| 📥 | Install commands |
| 📁 | File / folder structure |
| 🔐 | `.env` / secrets config |

Phase headers in roadmaps: `## Phase N — Title` with the emoji that matches the phase type (see iteration 1 roadmap as reference).

**Note:** 💡 in an **ideas file** title (`# 💡 Iteration N — Ideas`) is not the same as 💡 in mission (“Why It Exists”). Context comes from the filename.

---

## 5. File templates

### `master.md` (required sections)

1. Title: `# 📌 Iterations (master)`
2. `**Current iteration:** N`
3. `## 📚 Stable spec` — table linking `mission.md`, `tech-stack.md`
4. `## 🚀 Iterations` — table: Iteration | Status | Roadmap | Ideas
5. `## Workflow` — numbered steps 1–4
6. `## 🤖 Agent instructions` — read order, do not implement ideas file

Status values in table: `🔄 active` | `✅ done` | `⏳ not started`

When iteration N completes:

1. Set iteration N status to `✅ done`.
2. Set **Current iteration** to N+1.
3. Set iteration N+1 to `🔄 active` and link the new roadmap file.

### `iteration-NN-roadmap.md` (required header)

```markdown
# 🗺️ Iteration N — Roadmap

**Status:** 🔄 active | ✅ done

[One sentence: what this lap covers.]

- 💡 Ideas for iteration N+1 → [iteration-0(N+1)-ideas.md](...)
- ⏳ Do not create `iteration-0(N+1)-roadmap.md` until this iteration is complete
- 📌 Index → [master.md](master.md)

## 🛠️ Development Standards
...
```

Then `## Phase 0 — …` through `## Phase 11 — …` with phase emojis where applicable.

### `iteration-NN-ideas.md` (required header)

```markdown
# 💡 Iteration N — Ideas

**Not a roadmap.** One-line bullets only.

Captured during iteration N-1. When iteration N-1 is finished, use this list to draft `iteration-NN-roadmap.md`.

---

- [One line per idea — no phases, no exit criteria here]
```

Append new ideas as `- ` bullets only. Keep each idea to **one line**.

### `mission.md` (stable — required header)

```markdown
# 🎯 Mission

> **Stable spec** — changes rarely. Update only when strategy, rules, or success criteria change.
> 📌 Index → [master.md](master.md) · Rules for edits → [`.agent_rules/spec-development.md`](../.agent_rules/spec-development.md)

---

## 🏗️ What We Are Building
## 💡 Why It Exists
## ⚙️ How It Works
## 📖 How We Learn From Errors
## ⚠️ The Decision Rules (Non-Negotiable)
## 🏁 Success Criteria
## 🔭 Long-Term Vision
```

Use `---` between major sections. Pipeline table stages may use stage emojis (🔍 🧠 📈 🛡️ ⚡ 📝) as in the current file.

### `tech-stack.md` (stable — required header)

```markdown
# 🧰 Tech Stack

> **Stable spec** — update when tools, libraries, paths, or `.env` variables change.
> 📌 Index → [master.md](master.md) · Rules for edits → [`.agent_rules/spec-development.md`](../.agent_rules/spec-development.md)

---

## 📋 Overview
## 🌐 External Services & APIs
## 🐍 Python Libraries
## 📥 Install Command
## 📁 Project File Structure
## 🔐 Key Configuration Variables (`.env`)
```

Service subsections: `### 🏦 Alpaca`, `### 🧠 Claude AI`, `### 📰 NewsAPI`, etc. Use **bold** for Role / Used for / Library labels.

---

## 6. Editing stable spec (`mission.md` & `tech-stack.md`)

Stable files hold **truth** for the whole project across iterations. Iteration roadmaps hold **tasks** for the current lap.

### When to edit which file

| Change type | Edit here | Do not put here |
|-------------|-----------|-----------------|
| New task, phase done, exit criteria | Active `iteration-NN-roadmap.md` | `mission.md` |
| Idea for a future lap | `iteration-0(N+1)-ideas.md` | `mission.md`, `tech-stack.md` |
| Strategy, rules, success criteria, pipeline meaning | `mission.md` | Roadmap or ideas |
| New library, API, path, `.env` key, install line | `tech-stack.md` | Roadmap (unless also a phase task) |
| “Maybe switch to Tiingo later” | `iteration-XX-ideas.md` | `tech-stack.md` (link to ideas only) |
| Current iteration number | `master.md` only | mission / tech-stack |

### Rules for stable spec edits

1. **Keep the header block** (title + `> **Stable spec**` + links to master and this rule file).
2. **Use section emojis** from §4 — same headings, same order as templates above.
3. **Minimal diffs** — change only what’s outdated; do not rewrite unrelated sections.
4. **No task checkboxes** (`- [ ]`) in mission or tech-stack — those belong in iteration roadmaps.
5. **No iteration-specific notes** (“we’ll fix this in iteration 2”) — use ideas files.
6. **After changing paths or env vars** — check the active iteration roadmap and code still match; update roadmap phase tasks if needed.
7. **Alternatives not yet adopted** (e.g. Tiingo) → one line in ideas file + optional link from tech-stack: `see iteration-02-ideas.md`.

### When `mission.md` and `tech-stack.md` disagree

- **Trading rules / thresholds** → `mission.md` wins.
- **Tooling / file paths / libraries** → `tech-stack.md` wins.
- If both need to change (e.g. new risk limit in code and docs), update **both** in the same session.

---

## 7. Agent workflow (every session)

1. Read `spec/master.md` → confirm **Current iteration**.
2. Open `iteration-0N-roadmap.md` for that N → implement **only** what belongs to the current phase unless the user directs otherwise.
3. If the user discovers work for the **next iteration** → append one line to `iteration-0(N+1)-ideas.md` (do not expand into a roadmap).
4. If the user completes a phase → check off tasks in the active roadmap (`- [x]`).
5. When the user says an iteration is complete → update `master.md`, create next roadmap from ideas file, stop editing the old ideas file for new work.

**Opening line for user:** *"Current iteration: N. Follow `spec/master.md` and `iteration-0N-roadmap.md`."*

---

## 8. Checklist before editing spec files

- [ ] Correct file for the change (master vs roadmap vs ideas vs **stable**)?
- [ ] Correct iteration number (two digits)?
- [ ] Ideas file = bullets only, no fake phases?
- [ ] Emojis match §4?
- [ ] `master.md` **Current iteration** matches the file you're implementing?
- [ ] Stable edit? Header block kept; no checkboxes; no “iteration 2” deferrals in mission/tech-stack

---

*Consistency is the goal: same names, same emojis, same workflow every time.*
