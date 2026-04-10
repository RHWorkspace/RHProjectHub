<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('display_name');
            $table->string('description')->nullable();
            $table->string('color', 20)->default('#6366f1');
            $table->boolean('is_system')->default(false);
            $table->timestamps();
        });

        DB::table('roles')->insert([
            [
                'name'         => 'admin',
                'display_name' => 'Administrator',
                'description'  => 'Akses penuh ke seluruh fitur sistem. Tidak dapat dibatasi.',
                'color'        => '#ef4444',
                'is_system'    => true,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
            [
                'name'         => 'manager',
                'display_name' => 'Manager',
                'description'  => 'Mengelola project, board, task, dan tim dalam lingkup mereka.',
                'color'        => '#f59e0b',
                'is_system'    => true,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
            [
                'name'         => 'user',
                'display_name' => 'User',
                'description'  => 'Akses terbatas sesuai konfigurasi permissions.',
                'color'        => '#3b82f6',
                'is_system'    => true,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
