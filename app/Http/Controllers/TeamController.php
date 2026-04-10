<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Role;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class TeamController extends Controller
{
    public function index()
    {
        $this->authorizeRead('access_manage_teams');

        return Inertia::render('Teams', [
            'teams'     => Team::with(['users', 'projects'])->get(),
            'users'     => User::select('id', 'name', 'email', 'role')->get(),
            'projects'  => Project::select('id', 'name')->get(),
            'teamRoles' => Role::orderBy('display_name')->get(['name', 'display_name', 'color']),
        ]);
    }

    public function show(Team $team)
    {
        $this->authorizeRead('access_manage_teams');

        $team->load([
            'users',
            'projects.boards.tasks.assignedUser',
        ]);

        // Flatten all tasks across team projects
        $allTasks = collect();
        foreach ($team->projects as $project) {
            foreach ($project->boards as $board) {
                foreach ($board->tasks as $task) {
                    $task->board_name = $board->name;
                    $task->project_name = $project->name;
                    $task->project_id = $project->id;
                    $allTasks->push($task);
                }
            }
        }

        // Per-member task stats
        $memberTaskStats = [];
        foreach ($team->users as $user) {
            $assigned = $allTasks->where('assigned_to', $user->id);
            $memberTaskStats[$user->id] = [
                'total'       => $assigned->count(),
                'todo'        => $assigned->where('status', 'todo')->count(),
                'in_progress' => $assigned->where('status', 'in_progress')->count(),
                'done'        => $assigned->where('status', 'done')->count(),
            ];
        }

        return Inertia::render('TeamDetail', [
            'team'            => $team,
            'allTasks'        => $allTasks->values(),
            'memberTaskStats' => $memberTaskStats,
            'taskSummary'     => [
                'total'       => $allTasks->count(),
                'todo'        => $allTasks->where('status', 'todo')->count(),
                'in_progress' => $allTasks->where('status', 'in_progress')->count(),
                'done'        => $allTasks->where('status', 'done')->count(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        Team::create($validated);

        return redirect()->back()->with('success', 'Team created successfully.');
    }

    public function update(Request $request, Team $team)
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $team->update($validated);

        return redirect()->back()->with('success', 'Team updated successfully.');
    }

    public function destroy(Team $team)
    {
        $this->authorizeAdmin();

        $team->delete();

        return redirect()->back()->with('success', 'Team deleted successfully.');
    }

    public function myTeam()
    {
        /** @var User $user */
        $user = auth()->user();

        $teams = $user->teams()->with(['users', 'projects'])->get();

        return Inertia::render('MyTeam', [
            'teams' => $teams,
        ]);
    }

    public function addMember(Request $request, Team $team)
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role'    => ['required', 'string', Rule::in(Role::pluck('display_name')->toArray())],
        ]);

        $team->users()->syncWithoutDetaching([
            $validated['user_id'] => ['role' => $validated['role']],
        ]);

        return redirect()->back()->with('success', 'Member added to team.');
    }

    public function updateMember(Request $request, Team $team, User $user)
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'role' => ['required', 'string', Rule::in(Role::pluck('display_name')->toArray())],
        ]);

        $team->users()->updateExistingPivot($user->id, ['role' => $validated['role']]);

        return redirect()->back()->with('success', 'Team member role updated.');
    }

    public function removeMember(Team $team, User $user)
    {
        $this->authorizeAdmin();

        $team->users()->detach($user->id);

        return redirect()->back()->with('success', 'Member removed from team.');
    }

    protected function authorizeRead(string $permission): void
    {
        $user = auth()->user();
        if ($user->role !== 'admin' && !\App\Models\RolePermission::check($user->role, $permission)) {
            abort(403);
        }
    }

    protected function authorizeAdmin()
    {
        if (auth()->user()->role !== 'admin') {
            abort(403);
        }
    }
}
