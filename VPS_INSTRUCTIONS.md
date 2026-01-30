# VPS Deployment & Fix Instructions

## 🚨 One-Click Fix (Recommended)

If you are seeing "502 Bad Gateway" or your old project is missing, run this **Single Command** on your VPS:

```bash
cd /var/www/dlchats-app && git pull origin main && sudo bash fix_and_deploy.sh
```

This script will automatically:
1. **Restore your old project** (whatsapp-dashboard) if it was accidentally removed.
2. **Configure the new project** (app.dlchats.site) on Port 3005.
3. **Build the frontend** and start the server.
4. **Fix Nginx** configuration.

---

## Manual Steps (Only if script fails)

### 1. Update Server Code
Ensure `server.js` listens on `127.0.0.1` (already done in code).

### 2. Nginx Configuration
Edit `/etc/nginx/sites-available/dlchats-app`:
```nginx
server {
    listen 80;
    server_name app.dlchats.site;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Restart Services
```bash
pm2 restart dlchats-app
sudo systemctl reload nginx
```
