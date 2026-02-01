# Step-by-Step Guide: Deploy via GitHub

Since you have already set up the project locally and have a VPS, here is the exact workflow to connect them.

## Phase 1: Push Local Code to GitHub
Your local project is now configured for Git. You need to push it to your repository.

1. **Open your terminal in VS Code** (or the one you are using).
2. Run this command to overwrite the manual upload with your proper local project structure:
   ```bash
   git push -f origin main
   ```
   *(If asked for a password, use your GitHub Personal Access Token).*

---

## Phase 2: Deploy on Hostinger VPS
Now we will connect your VPS to this GitHub repository.

### 1. Connect to VPS
Open your SSH terminal (PuTTY or Terminal):
```bash
ssh root@72.60.236.77
```

### 2. Setup Directory & Clone
We will use the separate folder `dlchats-app` to keep your existing project safe.

```bash
# Remove old folder if it exists (fresh start)
rm -rf /var/www/dlchats-app

# Create new folder
mkdir -p /var/www/dlchats-app

# Clone your repository (Using SSH since you have keys)
git clone git@github.com:Shahzaib-ai70/Drugs-Chat-Box.git /var/www/dlchats-app
```

### 3. Install & Build
Now we install dependencies and build the frontend on the server.

```bash
cd /var/www/dlchats-app

# Install dependencies
npm install

# Build the frontend (creates 'dist' folder)
npm run build
```

### 4. Start the App (PM2)
We use the specific configuration to avoid conflicts.

```bash
# Start/Restart using the config file
pm2 start ecosystem.config.cjs
pm2 save
```

### 5. Configure Domain (Nginx)
If you haven't done this yet (from the previous step), set up the subdomain `app.dlchats.site`.

1. **Create Config**:
   ```bash
   nano /etc/nginx/sites-available/dlchats-app
   ```

2. **Paste This**:
   ```nginx
   server {
       listen 80;
       server_name app.dlchats.site;

       location / {
           proxy_pass http://localhost:3005;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   *(Press `Ctrl+X`, then `Y`, then `Enter` to save)*

3. **Activate**:
   ```bash
   ln -s /etc/nginx/sites-available/dlchats-app /etc/nginx/sites-enabled/
   nginx -t
   systemctl reload nginx
   ```

4. **SSL (Secure Lock)**:
   ```bash
   certbot --nginx -d app.dlchats.site
   ```

## Summary
- **Local**: You push changes with `git push`.
- **VPS**: To update in the future, just run:
  ```bash
  cd /var/www/dlchats-app
  git pull
  npm install
  npm run build
  pm2 restart dlchats-app
  ```
