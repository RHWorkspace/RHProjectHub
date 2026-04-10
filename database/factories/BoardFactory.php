<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Board>
 */
class BoardFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'        => fake()->words(2, true),
            'description' => fake()->sentence(),
            'project_id'  => Project::factory(),
            'user_id'     => User::factory(),
        ];
    }
}
