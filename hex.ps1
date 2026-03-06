$content = Get-Content .github/workflows/backup.yml -Raw
$content | Format-Hex