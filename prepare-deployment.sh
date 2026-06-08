#!/bin/bash

# Script untuk prepare files untuk upload ke Hostinger
# Run di local computer sebelum upload

echo "🚀 Preparing ES BAR 79 for Hostinger Deployment..."
echo ""

# 1. Build React Production
echo "📦 Step 1: Building React Production..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error: React build failed!"
    exit 1
fi
echo "✅ React build completed!"
echo ""

# 2. Back to root
cd ..

# 3. Create deployment folder
echo "📁 Step 2: Creating deployment folder..."
mkdir -p deployment/laravel
mkdir -p deployment/public_html/build
echo "✅ Deployment folders created!"
echo ""

# 4. Copy Laravel files
echo "📋 Step 3: Copying Laravel backend files..."
cp -r app deployment/laravel/
cp -r bootstrap deployment/laravel/
cp -r config deployment/laravel/
cp -r database deployment/laravel/
cp -r routes deployment/laravel/
cp -r storage deployment/laravel/
cp -r resources deployment/laravel/
cp artisan deployment/laravel/
cp composer.json deployment/laravel/
cp composer.lock deployment/laravel/
cp .env.example deployment/laravel/
echo "✅ Laravel files copied!"
echo ""

# 5. Copy .env.production as template
echo "📝 Step 4: Copying .env.production as template..."
cp .env.production deployment/laravel/.env.template
echo "⚠️  REMEMBER: Edit .env.template and rename to .env after upload!"
echo ""

# 6. Copy React build
echo "📋 Step 5: Copying React build files..."
cp -r frontend/build/* deployment/public_html/build/
echo "✅ React build copied!"
echo ""

# 7. Copy public files
echo "📋 Step 6: Preparing public_html files..."
cp public_html_index.php deployment/public_html/index.php
cp public_html.htaccess deployment/public_html/.htaccess
cp public/robots.txt deployment/public_html/robots.txt
echo "✅ Public files prepared!"
echo ""

# 8. Create README for deployment folder
cat > deployment/README.txt << 'EOF'
================================
ES BAR 79 - Deployment Package
================================

📂 Folder Structure:
-------------------
laravel/        → Upload ke ~/laravel/ di Hostinger
public_html/    → Upload ke ~/public_html/ di Hostinger

⚠️  IMPORTANT STEPS:
--------------------
1. Upload laravel/ folder ke ~/laravel/
2. Upload public_html/ folder ke ~/public_html/
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
EOF

echo "✅ Deployment package ready!"
echo ""
echo "📦 Next Steps:"
echo "1. Check folder: deployment/"
echo "2. Upload deployment/laravel/ to Hostinger ~/laravel/"
echo "3. Upload deployment/public_html/ to Hostinger ~/public_html/"
echo "4. Follow HOSTING_HOSTINGER_GUIDE.md for configuration"
echo ""
echo "🎉 Done! Ready to upload to Hostinger!"
