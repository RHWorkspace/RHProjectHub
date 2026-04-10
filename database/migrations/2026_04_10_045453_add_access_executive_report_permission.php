<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $now = now();
        DB::table('role_permissions')->insertOrIgnore([
            ['role' => 'manager', 'permission' => 'access_executive_report', 'enabled' => true,  'created_at' => $now, 'updated_at' => $now],
            ['role' => 'user',    'permission' => 'access_executive_report', 'enabled' => false, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('role_permissions')
            ->whereIn('role', ['manager', 'user'])
            ->where('permission', 'access_executive_report')
            ->delete();
    }
};
