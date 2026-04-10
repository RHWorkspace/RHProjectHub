<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'status',
        'priority',
        'progress',
        'board_id',
        'parent_id',
        'assigned_to',
        'due_date',
        'start_date',
    ];

    public function board()
    {
        return $this->belongsTo(Board::class);
    }

    public function parent()
    {
        return $this->belongsTo(Task::class, 'parent_id');
    }

    public function subtasks()
    {
        return $this->hasMany(Task::class, 'parent_id')->with('assignedUser');
    }

    /** Single assignee relation — kept for subtasks (uses assigned_to column). */
    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /** Multiple assignees — used by parent tasks via task_assignees pivot. */
    public function assignees()
    {
        return $this->belongsToMany(User::class, 'task_assignees')
            ->select('users.id', 'users.name', 'users.email', 'users.role')
            ->withTimestamps();
    }

    public function comments()
    {
        return $this->hasMany(TaskComment::class)->latest();
    }

    public function activityLogs()
    {
        return $this->hasMany(TaskActivityLog::class)->latest();
    }

    public function labels()
    {
        return $this->belongsToMany(Label::class, 'label_task');
    }
}