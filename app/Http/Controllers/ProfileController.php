<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class ProfileController extends Controller
{
    public function show()
    {
        $user = auth()->user()->load(['teams', 'assignedTasks']);

        $tasks = $user->assignedTasks;

        return Inertia::render('Profile', [
            'auth' => ['user' => $user],
            'stats' => [
                'todo'        => $tasks->where('status', 'todo')->count(),
                'in_progress' => $tasks->where('status', 'in_progress')->count(),
                'done'        => $tasks->where('status', 'done')->count(),
                'total'       => $tasks->count(),
            ],
            'teams' => $user->teams->map(fn($t) => [
                'id'   => $t->id,
                'name' => $t->name,
                'role' => $t->pivot->role,
            ]),
        ]);
    }

    public function update(Request $request)
    {
        $user = auth()->user();

        $validated = $request->validate([
            'name'  => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
        ]);

        $user->update($validated);

        return back()->with('success', 'Profile updated successfully.');
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => ['required', 'current_password'],
            'password'         => ['required', 'confirmed', Password::min(8)],
        ]);

        auth()->user()->update([
            'password' => Hash::make($request->password),
        ]);

        return back()->with('success', 'Password changed successfully.');
    }
}
