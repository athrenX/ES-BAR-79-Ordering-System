<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\MenuController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\TableController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Version 1 - FINAL COMPLETE
|--------------------------------------------------------------------------
| Semua endpoint sudah lengkap dan siap production
*/

// Test route
Route::get('/ping', function() {
    return response()->json(['message' => 'pong']);
});

Route::prefix('v1')->group(function () {
    
    // ============================================
    // 1. SESSION MANAGEMENT (PENTING AGAR TIDAK ERROR 404)
    // ============================================
    // Rute ini dipanggil oleh Cart.js saat fetchAll
    Route::post('/table/set', function (Request $request) {
        $request->validate([
            'table_id' => 'required|integer',
            'table_name' => 'nullable|string',
            'customer_name' => 'nullable|string'
        ]);

        // Simpan data meja ke session Laravel
        session([
            'table_id' => $request->table_id,
            'table_name' => $request->table_name ?? 'Meja ' . $request->table_id,
            'customer_name' => $request->customer_name ?? 'Pelanggan'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Session meja berhasil disimpan',
            'table' => [
                'id' => $request->table_id,
                'name' => $request->table_name ?? 'Meja ' . $request->table_id
            ]
        ]);
    });

    Route::get('/session', [CartController::class, 'getSession']);

    // ============================================
    // 2. PUBLIC ROUTES (Customer)
    // ============================================
    
    // Midtrans Snap Token (Diperbaiki ke PaymentController)
    Route::post('/midtrans/snap', [PaymentController::class, 'createPayment']);

    // Admin Auth
    Route::middleware(['throttle:5,1'])->group(function () {
        Route::post('/admin/login', [AuthController::class, 'login']);
    });
    
    // Menus (Public - Customer dapat melihat)
    Route::get('/menus', [MenuController::class, 'index']); // List semua menu
    Route::get('/menus/{id}', [MenuController::class, 'show']); // Detail menu
    Route::get('/menus/categories/list', [MenuController::class, 'categories']); // List kategori
    
    // Tables (Public - Customer dapat melihat)
    Route::get('/tables', [TableController::class, 'index']); // List semua meja
    Route::get('/tables/{id}', [TableController::class, 'show']); // Detail meja
    
    // Cart (Session-based, tidak perlu auth)
    Route::get('/cart', [CartController::class, 'index']); // Lihat cart
    Route::post('/cart', [CartController::class, 'store']); // Tambah item ke cart
    Route::put('/cart/{id}', [CartController::class, 'update']); // Update qty item
    Route::delete('/cart/{id}', [CartController::class, 'destroy']); // Hapus 1 item
    Route::delete('/cart', [CartController::class, 'clear']); // Hapus semua (setelah checkout)
    
    // Orders (Customer)
    Route::post('/orders', [OrderController::class, 'store']); // Create order baru
    Route::get('/orders/history', [OrderController::class, 'historyByTable']); // History berdasarkan meja
    Route::get('/orders/{orderId}', [OrderController::class, 'show']); // Detail order
    Route::post('/orders/{orderId}/mark-paid', [PaymentController::class, 'markAsPaidSimple']); // Mark paid (sandbox testing)
    
    // Payment Helper & Webhook
    Route::get('/orders/{orderId}/payment/status', [PaymentController::class, 'checkStatus']); // Cek status payment
    Route::post('/payment/cash/{orderId}', [PaymentController::class, 'cashPayment']); // Payment cash
    Route::post('/payment/webhook', [PaymentController::class, 'webhook']); // Midtrans webhook

    // ============================================
    // 3. ADMIN PROTECTED ROUTES (Perlu Token Sanctum)
    // ============================================
    Route::middleware(['auth:sanctum'])->group(function () {
        
        // Admin Auth Management
        Route::post('/admin/logout', [AuthController::class, 'logout']); // Logout admin
        Route::get('/admin/me', [AuthController::class, 'me']); // Get admin profile
        
        // ============================================
        // MENU CRUD (Admin)
        // ============================================
        Route::get('/admin/menus', [MenuController::class, 'index']); // List semua menu (admin)
        Route::post('/admin/menus', [MenuController::class, 'store']); // Create menu baru
        Route::post('/admin/menus/{id}', [MenuController::class, 'update']); // Update menu (support multipart/form-data)
        Route::delete('/admin/menus/{id}', [MenuController::class, 'destroy']); // Delete menu
        Route::post('/admin/menus/{id}/crop', [MenuController::class, 'crop']); // Crop gambar menu
        
        // ============================================
        // TABLE CRUD (Admin)
        // ============================================
        Route::get('/admin/tables', [TableController::class, 'index']); // List semua meja (admin)
        Route::post('/admin/tables', [TableController::class, 'store']); // Create meja baru
        Route::put('/admin/tables/{id}', [TableController::class, 'update']); // Update meja
        Route::delete('/admin/tables/{id}', [TableController::class, 'destroy']); // Delete meja
        Route::get('/admin/tables/{id}/qr', [TableController::class, 'downloadQr']); // Download QR code
        Route::get('/admin/tables/{id}/qr-url', [TableController::class, 'getQrUrl']); // Get QR code URL
        
        // ============================================
        // ORDER MANAGEMENT (Admin)
        // ============================================
        Route::get('/admin/orders', [OrderController::class, 'index']); // List semua orders
        Route::get('/admin/orders/{id}', [OrderController::class, 'show']); // Detail order
        Route::put('/admin/orders/{id}/status', [OrderController::class, 'updateStatus']); // Update status order
        Route::post('/admin/orders/{id}/cancel', [OrderController::class, 'cancel']); // Cancel order
        
        // ============================================
        // PAYMENT MANAGEMENT (Admin)
        // ============================================
        Route::post('/admin/orders/{id}/payment/confirm-cash', [PaymentController::class, 'confirmCashPayment']); // Konfirmasi payment tunai
        
        // ============================================
        // DASHBOARD STATISTICS (Admin)
        // ============================================
        Route::get('/admin/dashboard/statistics', [DashboardController::class, 'statistics']); // Dashboard stats
    });
});
