#!/usr/bin/env bash
# ==============================================================================
# Hostinger VPS Anti-Botnet & Security Hardening Script
# ==============================================================================
# Run this script immediately upon provisioning a new VPS (as root):
#   chmod +x vps_security_lockdown.sh
#   ./vps_security_lockdown.sh <NEW_USERNAME>
# ==============================================================================

set -euo pipefail

NEW_USER="${1:-camilo}"

echo "=========================================================="
echo "🛡️  Starting VPS Security Hardening for user: ${NEW_USER}"
echo "=========================================================="

# 1. Update OS Packages
echo "📦 [1/5] Updating OS and installing security utilities..."
export DEBIAN_FRONTEND=noninteractive
apt update && apt upgrade -y
apt install -y ufw fail2ban curl git unattended-upgrades

# 2. Create Sudo User
echo "👤 [2/5] Creating non-root user '${NEW_USER}' with sudo privileges..."
if ! id -u "${NEW_USER}" >/dev/null 2>&1; then
    adduser --disabled-password --gecos "" "${NEW_USER}"
    usermod -aG sudo "${NEW_USER}"
fi

# Copy SSH keys
mkdir -p "/home/${NEW_USER}/.ssh"
if [ -f "/root/.ssh/authorized_keys" ]; then
    cp "/root/.ssh/authorized_keys" "/home/${NEW_USER}/.ssh/authorized_keys"
else
    touch "/home/${NEW_USER}/.ssh/authorized_keys"
fi
chown -R "${NEW_USER}:${NEW_USER}" "/home/${NEW_USER}/.ssh"
chmod 700 "/home/${NEW_USER}/.ssh"
chmod 600 "/home/${NEW_USER}/.ssh/authorized_keys"

# 3. Harden SSH Configuration (Disable root login & password auth)
echo "🔒 [3/5] Hardening SSH configuration..."
cat > /etc/ssh/sshd_config.d/99-security-hardening.conf << 'EOF'
PermitRootLogin no
PasswordAuthentication no
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
MaxAuthTries 3
EOF

if sshd -t; then
    systemctl restart ssh || systemctl restart sshd
    echo "✅ SSH service reloaded with root & password logins disabled."
else
    echo "❌ SSH config check failed. Please inspect /etc/ssh/sshd_config.d/"
fi

# 4. Configure UFW Firewall
echo "🧱 [4/5] Configuring UFW Firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP / Let-s Encrypt'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
ufw status verbose

# 5. Configure Fail2ban
echo "🛡️ [5/5] Configuring Fail2ban anti-botnet brute-force protection..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
banaction = ufw

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 24h
EOF

systemctl enable fail2ban
systemctl restart fail2ban

echo ""
echo "=========================================================="
echo "✅ VPS Security Hardening Complete!"
echo "----------------------------------------------------------"
echo "1. User '${NEW_USER}' is created and granted sudo permissions."
echo "2. Root login and password logins are disabled."
echo "3. UFW firewall is active (ports 22, 80, 443 open only)."
echo "4. Fail2ban is active (auto-bans repeated failed login attempts)."
echo "=========================================================="
