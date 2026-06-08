# ES BAR 79 - System Health Check
Write-Host "=== ES BAR 79 System Health Check ===" -ForegroundColor Cyan
Write-Host ""

$pass = 0
$fail = 0

# 1. Check Laravel Server
Write-Host "1. Laravel Backend..." -ForegroundColor Yellow -NoNewline
try {
    $r = Invoke-WebRequest -Uri "http://192.168.1.13:8000/api/ping" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) {
        Write-Host " ✓ ONLINE" -ForegroundColor Green
        $pass++
    }
} catch {
    Write-Host " ✗ OFFLINE" -ForegroundColor Red
    Write-Host "  Error: Laravel server not running" -ForegroundColor Red
    Write-Host "  Fix: Run keep-server-alive.ps1" -ForegroundColor Yellow
    $fail++
}

# 2. Check React Frontend
Write-Host "2. React Frontend..." -ForegroundColor Yellow -NoNewline
try {
    $r = Invoke-WebRequest -Uri "http://192.168.1.13:3000" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) {
        Write-Host " ✓ ONLINE" -ForegroundColor Green
        $pass++
    }
} catch {
    Write-Host " ✗ OFFLINE" -ForegroundColor Red
    Write-Host "  Error: React server not running" -ForegroundColor Red
    Write-Host "  Fix: cd frontend; npm start" -ForegroundColor Yellow
    $fail++
}

# 3. Check Table API
Write-Host "3. Table API..." -ForegroundColor Yellow -NoNewline
try {
    $r = Invoke-WebRequest -Uri "http://192.168.1.13:8000/api/v1/tables/1" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) {
        Write-Host " ✓ WORKING" -ForegroundColor Green
        $pass++
    }
} catch {
    Write-Host " ✗ ERROR" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    $fail++
}

# 4. Check Admin API
Write-Host "4. Admin API..." -ForegroundColor Yellow -NoNewline
try {
    $r = Invoke-WebRequest -Uri "http://192.168.1.13:8000/api/admin/tables" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) {
        Write-Host " ✓ WORKING" -ForegroundColor Green
        $pass++
    }
} catch {
    Write-Host " ✗ ERROR" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    $fail++
}

# 5. Check CORS
Write-Host "5. CORS Configuration..." -ForegroundColor Yellow -NoNewline
$corsConfig = Get-Content "config/cors.php" -Raw
if ($corsConfig -match "192\.168\.1\.13:3000") {
    Write-Host " ✓ CONFIGURED" -ForegroundColor Green
    $pass++
} else {
    Write-Host " ✗ NOT CONFIGURED" -ForegroundColor Red
    Write-Host "  Error: IP WiFi not in CORS allowed_origins" -ForegroundColor Red
    $fail++
}

# 6. Check ENV
Write-Host "6. Environment Files..." -ForegroundColor Yellow -NoNewline
$laravelEnv = Get-Content ".env" -Raw
$frontendEnv = Get-Content "frontend/.env" -Raw
if (($laravelEnv -match "192\.168\.1\.13") -and ($frontendEnv -match "192\.168\.1\.13")) {
    Write-Host " ✓ CONFIGURED" -ForegroundColor Green
    $pass++
} else {
    Write-Host " ✗ NOT CONFIGURED" -ForegroundColor Red
    Write-Host "  Error: .env files not updated with WiFi IP" -ForegroundColor Red
    $fail++
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Pass: $pass/6" -ForegroundColor Green
Write-Host "Fail: $fail/6" -ForegroundColor Red
Write-Host ""

if ($fail -eq 0) {
    Write-Host "✓ ALL SYSTEMS OPERATIONAL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "URLs untuk testing:" -ForegroundColor Cyan
    Write-Host "  Admin: http://192.168.1.13:3000/admin/tables" -ForegroundColor White
    Write-Host "  Customer (QR): http://192.168.1.13:3000/?table_id=1" -ForegroundColor White
} else {
    Write-Host "✗ SOME ISSUES DETECTED" -ForegroundColor Red
    Write-Host "Fix errors above before testing" -ForegroundColor Yellow
}
