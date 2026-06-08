<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\File;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// Route Default Laravel
Route::get('/', function () {
    return view('welcome');
});

// Route Debug (Cek koneksi database)
Route::get('/debug-tables', function () {
    return response()->json([
        'success' => true,
        'message' => 'Direct route works!',
        'tables' => \App\Models\Table::all()->toArray()
    ]);
});

/*
|--------------------------------------------------------------------------
| ROUTE KHUSUS GAMBAR (ANTI ERROR / ANTI CORS / WINDOWS FRIENDLY)
|--------------------------------------------------------------------------
| Route ini mengambil alih tugas server untuk melayani file di /storage/
| karena symlink sering bermasalah di Windows + php artisan serve.
*/
// routes/web.php (Paling Bawah)

// Kita ganti nama jalurnya jadi '/buka-gambar' agar tidak diblokir server
Route::get('/buka-gambar/{path}', function ($path) {
    
    // Perbaiki path untuk Windows
    $cleanPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $path);
    
    // Arahkan ke file fisik di storage/app/public
    $filePath = storage_path('app' . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . $cleanPath);

    // Cek apakah file ada
    if (!file_exists($filePath)) {
        return response()->json([
            'status' => 'error', 
            'message' => 'File tidak ditemukan',
            'path_dicari' => $filePath
        ], 404);
    }

    // Kirim file
    return response()->file($filePath, [
        'Access-Control-Allow-Origin' => '*',
        'Cross-Origin-Resource-Policy' => 'cross-origin',
        'Content-Type' => \Illuminate\Support\Facades\File::mimeType($filePath),
    ]);
})->where('path', '.*');