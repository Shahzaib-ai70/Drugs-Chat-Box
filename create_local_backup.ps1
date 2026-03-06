# PowerShell Script to Create Backup Locally
# This script creates a zip backup of your project, excluding unnecessary files.

$backupName = "DL_optional_backup_file.zip"
$exclude = @("node_modules", ".git", ".github", "dist", "*.zip", "*.log", "database.db", "node.exe", "artifacts")

Write-Host "Creating backup: $backupName ..." -ForegroundColor Cyan

# Remove old backup if it exists
if (Test-Path $backupName) {
    Remove-Item $backupName -Force
    Write-Host "Removed old backup file." -ForegroundColor Yellow
}

# Create new backup
Get-ChildItem -Path . -Exclude $exclude | Compress-Archive -DestinationPath $backupName -Force

if (Test-Path $backupName) {
    Write-Host "SUCCESS! Backup created at: $(Get-Location)\$backupName" -ForegroundColor Green
} else {
    Write-Host "ERROR: Backup failed." -ForegroundColor Red
}

Pause
