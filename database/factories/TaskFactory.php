<?php

namespace Database\Factories;

use App\Models\Board;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Task>
 */
class TaskFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title'       => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'status'      => fake()->randomElement(['todo', 'in_progress', 'done']),
            'priority'    => fake()->randomElement(['low', 'medium', 'high', 'critical']),
            'progress'    => fake()->numberBetween(0, 100),
            'board_id'    => Board::factory(),
            'parent_id'   => null,
            'assigned_to' => null,
            'due_date'    => fake()->optional()->dateTimeBetween('now', '+30 days'),
            'start_date'  => fake()->optional()->dateTimeBetween('-7 days', 'now'),
        ];
    }

    public function todo(): static
    {
        return $this->state(['status' => 'todo', 'progress' => 0]);
    }

    public function inProgress(): static
    {
        return $this->state(['status' => 'in_progress', 'progress' => 50]);
    }

    public function done(): static
    {
        return $this->state(['status' => 'done', 'progress' => 100]);
    }
}
