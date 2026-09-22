# 🗺️ NOW — Active Milestone & Execution Plan

> **Single Source of Truth**: This document tracks the active milestone, feature execution order, and explicit verification test criteria.

---

## 🎯 Milestone

- **Name:** `Repo Hygiene, Dead Code Removal & Frontend Split`
- **Expected Outcome:** The repo has one spec system (`spec_development/`), no Jupyter notebooks, no leftover root junk or unused npm packages, a split dashboard UI instead of a monolithic `App.tsx`, one UI token file so a single color/type/radius/button change cascades everywhere, and a repeatable `npm run check` hygiene command so later changes cannot silently grow files, reintroduce notebooks, or leave dead dependencies.

### ✅ Completion Criteria
- [ ] **1. Inventory confirmed:** A written list of dead files, unused npm packages, and notebooks is presented and the human confirms what may be deleted.
- [ ] **2. Dead artifacts removed:** All `*.ipynb` files are deleted from the repo. Root leftovers (`get-pip.py`, `metadata.json`, dual lockfiles) and unused npm packages are gone. No notebooks folder is kept.
- [ ] **3. Spec unification:** `spec_development/` is the only spec source of truth. Docs and agent rules no longer point at the non-existent `spec/master.md` / iteration-roadmap workflow.
- [ ] **4. UI tokens:** All visual properties are named once in `frontend/src/index.css` (`@theme`): color, type, radius, buttons, badges, inputs, three spacings. No second token file, no UI kit.
- [ ] **5. Frontend split:** `frontend/src/App.tsx` is broken into dashboard components (header/portfolio, funnel, results, settings/dials, API hooks, types) that **only** use those token names. Changing a token (e.g. primary button color) updates every control that uses it. No leftover palette classes (`bg-teal-500`, `bg-rose-900`, mixed `red`/`rose`). No backend numbered-folder reshuffle.
- [ ] **6. Hygiene CLI:** `npm run check` fails on leftover notebooks, unused declared JS deps, TypeScript compile errors, and any `.py` / `.ts` / `.tsx` over **400 lines** except the allowlisted dial board `backend/config.py`. `npm audit` is a separate optional security command, not this check.

---

## 🧩 Milestone Features

> Execute **in this order**. Do not start the next feature until the active one is approved.

### 🔵 Active Feature

### Feature 1: Inventory (confirm before any delete)

**Expected Outcome:**  
A concrete inventory of: unused npm packages, root junk, every `*.ipynb`, docs/rules that still mention `spec/master.md`, and source files over 400 lines. Human replies that the list is the deletion set (or amends it). **No files are deleted in this feature.**

**Status:** ⏳ Not started

---

### ⏭️ Next Features

In the expected execution order:

1. **Feature 2: Delete notebooks, root junk, unused npm packages** — Remove all Jupyter notebooks from the repo (no archive folder). Remove confirmed root leftovers and unused npm dependencies. Keep a single JS lockfile.
2. **Feature 3: Spec unification** — Point `README.md`, `AGENTS.md`, `.agent_rules/`, and `.cursor/rules/` at `spec_development/NOW.md` only. Stop instructing agents to read `spec/master.md`.
3. **Feature 4: UI token file** — Define the locked token set in `frontend/src/index.css` (`@theme`) only. Do not add `tokens.ts` or a design-system package. Do not split `App.tsx` in this feature.

   **Token file contains only:**
   - **Color:** `canvas`, `surface`, `border`, `text`, `text-muted`, `text-faint`, `accent`, `positive`, `danger`, `warning` (one danger hue; no mixing `red` and `rose`).
   - **Type:** sans (UI) + mono (data). Same family for H1 and H2. Scale: H1 18/bold, H2 14/semibold, H3/card label 12/medium muted, eyebrow/badge 10/bold uppercase, display number 24/mono/bold, body 12–14.
   - **Radius:** `sm` (chips), `md` (cards, buttons), `full` (toggles only).
   - **Buttons (three roles, consume color/type/radius):** Primary (`accent` fill, dark text), Secondary (`surface` + `border`), Danger (`danger` fill). States: rest, hover, pressed, disabled/loading. Tabs = Secondary selected (`surface` + `accent` text). Toggles are not buttons (off = track; on = `danger` / `warning` / `accent`).
   - **Badges:** eyebrow type + semantic color + tinted fill (`LIVE`/`SIM`, `BUY`/`SKIP`/`BLOCKED`, P&L). Not a fourth button role.
   - **Inputs:** `surface` + `border`, mono for numbers, focus ring = `accent`, disabled = same as disabled buttons.
   - **Spacing (three only):** page gutter, card padding, stack gap. No full spacing scale.
   - **Not in the file:** extra fonts, shadow/z-index/animation scales, breakpoints, icon-size scale.
