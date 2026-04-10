<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** New permission keys added in this version */
    private array $newKeys = [
        'edit_task',
        'manage_team_members',
        'access_manage_teams',
        'access_manage_users',
        'access_manage_roles',
    ];

    public function up(): void
    {
        $now = now();
        $rows = [];

        foreach (['manager', 'user'] as $role) {
            foreach ($this->newKeys as $key) {
                // Only insert if not already present (idempotent)
                $exists = DB::table('role_permissions')
                    ->where('role', $role)
                    ->where('permission', $key)
                    ->exists();

                if (!$exists) {
                    $rows[] = [
                        'role'       => $role,
                        'permission' => $key,
                        'enabled'    => false,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }
        }

        if (!empty($rows)) {
            DB::table('role_permissions')->insert($rows);
        }
    }

    public function down(): void
    {
        foreach (['manager', 'user'] as $role) {
            DB::table('role_permissions')
                ->where('role', $role)
                ->whereIn('permission', $this->newKeys)
                ->delete();
        }
    }
};
