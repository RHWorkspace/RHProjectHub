import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '../Components/AppLayout';

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name = '') {
    return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
}

const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-indigo-100 text-indigo-700',
    'bg-teal-100 text-teal-700',
    'bg-orange-100 text-orange-700',
];

function avatarColor(id) {
    return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

const STATUS_META = {
    todo:        { label: 'Todo',        bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400'    },
    in_progress: { label: 'In Progress', bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500'    },
    done:        { label: 'Done',        bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

const PRIORITY_META = {
    low:      { label: 'Low',      color: 'text-gray-400' },
    medium:   { label: 'Medium',   color: 'text-amber-500' },
    high:     { label: 'High',     color: 'text-orange-500' },
    critical: { label: 'Critical', color: 'text-red-600' },
};

function StatCard({ icon, label, value, sub, color = 'blue' }) {
    const colors = {
        blue:    { ring: 'ring-blue-100',    icon: 'bg-blue-50 text-blue-600',    val: 'text-blue-700'    },
        purple:  { ring: 'ring-purple-100',  icon: 'bg-purple-50 text-purple-600', val: 'text-purple-700'  },
        amber:   { ring: 'ring-amber-100',   icon: 'bg-amber-50 text-amber-600',  val: 'text-amber-700'   },
        emerald: { ring: 'ring-emerald-100', icon: 'bg-emerald-50 text-emerald-600', val: 'text-emerald-700' },
        gray:    { ring: 'ring-gray-100',    icon: 'bg-gray-50 text-gray-500',    val: 'text-gray-700'    },
    };
    const c = colors[color] ?? colors.blue;
    return (
        <div className={`bg-white rounded-2xl border border-gray-100 ring-1 ${c.ring} p-5 flex items-center gap-4`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${c.icon} shrink-0`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                <p className={`text-2xl font-extrabold ${c.val}`}>{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

function ProgressBar({ value, max, color = 'bg-blue-500' }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-gray-400 w-9 text-right">{pct}%</span>
        </div>
    );
}

const TABS = ['Anggota', 'Projects', 'Semua Task'];
const PER_PAGE_OPTIONS = [10, 25, 50];

// ── Pagination Component ───────────────────────────────────────────────────────
function Pagination({ current, total, perPage, onPageChange, onPerPageChange }) {
    const totalPages = Math.ceil(total / perPage);

    const from = total === 0 ? 0 : (current - 1) * perPage + 1;
    const to   = Math.min(current * perPage, total);

    // Generate page numbers with ellipsis
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= current - 2 && i <= current + 2)) {
            pages.push(i);
        } else if (pages[pages.length - 1] !== '...') {
            pages.push('...');
        }
    }

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 bg-gray-50 border-t border-gray-100">
            {/* Left: info + per-page selector */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>
                    Menampilkan <span className="font-semibold text-gray-600">{from}–{to}</span> dari <span className="font-semibold text-gray-600">{total}</span> task
                </span>
                <span className="text-gray-300">|</span>
                <span>Per halaman:</span>
                <select
                    value={perPage}
                    onChange={e => onPerPageChange(Number(e.target.value))}
                    className="border border-gray-200 rounded-md px-1.5 py-0.5 text-xs text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                    {PER_PAGE_OPTIONS.map(n => (
                        <option key={n} value={n}>{n}</option>
                    ))}
                </select>
            </div>
            {/* Right: page buttons */}
            {totalPages > 1 && (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onPageChange(current - 1)}
                        disabled={current === 1}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        ← Prev
                    </button>
                    {pages.map((p, i) =>
                        p === '...' ? (
                            <span key={`ellipsis-${i}`} className="px-2 py-1 text-xs text-gray-400">…</span>
                        ) : (
                            <button
                                key={p}
                                onClick={() => onPageChange(p)}
                                className={`w-8 h-7 rounded-lg text-xs font-medium transition-colors ${
                                    p === current
                                        ? 'bg-blue-600 text-white border border-blue-600'
                                        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {p}
                            </button>
                        )
                    )}
                    <button
                        onClick={() => onPageChange(current + 1)}
                        disabled={current === totalPages}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TeamDetail({ auth, team, allTasks, memberTaskStats, taskSummary }) {
    const [activeTab, setActiveTab] = useState('Anggota');
    const [taskFilter, setTaskFilter] = useState('all');
    const [taskSearch, setTaskSearch] = useState('');
    const [taskPage,    setTaskPage]   = useState(1);
    const [perPage,     setPerPage]    = useState(10);

    const donePercent = taskSummary.total > 0
        ? Math.round((taskSummary.done / taskSummary.total) * 100)
        : 0;

    // Filtered tasks
    const filteredTasks = useMemo(() => allTasks.filter(t => {
        const matchStatus = taskFilter === 'all' || t.status === taskFilter;
        const matchSearch = taskSearch === '' ||
            t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
            (t.assigned_user?.name ?? '').toLowerCase().includes(taskSearch.toLowerCase());
        return matchStatus && matchSearch;
    }), [allTasks, taskFilter, taskSearch]);

    // Paginated slice
    const pagedTasks = useMemo(() => {
        const start = (taskPage - 1) * perPage;
        return filteredTasks.slice(start, start + perPage);
    }, [filteredTasks, taskPage, perPage]);

    // Reset to page 1 when filter/search/perPage changes
    function handleFilterChange(val)  { setTaskFilter(val); setTaskPage(1); }
    function handleSearchChange(val)  { setTaskSearch(val); setTaskPage(1); }
    function handlePerPageChange(val) { setPerPage(val);    setTaskPage(1); }

    return (
        <AppLayout auth={auth} title="Team Detail">
            <Head title={`Team — ${team.name}`} />

            {/* ── Back + Header ─────────────────────────────────── */}
            <div className="mb-6">
                <Link
                    href="/teams"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Kembali ke Daftar Tim
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {/* Team avatar */}
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl text-white font-extrabold shadow-lg shrink-0 select-none">
                            {team.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">{team.name}</h2>
                            {team.description ? (
                                <p className="text-sm text-gray-500 mt-0.5 max-w-xl">{team.description}</p>
                            ) : (
                                <p className="text-sm text-gray-400 italic mt-0.5">Belum ada deskripsi</p>
                            )}
                        </div>
                    </div>

                    {/* Overall progress */}
                    {taskSummary.total > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 text-center shadow-sm shrink-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Progress Keseluruhan</p>
                            <p className="text-3xl font-extrabold text-blue-600">{donePercent}%</p>
                            <p className="text-xs text-gray-400">{taskSummary.done}/{taskSummary.total} task selesai</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Stat Cards ────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <StatCard icon="👥" label="Anggota" value={team.users.length} color="blue" />
                <StatCard icon="📁" label="Projects" value={team.projects.length} color="purple" />
                <StatCard icon="📋" label="Total Task" value={taskSummary.total} sub={`${taskSummary.in_progress} in progress`} color="amber" />
                <StatCard icon="✅" label="Selesai" value={taskSummary.done} sub={`${taskSummary.todo} todo tersisa`} color="emerald" />
            </div>

            {/* ── Tabs ──────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Tab nav */}
                <div className="flex border-b border-gray-100">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3.5 text-sm font-semibold transition-colors relative ${
                                activeTab === tab
                                    ? 'text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Tab: Anggota ──────────────────────────────── */}
                {activeTab === 'Anggota' && (
                    <div className="p-6">
                        {team.users.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-3">👤</div>
                                <p className="text-gray-500 font-medium">Belum ada anggota</p>
                                <p className="text-sm text-gray-400 mt-1">Tambahkan anggota dari halaman daftar tim</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {team.users.map(user => {
                                    const stats = memberTaskStats[user.id] ?? { total: 0, todo: 0, in_progress: 0, done: 0 };
                                    return (
                                        <div key={user.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-colors">
                                            {/* Avatar + info */}
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0 ${avatarColor(user.id)}`}>
                                                    {initials(user.name)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-sm text-gray-900">{user.name}</span>
                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{user.pivot.role}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                                </div>
                                            </div>

                                            {/* Task stats */}
                                            <div className="flex items-center gap-3 sm:gap-5 shrink-0 flex-wrap">
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-400">Total</p>
                                                    <p className="text-base font-bold text-gray-700">{stats.total}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-400">Todo</p>
                                                    <p className="text-base font-bold text-gray-500">{stats.todo}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-400">In Progress</p>
                                                    <p className="text-base font-bold text-blue-600">{stats.in_progress}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-400">Done</p>
                                                    <p className="text-base font-bold text-emerald-600">{stats.done}</p>
                                                </div>
                                                {/* Progress bar */}
                                                <div className="w-28">
                                                    <ProgressBar value={stats.done} max={stats.total} color="bg-emerald-400" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: Projects ─────────────────────────────── */}
                {activeTab === 'Projects' && (
                    <div className="p-6">
                        {team.projects.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-3">📁</div>
                                <p className="text-gray-500 font-medium">Belum ada project yang dipetakan</p>
                                <p className="text-sm text-gray-400 mt-1">Map project ke tim ini dari halaman daftar tim</p>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {team.projects.map(project => {
                                    const projectTasks = allTasks.filter(t => t.project_id === project.id);
                                    const ptDone = projectTasks.filter(t => t.status === 'done').length;
                                    const ptProgress = projectTasks.filter(t => t.status === 'in_progress').length;
                                    const ptTodo = projectTasks.filter(t => t.status === 'todo').length;

                                    return (
                                        <div key={project.id} className="border border-gray-200 rounded-xl overflow-hidden">
                                            {/* Project header */}
                                            <div className="flex items-center justify-between gap-4 px-5 py-4 bg-gray-50 border-b border-gray-100">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold shrink-0">
                                                        📁
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-semibold text-gray-900 text-sm truncate">{project.name}</h4>
                                                        <p className="text-xs text-gray-400">{project.boards?.length ?? 0} board · {projectTasks.length} task</p>
                                                    </div>
                                                </div>
                                                <Link
                                                    href={`/projects/${project.id}`}
                                                    className="text-xs font-medium text-blue-600 hover:text-blue-800 shrink-0"
                                                >
                                                    Buka →
                                                </Link>
                                            </div>

                                            {/* Task breakdown */}
                                            {projectTasks.length > 0 && (
                                                <div className="px-5 py-3 grid grid-cols-3 gap-3 text-center text-xs border-b border-gray-100 bg-white">
                                                    <div>
                                                        <span className="font-semibold text-gray-600">{ptTodo}</span>
                                                        <span className="text-gray-400 ml-1">Todo</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-blue-600">{ptProgress}</span>
                                                        <span className="text-gray-400 ml-1">In Progress</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-emerald-600">{ptDone}</span>
                                                        <span className="text-gray-400 ml-1">Done</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Progress bar */}
                                            {projectTasks.length > 0 && (
                                                <div className="px-5 py-3">
                                                    <ProgressBar value={ptDone} max={projectTasks.length} color="bg-emerald-400" />
                                                </div>
                                            )}

                                            {/* Boards list */}
                                            {project.boards && project.boards.length > 0 && (
                                                <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {project.boards.map(board => (
                                                        <Link
                                                            key={board.id}
                                                            href={`/boards/${board.id}`}
                                                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 hover:bg-blue-50 group transition-colors"
                                                        >
                                                            <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700 truncate">📋 {board.name}</span>
                                                            <span className="text-xs text-gray-400 shrink-0 ml-2">{board.tasks?.length ?? 0} task</span>
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: Semua Task ───────────────────────────── */}
                {activeTab === 'Semua Task' && (
                    <div>
                        {/* Filter bar */}
                        <div className="flex flex-col sm:flex-row gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <input
                                type="text"
                                placeholder="Cari task atau assignee…"
                                value={taskSearch}
                                onChange={e => handleSearchChange(e.target.value)}
                                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex gap-2">
                                {['all', 'todo', 'in_progress', 'done'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => handleFilterChange(s)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                            taskFilter === s
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {s === 'all' ? 'Semua' : s === 'todo' ? 'Todo' : s === 'in_progress' ? 'In Progress' : 'Done'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Task list */}
                        {filteredTasks.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-3">📭</div>
                                <p className="text-gray-500 font-medium">Tidak ada task</p>
                                <p className="text-sm text-gray-400 mt-1">
                                    {taskSearch || taskFilter !== 'all' ? 'Coba ubah filter pencarian' : 'Belum ada task di project yang terpetakan'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {pagedTasks.map(task => {
                                    const sm = STATUS_META[task.status] ?? STATUS_META.todo;
                                    const pm = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;

                                    return (
                                        <div key={task.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors">
                                            {/* Status dot */}
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${sm.dot} mt-1 sm:mt-0`} />

                                            {/* Title + meta */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    <span className="text-xs text-gray-400">{task.project_name}</span>
                                                    <span className="text-gray-300">·</span>
                                                    <span className="text-xs text-gray-400">{task.board_name}</span>
                                                    {task.due_date && (
                                                        <>
                                                            <span className="text-gray-300">·</span>
                                                            <span className={`text-xs ${new Date(task.due_date) < new Date() && task.status !== 'done' ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                                                Due {new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Badges */}
                                            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sm.bg} ${sm.text}`}>
                                                    {sm.label}
                                                </span>
                                                <span className={`text-xs font-semibold ${pm.color}`}>
                                                    {pm.label}
                                                </span>
                                                {task.assigned_user ? (
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold shrink-0 text-white ${avatarColor(task.assigned_user.id)}`}>
                                                            {initials(task.assigned_user.name)}
                                                        </div>
                                                        <span className="text-xs text-gray-600 font-medium whitespace-nowrap">{task.assigned_user.name}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-xs flex items-center justify-center">
                                                            —
                                                        </div>
                                                        <span className="text-xs text-gray-400 whitespace-nowrap">Unassigned</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <Pagination
                            current={taskPage}
                            total={filteredTasks.length}
                            perPage={perPage}
                            onPageChange={setTaskPage}
                            onPerPageChange={handlePerPageChange}
                        />
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
