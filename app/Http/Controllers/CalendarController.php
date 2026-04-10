<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Carbon\Carbon;
use Inertia\Inertia;

class CalendarController extends Controller
{
    public function index()
    {
        $authUser = auth()->user();
        $isAdmin  = $authUser->role === 'admin';

        // ── Resolve accessible project IDs (null = unrestricted for admin) ──
        $accessibleProjectIds = null;
        $accessibleTeamIds    = null;

        if (!$isAdmin) {
            $userTeams = $authUser->teams()->with('projects:id')->get();

            $accessibleTeamIds = $userTeams->pluck('id');

            $accessibleProjectIds = $userTeams
                ->flatMap(fn($t) => $t->projects->pluck('id'))
                ->unique()
                ->values();
        }

        // ── Tasks ────────────────────────────────────────────────────────────
        $taskQuery = Task::with([
            'board:id,name,project_id',
            'board.project:id,name',
            'assignedUser:id,name,email',
        ])->whereNotNull('due_date');

        if (!$isAdmin) {
            $taskQuery->where(function ($q) use ($authUser, $accessibleProjectIds) {
                $q->where('assigned_to', $authUser->id)
                  ->orWhereHas('board', fn($b) => $b->whereIn('project_id', $accessibleProjectIds));
            });
        }

        $tasks = $taskQuery->get();

        $now = Carbon::now();

        $calendarTasks = $tasks->map(function ($task) use ($now) {
            $due = Carbon::parse($task->due_date);
            $isOverdue = $task->status === 'in_progress' && $due->isPast();

            return [
                'id'             => $task->id,
                'title'          => $task->title,
                'status'         => $task->status,
                'priority'       => $task->priority,
                'due_date'       => $task->due_date,
                'due_date_fmt'   => $due->toDateString(),
                'start_date'     => $task->start_date,
                'start_date_fmt' => $task->start_date ? Carbon::parse($task->start_date)->toDateString() : null,
                'progress'       => $task->progress ?? 0,
                'is_overdue'     => $isOverdue,
                'project'        => $task->board?->project?->name ?? '—',
                'project_id'     => $task->board?->project_id,
                'board'          => $task->board?->name ?? '—',
                'board_id'       => $task->board_id,
                'assignee'       => $task->assignedUser
                    ? ['id' => $task->assignedUser->id, 'name' => $task->assignedUser->name, 'email' => $task->assignedUser->email]
                    : null,
            ];
        })->values();

        // ── Boards & Projects (scoped to accessible projects) ────────────────
        $boardQuery = Board::with('project:id,name')->orderBy('name');
        if (!$isAdmin) {
            $boardQuery->whereIn('project_id', $accessibleProjectIds);
        }
        $boardList = $boardQuery->get(['id', 'name', 'project_id'])
            ->map(fn($b) => [
                'id'         => $b->id,
                'name'       => $b->name,
                'project_id' => $b->project_id,
                'project'    => $b->project?->name,
            ]);

        $projectList = $boardList
            ->whereNotNull('project_id')
            ->unique('project_id')
            ->map(fn($b) => ['id' => $b['project_id'], 'name' => $b['project']])
            ->sortBy('name')
            ->values();

        // ── Assignable users (scoped to same teams) ──────────────────────────
        if ($isAdmin) {
            $assignableUsers = User::orderBy('name')->get(['id', 'name']);
        } else {
            $assignableUsers = User::whereHas('teams', fn($q) => $q->whereIn('teams.id', $accessibleTeamIds))
                ->orderBy('name')
                ->get(['id', 'name']);
        }

        return Inertia::render('Calendar', [
            'tasks'       => $calendarTasks,
            'currentDate' => $now->toDateString(),
            'boards'      => $boardList,
            'projects'    => $projectList,
            'users'       => $assignableUsers,
        ]);
    }
}
