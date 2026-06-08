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

class OrderStatusUpdatedEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $order;
    public $oldStatus;

    /**
     * Create a new event instance.
     */
    public function __construct(Order $order, string $oldStatus)
    {
        $this->order = $order;
        $this->oldStatus = $oldStatus;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('orders'),
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
        
        $statusMessages = [
            'Menunggu Pembayaran' => 'Menunggu pembayaran',
            'Sedang Disiapkan' => 'Pesanan sedang disiapkan',
            'Siap Disajikan' => 'Pesanan siap disajikan',
            'Selesai' => 'Pesanan telah selesai',
            'Dibatalkan' => 'Pesanan dibatalkan',
        ];

        return [
            'order_id' => $this->order->id,
            'tracking_code' => $this->order->tracking_code,
            'table_id' => $this->order->table_id,
            'customer_name' => $this->order->customer_name,
            'total' => $this->order->total,
            'payment_type' => $this->order->payment_type,
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
            'old_status' => $this->oldStatus,
            'new_status' => $this->order->status,
            'status' => $this->order->status,
            'created_at' => $this->order->created_at->toISOString(),
            'updated_at' => $this->order->updated_at->toISOString(),
            'message' => $statusMessages[$this->order->status] ?? 'Status pesanan diperbarui',
        ];
    }

    /**
     * The event's broadcast name.
     *
     * @return string
     */
    public function broadcastAs(): string
    {
        return 'order.status.updated';
    }
}
