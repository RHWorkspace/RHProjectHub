<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskActivityLog extends Model
{
    protected $fillable = ['task_id', 'user_id', 'event', 'old_value', 'new_value'];

    protected $casts = [
        'old_value' => 'array',
        'new_value' => 'array',
    ];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function log(int $taskId, int $userId, string $event, mixed $oldValue = null, mixed $newValue = null): void
    {
        static::create([
            'task_id'   => $taskId,
            'user_id'   => $userId,
            'event'     => $event,
            'old_value' => $oldValue !== null ? (is_array($oldValue) ? $oldValue : ['value' => $oldValue]) : null,
            'new_value' => $newValue !== null ? (is_array($newValue) ? $newValue : ['value' => $newValue]) : null,
        ]);
    }
}
