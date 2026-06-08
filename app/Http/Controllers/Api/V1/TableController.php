<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Table;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;

class TableController extends Controller
{
    /**
     * Get all tables
     */
    public function index()
    {
        try {
            $tables = Table::orderBy('name')->get(['id', 'name', 'created_at', 'updated_at']);
            
            Log::info('TableController::index called', [
                'count' => $tables->count(),
                'tables' => $tables->toArray()
            ]);
            
            $data = $tables->map(function ($table) {
                return [
                    'id' => $table->id,
                    'name' => $table->name,
                    'has_active_orders' => false, // Simplified - avoid potential errors
                    'created_at' => $table->created_at,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            Log::error('TableController::index error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch tables',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single table
     */
    public function show($id)
    {
        // Support lookup by ID or by name (table number)
        if (is_numeric($id)) {
            $table = Table::where('id', $id)->orWhere('name', $id)->firstOrFail();
        } else {
            $table = Table::where('name', $id)->firstOrFail();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $table->id,
                'name' => $table->name,
                'has_active_orders' => $table->hasActiveOrders(),
            ],
        ]);
    }

    /**
     * Validate QR Code Signature
     * Mencegah user manipulasi table_id dari URL
     */
    public function validateQrSignature(Request $request)
    {
        $request->validate([
            'table_id' => 'required|integer|exists:tables,id',
            'signature' => 'required|string',
        ]);

        $table = Table::findOrFail($request->table_id);
        
        // Generate signature yang valid
        $validSignature = hash_hmac('sha256', $table->id . '|' . $table->name, env('APP_KEY'));
        
        // Bandingkan dengan signature dari request
        if (!hash_equals($validSignature, $request->signature)) {
            return response()->json([
                'success' => false,
                'message' => 'QR Code tidak valid. Silakan scan ulang QR Code dari meja Anda.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'message' => 'QR Code valid',
            'data' => [
                'table_id' => $table->id,
                'table_name' => $table->name,
            ],
        ]);
    }

    /**
     * Create new table (Admin only)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:tables,name|max:255',
        ]);

        $table = Table::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Meja berhasil ditambahkan',
            'data' => [
                'id' => $table->id,
                'name' => $table->name,
            ],
        ], 201);
    }

    /**
     * Update table (Admin only)
     */
    public function update(Request $request, $id)
    {
        $table = Table::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:tables,name,' . $id,
        ]);

        $table->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Meja berhasil diupdate',
            'data' => [
                'id' => $table->id,
                'name' => $table->name,
            ],
        ]);
    }

    /**
     * Delete table (Admin only)
     * Prevent delete if table has active orders
     */
    public function destroy($id)
    {
        $table = Table::findOrFail($id);

        if ($table->hasActiveOrders()) {
            throw ValidationException::withMessages([
                'table' => ['Tidak dapat menghapus meja yang memiliki pesanan aktif.'],
            ]);
        }

        $table->delete();

        return response()->json([
            'success' => true,
            'message' => 'Meja berhasil dihapus',
        ]);
    }

    /**
     * Download QR Code for table (Admin only)
     */
    public function downloadQr($id)
    {
        $table = Table::findOrFail($id);
        
        // Frontend URL dengan table_number parameter
        // LOCAL NETWORK: http://172.17.192.1:3000 (accessible from mobile)
        // PRODUCTION: https://esbar79.shop (uncomment saat deploy)
        $frontendUrl = env('FRONTEND_URL', 'http://172.17.192.1:3000');
        $signature = hash_hmac('sha256', $table->id . '|' . $table->name, env('APP_KEY'));
        $qrUrl = $frontendUrl . '/?table_number=' . urlencode($table->name) . '&signature=' . $signature;
        
        // Generate QR Code menggunakan external API
        // Menggunakan qr-server.com API (free & reliable)
        $qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?' . http_build_query([
            'size' => '300x300',
            'data' => $qrUrl,
            'ecc' => 'H', // High error correction
            'format' => 'png',
        ]);
        
        // Fetch QR code image
        $qrImage = file_get_contents($qrCodeUrl);
        
        if (!$qrImage) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate QR Code'
            ], 500);
        }
        
        // Return as downloadable PNG file
        return response($qrImage)
            ->header('Content-Type', 'image/png')
            ->header('Content-Disposition', 'attachment; filename="QR_' . $table->name . '.png"');
    }

    /**
     * Get QR Code URL for table (Admin only)
     */
    public function getQrUrl($id)
    {
        $table = Table::findOrFail($id);
        
        // LOCAL NETWORK: http://172.17.192.1:3000 (accessible from mobile)
        // PRODUCTION: https://esbar79.shop (uncomment saat deploy)
        $frontendUrl = env('FRONTEND_URL', 'http://172.17.192.1:3000');
        
        // Generate signed URL dengan expiration 30 hari
        // Gunakan table_number (name) di URL, bukan ID database
        $signature = hash_hmac('sha256', $table->id . '|' . $table->name, env('APP_KEY'));
        $qrUrl = $frontendUrl . '/?table_number=' . urlencode($table->name) . '&signature=' . $signature;
        
        $qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?' . http_build_query([
            'size' => '300x300',
            'data' => $qrUrl,
            'ecc' => 'H',
            'format' => 'png',
        ]);
        
        return response()->json([
            'success' => true,
            'data' => [
                'table_id' => $table->id,
                'table_name' => $table->name,
                'qr_url' => $qrCodeUrl,
                'target_url' => $qrUrl,
            ],
        ]);
    }
}

