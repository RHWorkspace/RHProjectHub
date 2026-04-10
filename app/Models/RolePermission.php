<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RolePermission extends Model
{
    protected $fillable = ['role', 'permission', 'enabled'];

    protected $casts = ['enabled' => 'boolean'];

    /** In-request static cache: ['manager' => ['perm' => true, ...], 'user' => [...]] */
    private static ?array $cache = null;

    /**
     * Check whether a role has a given permission.
     * Admin always returns true regardless of the DB.
     */
    public static function check(string $role, string $permission): bool
    {
        if ($role === 'admin') {
            return true;
        }

        if (static::$cache === null) {
            static::$cache = static::all()
                ->groupBy('role')
                ->map(fn($rows) => $rows->pluck('enabled', 'permission')->toArray())
                ->toArray();
        }

        return (bool) (static::$cache[$role][$permission] ?? false);
    }

    /** Return all enabled permission keys for a given role (used for Inertia sharing). */
    public static function enabledForRole(string $role): array
    {
        if ($role === 'admin') {
            return ['*'];
        }

        if (static::$cache === null) {
            static::$cache = static::all()
                ->groupBy('role')
                ->map(fn($rows) => $rows->pluck('enabled', 'permission')->toArray())
                ->toArray();
        }

        return array_keys(array_filter(static::$cache[$role] ?? []));
    }

    public static function clearCache(): void
    {
        static::$cache = null;
    }
}
