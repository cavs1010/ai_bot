# =============================================================================
# Production Multi-Runtime Dockerfile (Node.js 20 + Python 3.11)
# Target: Dokploy PaaS on Hostinger VPS
# =============================================================================

FROM node:20-bookworm-slim

# Set working directory
WORKDIR /app

# Prevent interactive prompts during apt install
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV PORT=3000

# Install Python 3.11, virtual environment tools, and build essentials for native packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 1. Install Node.js dependencies
COPY package*.json ./
RUN npm install

# 2. Setup Python isolated virtual environment (.venv) and install quant dependencies
COPY requirements.txt ./
RUN python3 -m venv .venv && \
    .venv/bin/pip install --upgrade pip setuptools wheel && \
    .venv/bin/pip install --no-cache-dir -r requirements.txt

# 3. Copy application source code
COPY . .

# 4. Compile frontend with Vite and bundle Express server with esbuild into /dist
RUN npm run build

# 5. Ensure persistent data directory exists
RUN mkdir -p /app/backend/01_scanner/data

# 6. Container health check for Dokploy / Traefik monitoring
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Expose internal container port
EXPOSE 3000

# Launch standalone compiled production server
CMD ["node", "dist/server.cjs"]
