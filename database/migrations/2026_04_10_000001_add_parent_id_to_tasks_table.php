<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('parent_id')
                  ->nullable()
                  ->after('board_id')
                  ->constrained('tasks')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\Task::class, 'parent_id');
            $table->dropColumn('parent_id');
        });
    }
};
