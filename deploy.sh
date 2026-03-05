#!/bin/bash
cd /var/www/dlchats-app && \
git fetch origin && \
git reset --hard origin/main && \
npm install && \
npm run build && \
pm2 restart all && \
echo "Update Complete! Restored delete button."
