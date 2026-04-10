<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamTest extends TestCase
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
    public function admin_can_create_a_team(): void
    {
        $response = $this->actingAs($this->admin())
            ->post('/teams', [
                'name'        => 'Alpha Team',
                'description' => 'Best team',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('teams', ['name' => 'Alpha Team']);
    }

    /** @test */
    public function manager_cannot_create_a_team(): void
    {
        $response = $this->actingAs($this->manager())
            ->post('/teams', ['name' => 'Manager Team']);

        $response->assertForbidden();
    }

    /** @test */
    public function regular_user_cannot_create_a_team(): void
    {
        $response = $this->actingAs($this->regularUser())
            ->post('/teams', ['name' => 'User Team']);

        $response->assertForbidden();
    }

    /** @test */
    public function team_creation_requires_name(): void
    {
        $response = $this->actingAs($this->admin())
            ->post('/teams', ['name' => '']);

        $response->assertSessionHasErrors('name');
    }

    // ─── Update ─────────────────────────────────────────────────────────────

    /** @test */
    public function admin_can_update_a_team(): void
    {
        $team = Team::factory()->create(['name' => 'Old Team']);

        $response = $this->actingAs($this->admin())
            ->patch("/teams/{$team->id}", ['name' => 'New Team']);

        $response->assertRedirect();
        $this->assertDatabaseHas('teams', ['id' => $team->id, 'name' => 'New Team']);
    }

    /** @test */
    public function regular_user_cannot_update_a_team(): void
    {
        $team = Team::factory()->create();

        $response = $this->actingAs($this->regularUser())
            ->patch("/teams/{$team->id}", ['name' => 'Hacked']);

        $response->assertForbidden();
    }

    // ─── Delete ─────────────────────────────────────────────────────────────

    /** @test */
    public function admin_can_delete_a_team(): void
    {
        $team = Team::factory()->create();

        $response = $this->actingAs($this->admin())
            ->delete("/teams/{$team->id}");

        $response->assertRedirect();
        $this->assertDatabaseMissing('teams', ['id' => $team->id]);
    }

    /** @test */
    public function regular_user_cannot_delete_a_team(): void
    {
        $team = Team::factory()->create();

        $response = $this->actingAs($this->regularUser())
            ->delete("/teams/{$team->id}");

        $response->assertForbidden();
        $this->assertDatabaseHas('teams', ['id' => $team->id]);
    }

    // ─── Members ────────────────────────────────────────────────────────────

    /** @test */
    public function admin_can_add_member_to_team(): void
    {
        $admin  = $this->admin();
        $team   = Team::factory()->create();
        $member = User::factory()->create();

        $response = $this->actingAs($admin)
            ->post("/teams/{$team->id}/members", [
                'user_id' => $member->id,
                'role'    => 'Developer',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('team_user', [
            'team_id' => $team->id,
            'user_id' => $member->id,
        ]);
    }

    /** @test */
    public function admin_can_remove_member_from_team(): void
    {
        $admin  = $this->admin();
        $team   = Team::factory()->create();
        $member = User::factory()->create();
        $team->users()->attach($member->id, ['role' => 'member']);

        $response = $this->actingAs($admin)
            ->delete("/teams/{$team->id}/members/{$member->id}");

        $response->assertRedirect();
        $this->assertDatabaseMissing('team_user', [
            'team_id' => $team->id,
            'user_id' => $member->id,
        ]);
    }
}
