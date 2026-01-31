#!/bin/bash
echo "=========================================="
echo "   DLCHATS-APP VPS AUTO-FIX & DEPLOY"
echo "=========================================="

# 1. Install System Dependencies (Crucial for Puppeteer/WhatsApp)
echo "[1/6] Installing system dependencies..."
sudo apt-get update > /dev/null
sudo apt-get install -y ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils > /dev/null

# 2. Fix Nginx Configuration (Resolve 502 & Conflicts)
echo "[2/6] Fixing Nginx configuration..."
sudo mkdir -p /root/nginx_backups

# Disable conflicting sites
if [ -f /etc/nginx/sites-enabled/whatsapp-dashboard ]; then
    echo " -> Disabling whatsapp-dashboard to prevent conflicts..."
    sudo mv /etc/nginx/sites-enabled/whatsapp-dashboard /root/nginx_backups/ 2>/dev/null
fi
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo " -> Disabling default site..."
    sudo mv /etc/nginx/sites-enabled/default /root/nginx_backups/ 2>/dev/null
fi

# Write correct config
echo " -> Writing new Nginx config for app.dlchats.site..."
sudo bash -c 'cat > /etc/nginx/sites-available/dlchats-app <<EOF
server {
    listen 80;
    server_name app.dlchats.site;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF'

# Enable and Reload
sudo ln -sf /etc/nginx/sites-available/dlchats-app /etc/nginx/sites-enabled/
sudo nginx -t > /dev/null 2>&1
sudo systemctl reload nginx

# 3. Update Code
echo "[3/6] Updating application code..."
git reset --hard
git pull origin main

# 4. Install Dependencies & Build
echo "[4/6] Installing NPM dependencies..."
# Remove node_modules to ensure clean slate for SQLite/Puppeteer
rm -rf node_modules
npm install
echo " -> Building frontend..."
npm run build

# 5. Restart Application
echo "[5/6] Restarting PM2 process..."
pm2 delete dlchats-app 2>/dev/null
pm2 start ecosystem.config.cjs
pm2 save

# 6. Verify Status
echo "[6/6] Verifying deployment..."
echo " -> Waiting 10s for startup..."
sleep 10

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3005)

if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "404" ]; then
    echo "SUCCESS! The app is running internally."
    echo "You should be able to access: https://app.dlchats.site"
else
    echo "WARNING: App might have failed to start (HTTP Status: $HTTP_STATUS)"
    echo "Here are the last 20 lines of error logs:"
    pm2 logs dlchats-app --lines 20 --nostream
fi

echo "=========================================="
echo "   DEPLOYMENT COMPLETE"
echo "=========================================="
