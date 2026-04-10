<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function showLogin()
    {
        return Inertia::render('Login');
    }

    public function showRegister()
    {
        return Inertia::render('Register');
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'user',
        ]);

        Auth::login($user);

        return redirect('/dashboard');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if (Auth::attempt($credentials, $request->boolean('remember'))) {
            $request->session()->regenerate();
            return redirect('/dashboard');
        }

        return back()->withErrors([
            'email' => 'The provided credentials do not match our records.',
        ])->onlyInput('email');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    public function myTasks()
    {
        $user = auth()->user()->load([
            'assignedTasks' => function ($q) {
                $q->whereNull('parent_id')->with([
                    'board.project',
                    'assignedUser:id,name,email,role',
                    'comments.user',
                    'activityLogs.user',
                ]);
            },
        ]);

        $data = [
            'auth' => ['user' => $user],
        ];

        if ($user->role === 'admin') {
            $data['tasks'] = Task::whereNull('assigned_to')->whereNull('parent_id')->with([
                'board.project',
                'assignedUser:id,name,email,role',
                'comments.user',
                'activityLogs.user',
            ])->get();
            $data['pageType'] = 'unassigned';
        } else {
            $data['tasks'] = $user->assignedTasks;
            $data['pageType'] = 'assigned';
        }

        return Inertia::render('MyTasks', array_merge($data, [
            'taskPermissions' => [
                'canEditDetail'     => in_array($user->role, ['admin', 'manager']) || \App\Models\RolePermission::check($user->role, 'edit_task_detail'),
                'canEditStatus'     => in_array($user->role, ['admin', 'manager']) || \App\Models\RolePermission::check($user->role, 'edit_task_status'),
                'canUpdateProgress' => in_array($user->role, ['admin', 'manager']) || \App\Models\RolePermission::check($user->role, 'update_task_progress'),
            ],
        ]));
    }

    public function dashboard()
    {
        $user    = auth()->user()->load(['assignedTasks.board.project']);
        $isAdmin = $user->role === 'admin';
        $today   = today();

        // Returns a fresh query builder scoped to the current user (admins see all)
        $scope = fn () => $isAdmin
            ? Task::whereNull('parent_id')
            : Task::whereNull('parent_id')->where('assigned_to', $user->id);

        $withRel = ['board:id,name,project_id', 'board.project:id,name', 'assignedUser:id,name'];

        $tasksDueToday = $scope()
            ->whereDate('due_date', $today)
            ->where('status', '!=', 'done')
            ->with($withRel)
            ->orderByRaw("FIELD(priority,'critical','high','medium','low')")
            ->limit(10)
            ->get();

        $myOverdueTasks = $scope()
            ->whereDate('due_date', '<', $today)
            ->where('status', '!=', 'done')
            ->with($withRel)
            ->orderBy('due_date')
            ->limit(10)
            ->get();

        $recentlyUpdated = $scope()
            ->with($withRel)
            ->orderByDesc('updated_at')
            ->limit(8)
            ->get();

        // Weekly trend — last 7 days (today is index 0)
        $weeklyTrend = collect(range(6, 0))->map(function ($i) use ($scope) {
            $date = now()->subDays($i)->toDateString();
            return [
                'date'      => $date,
                'label'     => now()->subDays($i)->format('D'),
                'created'   => $scope()->whereDate('created_at', $date)->count(),
                'completed' => $scope()->whereDate('updated_at',  $date)->where('status', 'done')->count(),
            ];
        })->values();

        // Members only see projects whose teams they belong to
        $projects = $isAdmin
            ? Project::with(['boards', 'teams'])->get()
            : Project::whereHas('teams', fn ($q) =>
                $q->whereHas('users', fn ($q2) => $q2->where('users.id', $user->id))
              )->with(['boards', 'teams'])->get();

        $data = [
            'auth'            => ['user' => $user],
            'projects'        => $projects,
            'totalTeams'      => Team::count(),
            'totalUsers'      => User::count(),
            'totalTasks'      => Task::count(),
            'tasksDueToday'   => $tasksDueToday,
            'myOverdueTasks'  => $myOverdueTasks,
            'recentlyUpdated' => $recentlyUpdated,
            'weeklyTrend'     => $weeklyTrend,
        ];

        if ($isAdmin) {
            $data['unassignedTasks'] = Task::whereNull('parent_id')->whereNull('assigned_to')
                ->with(['board.project'])
                ->get();
        }

        if ($user->role === 'manager') {
            $data['managerProjectIds'] = $user->teams()
                ->with('projects:id')
                ->get()
                ->flatMap(fn ($team) => $team->projects->pluck('id'))
                ->unique()
                ->values()
                ->toArray();
        }

        return Inertia::render('Dashboard', $data);
    }
}
