import React, { useState, useCallback, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '../Components/AppLayout';
import Pagination from '../Components/Pagination';
import TaskDetailDrawer from '../Components/TaskDetailDrawer';

// -- Helpers ------------------------------------------------------------------
function initials(name = '') {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function avatarColor(name = '') {
    const COLORS = ['bg-violet-500','bg-sky-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-indigo-500'];
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
        const label = diff === 0 ? `Selesai tepat waktu ✓` : `Selesai lebih awal ✓ · ${dateFmt}`;
        return { label, isOverdue: false, isDoneOnTime: true, diff };
    }
    if (status === 'done' && diff < 0) {
        const label = due.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        return { label, isOverdue: false, isDoneOnTime: false, diff };
    }
    let label;
    if (diff === 0)       label = 'Due today';
    else if (diff === 1)  label = 'Due tomorrow';
    else if (diff === -1) label = '1 day overdue';
    else if (diff < 0)    label = `${Math.abs(diff)} days overdue`;
    else                  label = `Due in ${diff}d`;
    return { label, isOverdue, diff };
}

const STATUS_META = {
    todo:        { label: 'To Do',       cls: 'bg-slate-100 text-slate-700',    bar: 'bg-slate-400',   border: 'border-l-slate-400'  },
    in_progress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700',      bar: 'bg-blue-500',    border: 'border-l-blue-500'   },
    done:        { label: 'Done',        cls: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', border: 'border-l-emerald-500'},
};
const PRIORITY_META = {
    critical: { label: 'Critical', cls: 'bg-red-100 text-red-700',     icon: '🔴' },
    high:     { label: 'High',     cls: 'bg-orange-100 text-orange-700',icon: '🟠' },
    medium:   { label: 'Medium',   cls: 'bg-yellow-100 text-yellow-700',icon: '🟡' },
    low:      { label: 'Low',      cls: 'bg-green-100 text-green-700',  icon: '🟢' },
};

// -- Progress Slider ----------------------------------------------------------
function ProgressSlider({ task }) {
    const [localVal, setLocalVal] = useState(task.progress ?? 0);

    const commit = useCallback((val) => {
        router.patch(`/tasks/${task.id}/progress`, { progress: val }, { preserveScroll: true });
    }, [task.id]);

    React.useEffect(() => { setLocalVal(task.progress ?? 0); }, [task.progress]);

    const barColor =
        localVal === 100 ? 'bg-emerald-500' :
        localVal > 0     ? 'bg-blue-500'    : 'bg-slate-300';

    return (
        <div>
            <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span className="font-semibold">{localVal}%</span>
            </div>
            <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={localVal}
                onChange={e => setLocalVal(parseInt(e.target.value))}
                onMouseUp={e => commit(parseInt(e.target.value))}
                onTouchEnd={e => commit(parseInt(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-600"
            />
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${localVal}%` }} />
            </div>
            {localVal > 0 && localVal < 100 && (
                <p className="text-xs text-blue-500 mt-0.5">Will set &rarr; In Progress</p>
            )}
            {localVal === 100 && (
                <p className="text-xs text-emerald-600 mt-0.5">Will set &rarr; Done &#10003;</p>
            )}
            {localVal === 0 && (
                <p className="text-xs text-slate-400 mt-0.5">Will set &rarr; To Do</p>
            )}
        </div>
    );
}

// -- Card View ----------------------------------------------------------------
function TaskCard({ task, isAdmin, canUpdateProgress, onViewDetail }) {
    const sm  = STATUS_META[task.status]    ?? STATUS_META.todo;
    const pm  = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;
    const due = dueDateInfo(task.due_date, task.status);

    return (
        <div className={`bg-white rounded-xl shadow-sm p-5 border border-gray-200 border-l-4 ${sm.border} hover:shadow-md transition`}>
            <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 text-sm leading-snug flex-1">{task.title}</h3>
                <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${sm.cls}`}>{sm.label}</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pm.cls}`}>{pm.icon} {pm.label}</span>
                {due && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        due.isDoneOnTime ? 'bg-emerald-100 text-emerald-700' :
                        due.isOverdue ? 'bg-red-100 text-red-700' :
                        due.diff === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                    }`}>📅 {due.label}</span>
                )}
            </div>

            {task.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>
            )}

            <div className="text-xs text-gray-400 space-y-0.5 mb-3">
                {task.board?.project && <p>📁 <span className="text-gray-600 font-medium">{task.board.project.name}</span></p>}
                {task.board && <p>📋 <span className="text-gray-600 font-medium">{task.board.name}</span></p>}
            </div>

            {!isAdmin && canUpdateProgress && (
                <div className="mb-3">
                    <ProgressSlider task={task} />
                </div>
            )}

            {task.board && (
                <Link href={`/boards/${task.board.id}`}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                    {isAdmin ? 'Assign on Board' : 'View Board'} &rarr;
                </Link>
            )}
            <button
                onClick={onViewDetail}
                className="text-xs font-medium text-gray-500 hover:text-gray-800 inline-flex items-center gap-1 mt-1"
            >
                Detail &rarr;
            </button>
        </div>
    );
}

