<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite does not enforce or support ENUM modification; MySQL-only
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE tasks MODIFY COLUMN priority ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("UPDATE tasks SET priority = 'medium' WHERE priority = 'critical'");
            DB::statement("ALTER TABLE tasks MODIFY COLUMN priority ENUM('low','medium','high') NOT NULL DEFAULT 'medium'");
        }
    }
};
