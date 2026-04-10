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
            $tasks = Task::with(['assignees', 'board.project.teams'])
                ->orderBy('created_at', 'desc')
                ->get();
        } elseif ($user->role === 'manager') {
            $teams = $user->teams()->with(['users:id', 'projects:id'])->get();

            $teamUserIds = $teams->flatMap(fn($team) => $team->users->pluck('id'))->unique()->values();
            $teamProjectIds = $teams->flatMap(fn($team) => $team->projects->pluck('id'))->unique()->values();

            $tasks = Task::where(function ($q) use ($teamUserIds, $teamProjectIds) {
                $q->whereHas('assignees', fn($aq) => $aq->whereIn('users.id', $teamUserIds))
                  ->orWhere(function ($q2) use ($teamProjectIds) {
                      $q2->whereDoesntHave('assignees')
                         ->whereHas('board', fn($b) => $b->whereIn('project_id', $teamProjectIds));
                  });
            })
                ->with(['assignees', 'board.project.teams'])
                ->orderBy('created_at', 'desc')
                ->get();
        } else {
            $tasks = Task::whereHas('assignees', fn($q) => $q->where('users.id', $user->id))
                ->with(['assignees', 'board.project.teams'])
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

    public function executive()
    {
        $user = auth()->user();

        if (! RolePermission::check($user->role, 'access_executive_report')) {
            abort(403, 'Akses Executive Report tidak diizinkan.');
        }

        if ($user->role === 'admin') {
            $tasks    = Task::with(['assignees', 'board.project.teams'])
                            ->whereNull('parent_id')
                            ->orderBy('created_at', 'desc')
                            ->get();
            $projects = Project::select('id', 'name')->orderBy('name')->get();
            $teams    = Team::select('id', 'name')->orderBy('name')->get();
        } else {
            $managerTeams   = $user->teams()->with(['users:id', 'projects:id'])->get();
            $teamUserIds    = $managerTeams->flatMap(fn($t) => $t->users->pluck('id'))->unique()->values();
            $teamProjectIds = $managerTeams->flatMap(fn($t) => $t->projects->pluck('id'))->unique()->values();

            $tasks = Task::where(function ($q) use ($teamUserIds, $teamProjectIds) {
                $q->whereHas('assignees', fn($aq) => $aq->whereIn('users.id', $teamUserIds))
                  ->orWhere(function ($q2) use ($teamProjectIds) {
                      $q2->whereDoesntHave('assignees')
                         ->whereHas('board', fn($b) => $b->whereIn('project_id', $teamProjectIds));
                  });
            })
                ->whereNull('parent_id')
                ->with(['assignees', 'board.project.teams'])
                ->orderBy('created_at', 'desc')
                ->get();

            $projects = Project::select('id', 'name')->whereIn('id', $teamProjectIds)->orderBy('name')->get();
            $teams    = Team::select('id', 'name')->whereIn('id', $managerTeams->pluck('id'))->orderBy('name')->get();
        }

        return Inertia::render('ExecutiveReport', [
            'tasks'    => $tasks,
            'projects' => $projects,
            'teams'    => $teams,
        ]);
    }
}