4. **Feature 5: Split the dashboard (`App.tsx`)** — Modularize the cockpit (header/portfolio, funnel, candidate table, settings/dials, API hooks, types) so every component **references Feature 4 token names**. A leftover hardcoded `bg-teal-500` does not cascade — that is a Feature 5 failure. Do not rename `backend/00_data`–`04_execution`.
5. **Feature 6: Hygiene CLI (`npm run check`)** — One command covering both JS and Python trees: no `*.ipynb`, line-count cap (400; allowlist `backend/config.py`), unused JS deps, `tsc`. Do not mix in `npm audit`. Do not add new npm packages without explicit authorization.

---

### ✅ Completed Features
- *(None yet.)*

---

## 🧠 Current Focus — Human Work

- **Current Objective:** Approve Feature 1 (inventory) as the first execution step. No code or deletions until that list is confirmed.
- **Questions to Resolve:** None.
- **Decisions Made:**
  - Delete every Jupyter notebook from the repo. No `notebooks/` keep-folder.
  - Completed Dokploy work stays archived as `02_Dokploy_Deployment.md`.
  - Spec unification is in this milestone. Live spec system is `spec_development/` only.
  - Line-count cap is **400** for `.py` / `.ts` / `.tsx`. `backend/config.py` is allowlisted as the strategy dial board.
  - Do not reshuffle backend pipeline folders.
  - Do not mix this milestone with the relational audit-history or autonomous-daemon backlog items.
  - `npm audit` is not the cleanliness check.
  - No in-app hygiene dashboard. Cleanliness is the CLI (`npm run check`) only.
  - One UI token file: `frontend/src/index.css` (`@theme`). Named properties: color, type, radius, buttons, badges, inputs, three spacings. Change a token once → every component that uses that name updates. Components must not hardcode palette classes.
- **When This Is Finished:** The repo is smaller, one-spec, modular on the UI side, and a single CLI check guards those rules.

---

## 🤖 AI Queue

### AI Task 01: Produce the deletion/hygiene inventory
- **Status:** ⏳ Not started — wait for human to say to start Feature 1.
- **Scope:** List unused npm packages, root junk, all notebooks, `spec/master.md` references, and files over 400 lines. Present for confirmation. Do not delete.

---

## 💡 Discovered Ideas
- *Autonomous Execution Daemon → already in Milestone Backlog.*
- *Discord / Telegram webhooks → already in Milestone Backlog.*

---

## 🚧 Blockers & Enabling Milestones
- **Enabling Milestone:** `02_Dokploy_Deployment.md` (Completed ✅).
- **Current Blockers:** None. Waiting for human go-ahead to run Feature 1 (inventory only).

---

## 🔍 Review
- **Current Status:** `⏳ Spec ready` (not started).
- **Reviewer:** Human Lead.

---

## ✅ Milestone Closure
- [ ] All 6 features implemented and verified.
- [ ] `npm run check` passes on the cleaned tree.
- [ ] Human review confirmed and approved.

**Status:** ⏳ Not started
