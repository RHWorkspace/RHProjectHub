<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\RolePermission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class RoleController extends Controller
{
    /** Full list of configurable permissions with metadata. */
    const PERMISSION_LIST = [
        // Halaman
        ['key' => 'access_reporting',    'label' => 'View Reporting',     'category' => 'Halaman',       'description' => 'Akses halaman pelaporan task'],
        ['key' => 'access_workload',     'label' => 'View Workload',      'category' => 'Halaman',       'description' => 'Akses halaman workload tim'],
        ['key' => 'access_manage_tasks', 'label' => 'Manage Tasks Page',  'category' => 'Halaman',       'description' => 'Akses halaman kelola semua task'],
        // Project
        ['key' => 'create_project',      'label' => 'Create Project',     'category' => 'Project',       'description' => 'Membuat dan mengedit project'],
        ['key' => 'delete_project',      'label' => 'Delete Project',     'category' => 'Project',       'description' => 'Menghapus project'],
        // Board
        ['key' => 'create_board',        'label' => 'Create Board',       'category' => 'Board',         'description' => 'Membuat dan mengedit board dalam project'],
        ['key' => 'delete_board',        'label' => 'Delete Board',       'category' => 'Board',         'description' => 'Menghapus board beserta isinya'],
        // Task
        ['key' => 'create_task',           'label' => 'Create Task',           'category' => 'Task', 'description' => 'Membuat task baru dalam board'],
        ['key' => 'edit_task_detail',      'label' => 'Edit Task Detail',      'category' => 'Task', 'description' => 'Mengedit judul, deskripsi, prioritas, dan tanggal task'],
        ['key' => 'edit_task_status',      'label' => 'Edit Task Status',      'category' => 'Task', 'description' => 'Mengubah status task (Todo / In Progress / Done)'],
        ['key' => 'update_task_progress',  'label' => 'Update Task Progress',  'category' => 'Task', 'description' => 'Menggeser slider progress task'],
        ['key' => 'delete_task',           'label' => 'Delete Task',           'category' => 'Task', 'description' => 'Menghapus task'],
        ['key' => 'assign_task',           'label' => 'Assign Task',           'category' => 'Task', 'description' => 'Menugaskan task kepada user lain'],
        // Tim
        ['key' => 'access_manage_teams', 'label' => 'Manage Teams Page',  'category' => 'Tim',           'description' => 'Akses halaman kelola tim (view only)'],
        ['key' => 'manage_team_members', 'label' => 'Manage Team Members','category' => 'Tim',           'description' => 'Menambah, mengubah, atau mengeluarkan anggota tim'],
        // Administrasi
        ['key' => 'access_manage_users', 'label' => 'Manage Users Page',  'category' => 'Administrasi',  'description' => 'Akses halaman kelola pengguna (view only)'],
        ['key' => 'access_manage_roles', 'label' => 'Manage Roles Page',  'category' => 'Administrasi',  'description' => 'Akses halaman kelola role & permissions (view only)'],
    ];

    public function index()
    {
        $user = auth()->user();
        if ($user->role !== 'admin' && !\App\Models\RolePermission::check($user->role, 'access_manage_roles')) {
            abort(403);
        }

        $users = User::select('id', 'name', 'email', 'role', 'created_at')
            ->orderBy('name')
            ->get();

        $rolePermissions = RolePermission::all()
            ->groupBy('role')
            ->map(fn($rows) => $rows->pluck('enabled', 'permission'))
            ->toArray();

        $userCountByRole = $users->groupBy('role')->map->count();

        // Build stats for every known role (zero for roles with no users)
        $allRoleNames = Role::pluck('name');
        $stats = $allRoleNames->mapWithKeys(fn($name) => [$name => $userCountByRole[$name] ?? 0])->toArray();

        $roles = Role::orderByDesc('is_system')->orderBy('display_name')->get()
            ->map(fn($role) => array_merge($role->toArray(), [
                'users_count' => $userCountByRole[$role->name] ?? 0,
            ]));

        return Inertia::render('ManageRoles', [
            'auth'            => ['user' => auth()->user()],
            'users'           => $users,
            'roles'           => $roles,
            'rolePermissions' => $rolePermissions,
            'permissionList'  => self::PERMISSION_LIST,
            'stats'           => $stats,
        ]);
    }

    public function store(Request $request)
    {
        if (auth()->user()->role !== 'admin') {
            abort(403);
        }

        $validated = $request->validate([
            'name'         => 'required|string|max:50|alpha_dash|unique:roles,name',
            'display_name' => 'required|string|max:100',
            'description'  => 'nullable|string|max:255',
            'color'        => 'required|string|max:20',
        ]);

        Role::create($validated);

        return back()->with('success', "Role '{$validated['display_name']}' berhasil dibuat.");
    }

    public function update(Request $request, Role $role)
    {
        if (auth()->user()->role !== 'admin') {
            abort(403);
        }

        $validated = $request->validate([
            'name'         => 'required|string|max:50|alpha_dash|unique:roles,name,' . $role->id,
            'display_name' => 'required|string|max:100',
            'description'  => 'nullable|string|max:255',
            'color'        => 'required|string|max:20',
        ]);

        // Protect system role slug from being changed
        if ($role->is_system) {
            unset($validated['name']);
        }

        $role->update($validated);

        return back()->with('success', "Role '{$role->display_name}' berhasil diperbarui.");
    }

    public function destroy(Role $role)
    {
        if (auth()->user()->role !== 'admin') {
            abort(403);
        }

        if ($role->is_system) {
            abort(422, 'Role sistem tidak dapat dihapus.');
        }

        $role->delete();

        return back()->with('success', "Role '{$role->display_name}' berhasil dihapus.");
    }

    public function updatePermission(Request $request, string $role)
    {
        if (auth()->user()->role !== 'admin') {
            abort(403);
        }

        if ($role === 'admin') {
            abort(422, 'Permissions admin tidak dapat diubah.');
        }

        if (!Role::where('name', $role)->exists()) {
            abort(422, 'Role tidak ditemukan.');
        }

        $validated = $request->validate([
            'permission' => 'required|string',
            'enabled'    => 'required|boolean',
        ]);

        RolePermission::updateOrCreate(
            ['role' => $role, 'permission' => $validated['permission']],
            ['enabled' => $validated['enabled']]
        );

        RolePermission::clearCache();

        return back()->with('success', 'Permission updated.');
    }

    public function updateUserRole(Request $request, User $user)
    {
        if (auth()->user()->role !== 'admin') {
            abort(403);
        }

        if ($user->id === auth()->id()) {
            return back()->withErrors(['role' => 'Tidak bisa mengubah role Anda sendiri.']);
        }

        $validRoles = Role::pluck('name')->toArray();

        $validated = $request->validate([
            'role' => ['required', 'string', Rule::in($validRoles)],
        ]);

        $user->update(['role' => $validated['role']]);

        return back()->with('success', "Role {$user->name} berhasil diubah menjadi {$validated['role']}.");
    }
}
