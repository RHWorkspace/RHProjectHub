<?php

namespace App\Http\Middleware;

use App\Models\Role;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user(),
            ],
            'flash' => [
                'success' => session('success'),
                'error'   => session('error'),
            ],
            'userPermissions' => function () use ($request) {
                if (! $request->user()) {
                    return [];
                }
                return \App\Models\RolePermission::enabledForRole($request->user()->role);
            },
            // All roles — used by AppLayout for badge display, etc.
            'allRoles' => function () use ($request) {
                if (! $request->user()) {
                    return [];
                }
                return Role::select('name', 'display_name', 'color', 'is_system')
                    ->orderByDesc('is_system')
                    ->orderBy('display_name')
                    ->get();
            },
            // Unread notification count — shown as bell badge in AppLayout
            'unreadNotifCount' => function () use ($request) {
                if (! $request->user()) {
                    return 0;
                }
                return $request->user()->unreadNotifications()->count();
            },
        ]);
    }
}
