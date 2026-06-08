

<div align="center">

![ES BAR 79](https://img.shields.io/badge/ES%20BAR%2079-ICE%20CREAM%20%26%20COFFEE-red?style=for-the-badge)
![Laravel](https://img.shields.io/badge/Laravel-12-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

**Sistem pemesanan digital untuk kedai es krim & kopi berbasis QR Code**

</div>

---

## 🚀 Live Demo & Akses Cepat

Kamu bisa mencoba langsung aplikasi yang sudah ter-deploy secara online di sini:

* **🔗 Link Demo Aplikasi (Frontend):** **[https://esbar-ordering-system.vercel.app](https://esbar-ordering-system.vercel.app)**
* **🔗 Link API (Backend):** **[https://laravel-backend-production-530f.up.railway.app](https://laravel-backend-production-530f.up.railway.app)**

### 🔑 Kredensial Demo Admin
Untuk mencoba fitur admin panel (kelola meja, ubah menu, approve cash, pantau pesanan):
* **Halaman Login Admin:** **[https://esbar-ordering-system.vercel.app/admin](https://esbar-ordering-system.vercel.app/admin)**
* **Username:** `demo_admin`
* **Password:** `demo123`

*(Catatan: Aplikasi berjalan dalam Sandbox mode. Kamu dapat mencoba melakukan pembayaran Midtrans QRIS/Gopay secara simulasi menggunakan uang mainan).*

---

## 📋 Deskripsi

ES BAR 79 Ordering System adalah aplikasi pemesanan restoran berbasis web yang memungkinkan:
- 👥 **Customer** scan QR Code di meja → lihat menu → pesan → bayar
- 👨‍💼 **Admin** kelola menu, pantau pesanan real-time, lihat laporan revenue

## ✨ Fitur Utama

| Fitur | Status |
|-------|--------|
| 🔐 Admin Authentication (Sanctum) | ✅ |
| 📱 QR Code per Meja (scan & auto-detect) | ✅ |
| 🍽️ Manajemen Menu (CRUD + Upload Gambar) | ✅ |
| 🛒 Keranjang Belanja (per meja, session-based) | ✅ |
| 📦 Order Management + Tracking Code | ✅ |
| 💳 Payment Gateway (QRIS, GoPay, BCA VA, Cash) | ✅ |
| 📊 Admin Dashboard & Laporan Revenue | ✅ |
| 🔔 Real-time Notifications (Pusher) | ✅ |
| 📷 In-browser QR Scanner | ✅ |

## 🛠️ Tech Stack

### Backend
- **Framework**: Laravel 12 (PHP 8.2+)
- **Database**: MySQL 8.0
- **Auth**: Laravel Sanctum (Token-based)
- **Payment**: Midtrans SDK (QRIS, GoPay, BCA VA)
- **Real-time**: Pusher

### Frontend
- **Framework**: React 18 (Create React App)
- **HTTP Client**: Axios
- **Real-time**: Laravel Echo + Pusher JS
- **QR Scanner**: html5-qrcode

---

## 🚀 Setup & Instalasi

### Prerequisites
- PHP 8.2+
- Composer
- MySQL 8.0+
- Node.js 18+
- NPM

### 1. Clone Repository
```bash
git clone https://github.com/your-username/laravel_esbar.git
cd laravel_esbar
```

### 2. Setup Backend (Laravel)

```bash
# Install dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate app key
php artisan key:generate
```

Edit `.env` dan isi konfigurasi database dan Midtrans:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=laravel_esbar
DB_USERNAME=root
DB_PASSWORD=your_password

MIDTRANS_CLIENT_KEY=your-client-key
MIDTRANS_SERVER_KEY=your-server-key
MIDTRANS_IS_PRODUCTION=false

FRONTEND_URL=http://localhost:3001
```

```bash
# Buat database
mysql -u root -p -e "CREATE DATABASE laravel_esbar CHARACTER SET utf8mb4"

# Jalankan migrasi + seeder
php artisan migrate --seed

# Buat storage link
php artisan storage:link

# Jalankan server
php artisan serve
```

### 3. Setup Frontend (React)

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env
# REACT_APP_API_URL=http://127.0.0.1:8000/api/v1
# REACT_APP_PUSHER_KEY=your-pusher-key

# Jalankan dev server
npm start
```

Frontend akan berjalan di: **http://localhost:3001**

## 🔑 Akun Default (Setelah Seeder)

| Role | Username | Password |
|------|----------|----------|
| Demo Admin | `demo_admin` | `demo123` |
| Admin | `admin` | `admin123` |
| Admin 2 | `esbar_admin` | `esbar2024` |

**Data awal:**
- 20 Meja (Meja 1 - Meja 20)
- 15 Menu (5 Makanan, 5 Minuman, 5 Es Krim)

---

## 📸 Screenshots

Berikut adalah beberapa tampilan antarmuka dari **ES BAR 79 Ordering System**:

### 1. Customer Flow
* **Customer Ordering (Katalog Menu)**
  <img width="395" height="844" alt="gambar" src="https://github.com/user-attachments/assets/6aab6afc-9c8d-4a8e-87fb-a5538d498f7f" />
  
  <img width="403" height="858" alt="gambar" src="https://github.com/user-attachments/assets/28af6272-0f26-41a6-b423-06cde8db4fde" />

* **QR Scan Meja**
 
  <img width="1813" height="899" alt="gambar" src="https://github.com/user-attachments/assets/03ec793c-eb5f-486e-90a5-dfaa70359456" />

  
* **Checkout & Metode Pembayaran**
 
  <img width="456" height="855" alt="gambar" src="https://github.com/user-attachments/assets/a099a043-5b18-45ee-82f9-6bb117bda738" />

<img width="337" height="656" alt="gambar" src="https://github.com/user-attachments/assets/80fc78d7-9d9a-45d5-9e3b-1a78a1214773" />

<img width="423" height="873" alt="gambar" src="https://github.com/user-attachments/assets/00e78d97-68a1-42a3-8021-400d83682992" />



### 2. Admin Flow
* **Admin Dashboard (Monitor Live Order)**

  <img width="1812" height="899" alt="gambar" src="https://github.com/user-attachments/assets/30918ef3-abd4-483f-a332-e339ce7781fc" />

* **Revenue Dashboard (Statistik Pendapatan)**

  <img width="1822" height="892" alt="gambar" src="https://github.com/user-attachments/assets/e4538a75-c80c-4ccb-a66a-b5734675fc5a" />

  <img width="625" height="787" alt="gambar" src="https://github.com/user-attachments/assets/8a3dd4cf-eafd-46cd-ac4c-787333cd35b6" />



## 📡 API Endpoints

Base URL: `http://localhost:8000/api/v1`

### Public (Customer)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/table/set` | Set session meja |
| GET | `/menus` | List menu (dengan filter kategori) |
| POST | `/cart` | Tambah ke keranjang |
| POST | `/orders` | Checkout |
| POST | `/orders/{id}/payment` | Buat pembayaran |

### Admin (Requires Bearer Token)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/admin/login` | Login admin |
| GET | `/admin/orders` | List semua order |
| PUT | `/admin/orders/{id}/status` | Update status order |
| GET | `/admin/tables/{id}/qr` | Download QR Code meja |
| GET | `/admin/dashboard/statistics` | Statistik dashboard |

---

## 📱 Cara Kerja (Customer Flow)

```
1. Scan QR Code di meja
       ↓
2. Buka halaman → input nama
       ↓
3. Browse menu & tambah ke cart
       ↓
4. Checkout → pilih metode bayar
       ↓
5. Bayar via QRIS / GoPay / BCA VA / Cash
       ↓
6. Tracking order dengan kode ESB-XXXXX
```

## 👨‍💼 Admin Flow

```
1. Login ke /admin
       ↓
2. Dashboard — lihat order masuk real-time
       ↓
3. Update status: Menunggu → Disiapkan → Selesai
       ↓
4. Kelola Menu & Meja
       ↓
5. Download / Print QR Code meja
       ↓
6. Lihat laporan revenue
```

---

## 🏗️ Struktur Project

```
laravel_esbar/
├── app/
│   ├── Http/Controllers/Api/V1/
│   │   ├── AuthController.php
│   │   ├── MenuController.php
│   │   ├── TableController.php
│   │   ├── CartController.php
│   │   ├── OrderController.php
│   │   ├── PaymentController.php
│   │   └── DashboardController.php
│   └── Models/
│       ├── Admin.php
│       ├── Menu.php
│       ├── Table.php
│       ├── Cart.php
│       ├── Order.php
│       └── OrderItem.php
├── database/
│   ├── migrations/
│   └── seeders/
├── routes/
│   └── api.php
├── frontend/                   # React App
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js        # Customer login + QR scanner
│   │   │   ├── Catalog.js      # Halaman menu
│   │   │   ├── Cart.js         # Keranjang
│   │   │   ├── PaymentPage.js  # Pembayaran
│   │   │   └── admin/          # Admin panel
│   │   └── api/
│   │       └── config.js       # Axios config
│   └── package.json
├── .env.example
└── README.md
```

---

## 🚀 Deploy ke Production

### Backend (Shared Hosting / VPS)
1. Upload semua file kecuali `vendor/` dan `node_modules/`
2. Jalankan `composer install --no-dev --optimize-autoloader`
3. Set `.env`: `APP_ENV=production`, `APP_DEBUG=false`
4. Set Midtrans production keys: `MIDTRANS_IS_PRODUCTION=true`
5. Jalankan `php artisan migrate --force`
6. Jalankan `php artisan config:cache && php artisan route:cache`

### Frontend
```bash
# Build untuk production
cd frontend
npm run build
```
Upload folder `frontend/build/` ke hosting.

---

## 📜 License

Proprietary © 2024 ES BAR 79. All rights reserved.

---

<div align="center">
Made with ❤️ for <strong>ES BAR 79 Ice Cream & Coffee</strong>
</div>
