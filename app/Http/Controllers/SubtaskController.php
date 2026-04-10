<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\RolePermission;
use Illuminate\Http\Request;

class SubtaskController extends Controller
{
    public function store(Request $request, Task $task)
    {
        $user = auth()->user();
        $canManage = in_array($user->role, ['admin', 'manager'])
            || RolePermission::check($user->role, 'edit_task_detail');

        if (! $canManage) {
            abort(403, 'You do not have permission to create subtasks.');
        }

        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'assigned_to' => 'nullable|exists:users,id',
            'priority'    => 'nullable|in:low,medium,high,critical',
            'due_date'    => 'nullable|date',
        ]);

        $task->subtasks()->create([
            'title'       => $validated['title'],
            'status'      => 'todo',
            'priority'    => $validated['priority'] ?? 'medium',
            'progress'    => 0,
            'board_id'    => $task->board_id,
            'assigned_to' => $validated['assigned_to'] ?? null,
            'due_date'    => $validated['due_date'] ?? null,
        ]);

        // New subtask means parent is no longer fully done
        $this->recalcParentProgress($task->id);

        return redirect()->back()->with('success', 'Subtask created.');
    }

    public function updateStatus(Request $request, Task $subtask)
    {
        $user = auth()->user();
        $canUpdate = in_array($user->role, ['admin', 'manager'])
            || RolePermission::check($user->role, 'edit_task_status')
            || $subtask->assigned_to === $user->id;

        if (! $canUpdate) {
            abort(403, 'You do not have permission to update this subtask.');
        }

        $validated = $request->validate([
            'status' => 'required|in:todo,in_progress,done',
        ]);

        $progressMap = ['todo' => 0, 'in_progress' => 50, 'done' => 100];

        $subtask->update([
            'status'   => $validated['status'],
            'progress' => $progressMap[$validated['status']],
        ]);

        if ($subtask->parent_id) {
            $this->recalcParentProgress($subtask->parent_id);
        }

        return redirect()->back()->with('success', 'Subtask updated.');
    }

    public function destroy(Task $subtask)
    {
        $user = auth()->user();
        $canManage = in_array($user->role, ['admin', 'manager'])
            || RolePermission::check($user->role, 'edit_task_detail');

        if (! $canManage) {
            abort(403, 'You do not have permission to delete subtasks.');
        }

        $parentId = $subtask->parent_id;
        $subtask->delete();

        if ($parentId) {
            $this->recalcParentProgress($parentId);
        }

        return redirect()->back()->with('success', 'Subtask deleted.');
    }

    private function recalcParentProgress(int $parentId): void
    {
        $parent = Task::find($parentId);
        if (! $parent) {
            return;
        }

        $subtasks = Task::where('parent_id', $parentId)->get();
        if ($subtasks->isEmpty()) {
            return;
        }

        $total      = $subtasks->count();
        $doneCount  = $subtasks->where('status', 'done')->count();
        $inProgCount = $subtasks->where('status', 'in_progress')->count();
        $pct        = (int) round(($doneCount / $total) * 100);

        // Derive parent status from subtask states
        if ($doneCount === $total) {
            $derivedStatus = 'done';
        } elseif ($doneCount > 0 || $inProgCount > 0) {
            $derivedStatus = 'in_progress';
        } else {
            $derivedStatus = 'todo';
        }

        $parent->update([
            'progress' => $pct,
            'status'   => $derivedStatus,
        ]);
    }
}
