<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\Task;
use App\Models\TaskActivityLog;
use App\Models\Team;
use App\Models\User;
use App\Notifications\TaskAssigned;
use App\Notifications\TaskStatusChanged;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class BoardController extends Controller
{
    public function create(Request $request, $projectId)
    {
        $user = auth()->user();

        if ($user->role === 'admin') {
            // allowed
        } elseif ($user->role === 'manager') {
            $project = \App\Models\Project::findOrFail($projectId);
            $inTeam  = $user->teams()
                ->whereHas('projects', fn($q) => $q->where('projects.id', $projectId))
                ->exists();
            if (!$inTeam && $project->user_id !== $user->id) {
                abort(403, 'Unauthorized');
            }
        } else {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        Board::create([
            'name'        => $validated['name'],
            'description' => $validated['description'] ?? null,
            'project_id'  => $projectId,
            'user_id'     => $user->id,
        ]);

        return redirect()->back()->with('success', 'Board created successfully!');
    }

    public function editBoard(Request $request, Board $board)
    {
        $user = auth()->user();

        if ($user->role === 'admin') {
            // allowed
        } elseif ($user->role === 'manager') {
            $canEdit = $user->teams()
                ->whereHas('projects', fn($q) => $q->where('projects.id', $board->project_id))
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

        $board->update($validated);

        return redirect()->back()->with('success', 'Board updated successfully!');
    }

    public function destroyBoard(Board $board)
    {
        $user = auth()->user();

        // Admin can delete anything; manager can only delete their own board
        if ($user->role === 'admin') {
            // allowed
        } elseif ($user->role === 'manager' && $board->user_id === $user->id) {
            // allowed – creator
        } else {
            abort(403, 'Unauthorized');
        }

        $board->tasks()->delete();
        $board->delete();

        return redirect()->back()->with('success', 'Board deleted successfully!');
    }

    public function show(Board $board)
    {
        $user    = auth()->user();
        $isAdmin = $user->role === 'admin';

        if ($isAdmin) {
            $usersQuery = User::select('id', 'name', 'email');
        } else {
            $projectTeamIds = Team::whereHas('projects', fn($q) => $q->where('projects.id', $board->project_id))
                ->pluck('id');
            $usersQuery = User::select('id', 'name', 'email')
                ->whereHas('teams', fn($q) => $q->whereIn('teams.id', $projectTeamIds));
        }

        return Inertia::render('Board', [
            'auth' => [
                'user' => $user,
            ],
            'board' => $board->load('project'),
            'tasks' => $board->tasks()->whereNull('parent_id')->with(['assignedUser', 'comments.user', 'activityLogs.user', 'subtasks.assignedUser'])->get(),
            'users' => $usersQuery->get(),
        ]);
    }

    public function storeTask(Request $request, Board $board)
    {
        $authUser = auth()->user();
        $isAdmin  = $authUser->role === 'admin';

        if (!in_array($authUser->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        if ($isAdmin) {
            $assignableUserIds = User::pluck('id');
        } else {
            $projectTeamIds    = Team::whereHas('projects', fn($q) => $q->where('projects.id', $board->project_id))->pluck('id');
            $assignableUserIds = User::whereHas('teams', fn($q) => $q->whereIn('teams.id', $projectTeamIds))->pluck('id');
        }

        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'status'      => 'required|in:todo,in_progress,done',
            'priority'    => 'required|in:low,medium,high,critical',
            'progress'    => 'required|integer|min:0|max:100',
            'assigned_to' => ['nullable', Rule::in($assignableUserIds)],
            'due_date'    => 'nullable|date',
            'start_date'  => 'nullable|date',
        ]);

        $task = $board->tasks()->create([
            'title'       => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status'      => $validated['status'],
            'priority'    => $validated['priority'],
            'progress'    => $validated['progress'],
            'assigned_to' => $validated['assigned_to'] ?? null,
            'due_date'    => $validated['due_date'] ?? null,
            'start_date'  => $validated['start_date'] ?? null,
        ]);

        TaskActivityLog::log($task->id, $authUser->id, 'created', null, [
            'title'    => $task->title,
            'status'   => $task->status,
            'priority' => $task->priority,
        ]);

        // Notify the assigned user (skip self-notifications)
        if ($task->assigned_to && $task->assigned_to !== $authUser->id) {
            $assignee = User::find($task->assigned_to);
            $assignee?->notify(new TaskAssigned($task->load('board'), $authUser->name));
        }

        return redirect()->back()->with('success', 'Task created successfully!');
    }

    public function updateTaskStatus(Request $request, Task $task)
    {
        $authUser = auth()->user();
        $isOwner  = $authUser->id === $task->assigned_to;
        if (!$isOwner && !in_array($authUser->role, ['admin', 'manager'])) {
            abort(403);
        }
        if (!in_array($authUser->role, ['admin', 'manager']) && !\App\Models\RolePermission::check($authUser->role, 'edit_task_status')) {
            abort(403, 'Anda tidak memiliki izin mengubah status task.');
        }

        $validated = $request->validate([
            'status' => 'required|in:todo,in_progress,done',
        ]);

        $oldStatus = $task->status;
        $task->update(['status' => $validated['status']]);

        TaskActivityLog::log($task->id, auth()->id(), 'status_changed',
            ['status' => $oldStatus],
            ['status' => $validated['status']]
        );

        // Notify assigned user if they didn't make the change themselves
        if ($task->assigned_to && $task->assigned_to !== $authUser->id && $oldStatus !== $validated['status']) {
            $assignee = User::find($task->assigned_to);
            $assignee?->notify(new TaskStatusChanged($task->load('board'), $oldStatus, $validated['status'], $authUser->name));
        }

        return redirect()->back()->with('success', 'Task status updated!');
    }

    public function updateTaskAssignment(Request $request, Task $task)
    {
        if (!in_array(auth()->user()->role, ['admin', 'manager'])) {
            abort(403);
        }

        $validated = $request->validate([
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $oldAssignee = $task->assigned_to;
        $task->update(['assigned_to' => $validated['assigned_to']]);

        TaskActivityLog::log($task->id, auth()->id(), 'assigned',
            ['assigned_to' => $oldAssignee],
            ['assigned_to' => $validated['assigned_to']]
        );

        // Notify new assignee (if they changed and it's not a self-assignment)
        $newAssignee = $validated['assigned_to'];
        if ($newAssignee && $newAssignee !== $oldAssignee && $newAssignee !== auth()->id()) {
            $assigneeUser = User::find($newAssignee);
            $assigneeUser?->notify(new TaskAssigned($task->load('board'), auth()->user()->name));
        }

        return redirect()->back()->with('success', 'Task assignment updated!');
    }

    public function updateTask(Request $request, Task $task)
    {
        $authUser = auth()->user();
        $isOwner  = $authUser->id === $task->assigned_to;
        if (!$isOwner && !in_array($authUser->role, ['admin', 'manager'])) {
            abort(403);
        }
        if (!in_array($authUser->role, ['admin', 'manager']) && !\App\Models\RolePermission::check($authUser->role, 'edit_task_detail')) {
            abort(403, 'Anda tidak memiliki izin mengedit detail task.');
        }

        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'status'      => 'required|in:todo,in_progress,done',
            'priority'    => 'required|in:low,medium,high,critical',
            'progress'    => 'required|integer|min:0|max:100',
            'due_date'    => 'nullable|date',
            'start_date'  => 'nullable|date',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $update = [
            'title'       => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status'      => $validated['status'],
            'priority'    => $validated['priority'],
            'progress'    => $validated['progress'],
            'due_date'    => $validated['due_date'] ?? null,
            'start_date'  => $validated['start_date'] ?? null,
        ];

        // Only admin/manager can change assignment via general update
        if (in_array($authUser->role, ['admin', 'manager'])) {
            $update['assigned_to'] = $validated['assigned_to'] ?? null;
        }

        $changes = [];
        foreach (['title', 'description', 'status', 'priority', 'progress', 'due_date', 'start_date', 'assigned_to'] as $field) {
            if (array_key_exists($field, $update) && (string)$task->{$field} !== (string)($update[$field] ?? '')) {
                $changes[$field] = ['old' => $task->{$field}, 'new' => $update[$field]];
            }
        }

        $task->update($update);

        if (!empty($changes)) {
            TaskActivityLog::log($task->id, $authUser->id, 'updated',
                array_map(fn($c) => $c['old'], $changes),
                array_map(fn($c) => $c['new'], $changes)
            );
        }

        // Fire notifications based on changes
        $task->refresh()->load('board');
        if (isset($changes['assigned_to'])) {
            $newAssignee = $changes['assigned_to']['new'];
            if ($newAssignee && $newAssignee !== $authUser->id) {
                $assigneeUser = User::find($newAssignee);
                $assigneeUser?->notify(new TaskAssigned($task, $authUser->name));
            }
        }
        if (isset($changes['status']) && $task->assigned_to && $task->assigned_to !== $authUser->id) {
            $assignee = User::find($task->assigned_to);
            $assignee?->notify(new TaskStatusChanged($task, $changes['status']['old'], $changes['status']['new'], $authUser->name));
        }

        return redirect()->back()->with('success', 'Task updated successfully!');
    }

    public function updateProgress(Request $request, Task $task)
    {
        $authUser = auth()->user();
        $isOwner  = $authUser->id === $task->assigned_to;
        $canUpdate = in_array($authUser->role, ['admin', 'manager'])
            || \App\Models\RolePermission::check($authUser->role, 'update_task_progress')
            || $isOwner; // assigned user can always update their own task progress
        if (!$canUpdate) {
            abort(403, 'Anda tidak memiliki izin mengupdate progress task.');
        }

        $validated = $request->validate([
            'progress' => 'required|integer|min:0|max:100',
        ]);

        $progress = $validated['progress'];

        if ($progress === 100) {
            $status = 'done';
        } elseif ($progress > 0) {
            $status = 'in_progress';
        } else {
            $status = 'todo';
        }

        $oldProgress = $task->progress;
        $oldStatus   = $task->status;
        $task->update(['progress' => $progress, 'status' => $status]);

        TaskActivityLog::log($task->id, $authUser->id, 'progress_updated',
            ['progress' => $oldProgress, 'status' => $oldStatus],
            ['progress' => $progress, 'status' => $status]
        );

        return redirect()->back()->with('success', 'Progress updated!');
    }

    public function destroyTask(Task $task)
    {
        if (!in_array(auth()->user()->role, ['admin', 'manager'])) {
            abort(403);
        }

        $task->delete();

        return redirect()->back()->with('success', 'Task deleted successfully!');
    }
}

