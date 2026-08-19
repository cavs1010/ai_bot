# 🚀 Dokploy & GitHub Auto-Deployment Guide (Hostinger VPS)

This guide provides the complete, step-by-step procedure to deploy the **AI Trading Bot Cockpit** onto your Hostinger VPS using **Dokploy** with continuous deployment from **GitHub (`main` branch)**.

---

## 🏗️ Architecture Summary

- **Server Runtime:** Node.js 20 (Express CJS backend + React static build)
- **Quant Engine:** Python 3.11 with isolated `.venv` (`alpaca-py`, `ta`, `pandas`, `yfinance`)
- **Container Port:** `3000` (Internal)
- **Health Check:** `http://localhost:3000/api/health`
- **Persistent Data Path:** `/app/backend/01_scanner/data`

---

## 📋 Step-by-Step Deployment Protocol

### Step 1: Push Codebase to GitHub
1. Create a repository on GitHub (e.g., `ai-trading-bot`).
2. Push your project files to the repository:
   ```bash
   git init
   git add .
   git commit -m "feat: complete production Dockerfile and quant dashboard"
   git branch -M main
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git
   git push -u origin main
   ```

---

### Step 2: Connect GitHub to Dokploy
1. Open your Dokploy Dashboard on your Hostinger VPS (`http://<YOUR_VPS_IP>:3000` or your Dokploy domain).
2. Go to **Settings** → **Source Control** / **Git Providers**.
3. Connect your **GitHub Account** (via GitHub App or Personal Access Token / Deploy Key).

---

### Step 3: Create the Application in Dokploy
1. In Dokploy, navigate to your **Project** (or create a new Project named `Trading`).
2. Click **Create Service** → Select **Application**.
3. Name the service (e.g., `trading-bot-cockpit`).
4. In the **Source** tab:
   - **Provider:** GitHub
   - **Repository:** `<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>`
   - **Branch:** `main`
   - **Build Type:** Select **Dockerfile**
   - **Dockerfile Path:** `/Dockerfile`
   - **Context Path:** `/`

---

### Step 4: Configure GitHub Auto-Deploy (CI/CD on Merge to `main`)
1. In the Application settings in Dokploy, locate the **Auto Deploy** toggle.
2. Enable **Auto Deploy**.
3. Dokploy will automatically create a webhook in your GitHub repository.
4. *Result:* Every time a Pull Request is merged or code is pushed to `main`, GitHub signals Dokploy to automatically pull, build the Docker container, and restart the service with zero downtime.

---

### Step 5: Configure Persistent Storage (Volumes)
> ⚠️ **Crucial:** Without this step, scanner telemetry (`latest_run.json`) and watchlists will be reset whenever a new deployment builds.

1. In your Dokploy Application view, click the **Volumes / Mounts** tab.
2. Click **Add Mount**:
   - **Type:** Volume or Bind Mount
   - **Host Path (VPS):** `/var/lib/dokploy/trading-bot-data` (or named volume `trading_bot_data`)
   - **Mount Path (Container):** `/app/backend/01_scanner/data`
3. Click **Save Mount**.

---

### Step 6: Add Environment Variables
1. In your Dokploy Application view, click the **Environment** tab.
2. Copy and paste the values based on `.env.example`:
   ```env
   NODE_ENV=production
   PORT=3000
   
   # Alpaca API Credentials
   APCA_API_KEY_ID=your_alpaca_key_id_here
   APCA_API_SECRET_KEY=your_alpaca_secret_key_here
   APCA_API_BASE_URL=https://paper-api.alpaca.markets
   
   # Google Gemini API Key
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Click **Save Environment**.

---

### Step 7: Configure Domain & SSL (HTTPS)
1. Go to the **Domains** tab in your Dokploy application.
2. Click **Add Domain**.
3. Enter your domain or subdomain (e.g., `trade.yourdomain.com`).
4. Set **Container Port:** `3000`.
5. Check **Enable HTTPS / SSL (Let's Encrypt automated certificate)**.
6. In your DNS provider (Cloudflare, Namecheap, GoDaddy, Hostinger DNS), add an **A Record**:
   - **Host:** `trade` (or `@`)
   - **Points to:** `<YOUR_HOSTINGER_VPS_IP>`
7. Click **Save Domain**. Dokploy's built-in Traefik reverse proxy will automatically generate and renew free SSL certificates.

---

### Step 8: Deploy & Verify
1. Click **Deploy** in the top-right corner of Dokploy.
2. Watch the **Deployment Logs** tab:
   - Node dependencies install.
   - Python virtual environment is created and quant packages installed.
   - Vite builds the frontend and esbuild bundles the server.
   - Container starts and healthcheck succeeds.
3. Access your live app at `https://trade.yourdomain.com`.
4. Test health endpoint: `https://trade.yourdomain.com/api/health` → `{"status": "ok", ...}`.

---

## 🛠️ Maintenance & Useful Commands

### Viewing Live Logs in Dokploy
- Go to **Logs** inside the Dokploy Application dashboard to view real-time Python pipeline execution and Express API requests.

### Triggering Manual Pipeline Runs
- The dashboard UI has the interactive **"Run Bot Pipeline"** button with live Server-Sent Events (SSE) streaming logs directly to your browser.
