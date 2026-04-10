import React, { useState, useMemo } from 'react';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import AppLayout from '../Components/AppLayout';
import ConfirmDialog from '../Components/ConfirmDialog';
import Modal, { ModalBody, ModalFooter, FieldLabel, FieldInput, FieldTextarea, FieldSelect } from '../Components/Modal';
import TaskDetailDrawer from '../Components/TaskDetailDrawer';
import LabelManager, { LabelChip, LabelPicker } from '../Components/LabelManager';

// ── Helpers ──────────────────────────────────────────────────────────────────
function initials(name = '') {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function avatarColor(name = '') {
    const COLORS = ['bg-violet-500','bg-sky-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-indigo-500','bg-pink-500'];
    let h = 0;
    for (let c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return COLORS[h % COLORS.length];
}
// ── Avatar stack (multiple assignees) ───────────────────────────────────────
function AvatarStack({ assignees = [], size = 7 }) {
    if (!assignees.length) return (
        <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-sm shrink-0">👤</div>
            <span className="text-sm text-gray-400 italic">Unassigned</span>
        </div>
    );
    const shown = assignees.slice(0, 3);
    const extra = assignees.length - 3;
    return (
        <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1.5">
                {shown.map(u => (
                    <div key={u.id} title={u.name}
                        className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shrink-0 ${avatarColor(u.name)}`}>
                        {initials(u.name)}
                    </div>
                ))}
                {extra > 0 && (
                    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white bg-gray-300 text-gray-700 shrink-0`}>
                        +{extra}
                    </div>
                )}
            </div>
            {assignees.length === 1 && (
                <span className="text-sm font-medium text-gray-800">{assignees[0].name}</span>
            )}
            {assignees.length > 1 && (
                <span className="text-sm text-gray-500">{assignees.length} assignees</span>
            )}
        </div>
    );
}

// ── Compact avatar stack (for compact row view) ───────────────────────────────
function AvatarStackCompact({ assignees = [] }) {
    if (!assignees.length) return (
        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">?</div>
    );
    const shown = assignees.slice(0, 3);
    const extra = assignees.length - 3;
    return (
        <div className="flex -space-x-1">
            {shown.map(u => (
                <div key={u.id} title={u.name}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shrink-0 ${avatarColor(u.name)}`}>
                    {initials(u.name)}
                </div>
            ))}
            {extra > 0 && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white bg-gray-300 text-gray-700 shrink-0">
                    +{extra}
                </div>
            )}
        </div>
    );
}

// ── Multi-assignee picker (checkbox list) ─────────────────────────────────────
function MultiAssigneePicker({ users = [], selected = [], onChange, disabled = false }) {
    return (
        <div className={`space-y-0.5 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-1.5 bg-white ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
            {users.length === 0 ? (
                <p className="text-xs text-gray-400 italic px-2 py-1">No users available</p>
            ) : (
                users.map(u => {
                    const isChecked = selected.some(id => Number(id) === u.id);
                    return (
                        <label key={u.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" checked={isChecked}
                                onChange={e => {
                                    if (e.target.checked) onChange([...selected, u.id]);
                                    else onChange(selected.filter(id => Number(id) !== u.id));
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(u.name)}`}>
                                {initials(u.name)}
                            </div>
                            <span className="text-xs text-gray-700 truncate">{u.name}</span>
                        </label>
                    );
                })
            )}
        </div>
    );
}

function dueDateInfo(due_date, status) {
    if (!due_date) return null;
    const due = new Date(due_date); due.setHours(0,0,0,0);
    const now = new Date();        now.setHours(0,0,0,0);
    const diff = Math.round((due - now) / 86400000);
    const isOverdue = status === 'in_progress' && diff < 0;
    if (status === 'done' && diff >= 0) {
        const dateFmt = due.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        const label = diff === 0 ? `Selesai tepat waktu ✓` : `Selesai lebih awal ✓ · ${dateFmt}`;
        return { label, isOverdue: false, isDoneOnTime: true, diff };
    }
    if (status === 'done' && diff < 0) {
        const label = due.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        return { label, isOverdue: false, isDoneOnTime: false, diff };
    }
    let label;
    if (diff === 0)      label = 'Due today';
    else if (diff === 1) label = 'Due tomorrow';
    else if (diff === -1)label = '1 day overdue';
    else if (diff < 0)   label = `${Math.abs(diff)} days overdue`;
    else                 label = `Due in ${diff} days`;
    return { label, isOverdue, diff };
}

const STATUS_META = {
    todo:        { label: 'To Do',       cls: 'bg-slate-100 text-slate-700',   bar: 'bg-slate-400' },
    in_progress: { label: 'In Progress', cls: 'bg-blue-100  text-blue-700',    bar: 'bg-blue-500'  },
    done:        { label: 'Done',        cls: 'bg-emerald-100 text-emerald-700',bar: 'bg-emerald-500'},
};
const PRIORITY_META = {
    critical: { label: 'Critical', cls: 'bg-red-100 text-red-700',     icon: '🔴' },
    high:     { label: 'High',     cls: 'bg-orange-100 text-orange-700',icon: '🟠' },
    medium:   { label: 'Medium',   cls: 'bg-yellow-100 text-yellow-700',icon: '🟡' },
    low:      { label: 'Low',      cls: 'bg-green-100 text-green-700',  icon: '🟢' },
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function Board({ auth, board, tasks, users, labels: initialLabels = [] }) {
    const [showEditForm,  setShowEditForm]  = useState(false);
    const [selectedTask,  setSelectedTask]  = useState(null);
    const [viewTaskId,    setViewTaskId]    = useState(null);
    const [labels,        setLabels]         = useState(initialLabels);

    // Derive viewTask reactively so the drawer always shows fresh data after Inertia refreshes
    const viewTask = useMemo(() => tasks?.find(t => t.id === viewTaskId) ?? null, [tasks, viewTaskId]);
    const [showLabelMgr,  setShowLabelMgr]  = useState(false);
    const [updatingTaskStatus, setUpdatingTaskStatus] = useState(null);
    const [updatingTaskAssign, setUpdatingTaskAssign] = useState(null);

    // ── Confirm dialog ──────────────────────────────────────
    const CONFIRM_INIT = { open: false, title: '', message: '', onConfirm: null, loading: false };
    const [confirmState, setConfirmState] = useState(CONFIRM_INIT);
    const openConfirm = (title, message, onConfirm) =>
        setConfirmState({ open: true, title, message, onConfirm, loading: false });
    const closeConfirm = () => setConfirmState(CONFIRM_INIT);

    const { data, setData, post, processing, errors, reset } = useForm({
        title: '', description: '', status: 'todo', priority: 'medium',
        progress: 0, assignee_ids: [], start_date: '', due_date: '', label_ids: [],
    });

    const editForm = useForm({
        title: '', description: '', status: 'todo', priority: 'medium',
        progress: 0, assignee_ids: [], start_date: '', due_date: '', label_ids: [],
    });

    const canManageTask = auth.user.role === 'admin' || auth.user.role === 'manager';
    const canEditTask   = (task) => canManageTask || task.assignees?.some(a => a.id === auth.user.id);

    // granular task permissions (from globally-shared userPermissions)
    const userPermissions = usePage().props.userPermissions ?? [];
    const canEditDetail     = canManageTask || userPermissions.includes('edit_task_detail');
    const canEditStatus     = canManageTask || userPermissions.includes('edit_task_status');
    const canUpdateProgress = canManageTask || userPermissions.includes('update_task_progress');

    const submit = (e) => {
        e.preventDefault();
        post(`/boards/${board.id}/tasks`, { onSuccess: () => reset() });
    };

    const openEdit = (task) => {
        setSelectedTask(task);
        editForm.setData({
            title:       task.title,
            description: task.description || '',
            status:      task.status,
            priority:    task.priority || 'medium',
            progress:    task.progress ?? 0,
            assignee_ids: task.assignees?.map(a => a.id) ?? [],
            start_date:  task.start_date ? task.start_date.slice(0, 10) : '',
            due_date:    task.due_date ? task.due_date.slice(0, 10) : '',
            label_ids:   task.labels?.map(l => l.id) ?? [],
        });
        setViewTaskId(null);
        setShowEditForm(true);
    };

    const updateTask = (e) => {
        e.preventDefault();
        // Use editForm.patch() so editForm.processing is correctly tracked
        editForm.patch(`/tasks/${selectedTask.id}`, {
            onSuccess: () => { setShowEditForm(false); editForm.reset(); setSelectedTask(null); },
            preserveScroll: true,
        });
    };

    const updateStatus = (taskId, newStatus) => {
        setUpdatingTaskStatus(taskId);
        router.patch(`/tasks/${taskId}/status`, { status: newStatus }, {
            preserveScroll: true,
            onFinish: () => setUpdatingTaskStatus(null),
        });
    };

    const updateAssign = (taskId, assigneeIds) => {
        setUpdatingTaskAssign(taskId);
        router.patch(`/tasks/${taskId}/assignment`, { assignee_ids: assigneeIds }, {
            preserveScroll: true,
            onFinish: () => setUpdatingTaskAssign(null),
        });
    };

    const deleteTask = (task) => {
        openConfirm(
            `Hapus Task?`,
            `Task "${task.title}" akan dihapus permanen.`,
            () => {
                setConfirmState(s => ({ ...s, loading: true }));
                router.delete(`/tasks/${task.id}/delete`, {
                    preserveScroll: true,
                    onFinish: closeConfirm,
                });
            }
        );
    };

    // ── Filter / Sort / View state ────────────────────────────────
    const [searchQuery,     setSearchQuery]     = useState('');
    const [filterStatus,    setFilterStatus]    = useState('all');
    const [filterPriority,  setFilterPriority]  = useState('all');
    const [filterLabel,     setFilterLabel]     = useState('all');
    const [sortBy,          setSortBy]          = useState('default');
    const [collapsedGroups, setCollapsedGroups] = useState({});
    const [viewMode,        setViewMode]        = useState('full');

    const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

    const filteredTasks = useMemo(() => {
        let t = tasks ?? [];
        const q = searchQuery.toLowerCase();
        if (q) t = t.filter(x => x.title.toLowerCase().includes(q) || (x.description || '').toLowerCase().includes(q));
        if (filterStatus   !== 'all') t = t.filter(x => x.status   === filterStatus);
        if (filterPriority !== 'all') t = t.filter(x => x.priority === filterPriority);
        if (filterLabel    !== 'all') t = t.filter(x => x.labels?.some(l => l.id === parseInt(filterLabel)));
        if (sortBy === 'priority') t = [...t].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4));
        if (sortBy === 'due_date') t = [...t].sort((a, b) => { if (!a.due_date) return 1; if (!b.due_date) return -1; return new Date(a.due_date) - new Date(b.due_date); });
        if (sortBy === 'progress') t = [...t].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
        return t;
    }, [tasks, searchQuery, filterStatus, filterPriority, filterLabel, sortBy]);

    const groupedTasks = useMemo(() => ({
        in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
        todo:        filteredTasks.filter(t => t.status === 'todo'),
        done:        filteredTasks.filter(t => t.status === 'done'),
    }), [filteredTasks]);

    const taskStats = useMemo(() => {
        const all = tasks ?? [];
        return {
            total:      all.length,
            overdue:    all.filter(t => dueDateInfo(t.due_date, t.status)?.isOverdue).length,
            done:       all.filter(t => t.status === 'done').length,
            inProgress: all.filter(t => t.status === 'in_progress').length,
        };
    }, [tasks]);

    const toggleGroup = (key) => setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <AppLayout auth={auth} title={board.name}>
            <Head title={`${board.name} - Tasks`} />

            <ConfirmDialog
                open={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={confirmState.onConfirm}
                onCancel={closeConfirm}
                loading={confirmState.loading}
            />

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
                <Link href="/dashboard" className="hover:text-gray-800 font-medium">Dashboard</Link>
                <span>/</span>
                <Link href={`/boards/${board.id}`} className="text-gray-900 font-semibold">{board.name}</Link>
                {board.project && (<><span>/</span><span className="text-gray-600">{board.project.name}</span></>)}
            </div>

            <div className={`grid grid-cols-1 gap-6 ${canManageTask ? 'xl:grid-cols-[320px_1fr]' : ''}`}>

                {/* ── Add Task Form (admin/manager only) ────────── */}
                {canManageTask && (
                <div className="xl:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-4">Add New Task</h2>
                        <form onSubmit={submit} className="space-y-5">
                            {/* 📝 Informasi Task */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2.5 flex items-center gap-1.5">
                                    <span>📝</span> Informasi Task
                                </p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Judul <span className="text-red-500">*</span></label>
                                        <input type="text" value={data.title} onChange={e => setData('title', e.target.value)}
                                            placeholder="Masukkan judul task..."
                                            className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                                        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Deskripsi</label>
                                        <textarea value={data.description} onChange={e => setData('description', e.target.value)}
                                            placeholder="Deskripsi (opsional)..."
                                            rows={3} className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
                                    </div>
                                </div>
                            </div>

                            {/* 🏷️ Status & Prioritas */}
                            <div className="border-t border-gray-100 pt-4">
                                <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2.5 flex items-center gap-1.5">
                                    <span>🏷️</span> Status & Prioritas
                                </p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Status</label>
                                        <div className="flex gap-1.5 flex-wrap">
                                            {[
                                                { val: 'todo',        label: 'Todo',        on: 'bg-gray-500 text-white border-gray-500'       },
                                                { val: 'in_progress', label: 'In Progress', on: 'bg-blue-500 text-white border-blue-500'       },
                                                { val: 'done',        label: 'Done',        on: 'bg-emerald-500 text-white border-emerald-500' },
                                            ].map(({ val, label, on }) => (
                                                <button key={val} type="button"
                                                    onClick={() => setData('status', val)}
                                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                                                        data.status === val ? on : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'
                                                    }`}
                                                >{label}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Prioritas</label>
                                        <div className="flex gap-1.5 flex-wrap">
                                            {[
                                                { val: 'low',      label: 'Low',      on: 'bg-gray-400 text-white border-gray-400'     },
                                                { val: 'medium',   label: 'Medium',   on: 'bg-amber-400 text-white border-amber-400'   },
                                                { val: 'high',     label: 'High',     on: 'bg-orange-500 text-white border-orange-500' },
                                                { val: 'critical', label: 'Critical', on: 'bg-red-600 text-white border-red-600'       },
                                            ].map(({ val, label, on }) => (
                                                <button key={val} type="button"
                                                    onClick={() => setData('priority', val)}
                                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                                                        data.priority === val ? on : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'
                                                    }`}
                                                >{label}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Progress</label>
                                            <span className="text-sm font-bold text-blue-600">{data.progress}%</span>
                                        </div>
                                        <input type="range" min="0" max="100" step="5" value={data.progress}
                                            onChange={e => setData('progress', parseInt(e.target.value))}
                                            className="block w-full h-2 rounded-lg cursor-pointer accent-blue-600"
                                            style={{ background: `linear-gradient(to right, #3b82f6 ${data.progress}%, #e5e7eb ${data.progress}%)` }}
                                        />
                                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                                            <span>0%</span><span>50%</span><span>100%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 👤 Penugasan & Jadwal */}
                            <div className="border-t border-gray-100 pt-4">
                                <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2.5 flex items-center gap-1.5">
                                    <span>👤</span> Penugasan & Jadwal
                                </p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Assign To</label>
                                        <MultiAssigneePicker
                                            users={users ?? []}
                                            selected={data.assignee_ids}
                                            onChange={ids => setData('assignee_ids', ids)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Start Date</label>
                                            <input type="date" value={data.start_date} onChange={e => setData('start_date', e.target.value)}
                                                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Due Date</label>
                                            <input type="date" value={data.due_date} onChange={e => setData('due_date', e.target.value)}
                                                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 🏷 Labels */}
                            {labels.length > 0 && (
                            <div className="border-t border-gray-100 pt-4">
                                <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2.5 flex items-center gap-1.5">
                                    <span>🏷</span> Labels
                                </p>
                                <LabelPicker allLabels={labels} selected={data.label_ids} onChange={ids => setData('label_ids', ids)} />
                            </div>
                            )}

                            <button type="submit" disabled={processing}
                                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
                                {processing
                                    ? <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Menyimpan...</>
                                    : 'Buat Task'
                                }
                            </button>
                        </form>
                    </div>
                </div>
                )}

                {/* ── Edit Task Modal ───────────────────────── */}
                <Modal open={showEditForm && !!selectedTask} onClose={() => { setShowEditForm(false); setSelectedTask(null); editForm.reset(); }} title="Edit Task" icon="edit" size="lg" processing={editForm.processing}>
                    <form onSubmit={updateTask}>
                        <ModalBody>
                            {!canEditDetail && !canEditStatus && !canUpdateProgress && (
                                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-1">
                                    ⚠️ Anda tidak memiliki izin mengedit task ini.
                                </p>
                            )}
                            <div>
                                <FieldLabel required>Title</FieldLabel>
                                <FieldInput type="text" value={editForm.data.title} onChange={e => editForm.setData('title', e.target.value)} required disabled={!canEditDetail} />
                            </div>
                            <div>
                                <FieldLabel>Description</FieldLabel>
                                <FieldTextarea value={editForm.data.description} onChange={e => editForm.setData('description', e.target.value)} rows={3} disabled={!canEditDetail} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <FieldLabel>Status</FieldLabel>
                                    <FieldSelect value={editForm.data.status} onChange={e => editForm.setData('status', e.target.value)} disabled={!canEditStatus}>
                                        <option value="todo">To Do</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="done">Done</option>
                                    </FieldSelect>
                                </div>
                                <div>
                                    <FieldLabel>Priority</FieldLabel>
                                    <FieldSelect value={editForm.data.priority} onChange={e => editForm.setData('priority', e.target.value)} disabled={!canEditDetail}>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </FieldSelect>
                                </div>
                            </div>
                            <div>
                                <FieldLabel>Progress: {editForm.data.progress}%</FieldLabel>
                                <input type="range" min="0" max="100" step="5" value={editForm.data.progress}
                                    onChange={e => editForm.setData('progress', parseInt(e.target.value))}
                                    disabled={!canUpdateProgress}
                                    className={`block w-full accent-blue-600 ${!canUpdateProgress ? 'opacity-40 cursor-not-allowed' : ''}`} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <FieldLabel>Start Date</FieldLabel>
                                    <FieldInput type="date" value={editForm.data.start_date} onChange={e => editForm.setData('start_date', e.target.value)} disabled={!canEditDetail} />
                                </div>
                                <div>
                                    <FieldLabel>Due Date</FieldLabel>
                                    <FieldInput type="date" value={editForm.data.due_date} onChange={e => editForm.setData('due_date', e.target.value)} disabled={!canEditDetail} />
                                </div>
                            </div>
                            {canManageTask && (
                                <div>
                                    <FieldLabel>Assigned To</FieldLabel>
                                    <MultiAssigneePicker
                                        users={users ?? []}
                                        selected={editForm.data.assignee_ids}
                                        onChange={ids => editForm.setData('assignee_ids', ids)}
                                    />
                                </div>
                            )}
                            {labels.length > 0 && (
                                <div>
                                    <FieldLabel>Labels</FieldLabel>
                                    <LabelPicker allLabels={labels} selected={editForm.data.label_ids} onChange={ids => editForm.setData('label_ids', ids)} />
                                </div>
                            )}
                        </ModalBody>
                        <ModalFooter
                            onCancel={() => { setShowEditForm(false); setSelectedTask(null); editForm.reset(); }}
                            submitLabel="Simpan Perubahan"
                            processing={editForm.processing}
                        />
                    </form>
                </Modal>
                                {/* ── Task List ─────────────────────────────────── */}
                <div className="xl:col-span-1 min-w-0">

                    {/* Stats bar */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                        {[
                            { label: 'Total',       value: taskStats.total,      color: 'text-gray-900',    border: 'border-gray-200'    },
                            { label: 'In Progress', value: taskStats.inProgress, color: 'text-blue-600',    border: 'border-blue-200'    },
                            { label: 'Done',        value: taskStats.done,       color: 'text-emerald-600', border: 'border-emerald-200' },
                            { label: 'Overdue',     value: taskStats.overdue,    color: 'text-red-600',     border: 'border-red-200'     },
                        ].map(({ label, value, color, border }) => (
                            <div key={label} className={`bg-white rounded-xl border ${border} px-4 py-3 text-center`}>
                                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Filter + Search + Sort bar */}
                    <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex flex-wrap gap-2 items-center">
                        <div className="relative flex-1 min-w-[160px]">
                            <input
                                type="text"
                                placeholder="🔍 Cari task..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-3 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600">&times;</button>
                            )}
                        </div>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-blue-500">
                            <option value="all">All Status</option>
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                        </select>
                        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-blue-500">
                            <option value="all">All Priority</option>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                        {labels.length > 0 && (
                        <select value={filterLabel} onChange={e => setFilterLabel(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-blue-500">
                            <option value="all">All Labels</option>
                            {labels.map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                        )}
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-blue-500">
                            <option value="default">Sort: Default</option>
                            <option value="priority">Sort: Priority</option>
                            <option value="due_date">Sort: Due Date</option>
                            <option value="progress">Sort: Progress</option>
                        </select>
                        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                            <button type="button" onClick={() => setViewMode('full')} title="Full view"
                                className={`px-2.5 py-1.5 text-xs font-medium transition ${viewMode === 'full' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                                ☰ Full
                            </button>
                            <button type="button" onClick={() => setViewMode('compact')} title="Compact view"
                                className={`px-2.5 py-1.5 text-xs font-medium border-l border-gray-200 transition ${viewMode === 'compact' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                                ≡ Compact
                            </button>
                        </div>
                        {canManageTask && (
                        <button type="button" onClick={() => setShowLabelMgr(true)}
                            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 whitespace-nowrap">
                            🏷 Labels
                        </button>
                        )}
                    </div>

                    {/* Active filter summary */}
                    {(searchQuery || filterStatus !== 'all' || filterPriority !== 'all' || filterLabel !== 'all') && (
                        <p className="text-xs text-gray-500 mb-3">
                            Menampilkan <strong>{filteredTasks.length}</strong> dari <strong>{taskStats.total}</strong> task &mdash;{' '}
                            <button type="button" onClick={() => { setSearchQuery(''); setFilterStatus('all'); setFilterPriority('all'); setFilterLabel('all'); }} className="text-blue-500 hover:underline">Hapus filter</button>
                        </p>
                    )}

                    {/* Empty state */}
                    {filteredTasks.length === 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                            <p className="text-4xl mb-3">
                                {(searchQuery || filterStatus !== 'all' || filterPriority !== 'all' || filterLabel !== 'all') ? '🔍' : '📋'}
                            </p>
                            <p className="text-gray-600 text-base font-medium">
                                {(searchQuery || filterStatus !== 'all' || filterPriority !== 'all' || filterLabel !== 'all')
                                    ? 'Tidak ada task yang sesuai filter.'
                                    : canManageTask ? 'Belum ada task. Buat task pertama Anda!' : 'Belum ada task yang ditugaskan.'}
                            </p>
                        </div>
                    )}

                    {/* Grouped task sections */}
                    {filteredTasks.length > 0 && (
                        <div className="space-y-4">
                            {[
                                { key: 'in_progress', label: 'In Progress', dot: 'bg-blue-500',    light: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200'    },
                                { key: 'todo',        label: 'To Do',       dot: 'bg-slate-400',   light: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-200'   },
                                { key: 'done',        label: 'Done',        dot: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
                            ].map(({ key, label, dot, light, text, border }) => {
                                const group = groupedTasks[key];
                                if (group.length === 0) return null;
                                const isCollapsed = !!collapsedGroups[key];
                                return (
                                    <div key={key} className={`rounded-xl border ${border} overflow-hidden`}>

                                        {/* Group header (click to collapse) */}
                                        <button type="button" onClick={() => toggleGroup(key)}
                                            className={`w-full flex items-center justify-between px-4 py-3 ${light} hover:brightness-95 transition`}>
                                            <div className="flex items-center gap-2.5">
                                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${dot}`} />
                                                <span className={`text-sm font-bold ${text}`}>{label}</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/70 border ${border} ${text}`}>{group.length}</span>
                                            </div>
                                            <span className={`text-xs ${text} transition-transform duration-200 inline-block ${isCollapsed ? 'rotate-180' : ''}`}>▾</span>
                                        </button>

                                        {/* Task rows */}
                                        {!isCollapsed && (
                                            <div className="divide-y divide-gray-100">
                                                {group.map(task => {
                                                    const sm  = STATUS_META[task.status]     ?? STATUS_META.todo;
                                                    const pm  = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;
                                                    const due = dueDateInfo(task.due_date, task.status);

                                                    if (viewMode === 'compact') return (
                                                        <div key={task.id} className="bg-white px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition group/row">
                                                            <span className={`shrink-0 w-2 h-2 rounded-full ${dot}`} />
                                                            <button onClick={() => setViewTaskId(task.id)} className="flex-1 text-left text-sm font-medium text-gray-900 hover:text-blue-600 truncate">
                                                                {task.title}
                                                            </button>
                                                            <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full font-semibold ${pm.cls}`}>{pm.icon} {pm.label}</span>
                                                            {task.labels?.map(l => <LabelChip key={l.id} label={l} />)}
                                                            {due && (
                                                                <span className={`shrink-0 text-xs whitespace-nowrap ${due.isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                                                                    {due.label}
                                                                </span>
                                                            )}
                                                            <div className="shrink-0"><AvatarStackCompact assignees={task.assignees ?? []} /></div>
                                                            <div className="shrink-0 hidden group-hover/row:flex items-center gap-1">
                                                                {canEditTask(task) && (
                                                                    <button onClick={() => openEdit(task)} className="text-xs text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition">Edit</button>
                                                                )}
                                                                {canManageTask && (
                                                                    <button onClick={() => deleteTask(task)} className="text-xs text-red-600 px-2 py-1 rounded hover:bg-red-50 transition">Del</button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );

                                                    // Full view card
                                                    return (
                                                        <div key={task.id} className={`bg-white p-5 border-l-4 ${
                                                            due?.isOverdue           ? 'border-l-red-500' :
                                                            task.status === 'done'        ? 'border-l-emerald-500' :
                                                            task.status === 'in_progress' ? 'border-l-blue-500' : 'border-l-slate-300'
                                                        } hover:bg-gray-50/60 transition`}>
                                                            <div className="flex justify-between items-start gap-4">
                                                                {/* Left: task info */}
                                                                <div className="flex-1 min-w-0">
                                                                    <button onClick={() => setViewTaskId(task.id)} className="text-left text-base font-semibold text-gray-900 hover:text-blue-600 transition leading-snug break-words">
                                                                        {task.title}
                                                                    </button>
                                                                    {task.description && (
                                                                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{task.description}</p>
                                                                    )}
                                                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${sm.cls}`}>{sm.label}</span>
                                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${pm.cls}`}>{pm.icon} {pm.label}</span>
                                                                        {due && (
                                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                                due.isDoneOnTime ? 'bg-emerald-100 text-emerald-700' :
                                                                                due.isOverdue    ? 'bg-red-100 text-red-700' :
                                                                                due.diff === 0   ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                                                                            }`}>
                                                                                📅 {due.label}
                                                                            </span>
                                                                        )}
                                                                        {task.labels?.map(l => <LabelChip key={l.id} label={l} />)}
                                                                    </div>
                                                                    <div className="mt-3">
                                                                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                                                                            <span>Progress</span><span>{task.progress ?? 0}%</span>
                                                                        </div>
                                                                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                                            <div className={`h-1.5 rounded-full transition-all ${sm.bar}`} style={{ width: `${task.progress ?? 0}%` }} />
                                                                        </div>
                                                                    </div>
                                                                    {task.subtasks?.length > 0 && (
                                                                        <div className="mt-2 flex items-center gap-2">
                                                                            <span className="text-xs text-gray-400 shrink-0">&#128203; Subtasks</span>
                                                                            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                                                <div
                                                                                    className="h-full bg-violet-400 rounded-full"
                                                                                    style={{ width: `${Math.round((task.subtasks.filter(s => s.status === 'done').length / task.subtasks.length) * 100)}%` }}
                                                                                />
                                                                            </div>
                                                                            <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                                                                                {task.subtasks.filter(s => s.status === 'done').length}/{task.subtasks.length}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    <div className="mt-3">
                                                                        <AvatarStack assignees={task.assignees ?? []} />
                                                                    </div>
                                                                </div>
                                                                {/* Right: controls */}
                                                                <div className="flex flex-col gap-2 shrink-0 min-w-[180px]">
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                                                                        <div className="relative">
                                                                            <select value={task.status} onChange={e => updateStatus(task.id, e.target.value)}
                                                                                disabled={!canEditTask(task) || updatingTaskStatus === task.id}
                                                                                className="text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full disabled:opacity-60">
                                                                                <option value="todo">To Do</option>
                                                                                <option value="in_progress">In Progress</option>
                                                                                <option value="done">Done</option>
                                                                            </select>
                                                                            {updatingTaskStatus === task.id && (
                                                                                <span className="absolute inset-y-0 right-6 flex items-center pointer-events-none">
                                                                                    <svg className="animate-spin h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24">
                                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                                                    </svg>
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 pt-1">
                                                                        <button onClick={() => setViewTaskId(task.id)} className="flex-1 text-center text-sm font-medium text-gray-600 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition">Detail</button>
                                                                        {canEditTask(task) && (
                                                                            <button onClick={() => openEdit(task)} className="flex-1 text-center text-sm font-medium text-blue-600 px-3 py-1.5 border border-blue-300 rounded-lg hover:bg-blue-50 transition">Edit</button>
                                                                        )}
                                                                        {canManageTask && (
                                                                            <button onClick={() => deleteTask(task)} className="flex-1 text-center text-sm font-medium text-red-600 px-3 py-1.5 border border-red-300 rounded-lg hover:bg-red-50 transition">Delete</button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Task Detail Side Panel ────────────────────────── */}
            <TaskDetailDrawer
                key={viewTask?.id}
                task={viewTask}
                users={users ?? []}
                onClose={() => setViewTaskId(null)}
                onEdit={() => openEdit(viewTask)}
                canEditDetail={viewTask ? canEditDetail : false}
                canEditStatus={viewTask ? canEditStatus : false}
                canUpdateProgress={viewTask ? (canUpdateProgress || viewTask.assignees?.some(a => a.id === auth.user.id)) : false}
                canAssign={canManageTask}
                canManageTask={canManageTask}
                onStatusChange={updateStatus}
                onAssignChange={updateAssign}
                authUser={auth.user}
                allLabels={labels}
            />

            {/* ── Label Manager Modal ───────────────────────────── */}
            <Modal open={showLabelMgr} onClose={() => setShowLabelMgr(false)} title="Manage Labels" icon="tag" size="md">
                <ModalBody>
                    <LabelManager
                        projectId={board.project_id}
                        labels={labels}
                        onLabelsChange={setLabels}
                    />
                </ModalBody>
            </Modal>
        </AppLayout>
    );
}
