# Deployment Instructions for Hostinger VPS (Add-on Project)

Since you already have a project running on this VPS, we will deploy this new app safely alongside it using a separate directory and the `app.dlchats.site` subdomain.

## 1. Safe Setup (Don't touch existing project)
We will use a dedicated directory so we don't interfere with your current files.

1. Connect to your VPS via SSH.
2. Create a new folder for this specific app:
```bash
sudo mkdir -p /var/www/dlchats-app
```
3. Set permissions (if needed):
```bash
sudo chown -R $USER:$USER /var/www/dlchats-app
```

## 2. Clone from GitHub & Install
1. **Clone the repository** directly into the folder:
```bash
git clone https://github.com/Shahzaib-ai70/Drugs-Chat-Box.git /var/www/dlchats-app
```

2. Enter the directory and install dependencies:
```bash
cd /var/www/dlchats-app
npm install --production
```
*(If you haven't installed Puppeteer dependencies yet on this server, run this once:)*
```bash
sudo apt install -y ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
```

## 3. Start with PM2 (Non-blocking)
We use a unique name `dlchats-app` so it doesn't conflict with your other PM2 processes.
```bash
pm2 start ecosystem.config.cjs
pm2 save
```
*Your app is now running on port 3005.*

## 4. Nginx Configuration (Subdomain)
We will create a **new** Nginx config file for `app.dlchats.site`. This ensures your main domain `dlchats.site` remains untouched.

1. Create the config file:
```bash
sudo nano /etc/nginx/sites-available/dlchats-app
```

2. Paste this content:
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
3. Save and Exit (`Ctrl+X`, then `Y`, then `Enter`).

4. Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/dlchats-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 5. SSL (HTTPS) for Subdomain
Secure only this subdomain.
```bash
sudo certbot --nginx -d app.dlchats.site
```

## 6. Done!
- Open **https://app.dlchats.site** to see your new app.
- Your existing site on `dlchats.site` is completely unaffected.
