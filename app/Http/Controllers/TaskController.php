<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\Project;
use App\Models\RolePermission;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use App\Notifications\TaskAssigned;
use App\Notifications\TaskStatusChanged;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class TaskController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        if (! RolePermission::check($user->role, 'access_manage_tasks')) {
            abort(403, 'Akses halaman Manage Tasks tidak diizinkan.');
        }

        $tasksQuery = Task::whereNull('parent_id')->with([
            'board.project.teams',
            'assignedUser:id,name,email,role',
            'comments.user:id,name',
            'activityLogs.user:id,name',
            'subtasks.assignedUser:id,name',
        ]);

        if ($user->role === 'admin') {
            // admin sees all tasks
        } elseif ($user->role === 'manager') {
            // manager sees tasks belonging to boards in projects mapped to their teams
            $projectIds = $user->teams()
                ->with('projects:id')
                ->get()
                ->flatMap(fn($t) => $t->projects->pluck('id'))
                ->unique()
                ->values();

            $tasksQuery->whereHas('board', fn($q) => $q->whereIn('project_id', $projectIds));
        } else {
            // regular user sees only their assigned tasks
            $tasksQuery->where('assigned_to', $user->id);
        }

        $tasks = $tasksQuery->orderByDesc('created_at')->get();

        $isAdmin = $user->role === 'admin';

        if ($isAdmin) {
            $accessibleProjectIds = null; // unrestricted
            $accessibleTeamIds    = null;
        } else {
            $userTeams = $user->teams()->with('projects:id')->get();
            $accessibleTeamIds    = $userTeams->pluck('id');
            $accessibleProjectIds = $userTeams
                ->flatMap(fn($t) => $t->projects->pluck('id'))
                ->unique()->values();
        }

        $projectQuery = Project::select('id', 'name')->orderBy('name');
        if (!$isAdmin) {
            $projectQuery->whereIn('id', $accessibleProjectIds);
        }

        $boardQuery = Board::select('id', 'name', 'project_id')->orderBy('name');
        if (!$isAdmin) {
            $boardQuery->whereIn('project_id', $accessibleProjectIds);
        }

        if ($isAdmin) {
            $assignableUsers = User::select('id', 'name', 'email')->orderBy('name')->get();
        } else {
            $assignableUsers = User::select('id', 'name', 'email')
                ->whereHas('teams', fn($q) => $q->whereIn('teams.id', $accessibleTeamIds))
                ->orderBy('name')->get();
        }

        return Inertia::render('ManageTask', [
            'auth'            => ['user' => $user],
            'tasks'           => $tasks,
            'projects'        => $projectQuery->get(),
            'boards'          => $boardQuery->get(),
            'users'           => $assignableUsers,
            'taskPermissions' => [
                'canCreate'        => in_array($user->role, ['admin', 'manager']) || RolePermission::check($user->role, 'create_task'),
                'canEditDetail'    => in_array($user->role, ['admin', 'manager']) || RolePermission::check($user->role, 'edit_task_detail'),
                'canEditStatus'    => in_array($user->role, ['admin', 'manager']) || RolePermission::check($user->role, 'edit_task_status'),
                'canUpdateProgress'=> in_array($user->role, ['admin', 'manager']) || RolePermission::check($user->role, 'update_task_progress'),
                'canDelete'        => in_array($user->role, ['admin', 'manager']) || RolePermission::check($user->role, 'delete_task'),
                'canAssign'        => in_array($user->role, ['admin', 'manager']) || RolePermission::check($user->role, 'assign_task'),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        if (! RolePermission::check($user->role, 'create_task')) {
            abort(403, 'Unauthorized');
        }

        // Ensure the user can only create tasks in boards they have access to
        if ($user->role !== 'admin') {
            $accessibleProjectIds = $user->teams()->with('projects:id')->get()
                ->flatMap(fn($t) => $t->projects->pluck('id'))
                ->unique()->values();

            $boardAccessible = Board::whereIn('project_id', $accessibleProjectIds)
                ->pluck('id');

            $request->validate([
                'board_id' => ['required', Rule::in($boardAccessible)],
            ]);
        }

        $validated = $request->validate([
            'board_id'    => 'required|exists:boards,id',
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'status'      => 'required|in:todo,in_progress,done',
            'priority'    => 'required|in:low,medium,high,critical',
            'progress'    => 'required|integer|min:0|max:100',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date'    => 'nullable|date',
            'start_date'  => 'nullable|date',
        ]);

        $newTask = Task::create($validated);

        // Notify new assignee (skip self-assignment)
        if (!empty($validated['assigned_to']) && $validated['assigned_to'] !== $user->id) {
            $assignee = User::find($validated['assigned_to']);
            $assignee?->notify(new TaskAssigned($newTask->load('board'), $user->name));
        }

        return redirect()->back()->with('success', 'Task created.');
    }

    public function update(Request $request, Task $task)
    {
        $user    = auth()->user();
        $isOwner = $user->id === $task->assigned_to;

        if (!$isOwner && !in_array($user->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }
        if (!in_array($user->role, ['admin', 'manager']) && !RolePermission::check($user->role, 'edit_task_detail')) {
            abort(403, 'Anda tidak memiliki izin mengedit detail task.');
        }

        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'status'      => 'required|in:todo,in_progress,done',
            'priority'    => 'required|in:low,medium,high,critical',
            'progress'    => 'required|integer|min:0|max:100',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date'    => 'nullable|date',
            'start_date'  => 'nullable|date',
        ]);

        $oldAssignee = $task->assigned_to;
        $oldStatus   = $task->status;

        $task->update($validated);
        $task->refresh()->load('board');

        // Notify newly assigned user (if assignment changed and not self)
        if (($validated['assigned_to'] ?? null) !== $oldAssignee && !empty($validated['assigned_to']) && $validated['assigned_to'] !== $user->id) {
            $assignee = User::find($validated['assigned_to']);
            $assignee?->notify(new TaskAssigned($task, $user->name));
        }
        // Notify assigned user if status changed (and they didn't make the change)
        if ($validated['status'] !== $oldStatus && $task->assigned_to && $task->assigned_to !== $user->id) {
            $assignee = User::find($task->assigned_to);
            $assignee?->notify(new TaskStatusChanged($task, $oldStatus, $validated['status'], $user->name));
        }

        return redirect()->back()->with('success', 'Task updated.');
    }

    public function destroy(Task $task)
    {
        if (! RolePermission::check(auth()->user()->role, 'delete_task')) {
            abort(403, 'Unauthorized');
        }

        $task->delete();

        return redirect()->back()->with('success', 'Task deleted.');
    }
}
