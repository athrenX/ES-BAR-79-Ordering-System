<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Order extends Model
{
    protected $fillable = [
        'user_id', 'table_id', 'customer_name', 'payment_expires_at',
        'payment_transaction_id', 'payment_qr_url', 'payment_type',
        'payment_status', 'paid_at', 'status', 'total', 'tracking_code',
    ];

    protected $casts = [
        'payment_expires_at' => 'datetime',
        'paid_at' => 'datetime',
        'total' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(Table::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public static function generateTrackingCode()
    {
        do {
            $code = 'ESB-' . strtoupper(Str::random(5));
        } while (self::where('tracking_code', $code)->exists());
        return $code;
    }

    public function isPaid()
    {
        return $this->payment_status === 'paid' || !is_null($this->paid_at);
    }

    public function canBeCancelled()
    {
        // Order dapat dibatalkan jika:
        // 1. Belum dibayar ATAU
        // 2. Status masih "Menunggu Pembayaran" atau "Sedang Diproses"
        return !$this->isPaid() || 
               in_array($this->status, ['Menunggu Pembayaran', 'Sedang Diproses']);
    }
}