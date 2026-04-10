<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BoardController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ReportingController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\WorkloadController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\TaskCommentController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\SubtaskController;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect('/dashboard');
    }
    return redirect('/login');
});

// Auth Routes
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register']);
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/dashboard', [AuthController::class, 'dashboard'])->name('dashboard');
    Route::get('/my-tasks', [AuthController::class, 'myTasks'])->name('my-tasks.index');
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::get('/reporting', [ReportingController::class, 'index'])->name('reporting.index');

    // Project routes
    Route::get('/projects', [ProjectController::class, 'manageProjects'])->name('projects.index');
    Route::post('/projects', [ProjectController::class, 'create'])->name('projects.create');
    Route::get('/projects/{project}', [ProjectController::class, 'showProject'])->name('projects.show');
    Route::patch('/projects/{project}', [ProjectController::class, 'editProject'])->name('projects.edit');
    Route::delete('/projects/{project}', [ProjectController::class, 'delete'])->name('projects.delete');

    // Board routes
    Route::post('/projects/{project}/boards', [BoardController::class, 'create'])->name('boards.create');
    Route::patch('/boards/{board}', [BoardController::class, 'editBoard'])->name('boards.edit');
    Route::delete('/boards/{board}', [BoardController::class, 'destroyBoard'])->name('boards.delete');
    Route::get('/boards/{board}', [BoardController::class, 'show'])->name('boards.show');

    // Team routes
    Route::get('/teams', [TeamController::class, 'index'])->name('teams.index');
    Route::get('/teams/{team}', [TeamController::class, 'show'])->name('teams.show');
    Route::get('/my-team', [TeamController::class, 'myTeam'])->name('my-team.index');
    Route::post('/teams', [TeamController::class, 'store'])->name('teams.store');
    Route::patch('/teams/{team}', [TeamController::class, 'update'])->name('teams.update');
    Route::delete('/teams/{team}', [TeamController::class, 'destroy'])->name('teams.destroy');
    Route::post('/teams/{team}/members', [TeamController::class, 'addMember'])->name('teams.members.store');
    Route::patch('/teams/{team}/members/{user}', [TeamController::class, 'updateMember'])->name('teams.members.update');
    Route::delete('/teams/{team}/members/{user}', [TeamController::class, 'removeMember'])->name('teams.members.destroy');

    // Project team mapping routes
    Route::post('/projects/{project}/teams', [ProjectController::class, 'attachTeam'])->name('projects.teams.attach');
    Route::delete('/projects/{project}/teams/{team}', [ProjectController::class, 'detachTeam'])->name('projects.teams.detach');

    // Manage tasks (datatable)
    Route::get('/manage-tasks', [TaskController::class, 'index'])->name('manage-tasks.index');
    Route::post('/manage-tasks', [TaskController::class, 'store'])->name('manage-tasks.store');
    Route::patch('/manage-tasks/{task}', [TaskController::class, 'update'])->name('manage-tasks.update');
    Route::delete('/manage-tasks/{task}', [TaskController::class, 'destroy'])->name('manage-tasks.destroy');

    // Workload
    Route::get('/workload', [WorkloadController::class, 'index'])->name('workload.index');

    // Calendar
    Route::get('/calendar', [CalendarController::class, 'index'])->name('calendar.index');

    // Profile
    Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::patch('/profile/password', [ProfileController::class, 'updatePassword'])->name('profile.password');

    // Task routes
    Route::post('/boards/{board}/tasks', [BoardController::class, 'storeTask'])->name('tasks.store');
    Route::patch('/tasks/{task}/status', [BoardController::class, 'updateTaskStatus'])->name('tasks.update-status');
    Route::patch('/tasks/{task}/progress', [BoardController::class, 'updateProgress'])->name('tasks.update-progress');
    Route::patch('/tasks/{task}/assignment', [BoardController::class, 'updateTaskAssignment'])->name('tasks.update-assignment');
    Route::patch('/tasks/{task}', [BoardController::class, 'updateTask'])->name('tasks.update');
    Route::delete('/tasks/{task}/delete', [BoardController::class, 'destroyTask'])->name('tasks.destroy');

    // Task comment routes
    Route::post('/tasks/{task}/comments', [TaskCommentController::class, 'store'])->name('tasks.comments.store');
    Route::delete('/tasks/{task}/comments/{comment}', [TaskCommentController::class, 'destroy'])->name('tasks.comments.destroy');

    // Subtask routes
    Route::post('/tasks/{task}/subtasks', [SubtaskController::class, 'store'])->name('subtasks.store');
    Route::patch('/subtasks/{subtask}/status', [SubtaskController::class, 'updateStatus'])->name('subtasks.update-status');
    Route::delete('/subtasks/{subtask}', [SubtaskController::class, 'destroy'])->name('subtasks.destroy');

    Route::post('/users', [UserController::class, 'store'])->name('users.store');
    Route::patch('/users/{user}', [UserController::class, 'update'])->name('users.update');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');

    // Roles (admin only)
    Route::get('/roles', [RoleController::class, 'index'])->name('roles.index');
    Route::post('/roles', [RoleController::class, 'store'])->name('roles.store');
    Route::put('/roles/{role}', [RoleController::class, 'update'])->name('roles.update');
    Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');
    Route::patch('/roles/users/{user}', [RoleController::class, 'updateUserRole'])->name('roles.users.update');
    Route::patch('/roles/{role}/permissions', [RoleController::class, 'updatePermission'])->name('roles.permissions.update');

    // Notifications
    Route::get('/notifications',           [NotificationController::class, 'index'])->name('notifications.index');
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::patch('/notifications/read-all',  [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
});
