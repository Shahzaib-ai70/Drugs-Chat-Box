# VPS Deployment & Fix Instructions

## 🚨 Fresh Install (If folder is missing)

If you see `No such file or directory` or `502 Bad Gateway`, run these commands one by one:

```bash
# 1. Remove any partial installation
sudo rm -rf /var/www/dlchats-app

# 2. Download the project fresh
sudo git clone https://github.com/Shahzaib-ai70/Drugs-Chat-Box.git /var/www/dlchats-app

# 3. Enter the folder
cd /var/www/dlchats-app

# 4. Run the Master Fix Script
sudo bash fix_and_deploy.sh
```

---

## What does fix_and_deploy.sh do?
1. **Restores your old project** (whatsapp-dashboard) automatically.
2. **Sets up the new project** (app.dlchats.site) on Port 3005.
3. **Builds the frontend** so the white screen goes away.
4. **Fixes Nginx** configuration for both sites.
