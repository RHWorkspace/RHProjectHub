<?php

namespace App\Notifications;

use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DeadlineApproaching extends Notification
{
    use Queueable;

    public function __construct(public Task $task, public int $daysLeft) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $when = $this->daysLeft === 0 ? 'today' : "in {$this->daysLeft} day(s)";

        return [
            'type'       => 'deadline_approaching',
            'task_id'    => $this->task->id,
            'task_title' => $this->task->title,
            'due_date'   => $this->task->due_date,
            'days_left'  => $this->daysLeft,
            'board_id'   => $this->task->board_id,
            'project_id' => optional($this->task->board)->project_id,
            'message'    => "Task \"{$this->task->title}\" is due {$when}.",
        ];
    }
}
