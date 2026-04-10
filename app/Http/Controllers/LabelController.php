<?php

namespace App\Http\Controllers;

use App\Models\Label;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\Request;

class LabelController extends Controller
{
    /** List labels for a project */
    public function index(Project $project)
    {
        return response()->json($project->labels()->orderBy('name')->get());
    }

    /** Create a label for a project */
    public function store(Request $request, Project $project)
    {
        if (!in_array(auth()->user()->role, ['admin', 'manager'])) {
            abort(403);
        }

        $validated = $request->validate([
            'name'  => 'required|string|max:50',
            'color' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $label = $project->labels()->create($validated);

        return response()->json($label, 201);
    }

    /** Update a label */
    public function update(Request $request, Label $label)
    {
        if (!in_array(auth()->user()->role, ['admin', 'manager'])) {
            abort(403);
        }

        $validated = $request->validate([
            'name'  => 'required|string|max:50',
            'color' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $label->update($validated);

        return response()->json($label);
    }

    /** Delete a label */
    public function destroy(Label $label)
    {
        if (!in_array(auth()->user()->role, ['admin', 'manager'])) {
            abort(403);
        }

        $label->delete();

        return response()->json(null, 204);
    }

    /** Sync labels on a task */
    public function syncTask(Request $request, Task $task)
    {
        $user = auth()->user();
        $isOwner = $user->id === $task->assigned_to;

        if (!$isOwner && !in_array($user->role, ['admin', 'manager'])) {
            abort(403);
        }

        $validated = $request->validate([
            'label_ids'   => 'array',
            'label_ids.*' => 'integer|exists:labels,id',
        ]);

        $task->labels()->sync($validated['label_ids'] ?? []);

        return redirect()->back()->with('success', 'Labels updated.');
    }
}
