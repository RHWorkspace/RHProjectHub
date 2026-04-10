<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('role');        // 'manager' | 'user'  (admin = always all access)
            $table->string('permission');
            $table->boolean('enabled')->default(false);
            $table->timestamps();
            $table->unique(['role', 'permission']);
        });

        // Seed defaults — manager gets everything enabled, user gets nothing by default
        $permissions = [
            'access_reporting',
            'access_workload',
            'access_manage_tasks',
            'create_project',
            'delete_project',
            'create_board',
            'delete_board',
            'create_task',
            'delete_task',
            'assign_task',
        ];

        $now  = now();
        $rows = [];
        foreach ($permissions as $perm) {
            $rows[] = ['role' => 'manager', 'permission' => $perm, 'enabled' => true,  'created_at' => $now, 'updated_at' => $now];
            $rows[] = ['role' => 'user',    'permission' => $perm, 'enabled' => false, 'created_at' => $now, 'updated_at' => $now];
        }

        DB::table('role_permissions')->insert($rows);
    }

    public function down(): void
    {
        Schema::dropIfExists('role_permissions');
    }
};
