import React, { useState, useMemo } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '../Components/AppLayout';
import ConfirmDialog from '../Components/ConfirmDialog';
import Pagination from '../Components/Pagination';
import Modal, { ModalBody, ModalFooter, FieldLabel, FieldError, FieldInput, FieldTextarea, FieldSelect } from '../Components/Modal';
import TaskDetailDrawer from '../Components/TaskDetailDrawer';
import LabelManager, { LabelChip, LabelPicker } from '../Components/LabelManager';

function initials(name = '') {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function avatarColor(name = '') {
    const COLORS = ['bg-violet-500','bg-sky-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-indigo-500','bg-pink-500'];
    let h = 0;
    for (let c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return COLORS[h % COLORS.length];
}
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

const STATUS_LABEL = { todo: 'Todo', in_progress: 'In Progress', done: 'Done' };
const STATUS_COLOR = {
    todo:        'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    done:        'bg-green-100 text-green-700',
};
const PRIORITY_COLOR = {
    critical: 'bg-red-200 text-red-800',
    high:     'bg-red-100 text-red-700',
    medium:   'bg-yellow-100 text-yellow-700',
    low:      'bg-green-100 text-green-700',
};

export default function ManageTask({ auth, tasks, projects, boards, users, taskPermissions = {}, labels: initialLabels = [] }) {
    const isAdmin   = auth.user.role === 'admin';
    const isManager = auth.user.role === 'manager';
    const canManage = isAdmin || isManager;

    const [labels, setLabels] = useState(initialLabels);

    const {
        canCreate         = canManage,
        canEditDetail     = canManage,
        canEditStatus     = canManage,
        canUpdateProgress = canManage,
        canDelete         = canManage,
        canAssign         = canManage,
    } = taskPermissions;

    // ── Filters ──────────────────────────────────────────────
    const [search,          setSearch]          = useState('');
    const [filterStatus,    setFilterStatus]    = useState('all');
    const [filterPriority,  setFilterPriority]  = useState('all');
    const [filterProject,   setFilterProject]   = useState('all');
    const [filterBoard,     setFilterBoard]     = useState('all');
    const [filterAssignee,  setFilterAssignee]  = useState('all');
    const [filterLabel,     setFilterLabel]     = useState('all');

    // ── Sorting ───────────────────────────────────────────────
    const [sortKey,  setSortKey]  = useState('created_at');
    const [sortDir,  setSortDir]  = useState('desc');

    // ── Pagination ────────────────────────────────────────────
    const [page,     setPage]     = useState(1);
    const [perPage,  setPerPage]  = useState(10);

    // ── View drawer ───────────────────────────────────────────
    const [viewTaskId, setViewTaskId] = useState(null);
    // Derive viewTask reactively so the drawer always shows fresh data after Inertia refreshes
    const viewTask = useMemo(() => tasks?.find(t => t.id === viewTaskId) ?? null, [tasks, viewTaskId]);

    const updateStatus = (taskId, status) =>
        router.patch(`/tasks/${taskId}/status`, { status }, { preserveScroll: true });
    const updateAssign = (taskId, assignedTo) =>
        router.patch(`/tasks/${taskId}/assignment`, { assignee_ids: assignedTo ? [assignedTo] : [] }, { preserveScroll: true });

    // ── Edit modal ────────────────────────────────────────────
    const [editingTask, setEditingTask] = useState(null);

    // ── Confirm dialog ──────────────────────────────────────
    const CONFIRM_INIT = { open: false, title: '', message: '', onConfirm: null, loading: false };
    const [confirmState, setConfirmState] = useState(CONFIRM_INIT);
    const openConfirm = (title, message, onConfirm) =>
        setConfirmState({ open: true, title, message, onConfirm, loading: false });
    const closeConfirm = () => setConfirmState(CONFIRM_INIT);
    const editForm = useForm({
        title:       '',
        description: '',
        status:      'todo',
        priority:    'medium',
        progress:    0,
        assignee_ids: [],
        start_date:  '',
        due_date:    '',
        label_ids:   [],
    });

    // ── Add modal ─────────────────────────────────────────────
    const [showAddModal, setShowAddModal] = useState(false);
    const [addBoardProject, setAddBoardProject] = useState('all');
    const addForm = useForm({
        board_id:    '',
        title:       '',
        description: '',
        status:      'todo',
        priority:    'medium',
        progress:    0,
        assignee_ids: [],
        start_date:  '',
        due_date:    '',
        label_ids:   [],
    });

    const addBoardOptions = addBoardProject === 'all'
        ? boards
        : boards.filter((b) => b.project_id === parseInt(addBoardProject, 10));

    const openAdd = () => {
        addForm.reset();
        setAddBoardProject('all');
        setShowAddModal(true);
    };

    const submitAdd = (e) => {
        e.preventDefault();
        addForm.post('/manage-tasks', {
            onSuccess: () => { setShowAddModal(false); addForm.reset(); },
            preserveScroll: true,
        });
    };

    const openEdit = (task) => {
        setEditingTask(task);
        editForm.setData({
            title:       task.title,
            description: task.description || '',
            status:      task.status,
            priority:    task.priority || 'medium',
            progress:    task.progress ?? 0,
            assignee_ids: task.assignees?.map(a => a.id) ?? [],
            start_date:  task.start_date ? task.start_date.substring(0, 10) : '',
            due_date:    task.due_date ? task.due_date.substring(0, 10) : '',
            label_ids:   task.labels?.map(l => l.id) ?? [],
        });
    };

    const submitEdit = (e) => {
        e.preventDefault();
        editForm.patch(`/manage-tasks/${editingTask.id}`, {
            onSuccess: () => setEditingTask(null),
            preserveScroll: true,
        });
    };

    const handleDelete = (task) => {
        openConfirm(
            `Hapus Task "${task.title}"?`,
            'Task ini akan dihapus permanen dan tidak dapat dikembalikan.',
            () => {
                setConfirmState(s => ({ ...s, loading: true }));
                router.delete(`/manage-tasks/${task.id}`, {
                    preserveScroll: true,
                    onFinish: closeConfirm,
                });
            }
        );
    };

    // ── Filtered board options ───────────────────────────────
    const filteredBoardOptions = filterProject === 'all'
        ? boards
        : boards.filter((b) => b.project_id === parseInt(filterProject, 10));

    // ── Apply filters + search ────────────────────────────────
    const filtered = useMemo(() => {
        let data = [...tasks];

        if (search.trim()) {
            const q = search.toLowerCase();
            data = data.filter(
                (t) =>
                    t.title.toLowerCase().includes(q) ||
                    (t.description || '').toLowerCase().includes(q) ||
                    (t.assignees || []).some(a => a.name.toLowerCase().includes(q)),
            );
        }
        if (filterStatus   !== 'all') data = data.filter((t) => t.status   === filterStatus);
        if (filterPriority !== 'all') data = data.filter((t) => (t.priority || 'medium') === filterPriority);
        if (filterProject  !== 'all') data = data.filter((t) => t.board?.project?.id === parseInt(filterProject, 10));
        if (filterBoard    !== 'all') data = data.filter((t) => t.board?.id          === parseInt(filterBoard,   10));
        if (filterAssignee !== 'all') data = data.filter((t) => (t.assignees || []).some(a => String(a.id) === filterAssignee));
        if (filterLabel    !== 'all') data = data.filter((t) => t.labels?.some(l => l.id === parseInt(filterLabel)));

        // sort
        data.sort((a, b) => {
            let va = a[sortKey] ?? '';
            let vb = b[sortKey] ?? '';
            if (sortKey === 'assigned_user') {
                va = a.assignees?.[0]?.name ?? '';
                vb = b.assignees?.[0]?.name ?? '';
            }
            if (sortKey === 'board') {
                va = a.board?.name ?? '';
                vb = b.board?.name ?? '';
            }
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ?  1 : -1;
            return 0;
        });

        return data;
    }, [tasks, search, filterStatus, filterPriority, filterProject, filterBoard, filterAssignee, filterLabel, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const paginated  = filtered.slice((page - 1) * perPage, page * perPage);

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortKey(key); setSortDir('asc'); }
        setPage(1);
    };

    const resetFilter = () => {
        setSearch(''); setFilterStatus('all'); setFilterPriority('all');
        setFilterProject('all'); setFilterBoard('all'); setFilterAssignee('all'); setFilterLabel('all');
        setPage(1);
    };

    const SortIcon = ({ col }) => {
        if (sortKey !== col) return <span className="text-gray-300 ml-1">↕</span>;
        return <span className="text-blue-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
    };

    const thClass = 'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-gray-700';
    const tdClass = 'px-4 py-3 text-sm text-gray-700 align-top';
    const selectClass = 'block w-full border border-gray-300 rounded-md shadow-sm text-sm px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500 bg-white';

    return (
        <AppLayout auth={auth} title="Manage Tasks">
            <Head title="Manage Tasks" />

            <ConfirmDialog
                open={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={confirmState.onConfirm}
                onCancel={closeConfirm}
                loading={confirmState.loading}
            />

            {/* ── Page header ───────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manage Tasks</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Kelola semua task dalam satu tampilan.</p>
                </div>
                {canCreate && (
                    <button
                        onClick={openAdd}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm"
                    >
                        <span className="text-base leading-none">＋</span> Add Task
                    </button>
                )}
            </div>

            {/* ── Stats bar ─────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total',       value: tasks.length,                              color: 'text-gray-900' },
                    { label: 'Todo',        value: tasks.filter(t => t.status === 'todo').length,        color: 'text-gray-600' },
                    { label: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: 'text-blue-600' },
                    { label: 'Done',        value: tasks.filter(t => t.status === 'done').length,        color: 'text-green-600' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                    </div>
                ))}
            </div>

            {/* ── Filters ───────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    {/* Search */}
                    <div className="xl:col-span-2">
                        <input
                            type="text"
                            placeholder="Cari task, deskripsi, assignee…"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="block w-full border border-gray-300 rounded-md shadow-sm text-sm px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className={selectClass}>
                        <option value="all">Semua Status</option>
                        <option value="todo">Todo</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                    </select>

                    <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }} className={selectClass}>
                        <option value="all">Semua Priority</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>

                    <select value={filterProject} onChange={(e) => { setFilterProject(e.target.value); setFilterBoard('all'); setPage(1); }} className={selectClass}>
                        <option value="all">Semua Project</option>
                        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    <select value={filterBoard} onChange={(e) => { setFilterBoard(e.target.value); setPage(1); }} className={selectClass}>
                        <option value="all">Semua Board</option>
                        {filteredBoardOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                    <select value={filterAssignee} onChange={(e) => { setFilterAssignee(e.target.value); setPage(1); }} className={selectClass}>
                        <option value="all">Semua Assignee</option>
                        {users.map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
                    </select>

                    {labels.length > 0 && (
                    <select value={filterLabel} onChange={(e) => { setFilterLabel(e.target.value); setPage(1); }} className={selectClass}>
                        <option value="all">Semua Label</option>
                        {labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    )}

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{filtered.length} task ditemukan</span>
                        <button onClick={resetFilter} className="text-xs text-blue-600 hover:underline ml-2">Reset Filter</button>
                    </div>
                </div>
            </div>

            {/* ── Datatable ─────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className={thClass} onClick={() => toggleSort('title')}>
                                    Task <SortIcon col="title" />
                                </th>
                                <th className={thClass} onClick={() => toggleSort('status')}>
                                    Status <SortIcon col="status" />
                                </th>
                                <th className={thClass} onClick={() => toggleSort('priority')}>
                                    Priority <SortIcon col="priority" />
                                </th>
                                <th className={thClass}>Progress</th>
                                <th className={thClass} onClick={() => toggleSort('assigned_user')}>
                                    Assignee <SortIcon col="assigned_user" />
                                </th>
                                <th className={thClass} onClick={() => toggleSort('board')}>
                                    Board / Project <SortIcon col="board" />
                                </th>
                <th className={thClass} onClick={() => toggleSort('start_date')}>
                                    Start Date <SortIcon col="start_date" />
                                </th>
                                <th className={thClass} onClick={() => toggleSort('due_date')}>
                                    Due Date <SortIcon col="due_date" />
                                </th>
                                <th className={thClass} onClick={() => toggleSort('created_at')}>
                                    Created <SortIcon col="created_at" />
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                                        Tidak ada task yang sesuai filter.
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((task) => (
                                    <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                                        {/* Title */}
                                        <td className={tdClass + ' max-w-xs'}>
                                            <p className="font-medium text-gray-900 leading-snug">{task.title}</p>
                                            {task.description && (
                                                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]" title={task.description}>
                                                    {task.description}
                                                </p>
                                            )}
                                            {task.subtasks?.length > 0 && (
                                                <span className="inline-flex items-center gap-1 mt-1 text-xs text-violet-600 font-medium">
                                                    &#128203; {task.subtasks.filter(s => s.status === 'done').length}/{task.subtasks.length} subtasks
                                                </span>
                                            )}
                                            {task.labels?.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {task.labels.map(l => <LabelChip key={l.id} label={l} />)}
                                                </div>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className={tdClass}>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[task.status]}`}>
                                                {STATUS_LABEL[task.status] ?? task.status}
                                            </span>
                                        </td>

                                        {/* Priority */}
                                        <td className={tdClass}>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLOR[task.priority || 'medium']}`}>
                                                {(task.priority || 'medium').charAt(0).toUpperCase() + (task.priority || 'medium').slice(1)}
                                            </span>
                                        </td>

                                        {/* Progress */}
                                        <td className={tdClass + ' min-w-[120px]'}>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                                    <div
                                                        className="bg-blue-500 h-1.5 rounded-full"
                                                        style={{ width: `${task.progress ?? 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-500 w-8 text-right shrink-0">
                                                    {task.progress ?? 0}%
                                                </span>
                                            </div>
                                        </td>

                                        {/* Assignee */}
                                        <td className={tdClass}>
                                            {task.assignees && task.assignees.length > 0 ? (
                                                <div className="flex -space-x-1.5">
                                                    {task.assignees.slice(0, 3).map(u => (
                                                        <div key={u.id} title={u.name}
                                                            className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 ring-2 ring-white">
                                                            {u.name.charAt(0).toUpperCase()}
                                                        </div>
                                                    ))}
                                                    {task.assignees.length > 3 && (
                                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-gray-600 text-xs font-bold shrink-0 ring-2 ring-white">
                                                            +{task.assignees.length - 3}
                                                        </div>
                                                    )}
                                                    <span className="ml-2 text-gray-800 text-sm self-center">
                                                        {task.assignees.length === 1 ? task.assignees[0].name : `${task.assignees.length} assignees`}
                                                    </span>
                                                </div>
                                            ) : <span className="text-gray-400 text-xs">Unassigned</span>}
                                        </td>

                                        {/* Board / Project */}
                                        <td className={tdClass}>
                                            {task.board ? (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500">{task.board.project?.name || '—'}</p>
                                                    <p className="text-sm text-gray-800">{task.board.name}</p>
                                                </div>
                                            ) : <span className="text-gray-400 text-xs">—</span>}
                                        </td>

                                        {/* Start Date */}
                                        <td className={tdClass + ' whitespace-nowrap'}>
                                            {task.start_date
                                                ? new Date(task.start_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : <span className="text-gray-400 text-xs">&mdash;</span>}
                                        </td>

                                        {/* Due Date */}
                                        <td className={tdClass + ' whitespace-nowrap'}>
                                            {task.due_date
                                                ? new Date(task.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : <span className="text-gray-400 text-xs">—</span>}
                                        </td>

                                        {/* Created */}
                                        <td className={tdClass + ' whitespace-nowrap text-xs text-gray-500'}>
                                            {new Date(task.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <button
                                                onClick={() => setViewTaskId(task.id)}
                                                className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 mr-1"
                                            >
                                                Detail
                                            </button>
                                            {canEditDetail && (
                                                <>
                                                    <button
                                                        onClick={() => openEdit(task)}
                                                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 mr-1"
                                                    >
                                                        Edit
                                                    </button>
                                                    {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(task)}
                                                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                                                    >
                                                        Hapus
                                                    </button>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={filtered.length}
                    perPage={perPage}
                    onPageChange={setPage}
                    onPerPageChange={p => { setPerPage(p); setPage(1); }}
                    label="task"
                />
            </div>

            {/* ── Add Task Modal ────────────────────────── */}
            <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Tambah Task Baru" icon="+" size="xl" processing={addForm.processing}>
                <form onSubmit={submitAdd}>
                    <ModalBody>
                        <div className="grid grid-cols-2 gap-x-6">
                            {/* ── Left column ── */}
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2.5 flex items-center gap-1.5">
                                        <span>📍</span> Lokasi
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <FieldLabel>Filter Project</FieldLabel>
                                            <FieldSelect
                                                value={addBoardProject}
                                                onChange={(e) => { setAddBoardProject(e.target.value); addForm.setData('board_id', ''); }}
                                            >
                                                <option value="all">Semua Project</option>
                                                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </FieldSelect>
                                        </div>
                                        <div>
                                            <FieldLabel required>Board</FieldLabel>
                                            <FieldSelect
                                                value={addForm.data.board_id}
                                                onChange={(e) => addForm.setData('board_id', e.target.value)}
                                                required
                                            >
                                                <option value="">Pilih Board</option>
                                                {addBoardOptions.map((b) => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </FieldSelect>
                                            <FieldError>{addForm.errors.board_id}</FieldError>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-gray-100 pt-4">
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2.5 flex items-center gap-1.5">
                                        <span>📝</span> Informasi Task
                                    </p>
                                    <div className="space-y-3">
                                        <div>
                                            <FieldLabel required>Judul Task</FieldLabel>
                                            <FieldInput
                                                type="text"
                                                value={addForm.data.title}
                                                onChange={(e) => addForm.setData('title', e.target.value)}
                                                placeholder="Masukkan judul task..."
                                                required
                                            />
                                            <FieldError>{addForm.errors.title}</FieldError>
                                        </div>
                                        <div>
                                            <FieldLabel>Deskripsi</FieldLabel>
                                            <FieldTextarea
                                                value={addForm.data.description}
                                                onChange={(e) => addForm.setData('description', e.target.value)}
                                                rows={3}
                                                placeholder="Tambahkan deskripsi task (opsional)..."
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-gray-100 pt-4">
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2.5 flex items-center gap-1.5">
                                        <span>👤</span> Penugasan & Jadwal
                                    </p>
                                    <div className="space-y-3">
                                        <div>
                                            <FieldLabel>Assign To</FieldLabel>
                                            <MultiAssigneePicker
                                                users={users ?? []}
                                                selected={addForm.data.assignee_ids}
                                                onChange={ids => addForm.setData('assignee_ids', ids)}
                                            />
                                            {addForm.errors.assignee_ids && <FieldError>{addForm.errors.assignee_ids}</FieldError>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <FieldLabel>Start Date</FieldLabel>
                                                <FieldInput
                                                    type="date"
                                                    value={addForm.data.start_date}
                                                    onChange={(e) => addForm.setData('start_date', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <FieldLabel>Due Date</FieldLabel>
                                                <FieldInput
                                                    type="date"
                                                    value={addForm.data.due_date}
                                                    onChange={(e) => addForm.setData('due_date', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* ── Right column ── */}
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2.5 flex items-center gap-1.5">
                                        <span>🏷️</span> Status & Prioritas
                                    </p>
                                    <div className="space-y-3">
                                        <div>
                                            <FieldLabel>Status</FieldLabel>
                                            <div className="flex gap-1.5 flex-wrap mt-1">
                                                {[
                                                    { val: 'todo',        label: 'Todo',        on: 'bg-gray-500 text-white border-gray-500'       },
                                                    { val: 'in_progress', label: 'In Progress', on: 'bg-blue-500 text-white border-blue-500'       },
                                                    { val: 'done',        label: 'Done',        on: 'bg-emerald-500 text-white border-emerald-500' },
                                                ].map(({ val, label, on }) => (
                                                    <button key={val} type="button" onClick={() => addForm.setData('status', val)}
                                                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                                                            addForm.data.status === val ? on : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'
                                                        }`}>{label}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <FieldLabel>Prioritas</FieldLabel>
                                            <div className="flex gap-1.5 flex-wrap mt-1">
                                                {[
                                                    { val: 'low',      label: 'Low',      on: 'bg-gray-400 text-white border-gray-400'     },
                                                    { val: 'medium',   label: 'Medium',   on: 'bg-amber-400 text-white border-amber-400'   },
                                                    { val: 'high',     label: 'High',     on: 'bg-orange-500 text-white border-orange-500' },
                                                    { val: 'critical', label: 'Critical', on: 'bg-red-600 text-white border-red-600'       },
                                                ].map(({ val, label, on }) => (
                                                    <button key={val} type="button" onClick={() => addForm.setData('priority', val)}
                                                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                                                            addForm.data.priority === val ? on : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'
                                                        }`}>{label}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <FieldLabel>Progress</FieldLabel>
                                                <span className="text-sm font-bold text-blue-600">{addForm.data.progress}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" step="5" value={addForm.data.progress}
                                                onChange={(e) => addForm.setData('progress', parseInt(e.target.value))}
                                                className="block w-full h-2 rounded-lg cursor-pointer accent-blue-600"
                                                style={{ background: `linear-gradient(to right, #3b82f6 ${addForm.data.progress}%, #e5e7eb ${addForm.data.progress}%)` }}
                                            />
                                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                                <span>0%</span><span>50%</span><span>100%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {labels.length > 0 && (
                                    <div className="border-t border-gray-100 pt-4">
                                        <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2.5">🏷 Labels</p>
                                        <LabelPicker allLabels={labels} selected={addForm.data.label_ids} onChange={ids => addForm.setData('label_ids', ids)} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter
                        onCancel={() => setShowAddModal(false)}
                        submitLabel="Buat Task"
                        processing={addForm.processing}
                    />
                </form>
            </Modal>
            {/* ── Edit Modal ───────────────────────────── */}
            <Modal open={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Task" icon="edit" size="xl" processing={editForm.processing}>
                <form onSubmit={submitEdit}>
                    <ModalBody>
                        <div className="grid grid-cols-2 gap-x-6">
                            {/* ── Left column ── */}
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2.5 flex items-center gap-1.5">
                                        <span>📝</span> Informasi Task
                                    </p>
                                    <div className="space-y-3">
                                        <div>
                                            <FieldLabel required>Judul Task</FieldLabel>
                                            <FieldInput
                                                type="text"
                                                value={editForm.data.title}
                                                onChange={(e) => editForm.setData('title', e.target.value)}
                                                placeholder="Masukkan judul task..."
                                                required
                                            />
                                            <FieldError>{editForm.errors.title}</FieldError>
                                        </div>
                                        <div>
                                            <FieldLabel>Deskripsi</FieldLabel>
                                            <FieldTextarea
                                                value={editForm.data.description}
                                                onChange={(e) => editForm.setData('description', e.target.value)}
                                                rows={3}
                                                placeholder="Tambahkan deskripsi task (opsional)..."
                                            />
                                        </div>
                                    </div>
                                </div>
                                {canManage ? (
                                <div className="border-t border-gray-100 pt-4">
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2.5 flex items-center gap-1.5">
                                        <span>👤</span> Penugasan & Jadwal
                                    </p>
                                    <div className="space-y-3">
                                        <div>
                                            <FieldLabel>Assign To</FieldLabel>
                                            <MultiAssigneePicker
                                                users={users ?? []}
                                                selected={editForm.data.assignee_ids}
                                                onChange={ids => editForm.setData('assignee_ids', ids)}
                                            />
                                            {editForm.errors.assignee_ids && <FieldError>{editForm.errors.assignee_ids}</FieldError>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <FieldLabel>Start Date</FieldLabel>
                                                <FieldInput
                                                    type="date"
                                                    value={editForm.data.start_date}
                                                    onChange={(e) => editForm.setData('start_date', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <FieldLabel>Due Date</FieldLabel>
                                                <FieldInput
                                                    type="date"
                                                    value={editForm.data.due_date}
                                                    onChange={(e) => editForm.setData('due_date', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                ) : (
                                <div className="border-t border-gray-100 pt-4">
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2.5 flex items-center gap-1.5">
                                        <span>📅</span> Jadwal
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <FieldLabel>Start Date</FieldLabel>
                                            <FieldInput
                                                type="date"
                                                value={editForm.data.start_date}
                                                onChange={(e) => editForm.setData('start_date', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <FieldLabel>Due Date</FieldLabel>
                                            <FieldInput
                                                type="date"
                                                value={editForm.data.due_date}
                                                onChange={(e) => editForm.setData('due_date', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                )}
                            </div>
                            {/* ── Right column ── */}
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2.5 flex items-center gap-1.5">
                                        <span>🏷️</span> Status & Prioritas
                                    </p>
                                    <div className="space-y-3">
                                        <div>
                                            <FieldLabel>Status</FieldLabel>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {[
                                                    { val: 'todo',        label: 'To Do',       on: 'bg-slate-600 text-white border-slate-600'    },
                                                    { val: 'in_progress', label: 'In Progress', on: 'bg-blue-600 text-white border-blue-600'      },
                                                    { val: 'done',        label: 'Done',        on: 'bg-emerald-600 text-white border-emerald-600' },
                                                ].map(({ val, label, on }) => (
                                                    <button key={val} type="button"
                                                        disabled={!canEditStatus}
                                                        onClick={() => canEditStatus && editForm.setData('status', val)}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                                                            editForm.data.status === val ? on : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                                        } ${!canEditStatus ? 'opacity-40 cursor-not-allowed' : ''}`}
                                                    >{label}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <FieldLabel>Prioritas</FieldLabel>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {[
                                                    { val: 'low',      label: '🟢 Low',      on: 'bg-green-600 text-white border-green-600'   },
                                                    { val: 'medium',   label: '🟡 Medium',   on: 'bg-yellow-500 text-white border-yellow-500' },
                                                    { val: 'high',     label: '🟠 High',     on: 'bg-orange-500 text-white border-orange-500' },
                                                    { val: 'critical', label: '🔴 Critical', on: 'bg-red-600 text-white border-red-600'       },
                                                ].map(({ val, label, on }) => (
                                                    <button key={val} type="button" onClick={() => editForm.setData('priority', val)}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                                                            editForm.data.priority === val ? on : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                                        }`}>{label}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <FieldLabel>Progress</FieldLabel>
                                                <span className="text-sm font-bold text-blue-600">{editForm.data.progress}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" step="5" value={editForm.data.progress}
                                                onChange={(e) => editForm.setData('progress', parseInt(e.target.value))}
                                                disabled={!canUpdateProgress}
                                                className={`block w-full h-2 rounded-lg accent-blue-600 ${canUpdateProgress ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                                                style={{ background: `linear-gradient(to right, #3b82f6 ${editForm.data.progress}%, #e5e7eb ${editForm.data.progress}%)` }}
                                            />
                                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                                <span>0%</span><span>50%</span><span>100%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {labels.length > 0 && (
                                    <div className="border-t border-gray-100 pt-4">
                                        <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2.5">🏷 Labels</p>
                                        <LabelPicker allLabels={labels} selected={editForm.data.label_ids} onChange={ids => editForm.setData('label_ids', ids)} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter
                        onCancel={() => setEditingTask(null)}
                        submitLabel="Simpan Perubahan"
                        processing={editForm.processing}
                    />
                </form>
            </Modal>

            <TaskDetailDrawer
                key={viewTask?.id}
                task={viewTask}
                users={users ?? []}
                onClose={() => setViewTaskId(null)}
                onEdit={canEditDetail ? () => { openEdit(viewTask); setViewTaskId(null); } : null}
                canEditDetail={canEditDetail}
                canEditStatus={canEditStatus}
                canUpdateProgress={canUpdateProgress}
                canAssign={canAssign}
                canManageTask={canManage}
                onStatusChange={updateStatus}
                onAssignChange={updateAssign}
                authUser={auth.user}
            />
        </AppLayout>
    );
}
