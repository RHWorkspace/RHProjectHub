<?php

namespace App\Notifications;

use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TaskStatusChanged extends Notification
{
    use Queueable;

    public function __construct(
        public Task   $task,
        public string $oldStatus,
        public string $newStatus,
        public string $changedByName
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'           => 'task_status_changed',
            'task_id'        => $this->task->id,
            'task_title'     => $this->task->title,
            'old_status'     => $this->oldStatus,
            'new_status'     => $this->newStatus,
            'changed_by'     => $this->changedByName,
            'board_id'       => $this->task->board_id,
            'project_id'     => optional($this->task->board)->project_id,
            'message'        => "Task \"{$this->task->title}\" status changed from {$this->oldStatus} to {$this->newStatus} by {$this->changedByName}.",
        ];
    }
}
