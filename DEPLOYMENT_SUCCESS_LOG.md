
## 2026-02-03 - Critical Fix: Connected Accounts & Cleanup
- **Fix**: Resolved service ID mismatch in `App.tsx` (updated legacy `tg1`/`wa1` to `tg`/`wa`) to restore missing connected accounts.
- **Cleanup**: Removed `fb`, `ms` service definitions and unused imports from `services.tsx`.
- **VPS Path**: `/var/www/dlchats-app`
- **Deployment Command**: `cd /var/www/dlchats-app && git pull && ./fix_and_deploy.sh`
