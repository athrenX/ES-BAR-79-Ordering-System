<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Step 1: Modify payment_type enum to include 'cash'
        DB::statement("ALTER TABLE orders MODIFY COLUMN payment_type ENUM('qris', 'gopay', 'bca_va', 'cash') NULL");
        
        // Step 2: Add payment_status column
        Schema::table('orders', function (Blueprint $table) {
            $table->enum('payment_status', ['unpaid', 'paid'])
                  ->default('unpaid')
                  ->after('payment_type');
        });
        
        // Step 3: Update existing orders to 'paid' if paid_at is not null
        DB::statement("UPDATE orders SET payment_status = 'paid' WHERE paid_at IS NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('payment_status');
        });
        
        // Revert payment_type enum
        DB::statement("ALTER TABLE orders MODIFY COLUMN payment_type ENUM('qris', 'gopay', 'bca_va') NULL");
    }
};
