#!/bin/bash
echo "==================================================="
echo "   DLCHATS-APP SYSTEM DIAGNOSTIC TOOL"
echo "==================================================="

echo ""
echo "[1] Checking Node & NPM Versions..."
node -v
npm -v

echo ""
echo "[2] Checking PM2 Process Status..."
pm2 status dlchats-app
pm2 show dlchats-app | grep "status"

echo ""
echo "[3] Checking if Port 3005 is Open..."
# Try multiple tools to see if the port is listening
netstat -tulpn | grep 3005 || echo " -> Port 3005 NOT found in netstat"
lsof -i :3005 || echo " -> Port 3005 NOT found in lsof"

echo ""
echo "[4] Testing Local Connection (Internal)..."
# Try to connect to the app from inside the VPS
curl -I -v http://127.0.0.1:3005 2>&1 | head -n 10

echo ""
echo "[5] Checking Nginx Configuration..."
sudo nginx -t

echo ""
echo "[6] Checking Nginx Active Sites..."
ls -l /etc/nginx/sites-enabled/

echo ""
echo "[7] RECENT ERROR LOGS (Last 50 lines)..."
echo "---------------------------------------------------"
# Get the location of the error log file from PM2
LOG_PATH=$(pm2 describe dlchats-app | grep "error log path" | awk '{print $4}')
if [ -f "$LOG_PATH" ]; then
    tail -n 50 "$LOG_PATH"
else
    # Fallback to standard command if path not found
    pm2 logs dlchats-app --lines 50 --nostream
fi
echo "---------------------------------------------------"

echo ""
echo "DIAGNOSIS COMPLETE."
