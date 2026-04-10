<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_assignees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unique(['task_id', 'user_id']);
            $table->timestamps();
        });

        // Migrate existing assigned_to values (parent tasks only) to the pivot table
        $tasks = DB::table('tasks')
            ->whereNotNull('assigned_to')
            ->whereNull('parent_id')
            ->get(['id', 'assigned_to']);

        foreach ($tasks as $task) {
            DB::table('task_assignees')->insertOrIgnore([
                'task_id'    => $task->id,
                'user_id'    => $task->assigned_to,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Null out assigned_to for parent tasks (now managed via task_assignees pivot)
        DB::table('tasks')->whereNull('parent_id')->update(['assigned_to' => null]);
    }

    public function down(): void
    {
        Schema::dropIfExists('task_assignees');
    }
};
