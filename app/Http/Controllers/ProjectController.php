<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Team;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProjectController extends Controller
{
    public function index()
    {
        return Project::with('boards.tasks')->get();
    }

    public function store(Request $request)
    {
        $role = auth()->user()->role;
        if ($role !== 'admin' && $role !== 'manager') {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'name' => 'required|string',
            'description' => 'nullable|string',
        ]);

        return Project::create([
            'name' => $request->name,
            'description' => $request->description,
            'user_id' => auth()->id(),
        ]);
    }

    public function show(Project $project)
    {
        return $project->load('boards.tasks');
    }

    public function update(Request $request, Project $project)
    {
        $request->validate([
            'name' => 'required|string',
            'description' => 'nullable|string',
        ]);

        $project->update($request->only(['name', 'description']));

        return $project;
    }

    public function destroy(Project $project)
    {
        $project->delete();

        return response()->noContent();
    }

    // Web interface methods
    public function create(Request $request)
    {
        $role = auth()->user()->role;
        if ($role !== 'admin' && $role !== 'manager') {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        Project::create([
            'name' => $validated['name'],
            'description' => $validated['description'],
            'user_id' => auth()->id(),
        ]);

        return redirect()->back()->with('success', 'Project created successfully!');
    }

    public function delete(Project $project)
    {
        $user = auth()->user();

        // Admin can delete anything; manager can only delete their own project
        if ($user->role === 'admin') {
            // allowed
        } elseif ($user->role === 'manager' && $project->user_id === $user->id) {
            // allowed – creator
        } else {
            abort(403, 'Unauthorized');
        }

        $project->delete();

        return redirect()->back()->with('success', 'Project deleted successfully!');
    }

    public function editProject(Request $request, Project $project)
    {
        $user = auth()->user();

        if ($user->role === 'admin') {
            // allowed
        } elseif ($user->role === 'manager') {
            $canEdit = $user->teams()
                ->whereHas('projects', fn($q) => $q->where('projects.id', $project->id))
                ->exists();
            if (!$canEdit) {
                abort(403, 'Unauthorized');
            }
        } else {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $project->update($validated);

        return redirect()->back()->with('success', 'Project updated successfully!');
    }

    public function attachTeam(Request $request, Project $project)
    {
        if (auth()->user()->role !== 'admin') {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validate([
            'team_id' => 'required|exists:teams,id',
        ]);

        $project->teams()->syncWithoutDetaching([$validated['team_id']]);

        return redirect()->back()->with('success', 'Team mapped to project.');
    }

    public function detachTeam(Project $project, Team $team)
    {
        if (auth()->user()->role !== 'admin') {
            abort(403, 'Unauthorized');
        }

        $project->teams()->detach($team->id);

        return redirect()->back()->with('success', 'Team unmapped from project.');
    }

    public function manageProjects()
    {
        $user    = auth()->user();
        $isAdmin = $user->role === 'admin';

        if ($isAdmin) {
            $projects = Project::with(['boards.tasks', 'teams', 'user'])->get();
        } else {
            // Members/managers only see projects their teams are linked to
            $projects = Project::whereHas('teams', fn ($q) =>
                $q->whereHas('users', fn ($q2) => $q2->where('users.id', $user->id))
            )->with(['boards.tasks', 'teams', 'user'])->get();
        }

        $managerProjectIds = [];
        if ($user->role === 'manager') {
            $managerProjectIds = $user->teams()
                ->with('projects:id')
                ->get()
                ->flatMap(fn ($team) => $team->projects->pluck('id'))
                ->unique()
                ->values()
                ->toArray();
        }

        $allTeams = $isAdmin ? Team::all() : collect();

        return Inertia::render('Projects', [
            'auth'              => ['user' => $user],
            'projects'          => $projects,
            'managerProjectIds' => $managerProjectIds,
            'allTeams'          => $allTeams,
        ]);
    }

    public function showProject(Project $project)
    {
        $user = auth()->user();

        $project->load([
            'boards.tasks.assignedUser',
            'teams.users',
            'user',
        ]);

        $allTasks = $project->boards->flatMap(fn($b) => $b->tasks);

        $managerProjectIds = [];
        if ($user->role === 'manager') {
            $managerProjectIds = $user->teams()
                ->with('projects:id')
                ->get()
                ->flatMap(fn($team) => $team->projects->pluck('id'))
                ->unique()
                ->values()
                ->toArray();
        }

        return Inertia::render('ProjectDetail', [
            'auth'              => ['user' => $user],
            'project'           => $project,
            'managerProjectIds' => $managerProjectIds,
            'stats' => [
                'boards'      => $project->boards->count(),
                'tasks'       => $allTasks->count(),
                'todo'        => $allTasks->where('status', 'todo')->count(),
                'in_progress' => $allTasks->where('status', 'in_progress')->count(),
                'done'        => $allTasks->where('status', 'done')->count(),
                'overdue'     => $allTasks->filter(fn($t) =>
                    $t->due_date && $t->status === 'in_progress' &&
                    \Carbon\Carbon::parse($t->due_date)->isPast()
                )->count(),
            ],
        ]);
    }
}
