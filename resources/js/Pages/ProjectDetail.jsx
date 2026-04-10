import React, { useState, useEffect } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AppLayout from '../Components/AppLayout';
import Pagination from '../Components/Pagination';

const STATUS_META = {
    todo:        { label: 'To Do',       cls: 'bg-slate-100 text-slate-700',    dot: 'bg-slate-400'    },
    in_progress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-500'     },
    done:        { label: 'Done',        cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500'  },
};

const PRIORITY_META = {
    low:      { label: 'Low',      cls: 'bg-gray-100 text-gray-600'    },
    medium:   { label: 'Medium',   cls: 'bg-yellow-100 text-yellow-700' },
    high:     { label: 'High',     cls: 'bg-orange-100 text-orange-700' },
    critical: { label: 'Critical', cls: 'bg-red-100 text-red-700'       },
};

function StatCard({ label, value, icon, accent, iconBg, val }) {
    return (
        <div className={`bg-white rounded-xl shadow-sm border-l-4 ${accent} p-4 flex items-center gap-3`}>
            <div className={`${iconBg} rounded-xl w-10 h-10 flex items-center justify-center text-lg shrink-0`}>{icon}</div>
            <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                <p className={`text-2xl font-extrabold ${val}`}>{value}</p>
            </div>
        </div>
    );
}

export default function ProjectDetail({ auth, project, stats, managerProjectIds }) {
    const [activeTab, setActiveTab] = useState('boards');
    const [taskPage, setTaskPage] = useState(1);
    const [taskPerPage, setTaskPerPage] = useState(10);

    useEffect(() => { setTaskPage(1); }, [activeTab]);

    const isAdmin   = auth.user.role === 'admin';
    const isManager = auth.user.role === 'manager';
    const canEdit   = isAdmin || (isManager && managerProjectIds.includes(project.id));

    const allTasks = project.boards.flatMap(b => b.tasks.map(t => ({ ...t, boardName: b.name })));
    const taskTotalPages = Math.max(1, Math.ceil(allTasks.length / taskPerPage));
    const paginatedTasks = allTasks.slice((taskPage - 1) * taskPerPage, taskPage * taskPerPage);

    const progressPct = stats.tasks > 0 ? Math.round((stats.done / stats.tasks) * 100) : 0;

    const tabs = [
        { key: 'boards',  label: 'Boards',  icon: '📋', count: stats.boards },
        { key: 'tasks',   label: 'Tasks',   icon: '✅', count: stats.tasks  },
        { key: 'teams',   label: 'Teams',   icon: '👥', count: project.teams.length },
    ];

    return (
        <AppLayout auth={auth} title={project.name}>
            <Head title={project.name} />

            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <Link href="/dashboard" className="hover:text-blue-600">Dashboard</Link>
                <span>/</span>
                <span className="font-medium text-gray-700 truncate">{project.name}</span>
            </nav>

            {/* Header card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl shrink-0">📁</div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                            <p className="text-sm text-gray-500 mt-0.5">{project.description || 'No description provided.'}</p>
                            {project.user && (
                                <p className="text-xs text-gray-400 mt-1">Created by <span className="font-medium text-gray-600">{project.user.name}</span></p>
                            )}
                        </div>
                    </div>
                    {canEdit && (
                        <div className="flex gap-2 shrink-0">
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition"
                            >
                                ← Back
                            </Link>
                        </div>
                    )}
                    {!canEdit && (
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition"
                        >
                            ← Back
                        </Link>
                    )}
                </div>

                {/* Overall progress bar */}
                <div className="mt-5">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Overall Progress</span>
                        <span className="text-sm font-bold text-gray-700">{progressPct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div
                            className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{stats.done} of {stats.tasks} tasks completed</p>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                <StatCard label="Boards"      value={stats.boards}      icon="📋" accent="border-blue-500"    iconBg="bg-blue-50"    val="text-blue-700"    />
                <StatCard label="Total Tasks" value={stats.tasks}       icon="📌" accent="border-gray-400"    iconBg="bg-gray-50"    val="text-gray-700"    />
                <StatCard label="To Do"       value={stats.todo}        icon="⏳" accent="border-slate-400"   iconBg="bg-slate-50"   val="text-slate-700"   />
                <StatCard label="In Progress" value={stats.in_progress} icon="🔄" accent="border-blue-400"    iconBg="bg-blue-50"    val="text-blue-700"    />
                <StatCard label="Done"        value={stats.done}        icon="✅" accent="border-emerald-500" iconBg="bg-emerald-50" val="text-emerald-700" />
                <StatCard label="Overdue"     value={stats.overdue}     icon="⚠️" accent="border-red-400"     iconBg="bg-red-50"     val="text-red-600"     />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-5 w-fit">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === t.key
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <span>{t.icon}</span>
                        {t.label}
                        <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                            activeTab === t.key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>{t.count}</span>
                    </button>
                ))}
            </div>

            {/* Tab: Boards */}
            {activeTab === 'boards' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {project.boards.length === 0 && (
                        <div className="col-span-full bg-white rounded-xl border border-dashed border-gray-200 py-14 text-center">
                            <p className="text-3xl mb-2">📋</p>
                            <p className="text-gray-500 font-medium">No boards yet.</p>
                        </div>
                    )}
                    {project.boards.map(board => {
                        const bTotal    = board.tasks.length;
                        const bDone     = board.tasks.filter(t => t.status === 'done').length;
                        const bProgress = bTotal > 0 ? Math.round((bDone / bTotal) * 100) : 0;
                        return (
                            <div key={board.id} className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition">
                                <div className="p-5 flex-1">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h3 className="font-bold text-gray-900">{board.name}</h3>
                                        <span className="text-xs text-gray-400 shrink-0">{bTotal} task{bTotal !== 1 ? 's' : ''}</span>
                                    </div>
                                    {board.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{board.description}</p>}
                                    {/* Mini task status row */}
                                    <div className="flex gap-1.5 flex-wrap mb-3">
                                        {['todo','in_progress','done'].map(s => {
                                            const cnt = board.tasks.filter(t => t.status === s).length;
                                            if (!cnt) return null;
                                            const m = STATUS_META[s];
                                            return (
                                                <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.cls}`}>
                                                    {m.label}: {cnt}
                                                </span>
                                            );
                                        })}
                                    </div>
                                    {/* Progress bar */}
                                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                                        <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${bProgress}%` }} />
                                    </div>
                                    <p className="text-xs text-gray-400">{bProgress}% complete</p>
                                </div>
                                <div className="px-5 pb-4">
                                    <Link
                                        href={`/boards/${board.id}`}
                                        className="block w-full text-center text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg py-2 transition"
                                    >
                                        Open Board →
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Tab: Tasks */}
            {activeTab === 'tasks' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {allTasks.length === 0 ? (
                        <div className="py-14 text-center">
                            <p className="text-3xl mb-2">✅</p>
                            <p className="text-gray-500 font-medium">No tasks yet.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Task</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Board</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assignee</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Progress</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginatedTasks.map(task => {
                                    const sm = STATUS_META[task.status]   ?? STATUS_META.todo;
                                    const pm = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;
                                    const isOverdue = task.status === 'in_progress' && task.due_date && new Date(task.due_date) < new Date();
                                    return (
                                        <tr key={task.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{task.title}</td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">{task.boardName}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sm.cls}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                                                    {sm.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pm.cls}`}>{pm.label}</span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 text-xs">
                                                {task.assigned_user?.name ?? <span className="text-gray-300 italic">Unassigned</span>}
                                            </td>
                                            <td className={`px-4 py-3 text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                                {task.due_date
                                                    ? new Date(task.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                                    : <span className="text-gray-300">—</span>}
                                                {isOverdue && <span className="ml-1 text-red-500">⚠</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${task.progress ?? 0}%` }} />
                                                    </div>
                                                    <span className="text-xs text-gray-500 w-7 text-right">{task.progress ?? 0}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                    <Pagination
                        page={taskPage}
                        totalPages={taskTotalPages}
                        total={allTasks.length}
                        perPage={taskPerPage}
                        onPageChange={setTaskPage}
                        onPerPageChange={p => { setTaskPerPage(p); setTaskPage(1); }}
                        label="task"
                    />
                </div>
            )}

            {/* Tab: Teams */}
            {activeTab === 'teams' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {project.teams.length === 0 && (
                        <div className="col-span-full bg-white rounded-xl border border-dashed border-gray-200 py-14 text-center">
                            <p className="text-3xl mb-2">👥</p>
                            <p className="text-gray-500 font-medium">No teams mapped to this project.</p>
                        </div>
                    )}
                    {project.teams.map(team => (
                        <div key={team.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-lg">👥</div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{team.name}</h3>
                                    <p className="text-xs text-gray-400">{team.users?.length ?? 0} member{team.users?.length !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            {team.users && team.users.length > 0 && (
                                <ul className="space-y-2">
                                    {team.users.map(u => (
                                        <li key={u.id} className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                                                <p className="text-xs text-gray-400 truncate">{u.email}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </AppLayout>
    );
}
