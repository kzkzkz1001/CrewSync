#!/bin/sh
# One-time server setup script.
# Run as root on a fresh Ubuntu 22.04 / Debian 12 VPS.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/kzkzkz1001/CrewSync/main/infra/setup-server.sh | sh

set -e

DEPLOY_PATH="/opt/crewsync"
DEPLOY_USER="crewsync"

echo "==> Creating deploy user"
id -u "$DEPLOY_USER" &>/dev/null || useradd -m -s /bin/bash "$DEPLOY_USER"
usermod -aG docker "$DEPLOY_USER" 2>/dev/null || true

echo "==> Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> Installing Docker Compose plugin"
docker compose version >/dev/null 2>&1 || \
  apt-get install -y docker-compose-plugin

echo "==> Creating deployment directory"
mkdir -p "$DEPLOY_PATH/infra/nginx"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_PATH"

echo "==> Copying nginx config placeholder"
cat > "$DEPLOY_PATH/infra/nginx/nginx.conf" << 'NGINX'
# Replace with your actual nginx.conf from the repo
NGINX

echo ""
echo "✓ Server ready. Next steps:"
echo ""
echo "  1. Copy your .env file:"
echo "     scp .env $DEPLOY_USER@<host>:$DEPLOY_PATH/.env"
echo ""
echo "  2. Copy nginx config:"
echo "     scp infra/nginx/nginx.conf $DEPLOY_USER@<host>:$DEPLOY_PATH/infra/nginx/nginx.conf"
echo ""
echo "  3. Copy production compose:"
echo "     scp infra/docker-compose.prod.yml $DEPLOY_USER@<host>:$DEPLOY_PATH/infra/docker-compose.prod.yml"
echo ""
echo "  4. Add GitHub Actions secrets:"
echo "     DEPLOY_HOST     = <server IP>"
echo "     DEPLOY_USER     = $DEPLOY_USER"
echo "     DEPLOY_SSH_KEY  = <private key>"
echo "     DEPLOY_PATH     = $DEPLOY_PATH"
echo "     NEXT_PUBLIC_GATEWAY_URL   = https://<your-domain>"
echo "     NEXT_PUBLIC_MAPBOX_TOKEN  = pk.xxx"
echo ""
echo "  5. Push to main to trigger your first deploy."
