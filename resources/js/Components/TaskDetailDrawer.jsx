import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm, router } from '@inertiajs/react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name = '') {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function avatarColor(name = '') {
    const COLORS = ['bg-violet-500','bg-sky-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-indigo-500','bg-pink-500'];
    let h = 0;
    for (let c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return COLORS[h % COLORS.length];
}
function dueDateInfo(due_date, status) {
    if (!due_date) return null;
    const due = new Date(due_date); due.setHours(0,0,0,0);
    const now = new Date();        now.setHours(0,0,0,0);
    const diff = Math.round((due - now) / 86400000);
    const isOverdue = status === 'in_progress' && diff < 0;
    if (status === 'done' && diff >= 0) {
        const dateFmt = due.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        const label = diff === 0 ? 'Selesai tepat waktu ✓' : `Selesai lebih awal ✓ · ${dateFmt}`;
        return { label, isOverdue: false, isDoneOnTime: true, diff };
    }
    if (status === 'done' && diff < 0) {
        return { label: due.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }), isOverdue: false, isDoneOnTime: false, diff };
    }
    let label;
    if (diff === 0)      label = 'Due today';
    else if (diff === 1) label = 'Due tomorrow';
    else if (diff === -1)label = '1 day overdue';
    else if (diff < 0)   label = `${Math.abs(diff)} days overdue`;
    else                 label = `Due in ${diff} days`;
    return { label, isOverdue, diff };
}
function relativeTime(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

const STATUS_META = {
    todo:        { label: 'To Do',       cls: 'bg-slate-100 text-slate-700',    bar: 'bg-slate-400'   },
    in_progress: { label: 'In Progress', cls: 'bg-blue-100  text-blue-700',     bar: 'bg-blue-500'    },
    done:        { label: 'Done',        cls: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
};
const PRIORITY_META = {
    critical: { label: 'Critical', cls: 'bg-red-100 text-red-700',     icon: '🔴' },
    high:     { label: 'High',     cls: 'bg-orange-100 text-orange-700',icon: '🟠' },
    medium:   { label: 'Medium',   cls: 'bg-yellow-100 text-yellow-700',icon: '🟡' },
    low:      { label: 'Low',      cls: 'bg-green-100 text-green-700',  icon: '🟢' },
};

// ── TaskDetailDrawer ──────────────────────────────────────────────────────────
// Props:
//   task              – task object (with comments, activity_logs eager-loaded)
//   users             – array of assignable users (for reassign dropdown)
//   onClose           – close handler
//   onEdit            – open edit modal handler (optional)
//   canEditDetail     – boolean: can edit title/desc/priority/dates
//   canEditStatus     – boolean: can change status
//   canUpdateProgress – boolean: can move progress slider
//   canAssign         – boolean: can reassign task to someone else
//   onStatusChange    – (taskId, newStatus) => void
//   onAssignChange    – (taskId, assignedTo) => void
//   authUser          – auth.user object
// ── Inner drawer (only mounted when task is defined) ─────────────────────────
function DrawerContent({ task, users = [], onClose, onEdit, canEditDetail = false, canEditStatus = false, canUpdateProgress = false, canAssign = false, canManageTask = false, onStatusChange, onAssignChange, authUser }) {
    const [activeTab, setActiveTab] = useState('detail');
    const commentForm  = useForm({ body: '' });
    const subtaskForm  = useForm({ title: '', assigned_to: '', priority: 'medium', due_date: '' });
    const subtasks     = task.subtasks ?? [];

    const submitSubtask = (e) => {
        e.preventDefault();
        subtaskForm.post(`/tasks/${task.id}/subtasks`, {
            preserveScroll: true,
            onSuccess: () => subtaskForm.reset(),
        });
    };

    const cycleSubtaskStatus = (subtask) => {
        const cycle = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
        router.patch(`/subtasks/${subtask.id}/status`, { status: cycle[subtask.status] }, { preserveScroll: true });
    };

    const deleteSubtask = (subtask) => {
        router.delete(`/subtasks/${subtask.id}`, { preserveScroll: true });
    };

    const sm  = STATUS_META[task.status]    ?? STATUS_META.todo;
    const pm  = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;
    const due = dueDateInfo(task.due_date, task.status);

    const comments     = task.comments      ?? [];
    const activityLogs = task.activity_logs ?? [];

    const submitComment = (e) => {
        e.preventDefault();
        commentForm.post(`/tasks/${task.id}/comments`, {
            preserveScroll: true,
            onSuccess: () => commentForm.reset(),
        });
    };

    const deleteComment = (comment) => {
        router.delete(`/tasks/${task.id}/comments/${comment.id}`, { preserveScroll: true });
    };

    const activityLabel = (log) => {
        const { event, old_value: o, new_value: n } = log;
        switch (event) {
            case 'created':          return `Created task "${n?.title ?? ''}"`;
            case 'status_changed':   return `Changed status: "${o?.status ?? '?'}" → "${n?.status ?? '?'}"`;
            case 'assigned':         return o?.assigned_to ? 'Reassigned task' : 'Assigned task';
            case 'updated': {
                const fields = Object.keys(n ?? {}).join(', ');
                return `Updated: ${fields}`;
            }
            case 'progress_updated': return `Progress updated: ${o?.progress ?? '?'}% → ${n?.progress ?? '?'}%`;
            case 'commented':        return 'Added a comment';
            default:                 return event.replace(/_/g, ' ');
        }
    };

    const activityIcon = (event) => {
        switch (event) {
            case 'created':          return { icon: '✨', cls: 'bg-emerald-100 text-emerald-700' };
            case 'status_changed':   return { icon: '🔄', cls: 'bg-blue-100 text-blue-700' };
            case 'assigned':         return { icon: '👤', cls: 'bg-violet-100 text-violet-700' };
            case 'updated':          return { icon: '✏️', cls: 'bg-amber-100 text-amber-700' };
            case 'progress_updated': return { icon: '📊', cls: 'bg-sky-100 text-sky-700' };
            case 'commented':        return { icon: '💬', cls: 'bg-gray-100 text-gray-600' };
            default:                 return { icon: '•',  cls: 'bg-gray-100 text-gray-500' };
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex justify-end bg-black/40" onClick={onClose}>
            <div
                className="relative h-full w-full max-w-lg bg-white shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between gap-3 shrink-0">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 mb-0.5 font-medium uppercase tracking-wide">Task Detail</p>
                        <h2 className="text-lg font-bold text-gray-900 leading-snug break-words">{task.title}</h2>
                    </div>
                    <button onClick={onClose} className="shrink-0 mt-0.5 text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 bg-gray-50 shrink-0">
                    {[
                        { key: 'detail',   label: 'Detail' },
                        { key: 'comments', label: comments.length > 0 ? `Comments (${comments.length})` : 'Comments' },
                        { key: 'activity', label: activityLogs.length > 0 ? `Activity (${activityLogs.length})` : 'Activity' },
                        { key: 'subtasks', label: subtasks.length > 0 ? `Subtasks (${subtasks.length})` : 'Subtasks' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 py-2.5 text-sm font-medium transition border-b-2 ${
                                activeTab === tab.key
                                    ? 'border-blue-600 text-blue-700 bg-white'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto">

                    {/* ── Detail Tab ─────────────────────── */}
                    {activeTab === 'detail' && (
                        <div className="px-6 py-5 space-y-6">

                            {/* Status + Priority */}
                            <div className="flex flex-wrap gap-2">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${sm.cls}`}>
                                    {sm.label}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${pm.cls}`}>
                                    {pm.icon} {pm.label}
                                </span>
                                {due?.isOverdue && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                        ⚠️ {due.label}
                                    </span>
                                )}
                            </div>

                            {/* Description */}
                            {task.description && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{task.description}</p>
                                </div>
                            )}

                            {/* Progress */}
                            <div>
                                <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                    <span>Progress</span><span>{task.progress ?? 0}%</span>
                                </div>
                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${sm.bar}`}
                                        style={{ width: `${task.progress ?? 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Assignee */}
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Assignee</p>
                                {task.assigned_user ? (
                                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${avatarColor(task.assigned_user.name)}`}>
                                            {initials(task.assigned_user.name)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">{task.assigned_user.name}</p>
                                            <p className="text-xs text-gray-500">{task.assigned_user.email}</p>
                                            {task.assigned_user.role && (
                                            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                task.assigned_user.role === 'admin'   ? 'bg-red-100 text-red-700' :
                                                task.assigned_user.role === 'manager' ? 'bg-amber-100 text-amber-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>{task.assigned_user.role}</span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 text-gray-400">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">👤</div>
                                        <span className="text-sm italic">Unassigned</span>
                                    </div>
                                )}

                                {/* Inline reassign for managers/admins */}
                                {canAssign && users.length > 0 && (
                                    <div className="mt-2">
                                        <label className="block text-xs text-gray-500 mb-1">Reassign to</label>
                                        <select
                                            value={task.assigned_to || ''}
                                            onChange={e => onAssignChange(task.id, e.target.value)}
                                            className="text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full px-2 py-1.5"
                                        >
                                            <option value="">— Unassigned —</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Start Date */}
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Start Date</p>
                                {task.start_date ? (
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <span>&#128197;</span>
                                        <span>{new Date(task.start_date).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}</span>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">No start date</p>
                                )}
                            </div>

                            {/* Due Date */}
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Due Date</p>
                                {task.due_date ? (
                                    <div className={`flex items-center gap-2 text-sm font-medium ${due?.isOverdue ? 'text-red-600' : due?.isDoneOnTime ? 'text-emerald-600' : 'text-gray-700'}`}>
                                        <span>📅</span>
                                        <span>{new Date(task.due_date).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}</span>
                                        {due && (
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                                due.isDoneOnTime ? 'bg-emerald-100 text-emerald-700' :
                                                due.isOverdue    ? 'bg-red-100 text-red-700' :
                                                due.diff === 0   ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-500'}`}>
                                                {due.label}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">No due date</p>
                                )}
                            </div>

                            {/* Status change (inline) */}
                            {canEditStatus && onStatusChange && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Change Status</p>
                                    <div className="flex gap-2">
                                        {['todo','in_progress','done'].map(s => {
                                            const m = STATUS_META[s];
                                            return (
                                                <button
                                                    key={s}
                                                    onClick={() => onStatusChange(task.id, s)}
                                                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                                        task.status === s
                                                            ? `${m.cls} border-transparent shadow-sm`
                                                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                                                    }`}
                                                >
                                                    {m.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Timestamps */}
                            <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-3 text-xs text-gray-400">
                                {task.created_at && (
                                    <div>
                                        <p className="font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Created</p>
                                        <p>{new Date(task.created_at).toLocaleString('id-ID')}</p>
                                    </div>
                                )}
                                {task.updated_at && (
                                    <div>
                                        <p className="font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Updated</p>
                                        <p>{new Date(task.updated_at).toLocaleString('id-ID')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Comments Tab ─────────────────────── */}
                    {activeTab === 'comments' && (
                        <div className="px-6 py-5 space-y-5">
                            {/* Comment form */}
                            <form onSubmit={submitComment} className="space-y-2">
                                <textarea
                                    value={commentForm.data.body}
                                    onChange={e => commentForm.setData('body', e.target.value)}
                                    placeholder="Write a comment..."
                                    rows={3}
                                    className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                                {commentForm.errors.body && (
                                    <p className="text-xs text-red-600">{commentForm.errors.body}</p>
                                )}
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={commentForm.processing || !commentForm.data.body.trim()}
                                        className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                                    >
                                        {commentForm.processing ? 'Posting...' : 'Post Comment'}
                                    </button>
                                </div>
                            </form>

                            {/* Comments list */}
                            {comments.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 text-sm">No comments yet. Be the first to comment!</div>
                            ) : (
                                <div className="space-y-4">
                                    {comments.map(comment => (
                                        <div key={comment.id} className="flex gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 ${avatarColor(comment.user?.name ?? '')}`}>
                                                {initials(comment.user?.name ?? '?')}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <span className="text-sm font-semibold text-gray-800">{comment.user?.name ?? 'Unknown'}</span>
                                                    <span className="text-xs text-gray-400 shrink-0">{relativeTime(comment.created_at)}</span>
                                                </div>
                                                <p className="text-sm text-gray-700 whitespace-pre-line break-words leading-relaxed">{comment.body}</p>
                                                {(comment.user_id === authUser?.id || authUser?.role === 'admin') && (
                                                    <button
                                                        onClick={() => deleteComment(comment)}
                                                        className="mt-1 text-xs text-red-400 hover:text-red-600 transition"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Activity Tab ─────────────────────── */}
                    {activeTab === 'activity' && (
                        <div className="px-6 py-5">
                            {activityLogs.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 text-sm">No activity yet.</div>
                            ) : (
                                <div className="relative space-y-0">
                                    <div className="absolute left-3.5 top-5 bottom-0 w-0.5 bg-gray-100" aria-hidden="true" />
                                    {activityLogs.map(log => {
                                        const ai = activityIcon(log.event);
                                        return (
                                            <div key={log.id} className="relative flex gap-4 pb-5">
                                                <span className={`relative z-10 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${ai.cls}`}>
                                                    {ai.icon}
                                                </span>
                                                <div className="flex-1 min-w-0 pt-0.5">
                                                    <p className="text-sm text-gray-700">{activityLabel(log)}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs text-gray-500 font-medium">{log.user?.name ?? 'System'}</span>
                                                        <span className="text-gray-300">·</span>
                                                        <span className="text-xs text-gray-400">{relativeTime(log.created_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Subtasks Tab ─────────────────────── */}
                    {activeTab === 'subtasks' && (
                        <div className="px-6 py-5 space-y-4">
                            {/* Summary progress */}
                            {subtasks.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                        <span className="font-semibold uppercase tracking-wide">Progress</span>
                                        <span>{subtasks.filter(s => s.status === 'done').length} / {subtasks.length} done</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 rounded-full transition-all"
                                            style={{ width: `${Math.round((subtasks.filter(s => s.status === 'done').length / subtasks.length) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Subtask list */}
                            {subtasks.length === 0 ? (
                                <div className="text-center py-6 text-gray-400 text-sm">No subtasks yet.</div>
                            ) : (
                                <div className="space-y-2">
                                    {subtasks.map(subtask => {
                                        const spm = PRIORITY_META[subtask.priority] ?? PRIORITY_META.medium;
                                        const sdue = dueDateInfo(subtask.due_date, subtask.status);
                                        return (
                                            <div key={subtask.id} className="flex items-start gap-2 p-3 rounded-lg border border-gray-100 hover:border-gray-200 bg-gray-50 group">
                                                {/* Status cycle button */}
                                                <button
                                                    onClick={() => cycleSubtaskStatus(subtask)}
                                                    title={`Status: ${subtask.status}. Click to cycle.`}
                                                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                                                        subtask.status === 'done'
                                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                                            : subtask.status === 'in_progress'
                                                            ? 'bg-blue-100 border-blue-400 text-blue-600'
                                                            : 'bg-white border-gray-300'
                                                    }`}
                                                >
                                                    {subtask.status === 'done' && <span className="text-xs leading-none">&#10003;</span>}
                                                    {subtask.status === 'in_progress' && <span className="text-xs leading-none">&#8231;</span>}
                                                </button>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium leading-snug break-words ${subtask.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                        {subtask.title}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${spm.cls}`}>
                                                            {spm.icon} {spm.label}
                                                        </span>
                                                        {subtask.due_date && (
                                                            <span className={`text-xs px-1.5 py-0.5 rounded ${sdue?.isOverdue ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                                                &#128197; {new Date(subtask.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                                            </span>
                                                        )}
                                                        {subtask.assigned_user && (
                                                            <div
                                                                className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(subtask.assigned_user.name)}`}
                                                                title={subtask.assigned_user.name}
                                                            >
                                                                {initials(subtask.assigned_user.name)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Delete */}
                                                {canManageTask && (
                                                    <button
                                                        onClick={() => deleteSubtask(subtask)}
                                                        className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-lg leading-none transition"
                                                        title="Delete subtask"
                                                    >
                                                        &times;
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Add subtask form */}
                            {canManageTask && (
                                <form onSubmit={submitSubtask} className="pt-2 border-t border-gray-100 space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add Subtask</p>
                                    <input
                                        type="text"
                                        value={subtaskForm.data.title}
                                        onChange={e => subtaskForm.setData('title', e.target.value)}
                                        placeholder="Subtask title..."
                                        className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    {subtaskForm.errors.title && (
                                        <p className="text-xs text-red-600">{subtaskForm.errors.title}</p>
                                    )}
                                    <div className="grid grid-cols-2 gap-2">
                                        <select
                                            value={subtaskForm.data.priority}
                                            onChange={e => subtaskForm.setData('priority', e.target.value)}
                                            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="critical">Critical</option>
                                        </select>
                                        <select
                                            value={subtaskForm.data.assigned_to}
                                            onChange={e => subtaskForm.setData('assigned_to', e.target.value)}
                                            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Unassigned</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <input
                                        type="date"
                                        value={subtaskForm.data.due_date}
                                        onChange={e => subtaskForm.setData('due_date', e.target.value)}
                                        className="block w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={subtaskForm.processing || !subtaskForm.data.title.trim()}
                                            className="px-4 py-1.5 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition"
                                        >
                                            {subtaskForm.processing ? 'Adding...' : '+ Add Subtask'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-end gap-2 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                        Close
                    </button>
                    {canEditDetail && onEdit && (
                        <button onClick={onEdit} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">
                            ✏️ Edit Task
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Public wrapper — renders nothing when task is null ────────────────────────
export default function TaskDetailDrawer(props) {
    if (!props.task) return null;
    return createPortal(<DrawerContent {...props} />, document.body);
}
