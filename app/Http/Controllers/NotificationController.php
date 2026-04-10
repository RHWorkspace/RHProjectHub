<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationController extends Controller
{
    /** Return paginated notifications as JSON (for the dropdown fetch). */
    public function index(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->take(30)
            ->get()
            ->map(fn ($n) => [
                'id'         => $n->id,
                'data'       => $n->data,
                'read_at'    => $n->read_at,
                'created_at' => $n->created_at->diffForHumans(),
            ]);

        return response()->json($notifications);
    }

    /** Mark a single notification as read. */
    public function markRead(Request $request, string $id)
    {
        $request->user()
            ->notifications()
            ->where('id', $id)
            ->first()
            ?->markAsRead();

        return response()->json(['ok' => true]);
    }

    /** Mark all notifications as read. */
    public function markAllRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();
        return response()->json(['ok' => true]);
    }
}
