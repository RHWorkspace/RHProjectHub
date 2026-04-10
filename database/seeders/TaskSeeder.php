<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TaskSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $boards = \App\Models\Board::all();
        $users = \App\Models\User::all();

        foreach ($boards as $board) {
            $status = match($board->name) {
                'To Do' => 'todo',
                'In Progress' => 'in_progress',
                'Done' => 'done',
                default => 'todo'
            };

            \App\Models\Task::create([
                'title' => 'Sample Task for ' . $board->name,
                'description' => 'This is a sample task',
                'status' => $status,
                'board_id' => $board->id,
                'assigned_to' => $users->random()->id,
                'due_date' => now()->addDays(rand(1, 30)),
            ]);
        }
    }
}
