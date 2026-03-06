# How to Update the Automated Backup System

To change the backup file name to "Drug load fully optional backup file.zip" and generate it automatically on every push, please update the file `.github/workflows/backup.yml` with the following content:

```yaml
name: Full Project Backup

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  make-backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Create backup zip
        run: |
          mkdir -p artifacts
          zip -r "artifacts/Drug load fully optional backup file.zip" . \
            -x "node_modules/*" ".git/*" ".github/*" \
            "database.db*" "node.exe" \
            "*.zip" "*.log" "dist/*"
            
      - name: Upload backup artifact
        uses: actions/upload-artifact@v4
        with:
          name: Drug-load-fully-optional-backup
          path: artifacts/Drug load fully optional backup file.zip
```

Simply copy the content above and replace the existing content in `.github/workflows/backup.yml`.
This will ensure your backups are always named correctly and generated automatically.
