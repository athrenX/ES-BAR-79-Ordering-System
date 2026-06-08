<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Events\PaymentSuccessEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Midtrans\Config;
use Midtrans\Snap;
use Midtrans\Notification;

class PaymentController extends Controller
{
    public function __construct()
    {
        Config::$serverKey = env('MIDTRANS_SERVER_KEY');
        Config::$isProduction = false;
        Config::$isSanitized = true;
        Config::$is3ds = true;
    }

    /**
     * Create Midtrans Snap Token
     */
    public function createPayment(Request $request)
    {
        Log::info('PaymentController::createPayment - Request received', [
            'order_id' => $request->order_id,
            'all_input' => $request->all(),
        ]);
        
        $request->validate(['order_id' => 'required|exists:orders,id']);
        $order = Order::with(['items.menu'])->findOrFail($request->order_id);

        Log::info('PaymentController::createPayment - Order loaded', [
            'order_id' => $order->id,
            'tracking_code' => $order->tracking_code,
            'total' => $order->total,
            'is_paid' => $order->isPaid(),
            'customer_name' => $order->customer_name,
        ]);

        if ($order->isPaid()) {
            return response()->json(['message' => 'Order sudah dibayar.'], 400);
        }

        $transactionData = [
            'transaction_details' => [
                'order_id' => $order->tracking_code . '-' . time(),
                'gross_amount' => (int) $order->total,
            ],
            'customer_details' => [
                'first_name' => $order->customer_name ?? 'Customer',
                'email' => optional($order->user)->email ?? 'customer@esbar.com',
            ],
            'item_details' => $order->items->map(function ($item) {
                return [
                    'id' => $item->menu_id,
                    'price' => (int) $item->price,
                    'quantity' => $item->quantity,
                    'name' => $item->menu->name,
                ];
            })->toArray(),
            'enabled_payments' => ['gopay', 'qris', 'shopeepay', 'other_qris'],
            'gopay' => [
                'enable_callback' => true,
                'callback_url' => url('/v1/midtrans/webhook'),
            ],
            'credit_card' => [
                'secure' => true,
            ],
            'custom_field1' => 'Kedai ES BAR 79',
            'custom_field2' => 'Ice Cream & Coffee',
        ];

        try {
            $snapToken = Snap::getSnapToken($transactionData);
            $order->update([
                'payment_transaction_id' => $transactionData['transaction_details']['order_id'],
                'payment_status' => 'unpaid', // Changed from 'pending' to match enum values
                'payment_type' => 'qris',
                'payment_expires_at' => now()->addMinutes(15),
            ]);
            return response()->json(['token' => $snapToken]);
        } catch (\Exception $e) {
            Log::error('Midtrans Error: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Webhook Handler
     */
    public function webhook(Request $request)
    {
        try {
            $notification = new Notification();
            $transactionStatus = $notification->transaction_status;
            $orderIdFull = $notification->order_id;

            Log::info('Midtrans Webhook Received', [
                'order_id' => $orderIdFull,
                'transaction_status' => $transactionStatus,
                'payment_type' => $notification->payment_type ?? null,
            ]);

            $parts = explode('-', $orderIdFull);
            $trackingCode = $parts[0] . '-' . $parts[1];
            $order = Order::where('tracking_code', $trackingCode)->first();

            if (!$order) {
                Log::warning('Webhook: Order not found', ['tracking_code' => $trackingCode]);
                return response()->json(['message' => 'Not Found'], 404);
            }

            if (in_array($transactionStatus, ['capture', 'settlement'])) {
                Log::info('Webhook: Payment SUCCESS', ['order_id' => $order->id]);
                $this->markAsPaid($order);
            } elseif (in_array($transactionStatus, ['deny', 'expire', 'cancel'])) {
                Log::info('Webhook: Payment FAILED', ['order_id' => $order->id, 'status' => $transactionStatus]);
                $order->update(['payment_status' => 'failed']);
            }
            return response()->json(['message' => 'OK']);
        } catch (\Exception $e) {
            Log::error('Webhook Error: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function cashPayment($orderId)
    {
        $order = Order::findOrFail($orderId);
        $order->update(['payment_type' => 'cash', 'payment_status' => 'unpaid', 'status' => 'Menunggu Pembayaran']);
        return response()->json(['success' => true]);
    }

    public function confirmCashPayment($orderId)
    {
        $order = Order::findOrFail($orderId);
        $this->markAsPaid($order);
        return response()->json(['success' => true]);
    }

    /**
     * Mark order as paid (simple version for sandbox testing)
     * Called when user closes Midtrans tab
     */
    public function markAsPaidSimple($orderId)
    {
        try {
            $order = Order::findOrFail($orderId);
            
            Log::info('Mark as Paid Simple - Order found', [
                'order_id' => $order->id,
                'current_payment_status' => $order->payment_status,
            ]);
            
            // Mark as paid if not already paid
            if (!$order->isPaid()) {
                $order->update([
                    'payment_status' => 'paid',
                    'payment_type' => 'qris',
                    'paid_at' => now(),
                    'status' => 'Sedang Disiapkan'
                ]);
                
                // Trigger event for real-time notification
                event(new PaymentSuccessEvent($order));
                
                Log::info('Mark as Paid Simple - Order marked as paid', [
                    'order_id' => $order->id,
                ]);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Pembayaran berhasil dicatat',
                'data' => [
                    'order_id' => $order->id,
                    'payment_status' => 'paid',
                    'status' => $order->status,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Mark as Paid Simple - Error', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Gagal mencatat pembayaran',
            ], 500);
        }
    }

    public function checkStatus($orderId)
    {
        $order = Order::findOrFail($orderId);
        return response()->json([
            'data' => [
                'id' => $order->id,
                'tracking_code' => $order->tracking_code,
                'payment_status' => $order->payment_status,
                'payment_type' => $order->payment_type,
                'status' => $order->status,
                'total' => $order->total,
            ]
        ]);
    }

    private function markAsPaid($order)
    {
        if (!$order->isPaid()) {
            $order->update(['payment_status' => 'paid', 'paid_at' => now(), 'status' => 'Sedang Disiapkan']);
            event(new PaymentSuccessEvent($order));
        }
    }
}
