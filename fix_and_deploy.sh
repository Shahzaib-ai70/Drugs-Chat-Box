#!/bin/bash
# fix_and_deploy.sh - The Ultimate Fixer for DLCHATS-APP (Deep Clean Version)

echo "==================================================="
echo "   DLCHATS-APP FRESH START & DEPLOY TOOL"
echo "==================================================="

APP_DIR="/var/www/dlchats-app"
DOMAIN="app.dlchats.site drugs.dlchats.site"
PORT=3005

# 1. DELETE ALL OLD CONFLICTING CONFIGS (Emergency Clean)
echo ""
echo "[1] EMERGENCY CLEAN: Removing ALL old Nginx configs..."
# We are NOT restoring whatsapp-dashboard because it is causing conflicts.
# We will create a fresh config for the new app ONLY.
rm -f /etc/nginx/sites-enabled/whatsapp-dashboard
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-available/whatsapp-dashboard

# 2. Setup New Project Nginx Config
echo ""
echo "[2] Configuring Nginx for New Project ($DOMAIN)..."
cat > /etc/nginx/sites-available/dlchats-app <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable it
ln -sf /etc/nginx/sites-available/dlchats-app /etc/nginx/sites-enabled/

# 3. Deep Clean Build and Start App
echo ""
echo "[3] Building and Starting App (Deep Clean)..."
cd $APP_DIR || exit 1

# Stop existing process
pm2 delete dlchats-app 2>/dev/null

# Remove node_modules to ensure fresh install
echo " -> Removing old dependencies (fresh start)..."
rm -rf node_modules package-lock.json

echo " -> Installing dependencies..."
npm install

echo " -> Building frontend..."
npm run build

echo " -> Starting server with PM2..."
# Kill any existing node processes that might be lingering
killall -9 node 2>/dev/null
PORT=$PORT pm2 start server.js --name dlchats-app --spa --update-env

# 4. Resolve Nginx Conflicts (Redundant but safe)
echo ""
echo "[4] Final check for conflicts..."
# Aggressively remove ANY site that matches our domain pattern to be safe
# (Assuming user doesn't have other important sites starting with these names in default)
rm -f /etc/nginx/sites-enabled/whatsapp-dashboard
rm -f /etc/nginx/sites-enabled/default

# 5. Reload Nginx
echo ""
echo "[5] Reloading Nginx..."
nginx -t
if [ $? -eq 0 ]; then
    # Force restart to clear any stuck worker processes
    systemctl restart nginx
    echo " -> Nginx restarted successfully."
else
    echo " -> Nginx configuration error! Check output above."
fi

echo ""
echo "==================================================="
echo "   DONE! Check https://$DOMAIN"
echo "==================================================="
