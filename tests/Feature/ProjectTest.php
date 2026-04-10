<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectTest extends TestCase
{
    use RefreshDatabase;

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

    // ─── Create ─────────────────────────────────────────────────────────────

    /** @test */
    public function admin_can_create_a_project(): void
    {
        $response = $this->actingAs($this->admin())
            ->post('/projects', [
                'name'        => 'New Project',
                'description' => 'A description',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('projects', ['name' => 'New Project']);
    }

    /** @test */
    public function manager_can_create_a_project(): void
    {
        $response = $this->actingAs($this->manager())
            ->post('/projects', [
                'name'        => 'Manager Project',
                'description' => null,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('projects', ['name' => 'Manager Project']);
    }

    /** @test */
    public function regular_user_cannot_create_a_project(): void
    {
        $response = $this->actingAs($this->regularUser())
            ->post('/projects', [
                'name' => 'User Project',
            ]);

        $response->assertForbidden();
    }

    /** @test */
    public function project_creation_requires_name(): void
    {
        $response = $this->actingAs($this->admin())
            ->post('/projects', ['name' => '']);

        $response->assertSessionHasErrors('name');
    }

    // ─── Update ─────────────────────────────────────────────────────────────

    /** @test */
    public function admin_can_update_any_project(): void
    {
        $project = Project::factory()->create(['name' => 'Old Name']);

        $response = $this->actingAs($this->admin())
            ->patch("/projects/{$project->id}", ['name' => 'Updated Name']);

        $response->assertRedirect();
        $this->assertDatabaseHas('projects', ['id' => $project->id, 'name' => 'Updated Name']);
    }

    /** @test */
    public function regular_user_cannot_update_a_project(): void
    {
        $project = Project::factory()->create();

        $response = $this->actingAs($this->regularUser())
            ->patch("/projects/{$project->id}", ['name' => 'Hacked Name']);

        $response->assertForbidden();
    }

    // ─── Delete ─────────────────────────────────────────────────────────────

    /** @test */
    public function admin_can_delete_any_project(): void
    {
        $project = Project::factory()->create();

        $response = $this->actingAs($this->admin())
            ->delete("/projects/{$project->id}");

        $response->assertRedirect();
        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
    }

    /** @test */
    public function manager_can_delete_own_project(): void
    {
        $manager = $this->manager();
        $project = Project::factory()->create(['user_id' => $manager->id]);

        $response = $this->actingAs($manager)
            ->delete("/projects/{$project->id}");

        $response->assertRedirect();
        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
    }

    /** @test */
    public function manager_cannot_delete_another_managers_project(): void
    {
        $otherManager = $this->manager();
        $project      = Project::factory()->create(['user_id' => $otherManager->id]);

        $response = $this->actingAs($this->manager())
            ->delete("/projects/{$project->id}");

        $response->assertForbidden();
        $this->assertDatabaseHas('projects', ['id' => $project->id]);
    }

    /** @test */
    public function regular_user_cannot_delete_a_project(): void
    {
        $project = Project::factory()->create();

        $response = $this->actingAs($this->regularUser())
            ->delete("/projects/{$project->id}");

        $response->assertForbidden();
    }
}
