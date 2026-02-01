#!/bin/bash
echo "==================================================="
echo "   DLCHATS-APP CLEANUP & RESET TOOL"
echo "==================================================="
echo "WARNING: This will delete the 'dlchats-app' and its config."
echo "It will NOT touch 'Bitsafe' or other projects."
echo "==================================================="

# 1. Stop and Delete PM2 Process
echo "[1/4] Removing PM2 process..."
pm2 delete dlchats-app 2>/dev/null
pm2 save

# 2. Remove Nginx Configuration
echo "[2/4] Removing Nginx configuration..."
sudo rm -f /etc/nginx/sites-enabled/dlchats-app
sudo rm -f /etc/nginx/sites-available/dlchats-app
sudo systemctl reload nginx

# 3. Remove Project Directory
echo "[3/4] Removing project files..."
# Move out of the directory if we are in it
cd /root
sudo rm -rf /var/www/dlchats-app

# 4. Optional: Check for conflicting files in backup and warn
if [ -f /root/nginx_backups/whatsapp-dashboard ]; then
    echo "NOTE: The conflicting 'whatsapp-dashboard' file is still in /root/nginx_backups/."
    echo "We kept it there to prevent 502 errors on the new install."
fi

echo "==================================================="
echo "   CLEANUP COMPLETE"
echo "   You can now perform a fresh install."
echo "==================================================="
