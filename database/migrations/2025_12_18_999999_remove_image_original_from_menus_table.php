<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::table('menus', function (Blueprint $table) {
            if (Schema::hasColumn('menus', 'image_original')) {
                $table->dropColumn('image_original');
            }
        });
    }

    public function down()
    {
        Schema::table('menus', function (Blueprint $table) {
            $table->string('image_original')->nullable();
        });
    }
};
