#!/bin/bash
# fix_and_deploy.sh - The Ultimate Fixer for DLCHATS-APP (Deep Clean Version)

echo "==================================================="
echo "   DLCHATS-APP FRESH START & DEPLOY TOOL"
echo "==================================================="

APP_DIR="/var/www/dlchats-app"
DOMAIN="app.dlchats.site drugs.dlchats.site"
PORT=3005

# 0.5. AUTOMATIC SWAP FILE CREATION (Prevent OOM)
echo ""
echo "[0.5] Optimizing System Limits..."
# Increase File Descriptors for many Puppeteer instances
ulimit -n 65535
echo " -> File descriptors limit increased to 65535"

echo "[0.5] Checking for Swap File..."
if [ $(swapon --show | wc -l) -le 1 ]; then
    echo " -> No swap detected. Creating 4GB Swap File (This is critical for multiple Chrome instances)..."
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    echo " -> Swap created successfully!"
else
    echo " -> Swap already exists."
fi

# 0.6. FIREWALL CONFIGURATION
echo ""
echo "[0.6] Configuring Firewall..."
if command -v ufw &> /dev/null; then
    # We do NOT want to expose worker ports externally anymore
    # ufw allow 3000:3050/tcp 
    echo " -> Worker ports are internal only (Gateway Architecture)"
else
    echo " -> UFW not found. Skipping firewall config."
fi

# 1. CLEAN EXISTING CONFIG (Safe Mode)
echo ""
echo "[1] Configuring Nginx..."
# Only remove default and our own config, do NOT touch other projects
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/dlchats-app
echo " -> Cleaned up old dlchats-app config."

# 2. Setup New Project Nginx Config (FORCE OVERWRITE)
echo ""
echo "[2] Configuring Nginx for New Project ($DOMAIN)..."

# 2.1 Fix Nginx Bucket Size (Global Setting)
# We create a separate config file in conf.d to ensure it's in the http block
echo "server_names_hash_bucket_size 128;" > /etc/nginx/conf.d/dlchats-params.conf
echo " -> Created /etc/nginx/conf.d/dlchats-params.conf to fix long domain names"

# 2.2 Create Site Config
# Using a HEREDOC with strict content to avoid manual nano errors
cat > /etc/nginx/sites-available/dlchats-app <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Removed server_names_hash_bucket_size from here as it belongs in http block (handled above)

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable it
ln -sf /etc/nginx/sites-available/dlchats-app /etc/nginx/sites-enabled/
# Remove default to be safe
rm -f /etc/nginx/sites-enabled/default

# 3. Deep Clean Build and Start App
echo ""
echo "[3] Building and Starting App (Deep Clean)..."
cd $APP_DIR || exit 1

echo " -> Pulling latest changes (force reset to origin/main)..."
git fetch origin main
git reset --hard origin/main


# Stop existing process
pm2 delete dlchats-app 2>/dev/null

# Remove node_modules to ensure fresh install
echo " -> Removing old dependencies (fresh start)..."
rm -rf node_modules package-lock.json

echo " -> Installing dependencies..."
npm install

echo " -> Building frontend..."
# We use a non-blocking build approach. If it fails, we still start the server.
npm run build 

if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo "CRITICAL ERROR: Build failed or dist folder is empty. Aborting deployment to prevent blank page."
    exit 1
fi

echo " -> Starting server with PM2..."
# Kill any existing node processes that might be lingering
killall -9 node 2>/dev/null
# Start the server (Gateway Architecture)
# We allocate generous RAM for the Master Process
PORT=$PORT pm2 start server.js --name dlchats-app --update-env --node-args="--max-old-space-size=2048"

# 4. Final check for conflicts (Redundant but safe)
echo ""
echo "[4] Final check..."

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

# 5.5 Health Check
echo ""
echo "[5.5] Verifying Deployment..."
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$PORT/health)
if [ "$HTTP_CODE" == "200" ]; then
    echo " -> Health Check PASSED: App is running on port $PORT"
else
    echo " -> Health Check FAILED: App returned $HTTP_CODE (Expected 200)"
    pm2 logs dlchats-app --lines 20 --nostream
fi

# 6. Attempt SSL (Optional)
echo ""
echo "[6] Attempting SSL Setup (Certbot)..."
if command -v certbot &> /dev/null; then
    # Added --expand to handle existing certificates automatically
    certbot --nginx -d app.dlchats.site -d drugs.dlchats.site --non-interactive --agree-tos -m admin@dlchats.site --redirect --expand
else
    echo " -> Certbot not found. Skipping SSL."
fi

echo ""
echo "==================================================="
echo "   DONE! Check https://$DOMAIN"
echo "==================================================="