// -- List/Table Row -----------------------------------------------------------
function TaskRow({ task, isAdmin, canUpdateProgress, onViewDetail }) {
    const sm  = STATUS_META[task.status]    ?? STATUS_META.todo;
    const pm  = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;
    const due = dueDateInfo(task.due_date, task.status);

    return (
        <tr className="hover:bg-gray-50 border-b border-gray-100">
            <td className="px-4 py-3">
                <div className={`w-1 h-full min-h-[1.5rem] rounded-full inline-block mr-2 ${sm.bar}`} />
                <span className="text-sm font-medium text-gray-900">{task.title}</span>
                {task.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
                )}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sm.cls}`}>{sm.label}</span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pm.cls}`}>{pm.icon} {pm.label}</span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                {task.board?.project?.name ?? '-'}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                {due ? (
                    <span className={`font-medium ${due.isOverdue ? 'text-red-600' : due.diff === 0 ? 'text-yellow-600' : 'text-gray-600'}`}>
                        {due.label}
                    </span>
                ) : '-'}
            </td>
            <td className="px-4 py-3" style={{ minWidth: '160px' }}>
                {!isAdmin && canUpdateProgress ? (
                    <ProgressSlider task={task} />
                ) : (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${sm.bar}`} style={{ width: `${task.progress ?? 0}%` }} />
                        </div>
                        <span className="shrink-0">{task.progress ?? 0}%</span>
                    </div>
                )}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                {task.board && (
                    <Link href={`/boards/${task.board.id}`}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800">
                        {isAdmin ? 'Assign' : 'Board'} &rarr;
                    </Link>
                )}
                <button
                    onClick={onViewDetail}
                    className="block text-xs font-medium text-gray-500 hover:text-gray-800 mt-0.5"
                >
                    Detail &rarr;
                </button>
            </td>
        </tr>
    );
}

// -- Page ---------------------------------------------------------------------
export default function MyTasks({ auth, tasks = [], taskPermissions = {} }) {
    const [filterStatus, setFilterStatus] = useState('');
    const [view, setView] = useState('card');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [viewTask, setViewTask] = useState(null);

    const isAdmin = auth.user.role === 'admin';

    const {
        canEditDetail     = false,
        canEditStatus     = false,
        canUpdateProgress = !isAdmin,
    } = taskPermissions;

    const updateStatus = (taskId, status) =>
        router.patch(`/tasks/${taskId}/status`, { status }, { preserveScroll: true });

    const filtered = tasks.filter(t => {
        const matchStatus = !filterStatus || t.status === filterStatus;
        const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const paginated  = filtered.slice((page - 1) * perPage, page * perPage);

    useEffect(() => { setPage(1); }, [filterStatus, search, view]);

    const counts = {
        todo:        tasks.filter(t => t.status === 'todo').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        done:        tasks.filter(t => t.status === 'done').length,
        overdue:     tasks.filter(t => {
            if (!t.due_date || t.status !== 'in_progress') return false;
            return new Date(t.due_date) < new Date();
        }).length,
    };

    return (
        <AppLayout auth={auth} title="My Tasks">
            <Head title="My Tasks" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
                <div>
                    <h2 className="text-2xl font-extrabold text-gray-900">
                        {isAdmin ? '⚠️ Unassigned Tasks' : 'My Tasks'}
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-500">
                        {isAdmin ? 'Tugas yang belum memiliki assignee.' : 'Daftar tugas yang ditugaskan kepada Anda.'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                        <button
                            onClick={() => setView('card')}
                            className={`px-3 py-1.5 font-medium transition ${view === 'card' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        >&#8862; Card</button>
                        <button
                            onClick={() => setView('list')}
                            className={`px-3 py-1.5 font-medium transition ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        >&#9776; List</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                    { label: 'To Do',       value: counts.todo,        color: 'text-slate-700',   bg: 'bg-white',       key: 'todo'        },
                    { label: 'In Progress', value: counts.in_progress, color: 'text-blue-700',    bg: 'bg-blue-50',     key: 'in_progress' },
                    { label: 'Done',        value: counts.done,        color: 'text-emerald-700', bg: 'bg-emerald-50',  key: 'done'        },
                    { label: 'Overdue',     value: counts.overdue,     color: 'text-red-700',     bg: 'bg-red-50',      key: ''            },
                ].map(({ label, value, color, bg, key }) => (
                    <button
                        key={label}
                        onClick={() => setFilterStatus(prev => prev === key ? '' : key)}
                        className={`rounded-xl border border-gray-200 ${bg} px-4 py-3 shadow-sm text-left transition hover:shadow-md ${filterStatus === key ? 'ring-2 ring-blue-400' : ''}`}
                    >
                        <p className="text-xs text-gray-500 font-medium">{label}</p>
                        <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
                <input
                    type="text"
                    placeholder="Search tasks..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="border border-gray-300 rounded-lg text-sm px-3 py-2 bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500 w-48"
                />
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded-lg text-sm px-3 py-2 bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="">All Status</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                </select>
                {(filterStatus || search) && (
                    <button
                        onClick={() => { setFilterStatus(''); setSearch(''); }}
                        className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg border border-gray-200 bg-white"
                    >&#10005; Clear</button>
                )}
                <span className="ml-auto text-xs text-gray-400 self-center">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-16 text-center border border-gray-100">
                    <div className="text-5xl mb-4">{isAdmin ? '✅' : '💭'}</div>
                    <p className="text-gray-600 font-medium">
                        {isAdmin ? 'Semua task sudah di-assign. Bagus!' : 'Tidak ada tugas yang cocok.'}
                    </p>
                </div>
            ) : view === 'card' ? (
                <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {paginated.map(task => (
                        <TaskCard key={task.id} task={task} isAdmin={isAdmin} canUpdateProgress={canUpdateProgress} onViewDetail={() => setViewTask(task)} />
                    ))}
                </div>
                <div className="mt-4">
                    <Pagination page={page} totalPages={totalPages} total={filtered.length} perPage={perPage} onPageChange={setPage} onPerPageChange={p => { setPerPage(p); setPage(1); }} label="task" />
                </div>
                </>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Task</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Project</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{ minWidth: '180px' }}>Progress</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map(task => (
                                <TaskRow key={task.id} task={task} isAdmin={isAdmin} canUpdateProgress={canUpdateProgress} onViewDetail={() => setViewTask(task)} />
                            ))}
                        </tbody>
                    </table>
                    <Pagination page={page} totalPages={totalPages} total={filtered.length} perPage={perPage} onPageChange={setPage} onPerPageChange={p => { setPerPage(p); setPage(1); }} label="task" />
                </div>
            )}

            <TaskDetailDrawer
                key={viewTask?.id}
                task={viewTask}
                users={[]}
                onClose={() => setViewTask(null)}
                canEditDetail={canEditDetail}
                canEditStatus={canEditStatus}
                canUpdateProgress={canUpdateProgress}
                canAssign={false}
                onStatusChange={updateStatus}
                onAssignChange={() => {}}
                authUser={auth.user}
            />
        </AppLayout>
    );
}
