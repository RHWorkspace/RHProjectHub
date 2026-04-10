<?php

namespace App\Http\Controllers;

use App\Models\RolePermission;
use App\Models\Team;
use App\Models\Task;
use App\Models\User;
use Inertia\Inertia;

class WorkloadController extends Controller
{
    public function index()
    {
        $authUser = auth()->user();

        if (! RolePermission::check($authUser->role, 'access_workload')) {
            abort(403, 'Akses halaman workload tidak diizinkan.');
        }

        // ── Determine which teams to show ────────────────────────────
        if ($authUser->role === 'admin') {
            $teams = Team::with([
                'users:id,name,email,role',
                'projects:id,name',
            ])->get();
        } elseif ($authUser->role === 'manager') {
            $teams = $authUser->teams()->with([
                'users:id,name,email,role',
                'projects:id,name',
            ])->get();
        } else {
            // Regular users see their own teams
            $teams = $authUser->teams()->with([
                'users:id,name,email,role',
                'projects:id,name',
            ])->get();
        }

        // ── Collect all unique member IDs across relevant teams ──────
        $memberIds = $teams->flatMap(fn($t) => $t->users->pluck('id'))->unique()->values();

        // ── Load tasks for all those members (plus unassigned in team projects) ──
        $projectIds = $teams->flatMap(fn($t) => $t->projects->pluck('id'))->unique()->values();

        $tasks = Task::with(['assignees', 'board:id,name,project_id', 'board.project:id,name'])
            ->where(function ($q) use ($memberIds, $projectIds) {
                $q->whereHas('assignees', fn($aq) => $aq->whereIn('users.id', $memberIds))
                  ->orWhere(function ($q2) use ($projectIds) {
                      $q2->whereDoesntHave('assignees')
                         ->whereHas('board', fn($b) => $b->whereIn('project_id', $projectIds));
                  });
            })
            ->get();

        // ── Build per-member workload summary ────────────────────────
        // members keyed by id
        $membersById = User::whereIn('id', $memberIds)
            ->select('id', 'name', 'email', 'role')
            ->get()
            ->keyBy('id');

        // Build a map of user_id => first team_role from pivot
        $memberTeamRole = [];
        foreach ($teams as $team) {
            foreach ($team->users as $u) {
                if (! isset($memberTeamRole[$u->id])) {
                    $memberTeamRole[$u->id] = $u->pivot->role ?? null;
                }
            }
        }

        $memberWorkload = $membersById->map(function ($member) use ($tasks, $memberTeamRole) {
            $myTasks = $tasks->filter(fn($t) => $t->assignees->contains('id', $member->id));
            return [
                'id'          => $member->id,
                'name'        => $member->name,
                'email'       => $member->email,
                'role'        => $member->role,
                'team_role'   => $memberTeamRole[$member->id] ?? null,
                'total'       => $myTasks->count(),
                'todo'        => $myTasks->where('status', 'todo')->count(),
                'in_progress' => $myTasks->where('status', 'in_progress')->count(),
                'done'        => $myTasks->where('status', 'done')->count(),
                'overdue'     => $myTasks->filter(fn($t) =>
                    $t->due_date && $t->status === 'in_progress' && \Carbon\Carbon::parse($t->due_date)->isPast()
                )->count(),
                'avg_progress' => $myTasks->count()
                    ? round($myTasks->avg('progress'))
                    : 0,
            ];
        })->values();

        // ── Build per-team workload summary ──────────────────────────
        $teamWorkload = $teams->map(function ($team) use ($tasks, $memberWorkload) {
            $teamMemberIds    = $team->users->pluck('id');
            $teamUsersKeyed   = $team->users->keyBy('id');
            $teamTasks        = $tasks->filter(fn($t) => $t->assignees->pluck('id')->intersect($teamMemberIds)->isNotEmpty());
            $members = $memberWorkload->whereIn('id', $teamMemberIds)->map(function ($m) use ($teamUsersKeyed) {
                $pivotRole = $teamUsersKeyed->get($m['id'])?->pivot?->role ?? null;
                return array_merge($m, ['team_role' => $pivotRole]);
            })->values();

            return [
                'id'           => $team->id,
                'name'         => $team->name,
                'description'  => $team->description ?? '',
                'member_count' => $team->users->count(),
                'projects'     => $team->projects->map(fn($p) => ['id' => $p->id, 'name' => $p->name])->values(),
                'total'        => $teamTasks->count(),
                'todo'         => $teamTasks->where('status', 'todo')->count(),
                'in_progress'  => $teamTasks->where('status', 'in_progress')->count(),
                'done'         => $teamTasks->where('status', 'done')->count(),
                'overdue'      => $teamTasks->filter(fn($t) =>
                    $t->due_date && $t->status === 'in_progress' && \Carbon\Carbon::parse($t->due_date)->isPast()
                )->count(),
                'avg_progress' => $teamTasks->count()
                    ? round($teamTasks->avg('progress'))
                    : 0,
                'members'      => $members,
            ];
        })->values();

        return Inertia::render('Workload', [
            'teamWorkload'   => $teamWorkload,
            'memberWorkload' => $memberWorkload,
        ]);
    }
}
