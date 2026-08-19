# 🗺️ NOW — Active Milestone & Execution Plan

> **Single Source of Truth**: This document tracks the active milestone, feature execution order, and explicit verification test criteria.

---

## 🎯 Milestone

- **Name:** `Dokploy Deployment & Production Containerization for Hostinger VPS`
- **Expected Outcome:** The trading platform builds a clean, standalone production bundle (`npm run build`), packages into a unified Node.js 20 + Python 3.11 Docker container with isolated `.venv` dependencies, and is configured for automated GitHub CI/CD deployments on merge to `main` via Dokploy on Hostinger VPS with persistent volume mounts and verified health checks.

### ✅ Completion Criteria
- [x] **1. Production Build Pipeline (`npm run build`):** `vite build` generates the React frontend in `dist/` and `esbuild` bundles `server.ts` into `dist/server.cjs` with zero errors.
- [x] **2. Standalone Server Lifecycle Test:** Server boots cleanly with `NODE_ENV=production node dist/server.cjs` on port 3000, serving static assets and API routes without development dependencies (`tsx`).
- [x] **3. Unified Multi-Runtime `Dockerfile` & `.dockerignore`:** Debian-based container (Node 20 + Python 3.11) that installs `.venv` requirements, runs the production build, and exposes port 3000.
- [ ] **4. GitHub CI/CD & Auto-Deploy on `main`:** Clear branch and webhook deployment workflow defined for Dokploy on Hostinger VPS.
- [ ] **5. Persistent Storage & Secrets Protocol:** Persistent volume mapping for `/app/backend/01_scanner/data` (to persist watchlists and telemetry across redeploys) and complete `.env.example` secrets documentation.

---

## 🧩 Milestone Features

### 🔵 Active Feature: `3. GitHub Auto-Deploy, Dokploy Configuration & Secrets Protocol`
- **Objective:** Configure the GitHub `main` branch auto-deploy workflow, Dokploy persistent volume mounts, comprehensive `.env.example`, and step-by-step Dokploy deployment guide.
- **🧪 Mandatory Verification Tests:**
  1. Create comprehensive `.env.example` covering all Alpaca, LLM (Gemini/Anthropic), and market data API keys.
  2. Define Dokploy volume mount configuration for `/app/backend/01_scanner/data` to ensure data persists across fresh GitHub checkouts.
  3. Document step-by-step Dokploy service setup, GitHub webhook integration, and custom domain/SSL configuration.

---

### ⏭️ Next Features
- *(None — Final feature of the milestone)*

---

### ✅ Completed Features
- **Feature 1: Production Build Pipeline & Standalone Server Verification** (Completed ✅ — Verified `npm run build` generates `dist/index.html` and `dist/server.cjs`, and `node dist/server.cjs` serves `/api/health` and static frontend).
- **Feature 2: Multi-Runtime Production Dockerfile & .dockerignore** (Completed ✅ — Verified Debian Node 20 + Python 3.11 with `.venv`, layer caching, healthcheck, and AST validation).

---

## 🧠 Current Focus — Human Work

- **Current Objective:** Implement `.env.example`, persistent storage volume configuration, and provide complete step-by-step Dokploy guide for GitHub CI/CD auto-deployment.
- **Questions to Resolve:** None.
- **Decisions Made:**
  - Deployment target is Dokploy self-hosted PaaS on Hostinger VPS.
  - Hybrid containerization using Debian-based Node 20 + Python 3.11 with `.venv`.
  - Dokploy Auto-Deploy tracking `main` branch.
  - Persistent volume mount for `/app/backend/01_scanner/data`.
- **When This Is Finished:** The app will be ready for live deployment on Dokploy with automatic CI/CD on every push to `main`.

---

## 🤖 AI Queue

### AI Task 03: Create .env.example, Persistent Volume Specs & Step-by-Step Dokploy Guide
- **Status:** 🟡 Ready for Review (Tests Passed 100%)
- **Results:**
  - Created `.env.example` documenting all configuration keys (`APCA_API_KEY_ID`, `APCA_API_SECRET_KEY`, `APCA_API_BASE_URL`, `GEMINI_API_KEY`, fallbacks, and port settings) with zero committed secrets.
  - Created comprehensive `DOKPLOY_DEPLOYMENT_GUIDE.md` detailing step-by-step instructions for GitHub connection, branch auto-deploy, persistent volume mount (`/app/backend/01_scanner/data`), environment secrets entry, domain configuration, and automated Let's Encrypt SSL.
  - Verified compilation build with `compile_applet` (exit code 0).

---

## 💡 Discovered Ideas
- *Autonomous Execution Daemon (APScheduler / cron for pre-market and market open runs) → Captured for the next milestone.*
- *Discord / Telegram Webhook Notifications for trade execution alerts → Captured in Milestone Backlog.*

---

## 🚧 Blockers & Enabling Milestones
- **Enabling Milestone:** `01_UI.md` (Completed ✅).
- **Current Blockers:** None.

---

## 🔍 Review
- **Current Status:** `🟡 Ready for Milestone Review` (All 3 features ready).
- **Reviewer:** Human Lead.

---

## ✅ Milestone Closure
- [ ] All 3 features implemented and verified with tests.
- [ ] Production build and Dokploy deployment guide validated.
- [ ] Human review confirmed and approved.
