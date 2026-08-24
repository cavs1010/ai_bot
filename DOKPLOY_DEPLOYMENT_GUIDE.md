# 🚀 Dokploy & GitHub Auto-Deployment Guide (Hostinger 1-Click Dokploy)

This guide provides the complete, step-by-step procedure to securely configure your Hostinger VPS using Hostinger's **1-Click Dokploy Application Template**, protect it against botnet brute-force attacks and suspensions, and deploy the **AI Trading Bot Cockpit** with continuous deployment from **GitHub (`main` branch)** using the **free HTTP domain provided by Dokploy**.

---

## 📌 How Hostinger's 1-Click Dokploy Template Works

When you select the **Dokploy Template** on Hostinger:
1. **Dokploy and Docker are ALREADY installed automatically** the moment the VPS boots. You **do not** need to install Dokploy or Docker manually!
2. Dokploy is immediately live and listening on port `3000`.
3. **Your very first priority** is to claim the admin account on port `3000` before any internet bot tries to register it, then lock down the VPS security (user, SSH keys, firewall, fail2ban).

---

### Step 0: Understand Your Local Mac SSH Key Setup

Your Mac (`camilovargas@Camilos-MacBook-Pro`) already has an active default SSH key pair in `~/.ssh/`:
- **Private Key:** `~/.ssh/id_ed25519` (Stays safe on your Mac)
- **Public Key (Padlock):** `~/.ssh/id_ed25519.pub` (Goes on your VPS)

To view and copy your public padlock text from your Mac terminal at any time:
```bash
cat ~/.ssh/id_ed25519.pub
```
*(When creating or rebuilding your VPS in Hostinger hPanel, paste this text under **SSH Keys**).*

---

### Step 1: Claim Your Dokploy Admin Dashboard Immediately

Because Dokploy is already installed and running on boot:
1. Open your browser and go to: `http://<YOUR_VPS_IP>:3000`
2. **Immediately fill out the initial setup screen** with your email and a strong admin password.
   *(Doing this immediately ensures no automated scanner can access or register the initial panel).*

---

### Step 2: Update OS Packages & Enable Automatic Security Upgrades
Log into your VPS via SSH as `root` (or via Hostinger Browser Console) and run:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ufw fail2ban curl unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```
*(When the blue terminal dialog appears, select **Yes** to enable automatic security upgrades).*

---

### Step 3: Create the Dedicated Sudo User `camilo`
```bash
# 1. Create the new user 'camilo' (set a strong password when prompted)
sudo adduser camilo

# 2. Grant administrative sudo permissions to camilo
sudo usermod -aG sudo camilo
```

#### How to copy your Mac's SSH Key to `camilo`:
Choose either **Method A** or **Method B**:

* **Method A (If you pasted your SSH key in Hostinger hPanel when rebuilding):**
  Hostinger placed your key in `/root/.ssh/authorized_keys`. Copy it internally inside the VPS to `camilo`:
  ```bash
  sudo mkdir -p /home/camilo/.ssh
  sudo cp /root/.ssh/authorized_keys /home/camilo/.ssh/ 2>/dev/null || sudo touch /home/camilo/.ssh/authorized_keys
  sudo chown -R camilo:camilo /home/camilo/.ssh
  sudo chmod 700 /home/camilo/.ssh
  sudo chmod 600 /home/camilo/.ssh/authorized_keys
  ```

* **Method B (Directly from your Mac Terminal):**
  In your Mac terminal, send your default key directly across the network in one command:
  ```bash
  ssh-copy-id camilo@<YOUR_VPS_IP>
  ```

---

### Step 4: Verify Local SSH Access & Disable Root Password Logins

**A. In a NEW terminal window on your Mac, test connecting as `camilo`:**
```bash
ssh camilo@<YOUR_VPS_IP>
```
*(Your Mac will automatically use `~/.ssh/id_ed25519` to log in).*

**B. Once connected as `camilo`, lock down the SSH daemon on the VPS:**
```bash
sudo bash -c 'cat > /etc/ssh/sshd_config.d/99-security-hardening.conf << "EOF"
PermitRootLogin no
PasswordAuthentication no
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
MaxAuthTries 3
EOF'

