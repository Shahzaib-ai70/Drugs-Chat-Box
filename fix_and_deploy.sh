#!/bin/bash
# fix_and_deploy.sh - The Ultimate Fixer for DLCHATS-APP

echo "==================================================="
echo "   DLCHATS-APP FIX & DEPLOY TOOL"
echo "==================================================="

APP_DIR="/var/www/dlchats-app"
DOMAIN="app.dlchats.site"
PORT=3005

# 1. Restore Old Project (Crucial step to appease user)
echo ""
echo "[1] Checking for Old Project Backup..."
if [ -f /root/nginx_backups/whatsapp-dashboard ]; then
    echo " -> Found backup of 'whatsapp-dashboard'. Restoring it..."
    cp /root/nginx_backups/whatsapp-dashboard /etc/nginx/sites-available/whatsapp-dashboard
    ln -sf /etc/nginx/sites-available/whatsapp-dashboard /etc/nginx/sites-enabled/
    echo " -> Old project restored."
else
    echo " -> No backup found in /root/nginx_backups/. Skipping restoration."
    # Check if it already exists in available
    if [ -f /etc/nginx/sites-available/whatsapp-dashboard ]; then
        echo " -> It exists in sites-available. Enabling it just in case..."
        ln -sf /etc/nginx/sites-available/whatsapp-dashboard /etc/nginx/sites-enabled/
    fi
fi

# 2. Setup New Project Nginx Config
echo ""
echo "[2] Configuring Nginx for New Project ($DOMAIN)..."
# Using 127.0.0.1 explicitly as requested
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

# 3. Build and Start App
echo ""
echo "[3] Building and Starting App..."
cd $APP_DIR || exit 1
echo " -> Installing dependencies..."
npm install
echo " -> Building frontend..."
npm run build
echo " -> Starting server with PM2..."
pm2 delete dlchats-app 2>/dev/null
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
