<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'role' => 'admin',
        ]);

        \App\Models\User::factory()->create([
            'name' => 'Manager User',
            'email' => 'manager@example.com',
            'role' => 'manager',
        ]);

        \App\Models\User::factory()->create([
            'name' => 'Regular User',
            'email' => 'user@example.com',
            'role' => 'user',
        ]);

        // Create additional users
        \App\Models\User::factory(5)->create([
            'role' => 'user',
        ]);
    }
}
