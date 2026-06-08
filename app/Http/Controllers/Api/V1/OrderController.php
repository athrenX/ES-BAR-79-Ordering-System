<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use App\Events\OrderCreatedEvent;
use App\Events\OrderStatusUpdatedEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    /**
     * Create order from cart (Checkout)
     */
    public function store(Request $request)
    {
        // Ambil table_id dan customer_name dari body request jika ada, fallback ke session
        $tableId = $request->input('table_id') ?? session('table_id');
        $customerName = $request->input('customer_name') ?? session('customer_name');

        // Set ke session PHP agar konsisten untuk proses selanjutnya
        if ($tableId) session(['table_id' => $tableId]);
        if ($customerName) session(['customer_name' => $customerName]);

        if (!$tableId) {
            throw ValidationException::withMessages([
                'session' => ['Session tidak ditemukan. Silakan pilih meja terlebih dahulu.'],
            ]);
        }

        // Log untuk debugging
        Log::info('OrderController::store - Checking cart', [
            'table_id_from_request' => $request->input('table_id'),
            'table_id_from_session' => session('table_id'),
            'table_id_used' => $tableId,
        ]);

        // Get cart items
        $carts = Cart::with('menu')->where('table_id', $tableId)->get();

        // Log cart count
        Log::info('OrderController::store - Cart items found', [
            'count' => $carts->count(),
            'table_id' => $tableId,
        ]);

        if ($carts->isEmpty()) {
            // Log all carts for debugging
            $allCarts = Cart::select('id', 'table_id', 'menu_id', 'quantity')->get();
            Log::error('OrderController::store - Cart empty but other carts exist', [
                'requested_table_id' => $tableId,
                'all_carts' => $allCarts->toArray(),
            ]);
            
            throw ValidationException::withMessages([
                'cart' => ['Keranjang kosong. Tambahkan menu terlebih dahulu.'],
            ]);
        }

        // Calculate total
        $total = $carts->sum(function ($cart) {
            return $cart->menu->price * $cart->quantity;
        });

        // Create NEW order (setiap checkout = invoice baru)
        DB::beginTransaction();
        try {
            $order = Order::create([
                'table_id' => $tableId,
                'customer_name' => $customerName,
                'total' => $total,
                'tracking_code' => Order::generateTrackingCode(),
                'status' => 'Menunggu Pembayaran',
            ]);

            // Create order items
            foreach ($carts as $cart) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'menu_id' => $cart->menu_id,
                    'quantity' => $cart->quantity,
                    'price' => $cart->menu->price,
                ]);
            }

            // PENTING: Clear cart setelah checkout
            // Ini memastikan pesan berikutnya = invoice baru
            Cart::where('table_id', $tableId)->delete();

            DB::commit();

            // Load relationships
            $order->load(['items.menu', 'table']);

            // Broadcast order created event
            event(new OrderCreatedEvent($order));

            return response()->json([
                'success' => true,
                'message' => 'Order berhasil dibuat',
                'data' => $this->formatOrder($order),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Get order by ID (Public - with relaxed security for invoice access)
     * User bisa melihat order mereka sendiri
     * Admin bisa melihat semua order
     */
    public function show($id)
    {
        $order = Order::with(['items.menu', 'table'])->findOrFail($id);

        // Security Check: Hanya untuk admin
        $isAdmin = auth('sanctum')->check();
        
        // Untuk user biasa, allow access tapi log untuk monitoring
        if (!$isAdmin) {
            $sessionCustomerName = session('customer_name');
            $sessionTableId = session('table_id');
            
            Log::info('Order access by user', [
                'order_id' => $id,
                'order_customer' => $order->customer_name,
                'order_table_id' => $order->table_id,
                'session_customer' => $sessionCustomerName,
                'session_table_id' => $sessionTableId,
            ]);
            
            // Allow access untuk invoice view meskipun session berbeda
            // Karena user mungkin refresh page atau link invoice di-bookmark
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatOrder($order),
        ]);
    }

    /**
     * Get all orders with filters (Admin)
     */
    public function index(Request $request)
    {
        $query = Order::with(['items.menu', 'table']);

        // Filter by status
        if ($request->has('status')) {
            $query->byStatus($request->status);
        }

        // Filter by date
        if ($request->has('date')) {
            $query->whereDate('created_at', $request->date);
        }

        // Filter by table
        if ($request->has('table_id')) {
            $query->where('table_id', $request->table_id);
        }

        // Get active orders only
        if ($request->has('active') && $request->active) {
            $query->active();
        }

        // Pagination
        $perPage = $request->input('per_page', 10);
        $orders = $query->latest()->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $orders->map(fn($order) => $this->formatOrder($order)),
            'pagination' => [
                'total' => $orders->total(),
                'per_page' => $orders->perPage(),
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
            ],
        ]);
    }

    /**
     * Update order status (Admin)
     */
    public function updateStatus(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:Menunggu Pembayaran,Sedang Disiapkan,Selesai,Dibatalkan',
        ]);

        $oldStatus = $order->status;
        $order->status = $validated['status'];
        $order->save();

        // Broadcast status update event
        event(new OrderStatusUpdatedEvent($order, $oldStatus));

        return response()->json([
            'success' => true,
            'message' => 'Status order berhasil diupdate',
            'data' => $this->formatOrder($order->load(['items.menu', 'table'])),
        ]);
    }

    /**
     * Cancel order
     */
    public function cancel(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        if (!$order->canBeCancelled()) {
            throw ValidationException::withMessages([
                'order' => ['Order tidak dapat dibatalkan. Status: ' . $order->status],
            ]);
        }

        $oldStatus = $order->status;
        $order->status = 'Dibatalkan';
        $order->save();

        // Broadcast cancellation event
        event(new OrderStatusUpdatedEvent($order, $oldStatus));

        return response()->json([
            'success' => true,
            'message' => 'Order berhasil dibatalkan',
            'data' => $this->formatOrder($order->load(['items.menu', 'table'])),
        ]);
    }

    /**
     * Get order history by table and customer (Customer)
     * Menampilkan HANYA orders milik customer yang sama (by customer_name + table_id)
     */
    public function historyByTable(Request $request)
    {
        // Try to get from query params first, then session
        $tableId = $request->query('table_id') ?? session('table_id');
        $customerName = $request->query('customer_name') ?? session('customer_name');
        
        Log::info('historyByTable called', [
            'query_table_id' => $request->query('table_id'),
            'query_customer_name' => $request->query('customer_name'),
            'session_table_id' => session('table_id'),
            'session_customer_name' => session('customer_name'),
            'final_table_id' => $tableId,
            'final_customer_name' => $customerName,
        ]);
        
        if (!$tableId || !$customerName) {
            throw ValidationException::withMessages([
                'session' => ['Data tidak lengkap. Table ID: ' . ($tableId ?? 'null') . ', Customer: ' . ($customerName ?? 'null')],
            ]);
        }

        // SECURITY: Filter by BOTH table_id AND customer_name
        $orders = Order::with(['items.menu', 'table'])
            ->where('table_id', $tableId)
            ->where('customer_name', $customerName)
            ->latest()
            ->get();

        Log::info('Order history fetched', [
            'table_id' => $tableId,
            'customer_name' => $customerName,
            'orders_count' => $orders->count(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $orders->map(fn($order) => $this->formatOrder($order)),
        ]);
    }

    /**
     * Format order for response
     */
    private function formatOrder($order)
    {
        return [
            'id' => $order->id,
            'customer_name' => $order->customer_name,
            'table' => [
                'id' => $order->table->id,
                'name' => $order->table->name,
            ],
            'items' => $order->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'menu' => [
                        'id' => $item->menu->id,
                        'name' => $item->menu->name,
                        'category' => $item->menu->category,
                        'image' => $item->menu->image,
                    ],
                    'quantity' => $item->quantity,
                    'price' => $item->price,
                    'subtotal' => $item->subtotal,
                ];
            }),
            'total' => $order->total,
            'status' => $order->status,
            'payment_type' => $order->payment_type,
            'payment_status' => $order->payment_status,
            'payment_expires_at' => $order->payment_expires_at,
            'paid_at' => $order->paid_at,
            'is_paid' => $order->isPaid(),
            'can_be_cancelled' => $order->canBeCancelled(),
            'created_at' => $order->created_at,
            'updated_at' => $order->updated_at,
        ];
    }
}


