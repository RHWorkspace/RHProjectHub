<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE tasks MODIFY COLUMN priority ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium'");
    }

    public function down(): void
    {
        // Remove 'critical' values before reverting
        DB::statement("UPDATE tasks SET priority = 'medium' WHERE priority = 'critical'");
        DB::statement("ALTER TABLE tasks MODIFY COLUMN priority ENUM('low','medium','high') NOT NULL DEFAULT 'medium'");
    }
};
