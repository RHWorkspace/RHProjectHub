<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskComment;
use App\Models\TaskActivityLog;
use Illuminate\Http\Request;

class TaskCommentController extends Controller
{
    public function store(Request $request, Task $task)
    {
        $request->validate(['body' => 'required|string|max:2000']);

        $comment = $task->comments()->create([
            'user_id' => $request->user()->id,
            'body'    => $request->body,
        ]);

        TaskActivityLog::log(
            $task->id,
            $request->user()->id,
            'commented',
            null,
            ['comment_id' => $comment->id, 'body' => $comment->body]
        );

        return redirect()->back();
    }

    public function destroy(Request $request, Task $task, TaskComment $comment)
    {
        $user = $request->user();

        // Only the comment owner or admin can delete
        if ($comment->user_id !== $user->id && $user->role !== 'admin') {
            abort(403);
        }

        $comment->delete();

        return redirect()->back();
    }
}
