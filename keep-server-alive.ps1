# Keep Laravel Server Alive Script
# Run this in a separate PowerShell window

Write-Host "=== Laravel Server Monitor ===" -ForegroundColor Cyan
Write-Host "IP: 192.168.1.13:8000" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

$host.UI.RawUI.WindowTitle = "Laravel Server - ES BAR 79"

# Kill existing PHP processes
Get-Process -Name php -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Set location
Set-Location "e:\SEMESTER 7\PERKULIAHAN\PTIN\FINAL_2025\laravel_esbar"

# Clear cache
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Clearing cache..." -ForegroundColor Gray
php artisan config:clear | Out-Null
php artisan route:clear | Out-Null

# Start server
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Starting Laravel server..." -ForegroundColor Green
Write-Host ""

# Run server with output
php artisan serve --host=192.168.1.13 --port=8000
