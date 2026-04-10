<?php

namespace App\Console\Commands;

use App\Models\Task;
use App\Notifications\DeadlineApproaching;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class CheckDeadlines extends Command
{
    protected $signature   = 'tasks:check-deadlines';
    protected $description = 'Send deadline-approaching notifications for tasks due today or tomorrow';

    public function handle(): void
    {
        $today    = Carbon::today();
        $tomorrow = Carbon::tomorrow();

        $tasks = Task::with(['board', 'assignedUser'])
            ->whereNotNull('due_date')
            ->whereNotNull('assigned_to')
            ->where('status', '!=', 'done')
            ->whereDate('due_date', '<=', $tomorrow)
            ->whereDate('due_date', '>=', $today)
            ->get();

        $sent = 0;

        foreach ($tasks as $task) {
            $daysLeft = (int) $today->diffInDays(Carbon::parse($task->due_date), false);
            if ($daysLeft < 0) continue;

            $user = $task->assignedUser;
            if (! $user) continue;

            // Avoid duplicate: only notify once per task per day
            $alreadyNotified = $user->notifications()
                ->where('type', DeadlineApproaching::class)
                ->whereDate('created_at', $today)
                ->whereRaw("JSON_EXTRACT(data, '$.task_id') = ?", [$task->id])
                ->exists();

            if (! $alreadyNotified) {
                $user->notify(new DeadlineApproaching($task, $daysLeft));
                $sent++;
            }
        }

        $this->info("Deadline notifications sent: {$sent}");
    }
}
