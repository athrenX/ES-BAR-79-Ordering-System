<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PaymentSuccessEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $order;

    /**
     * Create a new event instance.
     */
    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('orders'), // Ganti dari admin-orders ke orders
            new PrivateChannel('table.' . $this->order->table_id),
        ];
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        // Load items with menu relationship
        $this->order->load('items.menu', 'table');
        
        return [
            'order_id' => $this->order->id,
            'tracking_code' => $this->order->tracking_code,
            'table_id' => $this->order->table_id,
            'customer_name' => $this->order->customer_name,
            'total' => $this->order->total,
            'transaction_id' => $this->order->transaction_id,
            'payment_type' => $this->order->payment_type,
            'payment_status' => $this->order->payment_status,
            'items' => $this->order->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'quantity' => $item->quantity,
                    'price' => $item->price,
                    'menu' => [
                        'id' => $item->menu->id,
                        'name' => $item->menu->name,
                        'image' => $item->menu->image,
                        'category' => $item->menu->category,
                    ],
                ];
            }),
            'table' => [
                'id' => $this->order->table->id,
                'name' => $this->order->table->name,
            ],
            'paid_at' => $this->order->paid_at ? $this->order->paid_at->toISOString() : null,
            'status' => $this->order->status,
            'created_at' => $this->order->created_at->toISOString(),
            'message' => 'Pembayaran berhasil untuk pesanan ' . $this->order->tracking_code,
        ];
    }

    /**
     * The event's broadcast name.
     *
     * @return string
     */
    public function broadcastAs(): string
    {
        return 'payment.success';
    }
}
