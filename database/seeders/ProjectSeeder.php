<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $admin = \App\Models\User::where('role', 'admin')->first();

        \App\Models\Project::create([
            'name' => 'Project Management App',
            'description' => 'Building a ClickUp-like application',
            'user_id' => $admin->id,
        ]);

        \App\Models\Project::create([
            'name' => 'E-commerce Platform',
            'description' => 'Online shopping website',
            'user_id' => $admin->id,
        ]);
    }
}
