<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Change ENUM to VARCHAR(50) to allow any role slug from the roles table
        DB::statement("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'user'");
    }

    public function down(): void
    {
        // Revert to enum (safe only if no custom role values exist)
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin','manager','user') NOT NULL DEFAULT 'user'");
    }
};
