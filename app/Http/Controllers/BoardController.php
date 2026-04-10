<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\Label;
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
            'board'  => $board->load('project'),
            'tasks'  => $board->tasks()->whereNull('parent_id')->with(['assignees', 'labels', 'comments.user', 'activityLogs.user', 'subtasks.assignedUser'])->get(),
            'users'  => $usersQuery->get(),
            'labels' => Label::where('project_id', $board->project_id)->orderBy('name')->get(),
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
            'title'          => 'required|string|max:255',
            'description'    => 'nullable|string',
            'status'         => 'required|in:todo,in_progress,done',
            'priority'       => 'required|in:low,medium,high,critical',
            'progress'       => 'required|integer|min:0|max:100',
            'assignee_ids'   => ['nullable', 'array'],
            'assignee_ids.*' => ['integer', Rule::in($assignableUserIds)],
            'due_date'       => 'nullable|date',
            'start_date'     => 'nullable|date',
            'label_ids'      => 'array',
            'label_ids.*'    => 'integer|exists:labels,id',
        ]);

        $task = $board->tasks()->create([
            'title'       => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status'      => $validated['status'],
            'priority'    => $validated['priority'],
            'progress'    => $validated['progress'],
            'due_date'    => $validated['due_date'] ?? null,
            'start_date'  => $validated['start_date'] ?? null,
        ]);

        $assigneeIds = $validated['assignee_ids'] ?? [];
        $task->assignees()->sync($assigneeIds);

        if (!empty($validated['label_ids'])) {
            $task->labels()->sync($validated['label_ids']);
        }

        TaskActivityLog::log($task->id, $authUser->id, 'created', null, [
            'title'    => $task->title,
            'status'   => $task->status,
            'priority' => $task->priority,
        ]);

        // Notify each assigned user (skip self-notifications)
        $task->load('board');
        foreach ($assigneeIds as $userId) {
            if ($userId !== $authUser->id) {
                $assignee = User::find($userId);
                $assignee?->notify(new TaskAssigned($task, $authUser->name));
            }
        }

        return redirect()->back()->with('success', 'Task created successfully!');
    }

    public function updateTaskStatus(Request $request, Task $task)
    {
        $authUser = auth()->user();
        $isOwner  = $task->assignees()->where('user_id', $authUser->id)->exists();
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

        // Notify all assignees who didn't make the change themselves
        if ($oldStatus !== $validated['status']) {
            $task->load('board');
            $task->assignees()->where('user_id', '!=', $authUser->id)->get()->each(
                fn ($assignee) => $assignee->notify(new TaskStatusChanged($task, $oldStatus, $validated['status'], $authUser->name))
            );
        }

        return redirect()->back()->with('success', 'Task status updated!');
    }

    public function updateTaskAssignment(Request $request, Task $task)
    {
        $authUser = auth()->user();
        if (!in_array($authUser->role, ['admin', 'manager'])) {
            abort(403);
        }

        $validated = $request->validate([
            'assignee_ids'   => 'nullable|array',
            'assignee_ids.*' => 'integer|exists:users,id',
        ]);

        $oldAssigneeIds = $task->assignees()->pluck('users.id')->toArray();
        $newAssigneeIds = $validated['assignee_ids'] ?? [];

        $task->assignees()->sync($newAssigneeIds);

        TaskActivityLog::log($task->id, $authUser->id, 'assigned',
            ['assignee_ids' => $oldAssigneeIds],
            ['assignee_ids' => $newAssigneeIds]
        );

        // Notify newly added assignees
        $addedIds = array_diff($newAssigneeIds, $oldAssigneeIds);
        $task->load('board');
        foreach ($addedIds as $userId) {
            if ($userId !== $authUser->id) {
                $assigneeUser = User::find($userId);
                $assigneeUser?->notify(new TaskAssigned($task, $authUser->name));
            }
        }

        return redirect()->back()->with('success', 'Task assignment updated!');
    }

    public function updateTask(Request $request, Task $task)
    {
        $authUser = auth()->user();
        $isOwner  = $task->assignees()->where('user_id', $authUser->id)->exists();
        if (!$isOwner && !in_array($authUser->role, ['admin', 'manager'])) {
            abort(403);
        }
        if (!in_array($authUser->role, ['admin', 'manager']) && !\App\Models\RolePermission::check($authUser->role, 'edit_task_detail')) {
            abort(403, 'Anda tidak memiliki izin mengedit detail task.');
        }

        $validated = $request->validate([
            'title'          => 'required|string|max:255',
            'description'    => 'nullable|string',
            'status'         => 'required|in:todo,in_progress,done',
            'priority'       => 'required|in:low,medium,high,critical',
            'progress'       => 'required|integer|min:0|max:100',
            'due_date'       => 'nullable|date',
            'start_date'     => 'nullable|date',
            'assignee_ids'   => 'nullable|array',
            'assignee_ids.*' => 'integer|exists:users,id',
            'label_ids'      => 'array',
            'label_ids.*'    => 'integer|exists:labels,id',
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

        $changes = [];
        foreach (['title', 'description', 'status', 'priority', 'progress', 'due_date', 'start_date'] as $field) {
            if ((string)$task->{$field} !== (string)($update[$field] ?? '')) {
                $changes[$field] = ['old' => $task->{$field}, 'new' => $update[$field]];
            }
        }

        $task->update($update);

        // Sync labels
        $task->labels()->sync($validated['label_ids'] ?? []);

        // Only admin/manager can change assignees
        $oldAssigneeIds = [];
        $newAssigneeIds = [];
        if (in_array($authUser->role, ['admin', 'manager'])) {
            $oldAssigneeIds = $task->assignees()->pluck('users.id')->toArray();
            $newAssigneeIds = $validated['assignee_ids'] ?? [];
            $task->assignees()->sync($newAssigneeIds);
            if (array_diff($newAssigneeIds, $oldAssigneeIds) || array_diff($oldAssigneeIds, $newAssigneeIds)) {
                $changes['assignees'] = ['old' => $oldAssigneeIds, 'new' => $newAssigneeIds];
            }
        }

        if (!empty($changes)) {
            TaskActivityLog::log($task->id, $authUser->id, 'updated',
                array_map(fn($c) => $c['old'], $changes),
                array_map(fn($c) => $c['new'], $changes)
            );
        }

        // Fire notifications based on changes
        $task->refresh()->load('board');
        if (isset($changes['assignees'])) {
            $addedIds = array_diff($newAssigneeIds, $oldAssigneeIds);
            foreach ($addedIds as $userId) {
                if ($userId !== $authUser->id) {
                    $assigneeUser = User::find($userId);
                    $assigneeUser?->notify(new TaskAssigned($task, $authUser->name));
                }
            }
        }
        if (isset($changes['status'])) {
            $task->assignees()->where('user_id', '!=', $authUser->id)->get()->each(
                fn ($assignee) => $assignee->notify(new TaskStatusChanged($task, $changes['status']['old'], $changes['status']['new'], $authUser->name))
            );
        }

        return redirect()->back()->with('success', 'Task updated successfully!');
    }

    public function updateProgress(Request $request, Task $task)
    {
        $authUser = auth()->user();
        $isOwner  = $task->assignees()->where('user_id', $authUser->id)->exists();
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

