<?php

namespace App\Notifications;

use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TaskAssigned extends Notification
{
    use Queueable;

    public function __construct(public Task $task, public string $assignedByName) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'            => 'task_assigned',
            'task_id'         => $this->task->id,
            'task_title'      => $this->task->title,
            'assigned_by'     => $this->assignedByName,
            'board_id'        => $this->task->board_id,
            'project_id'      => optional($this->task->board)->project_id,
            'message'         => "You were assigned to task \"{$this->task->title}\" by {$this->assignedByName}.",
        ];
    }
}
