<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Menu;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;

class MenuController extends Controller
{
    /**
     * Generate Snap Token Midtrans berdasarkan order_id
     * Request: { "order_id": 123 }
     */
    public function midtransSnap(Request $request)
    {
        $request->validate([
            'order_id' => 'required|integer|exists:orders,id',
        ]);

        try {
            $order = Order::findOrFail($request->order_id);

            // Konfigurasi Midtrans - Menggunakan env() langsung untuk menghindari masalah cache config
            \Midtrans\Config::$serverKey = env('MIDTRANS_SERVER_KEY');
            \Midtrans\Config::$isProduction = false; 
            \Midtrans\Config::$isSanitized = true;
            \Midtrans\Config::$is3ds = true;

            // Logika Fallback Nama Pelanggan
            $customerName = $order->customer_name ?? ($order->user->name ?? 'Pelanggan');

            $params = [
                'transaction_details' => [
                    // Menambahkan timestamp agar ID order selalu unik di sistem Sandbox Midtrans
                    'order_id' => 'ORDER-' . $order->id . '-' . time(),
                    'gross_amount' => (int) $order->total,
                ],
                'customer_details' => [
                    'first_name' => $customerName,
                    'email' => $order->user->email ?? 'customer@example.com',
                ],
            ];

            $snapToken = \Midtrans\Snap::getSnapToken($params);
            return response()->json(['token' => $snapToken]);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal Midtrans: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Menampilkan daftar menu (Customer & Admin)
     */
    public function index(Request $request)
    {
        $query = Menu::query();

        if ($request->has('category') && $request->category != '') {
            $query->where('category', $request->category);
        }

        if ($request->has('status') && $request->status != '') {
            $query->where('status', $request->status);
        } elseif (!$request->user()) {
            // Logic default untuk guest/customer
            $query->where('status', 'Tersedia');
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $menus = $query->latest()->get()->map(function ($menu) {
            return $this->formatMenu($menu);
        });

        return response()->json([
            'success' => true,
            'data' => $menus,
        ]);
    }

    /**
     * Detail single menu
     */
    public function show($id)
    {
        $menu = Menu::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $this->formatMenu($menu),
        ]);
    }

    /**
     * Simpan menu baru (Admin)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'category' => ['required', Rule::in(['Makanan', 'Minuman', 'Es Krim'])],
            'image' => 'nullable|image|max:10240',
            'status' => ['required', Rule::in(['Tersedia', 'Habis'])],
        ]);

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('images/menus', 'public');
            $validated['image'] = $path;
            $validated['image_cropped'] = $path; 
        }

        $menu = Menu::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Menu berhasil ditambahkan',
            'data' => $this->formatMenu($menu),
        ], 201);
    }

    /**
     * Update menu (Admin)
     */
    public function update(Request $request, $id)
    {
        $menu = Menu::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'price' => 'sometimes|required|numeric|min:0',
            'description' => 'nullable|string',
            'category' => ['sometimes', Rule::in(['Makanan', 'Minuman', 'Es Krim'])],
            'image' => 'nullable|image|max:10240',
            'status' => ['sometimes', Rule::in(['Tersedia', 'Habis'])],
        ]);

        if ($request->hasFile('image')) {
            // Hapus file fisik lama
            $this->deleteMenuImage($menu->image);
            $this->deleteMenuImage($menu->image_cropped);
            
            $path = $request->file('image')->store('images/menus', 'public');
            $validated['image'] = $path;
            $validated['image_cropped'] = $path; 
        }

        $menu->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Menu berhasil diperbarui',
            'data' => $this->formatMenu($menu),
        ]);
    }

    /**
     * Endpoint untuk menyimpan hasil pangkas (Crop) gambar
     */
    public function crop(Request $request, $id)
    {
        $menu = Menu::findOrFail($id);
        
        $request->validate([
            'cropped' => 'required|image|max:10240', 
        ]);

        // Hapus file lama agar tidak menumpuk
        if ($menu->image_cropped) {
            $this->deleteMenuImage($menu->image_cropped);
        }
        if ($menu->image && $menu->image !== $menu->image_cropped) {
            $this->deleteMenuImage($menu->image);
        }

        $path = $request->file('cropped')->store('images/cropped', 'public');
        
        // Sinkronisasi kedua kolom agar tidak NULL
        $menu->image = $path; 
        $menu->image_cropped = $path; 
        $menu->save();

        return response()->json([
            'success' => true,
            'message' => 'Gambar berhasil dipangkas dan diperbarui',
            'data' => $this->formatMenu($menu),
        ]);
    }

    /**
     * Hapus menu (Admin)
     */
    public function destroy($id)
    {
        $menu = Menu::findOrFail($id);

        $this->deleteMenuImage($menu->image);
        if ($menu->image_cropped !== $menu->image) {
            $this->deleteMenuImage($menu->image_cropped);
        }

        $menu->delete();

        return response()->json([
            'success' => true,
            'message' => 'Menu berhasil dihapus',
        ]);
    }

    /**
     * Daftar kategori
     */
    public function categories()
    {
        return response()->json([
            'success' => true,
            'data' => ['Makanan', 'Minuman', 'Es Krim'],
        ]);
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    private function formatMenu($menu)
    {
        $image = $menu->image ? Storage::url($menu->image) : null;
        $image_cropped = $menu->image_cropped ? Storage::url($menu->image_cropped) : null;
        return [
            'id' => $menu->id,
            'name' => $menu->name,
            'price' => $menu->price,
            'description' => $menu->description,
            'category' => $menu->category,
            'image' => $image,
            'image_cropped' => $image_cropped ?: $image,
            'status' => $menu->status,
            'created_at' => $menu->created_at,
            'updated_at' => $menu->updated_at,
        ];
    }

    private function deleteMenuImage($path)
    {
        if ($path && Storage::disk('public')->exists($path)) {
            try {
                Storage::disk('public')->delete($path);
            } catch (\Exception $e) {
                Log::warning("Gagal menghapus file di storage: " . $path);
            }
        }
    }
}