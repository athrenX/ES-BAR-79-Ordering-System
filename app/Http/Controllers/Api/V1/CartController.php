<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Menu;
use App\Models\Table;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CartController extends Controller
{
    /**
     * Set customer session (Hanya sebagai handshake/login awal)
     * Frontend tetap wajib mengirim table_id di setiap request berikutnya
     */
    public function setSession(Request $request)
    {
        $validated = $request->validate([
            'customer_name' => 'nullable|string|max:255',
            'table_id' => 'required|exists:tables,id',
        ]);

        // Opsional: Simpan di session PHP (untuk backup)
        session([
            'customer_name' => $validated['customer_name'] ?? 'Pelanggan',
            'table_id' => $validated['table_id'],
        ]);

        $table = Table::find($validated['table_id']);

        return response()->json([
            'success' => true,
            'message' => 'Session berhasil diset',
            'data' => [
                'customer_name' => $validated['customer_name'] ?? 'Pelanggan',
                'table' => [
                    'id' => $table->id,
                    'name' => $table->name,
                ],
            ],
        ]);
    }

    /**
     * Get customer session info
     */
    public function getSession(Request $request)
    {
        // Cek apakah table_id dikirim via query param atau ada di session
        $tableId = $request->query('table_id') ?? session('table_id');

        if (!$tableId) {
            return response()->json(['message' => 'Session tidak ditemukan'], 404);
        }

        $table = Table::find($tableId);

        return response()->json([
            'success' => true,
            'data' => [
                'customer_name' => session('customer_name', 'Pelanggan'),
                'table' => [
                    'id' => $table->id,
                    'name' => $table->name,
                ],
            ],
        ]);
    }

    /**
     * Get all cart items for specific table
     */
    public function index(Request $request)
    {
        // 1. Validasi table_id harus dikirim oleh Frontend
        $request->validate([
            'table_id' => 'required|integer|exists:tables,id',
        ]);

        $tableId = $request->table_id;

        // 2. Ambil data berdasarkan table_id dari Request (Bukan Session)
        $carts = Cart::with('menu')->where('table_id', $tableId)->get();

        $items = $carts->map(function ($cart) {
            return [
                'id' => $cart->id,
                // Pastikan menu_id dikirim untuk pencarian di Frontend
                'menu_id' => $cart->menu_id, 
                'menu' => [
                    'id' => $cart->menu->id,
                    'name' => $cart->menu->name,
                    'price' => $cart->menu->price,
                    'category' => $cart->menu->category,
                    'image' => $cart->menu->image, // Frontend sudah handle path storage
                ],
                'quantity' => $cart->quantity,
                'subtotal' => $cart->menu->price * $cart->quantity,
            ];
        });

        $total = $items->sum('subtotal');

        return response()->json([
            'success' => true,
            'data' => $items, // Kirim langsung array items agar mergeCart di Frontend mudah
            'meta' => [
                'total_price' => $total
            ]
        ]);
    }

    /**
     * Add item to cart
     */
    public function store(Request $request)
    {
        // 1. Validasi Input (table_id Wajib)
        $validated = $request->validate([
            'table_id' => 'required|integer|exists:tables,id',
            'menu_id' => 'required|exists:menus,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $tableId = $validated['table_id'];

        // Cek ketersediaan menu
        $menu = Menu::findOrFail($validated['menu_id']);
        if ($menu->status !== 'Tersedia') {
            throw ValidationException::withMessages([
                'menu' => ['Menu tidak tersedia saat ini.'],
            ]);
        }

        // Cek apakah item sudah ada di keranjang meja ini
        $existingCart = Cart::where('table_id', $tableId)
            ->where('menu_id', $validated['menu_id'])
            ->first();

        if ($existingCart) {
            // Update quantity
            $existingCart->quantity += $validated['quantity'];
            $existingCart->save();
            $cart = $existingCart;
        } else {
            // Buat item baru
            $cart = Cart::create([
                'table_id' => $tableId,
                'menu_id' => $validated['menu_id'],
                'quantity' => $validated['quantity'],
            ]);
        }

        $cart->load('menu');

        return response()->json([
            'success' => true,
            'message' => 'Item berhasil ditambahkan',
            'data' => [
                'id' => $cart->id,
                'menu_id' => $cart->menu_id,
                'menu' => [
                    'id' => $cart->menu->id,
                    'name' => $cart->menu->name,
                    'price' => $cart->menu->price,
                ],
                'quantity' => $cart->quantity,
            ],
        ], 201);
    }

    /**
     * Update cart item quantity (PUT)
     */
    public function update(Request $request, $menuId)
    {
        $validated = $request->validate([
            'table_id' => 'required|integer|exists:tables,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $tableId = $validated['table_id'];

        // Cari item berdasarkan Menu ID dan Table ID
        // Note: $menuId di sini adalah ID Menu (product ID), bukan ID Cart (primary key tabel cart)
        // Sesuaikan dengan logic Frontend yang mengirim menu_id di URL
        $cart = Cart::where('table_id', $tableId)
                    ->where('menu_id', $menuId)
                    ->first();

        if (!$cart) {
            return response()->json(['message' => 'Item tidak ditemukan di keranjang meja ini'], 404);
        }

        $cart->quantity = $validated['quantity'];
        $cart->save();

        return response()->json([
            'success' => true,
            'message' => 'Quantity berhasil diupdate',
        ]);
    }

    /**
     * Remove item from cart (DELETE)
     */
    public function destroy(Request $request, $menuId)
    {
        // Tangkap table_id dari query string atau body
        $tableId = $request->input('table_id') ?? $request->query('table_id');

        if (!$tableId) {
            return response()->json(['message' => 'Table ID wajib ada'], 422);
        }

        // Hapus berdasarkan Menu ID dan Table ID
        $deleted = Cart::where('table_id', $tableId)
                       ->where('menu_id', $menuId)
                       ->delete();

        if ($deleted) {
            return response()->json([
                'success' => true,
                'message' => 'Item berhasil dihapus',
            ]);
        }

        return response()->json(['message' => 'Item tidak ditemukan'], 404);
    }

    /**
     * Clear all cart items for a table
     */
    public function clear(Request $request)
    {
        $tableId = $request->input('table_id') ?? $request->query('table_id');

        if (!$tableId) {
            return response()->json(['message' => 'Table ID wajib ada'], 422);
        }

        Cart::where('table_id', $tableId)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Keranjang berhasil dikosongkan',
        ]);
    }
}