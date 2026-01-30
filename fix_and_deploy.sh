#!/bin/bash
# fix_and_deploy.sh - The Ultimate Fixer for DLCHATS-APP (Deep Clean Version)

echo "==================================================="
echo "   DLCHATS-APP FRESH START & DEPLOY TOOL"
echo "==================================================="

APP_DIR="/var/www/dlchats-app"
DOMAIN="app.dlchats.site"
PORT=3005

# 1. Restore Old Project (Safe-guarding user's existing work)
echo ""
echo "[1] Checking for Old Project Backup..."
if [ -f /root/nginx_backups/whatsapp-dashboard ]; then
    echo " -> Found backup of 'whatsapp-dashboard'. Restoring it..."
    cp /root/nginx_backups/whatsapp-dashboard /etc/nginx/sites-available/whatsapp-dashboard
    ln -sf /etc/nginx/sites-available/whatsapp-dashboard /etc/nginx/sites-enabled/
    echo " -> Old project restored."
else
    echo " -> No backup found in /root/nginx_backups/. Checking sites-available..."
    if [ -f /etc/nginx/sites-available/whatsapp-dashboard ]; then
        echo " -> It exists in sites-available. Enabling it..."
        ln -sf /etc/nginx/sites-available/whatsapp-dashboard /etc/nginx/sites-enabled/
    fi
fi

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
pm2 start server.js --name dlchats-app --port $PORT --spa

# 4. Reload Nginx
echo ""
echo "[4] Reloading Nginx..."
nginx -t
if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo " -> Nginx reloaded successfully."
else
    echo " -> Nginx configuration error! Check output above."
fi

echo ""
echo "==================================================="
echo "   DONE! Check https://$DOMAIN"
echo "==================================================="
