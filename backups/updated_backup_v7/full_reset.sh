#!/bin/bash
echo "==================================================="
echo "   FULL RESET TOOL (Clean everything)"
echo "==================================================="

# 1. Stop and Delete our New Process
pm2 delete dlchats-app 2>/dev/null
pm2 save

# 2. Remove all our New Configs
sudo rm -f /etc/nginx/sites-enabled/dlchats-app
sudo rm -f /etc/nginx/sites-available/dlchats-app

# 3. Remove our New Files
sudo rm -rf /var/www/dlchats-app

# 4. Disable the OLD confusing config causing 502
# (Since you said you want to clear this domain and don't need anything right now)
sudo rm -f /etc/nginx/sites-enabled/whatsapp-dashboard

# 5. Reload Nginx to apply "Empty" state
sudo systemctl reload nginx

echo "DONE. The domain app.dlchats.site should now show 'Site can't be reached' or default page."
