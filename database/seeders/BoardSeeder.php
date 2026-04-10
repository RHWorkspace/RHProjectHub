<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class BoardSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $project = \App\Models\Project::first();

        \App\Models\Board::create([
            'name' => 'To Do',
            'description' => 'Tasks to be done',
            'project_id' => $project->id,
        ]);

        \App\Models\Board::create([
            'name' => 'In Progress',
            'description' => 'Tasks currently being worked on',
            'project_id' => $project->id,
        ]);

        \App\Models\Board::create([
            'name' => 'Done',
            'description' => 'Completed tasks',
            'project_id' => $project->id,
        ]);
    }
}