# Validate config and restart SSH service
sudo sshd -t && sudo systemctl restart ssh
```
*Now direct root login and all password guessing attacks are permanently blocked at the network door.*

---

### Step 5: Configure UFW Firewall (Gatekeeper)
Allow SSH, Dokploy Web UI, and Web traffic:
```bash
# Default policy: Deny incoming, allow outgoing
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (Port 22), Dokploy Web UI (Port 3000), and Web Traffic (HTTP 80, HTTPS 443)
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 3000/tcp comment 'Dokploy Web UI'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Enable firewall
sudo ufw --force enable
sudo ufw status verbose
```

---

### Step 6: Configure & Activate Fail2ban (Anti-Botnet Defense)
Fail2ban automatically monitors logs and bans any IP address that attempts brute-force scans:
```bash
sudo bash -c 'cat > /etc/fail2ban/jail.local << "EOF"
[DEFAULT]
bantime = 24h
findtime = 10m
maxretry = 3
banaction = ufw

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
EOF'

sudo systemctl enable fail2ban
sudo systemctl restart fail2ban
sudo fail2ban-client status sshd
```

---

### Step 7: Access & Use the Dokploy Web UI

Port `3000` is kept permanently open in your firewall so you **always have guaranteed direct access** to configure your server, connect your GitHub repository, manage environment variables, and monitor deployments directly from the visual dashboard.

* **Access URL:** Open your browser and go to `http://<YOUR_VPS_IP>:3000`
* **Dashboard Configuration:** You can do 100% of your application setup, persistent volume mapping, environment secrets, and automated GitHub deployments directly through this web interface without touching the terminal again.

---

## 🏗️ Architecture Summary

- **Server Runtime:** Node.js 20 (Express CJS backend + React static build)
- **Quant Engine:** Python 3.11 with isolated `.venv` (`alpaca-py`, `ta`, `pandas`, `yfinance`)
- **Container Port:** `3000` (Internal)
- **Health Check:** `http://localhost:3000/api/health`
- **Persistent Data Path:** `/app/backend/01_scanner/data`

---

## 📋 Step-by-Step Deployment Protocol (Using the Dokploy UI)

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
1. Open your Dokploy Dashboard on your Hostinger VPS (`http://<YOUR_VPS_IP>:3000`).
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
   - **Type:** Bind Mount
3. Click **Save Mount**.

---

### Step 6: Add Environment Variables
1. In your Dokploy Application view, click the **Environment** tab.
2. Copy and paste the values based on `.env.example`:
   ```env
   ALPACA_SECRET_KEY=your_alpaca_secret_key_here
   ALPACA_API_KEY=your_alpaca_api_key_here
   ALPACA_BASE_URL=https://paper-api.alpaca.markets
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   NEWS_API_KEY=your_news_api_key_here
   FMP_API_KEY=your_fmp_api_key_here
   FINNHUB_API_KEY=your_finnhub_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Click **Save Environment**.

---

### Step 7: Configure Free Domain (Provided by Dokploy over HTTP)
1. Go to the **Domains** tab in your Dokploy application.
2. Click **Generate Domain** (Dokploy will automatically generate a free wildcard routing domain like `trading-bot.123-45-67-89.traefik.me`).
3. Set **Container Port:** `3000`.
4. Keep HTTPS/SSL disabled (operating directly over standard HTTP for this free domain).
5. Click **Save Domain**.

---

### Step 8: Deploy & Verify
1. Click **Deploy** in the top-right corner of Dokploy.
2. Watch the **Deployment Logs** tab:
   - Python quant virtual environment installs (`alpaca-py`, `pandas`, `ta`, `yfinance`).
   - Express backend bundles and React cockpit builds into `dist/`.
   - Service starts successfully on port 3000.
3. Open your live app using the free Dokploy domain: `http://<YOUR_DOKPLOY_GENERATED_DOMAIN>`.
4. Verify healthcheck: `http://<YOUR_DOKPLOY_GENERATED_DOMAIN>/api/health` → `{"status": "ok"}`.

---

## 🔄 Daily Developer Workflow

Whenever you build new features or refine Python quant pipelines:
1. Develop and test locally or in AI Studio.
2. Commit and push changes to GitHub:
   ```bash
   git add .
   git commit -m "feat: enhance scanner pipeline"
   git push origin main
   ```
3. **Dokploy automatically detects the push, builds the new Docker image, runs database migrations, and swaps containers with zero downtime.**

---

## 🛡️ Verification & Security Audit Commands

Run these on your VPS anytime to verify security status:
```bash
# Check Firewall Status
sudo ufw status verbose

# Check Fail2ban active jail and banned IPs
sudo fail2ban-client status sshd

# View real-time security log
sudo tail -f /var/log/auth.log
```
