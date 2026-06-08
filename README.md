# 🍦 ES BAR 79 — QR Code Ordering System

<div align="center">

![ES BAR 79](https://img.shields.io/badge/ES%20BAR%2079-ICE%20CREAM%20%26%20COFFEE-red?style=for-the-badge)
![Laravel](https://img.shields.io/badge/Laravel-12-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

**A digital self-ordering system for ice cream & coffee shops powered by QR Codes**

</div>

---

## 🚀 Live Demo & Quick Access

You can try the fully deployed application online:

* **🔗 Frontend Demo Web App:** **[https://esbar-ordering-system.vercel.app](https://esbar-ordering-system.vercel.app)**
* **🔗 Backend API Service:** **[https://laravel-backend-production-530f.up.railway.app](https://laravel-backend-production-530f.up.railway.app)**

### 🔑 Demo Admin Credentials
To access the admin dashboard features (manage tables, edit menus, approve cash payments, monitor live orders):
* **Admin Login Page:** **[https://esbar-ordering-system.vercel.app/admin](https://esbar-ordering-system.vercel.app/admin)**
* **Username:** `demo_admin`
* **Password:** `demo123`

*(Note: The application is currently running in Sandbox mode. You can simulate Midtrans QRIS/GoPay payments using sandbox test credentials).*

---

## 📋 Project Description

ES BAR 79 Ordering System is a web-based self-ordering application designed for restaurants and cafes:
- 👥 **Customers** scan a QR Code at their table → browse menu items → place orders → make payments.
- 👨‍💼 **Admins** manage menu listings, monitor incoming orders in real-time, and view revenue analytics.

## ✨ Key Features

| Feature | Status |
|-------|--------|
| 🔐 Admin Authentication (Sanctum) | ✅ |
| 📱 Table QR Code Generation & Auto-Detection | ✅ |
| 🍽️ Menu Management (CRUD + Image Upload & Crop) | ✅ |
| 🛒 Shopping Cart (Isolated per table, session-based) | ✅ |
| 📦 Order Management + Tracking Code System | ✅ |
| 💳 Integrated Payment Gateway (QRIS, GoPay, Bank Transfer, Cash) | ✅ |
| 📊 Admin Dashboard & Revenue Analytics | ✅ |
| 🔔 Real-time Socket Notifications (Pusher) | ✅ |
| 📷 Built-in In-Browser QR Scanner | ✅ |

## 🛠️ Technology Stack

### Backend
- **Framework**: Laravel 12 (PHP 8.2+)
- **Database**: MySQL 8.0
- **Auth**: Laravel Sanctum (Token-based authentication)
- **Payment Gateway**: Midtrans SDK (QRIS, GoPay, Bank Transfer)
- **Real-time Engine**: Pusher WebSocket

### Frontend
- **Framework**: React 18 (Create React App)
- **HTTP Client**: Axios
- **Real-time Client**: Laravel Echo + Pusher JS
- **QR Scanner**: html5-qrcode

---

## 🚀 Setup & Local Installation

### Prerequisites
- PHP 8.2+
- Composer
- MySQL 8.0+
- Node.js 18+
- NPM

### 1. Clone the Repository
```bash
git clone https://github.com/athrenX/ES-BAR-79-Ordering-System.git
cd ES-BAR-79-Ordering-System
```

### 2. Setup Backend (Laravel)

```bash
# Install PHP dependencies
composer install

# Create environment configuration file
cp .env.example .env

# Generate application key
php artisan key:generate
```

Configure your `.env` file with your database and Midtrans credentials:
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
# Create database
mysql -u root -p -e "CREATE DATABASE laravel_esbar CHARACTER SET utf8mb4"

# Run database migrations and seed default data
php artisan migrate --seed

# Create storage symlink
php artisan storage:link

# Start the local development server
php artisan serve
```

### 3. Setup Frontend (React)

```bash
cd frontend

# Install Node dependencies
npm install

# Create environment configuration file
cp .env.example .env

# Start the React development server
npm start
```

The React frontend will be accessible at: **http://localhost:3001**

## 🔑 Default Accounts (After Seeding)

| Role | Username | Password |
|------|----------|----------|
| Demo Admin | `demo_admin` | `demo123` |
| Admin | `admin` | `admin123` |
| Admin 2 | `esbar_admin` | `esbar2024` |

**Seeded Data:**
- 20 Tables (Table 1 - Table 20)
- 15 Menu items (5 Food, 5 Drinks, 5 Ice Creams with Unsplash images)

---

## 📸 Screenshots

Here are some interface previews of **ES BAR 79 Ordering System**:

### 1. Customer Flow
* **Customer Ordering (Menu Catalog)**
  <img width="395" height="844" alt="gambar" src="https://github.com/user-attachments/assets/6aab6afc-9c8d-4a8e-87fb-a5538d498f7f" />
  
  <img width="403" height="858" alt="gambar" src="https://github.com/user-attachments/assets/28af6272-0f26-41a6-b423-06cde8db4fde" />

* **QR Code Table Scanner**
 
  <img width="1813" height="899" alt="gambar" src="https://github.com/user-attachments/assets/03ec793c-eb5f-486e-90a5-dfaa70359456" />

  
* **Checkout & Payment Method Selection**
 
  <img width="456" height="855" alt="gambar" src="https://github.com/user-attachments/assets/a099a043-5b18-45ee-82f9-6bb117bda738" />

<img width="337" height="656" alt="gambar" src="https://github.com/user-attachments/assets/80fc78d7-9d9a-45d5-9e3b-1a78a1214773" />

<img width="423" height="873" alt="gambar" src="https://github.com/user-attachments/assets/00e78d97-68a1-42a3-8021-400d83682992" />



### 2. Admin Flow
* **Admin Dashboard (Live Order Monitoring)**

  <img width="1812" height="899" alt="gambar" src="https://github.com/user-attachments/assets/30918ef3-abd4-483f-a332-e339ce7781fc" />

* **Revenue Dashboard & Analytics**

  <img width="1822" height="892" alt="gambar" src="https://github.com/user-attachments/assets/e4538a75-c80c-4ccb-a66a-b5734675fc5a" />

  <img width="625" height="787" alt="gambar" src="https://github.com/user-attachments/assets/8a3dd4cf-eafd-46cd-ac4c-787333cd35b6" />



## 📡 API Endpoints

Base URL: `https://laravel-backend-production-530f.up.railway.app/api/v1`

### Public (Customer)
| Method | Endpoint | Description |
|--------|----------|-----------|
| POST | `/table/set` | Create session/table connection |
| GET | `/menus` | List menus (supports category filtering) |
| POST | `/cart` | Add item to cart |
| POST | `/orders` | Place order / Checkout |
| POST | `/orders/{id}/payment` | Initialize transaction |

### Admin (Requires Bearer Token)
| Method | Endpoint | Description |
|--------|----------|-----------|
| POST | `/admin/login` | Administrator login |
| GET | `/admin/orders` | Retrieve all orders |
| PUT | `/admin/orders/{id}/status` | Update order status |
| GET | `/admin/tables/{id}/qr` | Download table QR Code |
| GET | `/admin/dashboard/statistics` | Retrieve dashboard statistics |

---

## 📱 User Workflow (Customer Flow)

```
1. Scan QR Code on the table
       ↓
2. Landing page opens → enter name
       ↓
3. Browse catalog & add items to cart
       ↓
4. Checkout → select payment method
       ↓
5. Pay via QRIS / GoPay / Bank Transfer / Cash
       ↓
6. Track order preparation status (Code: ESB-XXXXX)
```

## 👨‍💼 Administrator Workflow

```
1. Login to /admin panel
       ↓
2. Monitor incoming orders in real-time
       ↓
3. Update status: Pending → Preparing → Completed
       ↓
4. Manage menu catalogs & table lists
       ↓
5. Generate / print table QR codes
       ↓
6. View revenue statistics
```

---

## 🏗️ Project Structure

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
├── frontend/                   # React Frontend App
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js        # Table checkin + camera QR scanner
│   │   │   ├── Catalog.js      # Menu browser
│   │   │   ├── Cart.js         # Order cart
│   │   │   ├── PaymentPage.js  # Payment checkout integration
│   │   │   └── admin/          # Backoffice admin panel
│   │   └── api/
│   │       └── config.js       # Axios client setup
│   └── package.json
├── .env.example
└── README.md
```

---

## 🚀 Production Deployment

### Backend (Shared Hosting / VPS / Cloud PaaS)
1. Upload all directories excluding `vendor/` and `node_modules/`
2. Execute: `composer install --no-dev --optimize-autoloader`
3. Configure `.env`: `APP_ENV=production`, `APP_DEBUG=false`
4. Set Midtrans Production keys: `MIDTRANS_IS_PRODUCTION=true`
5. Execute database migrations: `php artisan migrate --force`
6. Optimize routing and configurations: `php artisan config:cache && php artisan route:cache`

### Frontend
```bash
# Compile for production
cd frontend
npm run build
```
Deploy the compiled `frontend/build/` directory.

---

## 📜 License

Proprietary © 2024 ES BAR 79. All rights reserved.

---

<div align="center">
Made with ❤️ for <strong>ES BAR 79 Ice Cream & Coffee</strong>
</div>
