# PowerShell Script untuk prepare files untuk upload ke Hostinger
# Run di local Windows computer sebelum upload

Write-Host "🚀 Preparing ES BAR 79 for Hostinger Deployment..." -ForegroundColor Green
Write-Host ""

# 1. Build React Production
Write-Host "📦 Step 1: Building React Production..." -ForegroundColor Yellow
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: React build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ React build completed!" -ForegroundColor Green
Write-Host ""

# 2. Back to root
Set-Location ..

# 3. Create deployment folder
Write-Host "📁 Step 2: Creating deployment folder..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "deployment\laravel" | Out-Null
New-Item -ItemType Directory -Force -Path "deployment\public_html\build" | Out-Null
Write-Host "✅ Deployment folders created!" -ForegroundColor Green
Write-Host ""

# 4. Copy Laravel files
Write-Host "📋 Step 3: Copying Laravel backend files..." -ForegroundColor Yellow
Copy-Item -Recurse -Force "app" "deployment\laravel\"
Copy-Item -Recurse -Force "bootstrap" "deployment\laravel\"
Copy-Item -Recurse -Force "config" "deployment\laravel\"
Copy-Item -Recurse -Force "database" "deployment\laravel\"
Copy-Item -Recurse -Force "routes" "deployment\laravel\"
Copy-Item -Recurse -Force "storage" "deployment\laravel\"
Copy-Item -Recurse -Force "resources" "deployment\laravel\"
Copy-Item -Force "artisan" "deployment\laravel\"
Copy-Item -Force "composer.json" "deployment\laravel\"
Copy-Item -Force "composer.lock" "deployment\laravel\"
Copy-Item -Force ".env.example" "deployment\laravel\"
Write-Host "✅ Laravel files copied!" -ForegroundColor Green
Write-Host ""

# 5. Copy .env.production as template
Write-Host "📝 Step 4: Copying .env.production as template..." -ForegroundColor Yellow
Copy-Item -Force ".env.production" "deployment\laravel\.env.template"
Write-Host "⚠️  REMEMBER: Edit .env.template and rename to .env after upload!" -ForegroundColor Yellow
Write-Host ""

# 6. Copy React build
Write-Host "📋 Step 5: Copying React build files..." -ForegroundColor Yellow
Copy-Item -Recurse -Force "frontend\build\*" "deployment\public_html\build\"
Write-Host "✅ React build copied!" -ForegroundColor Green
Write-Host ""

# 7. Copy public files
Write-Host "📋 Step 6: Preparing public_html files..." -ForegroundColor Yellow
Copy-Item -Force "public_html_index.php" "deployment\public_html\index.php"
Copy-Item -Force "public_html.htaccess" "deployment\public_html\.htaccess"
Copy-Item -Force "public\robots.txt" "deployment\public_html\robots.txt"
Write-Host "✅ Public files prepared!" -ForegroundColor Green
Write-Host ""

# 8. Create README for deployment folder
$readmeContent = @"
================================
ES BAR 79 - Deployment Package
================================

📂 Folder Structure:
-------------------
laravel\        → Upload ke ~/laravel/ di Hostinger
public_html\    → Upload ke ~/public_html/ di Hostinger

⚠️  IMPORTANT STEPS:
--------------------
1. Upload laravel\ folder ke ~/laravel/
2. Upload public_html\ folder ke ~/public_html/
3. Di ~/laravel/:
   - Rename .env.template menjadi .env
   - Edit .env dengan kredensial Hostinger
   - Run: composer install --no-dev
   - Run: php artisan key:generate
   - Run: php artisan migrate --force
   - Run: php artisan storage:link
   - Run: chmod -R 755 storage bootstrap/cache

4. Di ~/public_html/:
   - Buat symlink: ln -s ../laravel/storage/app/public storage
   - Buat symlink: ln -s ../laravel/storage/app/public buka-gambar

5. Test:
   - https://esbar79.shop/api/health
   - https://esbar79.shop/

📖 Full Guide: See HOSTING_HOSTINGER_GUIDE.md

✅ All files ready for upload!
"@

Set-Content -Path "deployment\README.txt" -Value $readmeContent

Write-Host "✅ Deployment package ready!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Check folder: deployment\" -ForegroundColor White
Write-Host "2. Compress deployment folder to .zip (optional)" -ForegroundColor White
Write-Host "3. Upload deployment\laravel\ to Hostinger ~/laravel/" -ForegroundColor White
Write-Host "4. Upload deployment\public_html\ to Hostinger ~/public_html/" -ForegroundColor White
Write-Host "5. Follow HOSTING_HOSTINGER_GUIDE.md for configuration" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Done! Ready to upload to Hostinger!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tip: You can use FileZilla or Hostinger File Manager to upload" -ForegroundColor Yellow
