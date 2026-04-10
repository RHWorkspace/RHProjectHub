<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now  = now();
        $rows = [];

        $newPerms = [
            'edit_task_detail',   // edit title / description / priority / dates
            'edit_task_status',   // change status (todo → in_progress → done)
            'update_task_progress', // move the progress slider
        ];

        foreach ($newPerms as $perm) {
            // manager = enabled; user = enabled only for progress (detail/status off by default)
            $userEnabled = $perm === 'update_task_progress';
            $rows[] = ['role' => 'manager', 'permission' => $perm, 'enabled' => true,        'created_at' => $now, 'updated_at' => $now];
            $rows[] = ['role' => 'user',    'permission' => $perm, 'enabled' => $userEnabled, 'created_at' => $now, 'updated_at' => $now];
        }

        // Use upsert so it's idempotent if run multiple times
        DB::table('role_permissions')->upsert(
            $rows,
            ['role', 'permission'],
            ['enabled', 'updated_at']
        );
    }

    public function down(): void
    {
        DB::table('role_permissions')
            ->whereIn('permission', ['edit_task_detail', 'edit_task_status', 'update_task_progress'])
            ->delete();
    }
};
