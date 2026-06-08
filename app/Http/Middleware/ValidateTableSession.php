<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class ValidateTableSession
{
    /**
     * Handle an incoming request untuk validasi table_id
     * Mencegah user manipulasi payload table_id
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip validation untuk admin routes
        if ($request->is('api/*/admin/*')) {
            return $next($request);
        }

        // Ambil table_id dari request
        $tableId = $request->input('table_id') ?? $request->query('table_id');

        if (!$tableId) {
            return response()->json([
                'success' => false,
                'message' => 'Table ID wajib disertakan',
            ], 400);
        }

        // Validasi table_id exists di database
        $table = \App\Models\Table::find($tableId);
        
        if (!$table) {
            return response()->json([
                'success' => false,
                'message' => 'Meja tidak valid',
            ], 404);
        }

        // Simpan table info ke request untuk digunakan di controller
        $request->merge(['validated_table' => $table]);

        return $next($request);
    }
}
