<?php

namespace Tests\Unit;

use App\Models\Board;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskModelTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_belongs_to_a_board(): void
    {
        $board = Board::factory()->create();
        $task  = Task::factory()->create(['board_id' => $board->id]);

        $this->assertInstanceOf(Board::class, $task->board);
        $this->assertEquals($board->id, $task->board->id);
    }

    /** @test */
    public function it_can_have_a_parent_task(): void
    {
        $parent = Task::factory()->create();
        $child  = Task::factory()->create(['parent_id' => $parent->id]);

        $this->assertInstanceOf(Task::class, $child->parent);
        $this->assertEquals($parent->id, $child->parent->id);
    }

    /** @test */
    public function it_can_have_subtasks(): void
    {
        $parent = Task::factory()->create();
        Task::factory()->count(3)->create(['parent_id' => $parent->id]);

        $this->assertCount(3, $parent->subtasks);
    }

    /** @test */
    public function it_belongs_to_an_assigned_user(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->create(['assigned_to' => $user->id]);

        $this->assertInstanceOf(User::class, $task->assignedUser);
        $this->assertEquals($user->id, $task->assignedUser->id);
    }

    /** @test */
    public function assigned_user_is_null_when_unassigned(): void
    {
        $task = Task::factory()->create(['assigned_to' => null]);

        $this->assertNull($task->assignedUser);
    }

    /** @test */
    public function it_reports_correct_status_values(): void
    {
        $todo       = Task::factory()->todo()->create();
        $inProgress = Task::factory()->inProgress()->create();
        $done       = Task::factory()->done()->create();

        $this->assertEquals('todo', $todo->status);
        $this->assertEquals('in_progress', $inProgress->status);
        $this->assertEquals('done', $done->status);
    }

    /** @test */
    public function parent_id_is_null_for_top_level_tasks(): void
    {
        $task = Task::factory()->create(['parent_id' => null]);

        $this->assertNull($task->parent_id);
    }
}
