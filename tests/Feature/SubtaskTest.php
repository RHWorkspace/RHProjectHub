<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubtaskTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        \App\Models\RolePermission::clearCache();
    }

    private function seedPermission(string $role, string $permission, bool $enabled = true): void
    {
        \App\Models\RolePermission::updateOrCreate(
            ['role' => $role, 'permission' => $permission],
            ['enabled' => $enabled]
        );
        \App\Models\RolePermission::clearCache();
    }

    private function makeParentTask(array $attrs = []): Task
    {
        return Task::factory()->create(array_merge(['parent_id' => null], $attrs));
    }

    // ─── Create subtask ────────────────────────────────────────────────────

    /** @test */
    public function admin_can_create_a_subtask(): void
    {
        $admin  = User::factory()->create(['role' => 'admin']);
        $parent = $this->makeParentTask();

        $response = $this->actingAs($admin)
            ->post("/tasks/{$parent->id}/subtasks", [
                'title'    => 'My Subtask',
                'priority' => 'medium',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('tasks', [
            'title'     => 'My Subtask',
            'parent_id' => $parent->id,
            'status'    => 'todo',
        ]);
    }

    /** @test */
    public function manager_can_create_a_subtask(): void
    {
        $manager = User::factory()->create(['role' => 'manager']);
        $parent  = $this->makeParentTask();

        $response = $this->actingAs($manager)
            ->post("/tasks/{$parent->id}/subtasks", [
                'title'    => 'Manager Subtask',
                'priority' => 'high',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('tasks', ['title' => 'Manager Subtask', 'parent_id' => $parent->id]);
    }

    /** @test */
    public function user_without_permission_cannot_create_subtask(): void
    {
        $user   = User::factory()->create(['role' => 'user']);
        $parent = $this->makeParentTask();

        $response = $this->actingAs($user)
            ->post("/tasks/{$parent->id}/subtasks", ['title' => 'Should fail']);

        $response->assertForbidden();
    }

    /** @test */
    public function user_with_permission_can_create_subtask(): void
    {
        $this->seedPermission('user', 'edit_task_detail');
        $user   = User::factory()->create(['role' => 'user']);
        $parent = $this->makeParentTask();

        $response = $this->actingAs($user)
            ->post("/tasks/{$parent->id}/subtasks", ['title' => 'Permitted Subtask']);

        $response->assertRedirect();
        $this->assertDatabaseHas('tasks', ['title' => 'Permitted Subtask', 'parent_id' => $parent->id]);
    }

    // ─── Parent status auto-sync ────────────────────────────────────────────

    /** @test */
    public function all_subtasks_done_sets_parent_to_done(): void
    {
        $admin  = User::factory()->create(['role' => 'admin']);
        $parent = $this->makeParentTask(['status' => 'in_progress', 'progress' => 50]);
        $sub1   = Task::factory()->done()->create(['parent_id' => $parent->id, 'board_id' => $parent->board_id]);
        $sub2   = Task::factory()->todo()->create(['parent_id' => $parent->id, 'board_id' => $parent->board_id]);

        // Now mark sub2 as done
        $this->actingAs($admin)
            ->patch("/subtasks/{$sub2->id}/status", ['status' => 'done']);

        $parent->refresh();
        $this->assertEquals('done', $parent->status);
        $this->assertEquals(100, $parent->progress);
    }

    /** @test */
    public function any_subtask_in_progress_sets_parent_to_in_progress(): void
    {
        $admin  = User::factory()->create(['role' => 'admin']);
        $parent = $this->makeParentTask(['status' => 'todo', 'progress' => 0]);
        $sub    = Task::factory()->todo()->create(['parent_id' => $parent->id, 'board_id' => $parent->board_id]);

        $this->actingAs($admin)
            ->patch("/subtasks/{$sub->id}/status", ['status' => 'in_progress']);

        $parent->refresh();
        $this->assertEquals('in_progress', $parent->status);
    }

    /** @test */
    public function all_subtasks_todo_sets_parent_to_todo(): void
    {
        $admin  = User::factory()->create(['role' => 'admin']);
        $parent = $this->makeParentTask(['status' => 'done', 'progress' => 100]);
        $sub    = Task::factory()->done()->create(['parent_id' => $parent->id, 'board_id' => $parent->board_id]);

        $this->actingAs($admin)
            ->patch("/subtasks/{$sub->id}/status", ['status' => 'todo']);

        $parent->refresh();
        $this->assertEquals('todo', $parent->status);
        $this->assertEquals(0, $parent->progress);
    }

    /** @test */
    public function adding_subtask_to_done_parent_reopens_it(): void
    {
        $admin  = User::factory()->create(['role' => 'admin']);
        $parent = $this->makeParentTask(['status' => 'done', 'progress' => 100]);

        $this->actingAs($admin)
            ->post("/tasks/{$parent->id}/subtasks", ['title' => 'New Sub']);

        $parent->refresh();
        $this->assertNotEquals('done', $parent->status);
    }

    // ─── Delete subtask ────────────────────────────────────────────────────

    /** @test */
    public function admin_can_delete_subtask(): void
    {
        $admin  = User::factory()->create(['role' => 'admin']);
        $parent = $this->makeParentTask();
        $sub    = Task::factory()->create(['parent_id' => $parent->id, 'board_id' => $parent->board_id]);

        $response = $this->actingAs($admin)
            ->delete("/subtasks/{$sub->id}");

        $response->assertRedirect();
        $this->assertDatabaseMissing('tasks', ['id' => $sub->id]);
    }

    /** @test */
    public function user_without_permission_cannot_delete_subtask(): void
    {
        $user   = User::factory()->create(['role' => 'user']);
        $parent = $this->makeParentTask();
        $sub    = Task::factory()->create(['parent_id' => $parent->id, 'board_id' => $parent->board_id]);

        $response = $this->actingAs($user)
            ->delete("/subtasks/{$sub->id}");

        $response->assertForbidden();
        $this->assertDatabaseHas('tasks', ['id' => $sub->id]);
    }

    /** @test */
    public function parent_progress_recalculated_after_subtask_deletion(): void
    {
        $admin  = User::factory()->create(['role' => 'admin']);
        $parent = $this->makeParentTask(['status' => 'in_progress', 'progress' => 50]);
        $sub1   = Task::factory()->done()->create(['parent_id' => $parent->id, 'board_id' => $parent->board_id]);
        $sub2   = Task::factory()->todo()->create(['parent_id' => $parent->id, 'board_id' => $parent->board_id]);

        // Delete the incomplete subtask — parent should become done
        $this->actingAs($admin)->delete("/subtasks/{$sub2->id}");

        $parent->refresh();
        $this->assertEquals('done', $parent->status);
        $this->assertEquals(100, $parent->progress);
    }
}
