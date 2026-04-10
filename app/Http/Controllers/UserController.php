<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        if ($user->role !== 'admin' && !\App\Models\RolePermission::check($user->role, 'access_manage_users')) {
            abort(403);
        }

        return Inertia::render('Users', [
            'auth' => [
                'user' => auth()->user(),
            ],
            'users' => User::all(),
        ]);
    }

    public function store(Request $request)
    {
        if (auth()->user()->role !== 'admin') {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'role' => 'required|in:admin,manager,user',
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'password' => Hash::make($validated['password'] ?? 'password'),
        ]);

        return redirect()->back()->with('success', 'User created successfully!');
    }

    public function update(Request $request, User $user)
    {
        if (auth()->user()->role !== 'admin') {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'role' => 'required|in:admin,manager,user',
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'password' => $validated['password'] ? Hash::make($validated['password']) : $user->password,
        ]);

        return redirect()->back()->with('success', 'User updated successfully!');
    }

    public function destroy(User $user)
    {
        if (auth()->user()->role !== 'admin') {
            abort(403);
        }

        $user->delete();

        return redirect()->back()->with('success', 'User deleted successfully!');
    }
}
