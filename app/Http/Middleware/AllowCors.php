<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AllowCors
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // For development, allow localhost from frontend dev server
        $allowed = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
        ];

        $origin = $request->headers->get('origin');
        if (in_array($origin, $allowed)) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
        } else {
            // Optionally allow all in dev (comment this out for production)
            $response->headers->set('Access-Control-Allow-Origin', '*');
        }

        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
        $response->headers->set('Access-Control-Allow-Credentials', 'true');

        return $response;
    }
}
