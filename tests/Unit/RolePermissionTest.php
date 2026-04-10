<?php

namespace Tests\Unit;

use App\Models\RolePermission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RolePermissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RolePermission::clearCache();
    }

    /** @test */
    public function admin_always_has_every_permission(): void
    {
        $this->assertTrue(RolePermission::check('admin', 'create_task'));
        $this->assertTrue(RolePermission::check('admin', 'delete_task'));
        $this->assertTrue(RolePermission::check('admin', 'any_random_permission'));
    }

    /** @test */
    public function role_without_db_entry_returns_false(): void
    {
        $this->assertFalse(RolePermission::check('user', 'create_task'));
    }

    /** @test */
    public function enabled_permission_returns_true(): void
    {
        RolePermission::updateOrCreate(
            ['role' => 'user', 'permission' => 'create_task'],
            ['enabled' => true]
        );
        RolePermission::clearCache();

        $this->assertTrue(RolePermission::check('user', 'create_task'));
    }

    /** @test */
    public function disabled_permission_returns_false(): void
    {
        RolePermission::updateOrCreate(
            ['role' => 'user', 'permission' => 'delete_task'],
            ['enabled' => false]
        );
        RolePermission::clearCache();

        $this->assertFalse(RolePermission::check('user', 'delete_task'));
    }

    /** @test */
    public function enabled_for_role_returns_all_enabled_keys(): void
    {
        RolePermission::updateOrCreate(['role' => 'manager', 'permission' => 'create_task'], ['enabled' => true]);
        RolePermission::updateOrCreate(['role' => 'manager', 'permission' => 'delete_task'], ['enabled' => false]);
        RolePermission::updateOrCreate(['role' => 'manager', 'permission' => 'assign_task'], ['enabled' => true]);
        RolePermission::clearCache();

        $enabled = RolePermission::enabledForRole('manager');

        $this->assertContains('create_task', $enabled);
        $this->assertContains('assign_task', $enabled);
        $this->assertNotContains('delete_task', $enabled);
    }

    /** @test */
    public function admin_enabled_for_role_returns_wildcard(): void
    {
        $result = RolePermission::enabledForRole('admin');

        $this->assertEquals(['*'], $result);
    }
}
