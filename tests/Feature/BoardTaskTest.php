<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BoardTaskTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        \App\Models\RolePermission::clearCache();
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function manager(): User
    {
        return User::factory()->create(['role' => 'manager']);
    }

    private function regularUser(): User
    {
        return User::factory()->create(['role' => 'user']);
    }

    // ─── Create task ────────────────────────────────────────────────────────

    /** @test */
    public function admin_can_create_a_task_on_a_board(): void
    {
        $admin = $this->admin();
        $board = Board::factory()->create();

        $response = $this->actingAs($admin)
            ->post("/boards/{$board->id}/tasks", [
                'title'    => 'Test Task',
                'status'   => 'todo',
                'priority' => 'medium',
                'progress' => 0,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('tasks', ['title' => 'Test Task', 'board_id' => $board->id]);
    }

    /** @test */
    public function manager_can_create_a_task_on_a_board(): void
    {
        $manager = $this->manager();
        $board   = Board::factory()->create();

        $response = $this->actingAs($manager)
            ->post("/boards/{$board->id}/tasks", [
                'title'    => 'Manager Task',
                'status'   => 'todo',
                'priority' => 'high',
                'progress' => 0,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('tasks', ['title' => 'Manager Task', 'board_id' => $board->id]);
    }

    /** @test */
    public function regular_user_cannot_create_a_task(): void
    {
        $board = Board::factory()->create();

        $response = $this->actingAs($this->regularUser())
            ->post("/boards/{$board->id}/tasks", [
                'title'    => 'Unauthorized Task',
                'status'   => 'todo',
                'priority' => 'low',
                'progress' => 0,
            ]);

        $response->assertForbidden();
    }

    /** @test */
    public function task_creation_requires_title(): void
    {
        $admin = $this->admin();
        $board = Board::factory()->create();

        $response = $this->actingAs($admin)
            ->post("/boards/{$board->id}/tasks", [
                'title'    => '',
                'status'   => 'todo',
                'priority' => 'medium',
                'progress' => 0,
            ]);

        $response->assertSessionHasErrors('title');
    }

    // ─── Update task status ─────────────────────────────────────────────────

    /** @test */
    public function admin_can_update_task_status(): void
    {
        $admin = $this->admin();
        $task  = Task::factory()->todo()->create();

        $response = $this->actingAs($admin)
            ->patch("/tasks/{$task->id}/status", ['status' => 'done']);

        $response->assertRedirect();
        $this->assertDatabaseHas('tasks', ['id' => $task->id, 'status' => 'done']);
    }

    /** @test */
    public function assigned_user_with_permission_can_update_own_task_status(): void
    {
        \App\Models\RolePermission::updateOrCreate(
            ['role' => 'user', 'permission' => 'edit_task_status'],
            ['enabled' => true]
        );
        \App\Models\RolePermission::clearCache();

        $user = $this->regularUser();
        $task = Task::factory()->todo()->create(['assigned_to' => $user->id]);

        $response = $this->actingAs($user)
            ->patch("/tasks/{$task->id}/status", ['status' => 'in_progress']);

        $response->assertRedirect();
        $this->assertDatabaseHas('tasks', ['id' => $task->id, 'status' => 'in_progress']);
    }

    /** @test */
    public function unassigned_user_cannot_update_task_status(): void
    {
        $user = $this->regularUser();
        $task = Task::factory()->todo()->create(['assigned_to' => null]);

        $response = $this->actingAs($user)
            ->patch("/tasks/{$task->id}/status", ['status' => 'done']);

        $response->assertForbidden();
    }

    // ─── Delete task ─────────────────────────────────────────────────────────

    /** @test */
    public function admin_can_delete_a_task(): void
    {
        $admin = $this->admin();
        $task  = Task::factory()->create();

        $response = $this->actingAs($admin)
            ->delete("/tasks/{$task->id}/delete");

        $response->assertRedirect();
        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
    }

    /** @test */
    public function regular_user_cannot_delete_a_task(): void
    {
        $task = Task::factory()->create();

        $response = $this->actingAs($this->regularUser())
            ->delete("/tasks/{$task->id}/delete");

        $response->assertForbidden();
        $this->assertDatabaseHas('tasks', ['id' => $task->id]);
    }
}
