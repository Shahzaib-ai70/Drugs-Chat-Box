$exclude = @("node_modules", ".git", ".github", "dist", "*.zip", "*.log", "database.db", "node.exe")
Get-ChildItem -Path . -Exclude $exclude | Compress-Archive -DestinationPath "Drug load fully optional backup file.zip" -Force
Write-Host "Backup created."
