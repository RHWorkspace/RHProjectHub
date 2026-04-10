<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\Project;
use App\Models\RolePermission;
use App\Models\Team;
use App\Models\Task;
use Inertia\Inertia;

class ReportingController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        if (! RolePermission::check($user->role, 'access_reporting')) {
            abort(403, 'Akses halaman reporting tidak diizinkan.');
        }

        // Admin: semua task; Manager: task dari user dalam timnya; User: hanya task sendiri
        if ($user->role === 'admin') {
            $tasks = Task::with(['assignedUser', 'board.project.teams'])
                ->orderBy('created_at', 'desc')
                ->get();
        } elseif ($user->role === 'manager') {
            $teams = $user->teams()->with(['users:id', 'projects:id'])->get();

            $teamUserIds = $teams->flatMap(fn($team) => $team->users->pluck('id'))->unique()->values();
            $teamProjectIds = $teams->flatMap(fn($team) => $team->projects->pluck('id'))->unique()->values();

            $tasks = Task::where(function ($q) use ($teamUserIds, $teamProjectIds) {
                // Tasks assigned to any team member
                $q->whereIn('assigned_to', $teamUserIds)
                  // OR unassigned tasks that belong to a project mapped to this manager's teams
                  ->orWhere(function ($q2) use ($teamProjectIds) {
                      $q2->whereNull('assigned_to')
                         ->whereHas('board', fn($b) => $b->whereIn('project_id', $teamProjectIds));
                  });
            })
                ->with(['assignedUser', 'board.project.teams'])
                ->orderBy('created_at', 'desc')
                ->get();
        } else {
            $tasks = Task::where('assigned_to', $user->id)
                ->with(['assignedUser', 'board.project.teams'])
                ->orderBy('created_at', 'desc')
                ->get();
        }

        $isAdmin = $user->role === 'admin';

        if ($isAdmin) {
            $accessibleProjectIds = null;
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

        $boardQuery = Board::select('id', 'name', 'project_id')
            ->with('project:id,name')->orderBy('name');
        if (!$isAdmin) {
            $boardQuery->whereIn('project_id', $accessibleProjectIds);
        }

        $teamQuery = Team::select('id', 'name')->orderBy('name');
        if (!$isAdmin) {
            $teamQuery->whereIn('id', $accessibleTeamIds);
        }

        return Inertia::render('Reporting', [
            'tasks'    => $tasks,
            'projects' => $projectQuery->get(),
            'boards'   => $boardQuery->get(),
            'teams'    => $teamQuery->get(),
        ]);
    }
}
