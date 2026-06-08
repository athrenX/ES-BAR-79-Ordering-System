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
| API Routes - Version 1
|--------------------------------------------------------------------------
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
        try {
            // Ambil data tanpa validation ketat
            $tableId = $request->input('table_id');
            $tableName = $request->input('table_name');
            $customerName = $request->input('customer_name', 'Pelanggan');

            // Convert table_id to integer jika numeric
            if (is_numeric($tableId)) {
                $tableId = (int) $tableId;
            }

            // Pastikan ada table_id atau table_name
            if (!$tableId && !$tableName) {
                return response()->json([
                    'success' => false,
                    'message' => 'Table ID or Table Name required'
                ], 400);
            }

            // Simpan data meja ke session Laravel
            session([
                'table_id' => $tableId,
                'table_name' => $tableName ?? 'Meja ' . $tableId,
                'customer_name' => $customerName
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Session meja berhasil disimpan',
                'table' => [
                    'id' => $tableId,
                    'name' => $tableName ?? 'Meja ' . $tableId
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to set table session',
                'error' => $e->getMessage()
            ], 500);
        }
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
    
    // Menus
    Route::get('/menus', [MenuController::class, 'index']);
    Route::get('/menus/{id}', [MenuController::class, 'show']);
    Route::get('/menus/categories/list', [MenuController::class, 'categories']);
    
    // Tables
    Route::get('/tables', [TableController::class, 'index']);
    Route::get('/tables/{id}', [TableController::class, 'show']);
    Route::post('/tables/validate-qr', [TableController::class, 'validateQrSignature']);
    
    // Cart
    Route::get('/cart', [CartController::class, 'index']);
    Route::post('/cart', [CartController::class, 'store']); // Tambah Item
    Route::put('/cart/{id}', [CartController::class, 'update']); // Update Qty
    Route::delete('/cart/{id}', [CartController::class, 'destroy']); // Hapus Item
    Route::delete('/cart', [CartController::class, 'clear']); // Hapus Semua (Checkout)
    
    // Orders
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/history', [OrderController::class, 'historyByTable']); // Get user's own orders
    Route::get('/orders/{orderId}', [OrderController::class, 'show']); // Get single order by ID
    Route::post('/orders/{orderId}/mark-paid', [PaymentController::class, 'markAsPaidSimple']); // Mark as paid (sandbox)
    
    // Payment Helper & Webhook
    Route::get('/orders/{orderId}/payment/status', [PaymentController::class, 'checkStatus']);
    Route::post('/payment/cash/{orderId}', [PaymentController::class, 'cashPayment']);
    Route::post('/payment/webhook', [PaymentController::class, 'webhook']);

    // ============================================
    // 3. ADMIN PROTECTED ROUTES
    // ============================================
    Route::middleware(['auth:sanctum'])->group(function () {
        Route::post('/admin/logout', [AuthController::class, 'logout']);
        Route::get('/admin/me', [AuthController::class, 'me']);
        
        // Menu CRUD
        Route::get('/admin/menus', [MenuController::class, 'index']);
        Route::post('/admin/menus', [MenuController::class, 'store']);
        Route::post('/admin/menus/{id}', [MenuController::class, 'update']);
        Route::delete('/admin/menus/{id}', [MenuController::class, 'destroy']);
        Route::post('/admin/menus/{id}/crop', [MenuController::class, 'crop']);
        
        // Table CRUD
        Route::get('/admin/tables', [TableController::class, 'index']);
        Route::post('/admin/tables', [TableController::class, 'store']);
        Route::put('/admin/tables/{id}', [TableController::class, 'update']);
        Route::delete('/admin/tables/{id}', [TableController::class, 'destroy']);
        Route::get('/admin/tables/{id}/qr', [TableController::class, 'downloadQr']);
        Route::get('/admin/tables/{id}/qr-url', [TableController::class, 'getQrUrl']);
        
        // Order Management
        Route::get('/admin/orders', [OrderController::class, 'index']);
        Route::get('/admin/orders/{id}', [OrderController::class, 'show']);
        Route::put('/admin/orders/{id}/status', [OrderController::class, 'updateStatus']);
        Route::post('/admin/orders/{id}/cancel', [OrderController::class, 'cancel']);
        
        // Konfirmasi pembayaran tunai oleh admin
        Route::post('/admin/orders/{id}/payment/confirm-cash', [PaymentController::class, 'confirmCashPayment']);
        
        // Dashboard
        Route::get('/admin/dashboard/statistics', [DashboardController::class, 'statistics']);
    });
});