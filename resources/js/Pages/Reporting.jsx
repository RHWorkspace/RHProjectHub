import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import AppLayout from '../Components/AppLayout';
import Pagination from '../Components/Pagination';

export default function Reporting({ auth, tasks, projects, boards, teams }) {
    const [filterType, setFilterType] = useState('monthly');
    const [filterValue, setFilterValue] = useState(new Date().toISOString().split('T')[0].substring(0, 7));
    const [selectedProject, setSelectedProject] = useState('all');
    const [selectedBoard, setSelectedBoard] = useState('all');
    const [selectedTeam, setSelectedTeam] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedAssignee, setSelectedAssignee] = useState('all');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    useEffect(() => { setPage(1); }, [filterType, filterValue, selectedProject, selectedBoard, selectedTeam, selectedStatus, selectedAssignee]);

    const statusOptions = [
        { value: 'todo', label: 'Todo' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'done', label: 'Done' },
    ];

    const getUniqueAssignees = () => {
        const assignees = new Map();
        tasks.forEach((task) => {
            (task.assignees || []).forEach(a => {
                assignees.set(a.id, a);
            });
        });
        return Array.from(assignees.values());
    };

    const uniqueAssignees = getUniqueAssignees();

    const formatDateRange = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const week = getWeekNumber(today);

        if (filterType === 'yearly') {
            return `Tahun ${filterValue}`;
        } else if (filterType === 'monthly') {
            const [y, m] = filterValue.split('-');
            const monthName = new Date(y, m - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            return monthName;
        } else if (filterType === 'weekly') {
            const [y, w] = filterValue.split('-W');
            return `Tahun ${y}, Minggu ke-${w}`;
        }
    };

    const getWeekNumber = (date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    const filterTasks = () => {
        return tasks.filter((task) => {
            if (!task.created_at) return false;

            const taskDate = new Date(task.created_at);
            const taskYear = taskDate.getFullYear();
            const taskMonth = String(taskDate.getMonth() + 1).padStart(2, '0');
            const taskWeek = String(getWeekNumber(taskDate)).padStart(2, '0');

            if (filterType === 'yearly') {
                if (taskYear !== parseInt(filterValue, 10)) {
                    return false;
                }
            } else if (filterType === 'monthly') {
                const [y, m] = filterValue.split('-');
                if (taskYear !== parseInt(y, 10) || taskMonth !== m) {
                    return false;
                }
            } else if (filterType === 'weekly') {
                const [y, w] = filterValue.split('-W');
                if (taskYear !== parseInt(y, 10) || taskWeek !== w) {
                    return false;
                }
            }

            if (selectedProject !== 'all') {
                if (task.board?.project?.id !== parseInt(selectedProject, 10)) {
                    return false;
                }
            }

            if (selectedBoard !== 'all') {
                if (task.board?.id !== parseInt(selectedBoard, 10)) {
                    return false;
                }
            }

            if (selectedTeam !== 'all') {
                const projectTeams = task.board?.project?.teams || [];
                if (!projectTeams.some((team) => team.id === parseInt(selectedTeam, 10))) {
                    return false;
                }
            }

            if (selectedStatus !== 'all') {
                if (task.status !== selectedStatus) {
                    return false;
                }
            }

            if (selectedAssignee === 'unassigned') {
                if (task.assignees?.length) return false;
            } else if (selectedAssignee !== 'all') {
                if (!task.assignees?.some(a => a.id === parseInt(selectedAssignee, 10))) {
                    return false;
                }
            }

            return true;
        });
    };

    const getYearOptions = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear - 5; i <= currentYear; i++) {
            years.push(i);
        }
        return years;
    };

    const getMonthOptions = () => {
        const months = [];
        for (let i = 1; i <= 12; i++) {
            const date = new Date(2024, i - 1);
            months.push({
                value: String(i).padStart(2, '0'),
                label: date.toLocaleString('id-ID', { month: 'long' }),
            });
        }
        return months;
    };

    const getWeekOptions = () => {
        const weeks = [];
        for (let i = 1; i <= 53; i++) {
            weeks.push({
                value: String(i).padStart(2, '0'),
                label: `Minggu ke-${i}`,
            });
        }
        return weeks;
    };

    const filteredBoardOptions = selectedProject === 'all'
        ? boards
        : boards.filter((board) => board.project_id === parseInt(selectedProject, 10));

    const filteredTasks = filterTasks();
    const totalPages    = Math.max(1, Math.ceil(filteredTasks.length / perPage));
    const paginated     = filteredTasks.slice((page - 1) * perPage, page * perPage);

    const stats = {
        total: filteredTasks.length,
        completed: filteredTasks.filter((t) => t.status === 'done').length,
        inProgress: filteredTasks.filter((t) => t.status === 'in_progress').length,
        todo: filteredTasks.filter((t) => t.status === 'todo').length,
    };

    const handleLogout = () => {
        router.post('/logout');
    };

    const activeFilterCount = [
        selectedProject !== 'all',
        selectedBoard   !== 'all',
        selectedTeam    !== 'all',
        selectedStatus  !== 'all',
        selectedAssignee !== 'all',
    ].filter(Boolean).length;

    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    const downloadCSV = () => {
        const headers = ['Task', 'Description', 'Assignee', 'Project', 'Board', 'Team', 'Status', 'Priority', 'Progress (%)', 'Start Date', 'Due Date', 'Created'];
        const rows = filteredTasks.map(task => [
            task.title ?? '',
            task.description ?? '',
            task.assignees?.length ? task.assignees.map(a => a.name).join('; ') : 'Unassigned',
            task.board?.project?.name ?? '',
            task.board?.name ?? '',
            task.board?.project?.teams?.map(t => t.name).join('; ') ?? '',
            STATUS_LABEL[task.status] ?? task.status,
            task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : '',
            task.progress ?? 0,
            task.start_date ? new Date(task.start_date).toLocaleDateString('id-ID') : '',
            task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : '',
            task.created_at ? new Date(task.created_at).toLocaleDateString('id-ID') : '',
        ]);
        const escape = (val) => {
            const str = String(val);
            return (str.includes(',') || str.includes('"') || str.includes('\n'))
                ? `"${str.replace(/"/g, '""')}"`
                : str;
        };
        const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `task-report-${formatDateRange().replace(/[\s/]/g, '-')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const STATUS_STYLE = {
        done:        'bg-emerald-100 text-emerald-700 ring-emerald-200',
        in_progress: 'bg-amber-100 text-amber-700 ring-amber-200',
        todo:        'bg-blue-100 text-blue-700 ring-blue-200',
    };
    const STATUS_LABEL = { done: 'Done', in_progress: 'In Progress', todo: 'Todo' };

    const PRIORITY_STYLE = {
        critical: 'bg-red-100 text-red-700 ring-red-200',
        high:     'bg-orange-100 text-orange-700 ring-orange-200',
        medium:   'bg-yellow-100 text-yellow-700 ring-yellow-200',
        low:      'bg-green-100 text-green-700 ring-green-200',
    };

    return (
        <AppLayout auth={auth} title="Reporting">
            <Head title="Task Reporting" />

            {/* ── Page header ─────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Task Reporting</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {formatDateRange()} &middot; {filteredTasks.length} task ditemukan
                        {auth.user.role === 'user' && ` untuk ${auth.user.name}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {activeFilterCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
                            🔍 {activeFilterCount} filter aktif
                        </span>
                    )}
                    <button
                        onClick={downloadCSV}
                        disabled={filteredTasks.length === 0}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        title={`Download ${filteredTasks.length} task sebagai CSV`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Download CSV
                    </button>
                </div>
            </div>

            {/* ── Stat cards ──────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {/* Total */}
                <div className="col-span-2 lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">📋</div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Total Task</p>
                        <p className="text-3xl font-extrabold text-gray-900 leading-tight">{stats.total}</p>
                    </div>
                </div>
                {/* Todo */}
                <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Todo</span>
                        <span className="text-xl">📌</span>
                    </div>
                    <p className="text-3xl font-extrabold text-blue-700">{stats.todo}</p>
                    <p className="text-xs text-gray-400 mt-1">{stats.total > 0 ? Math.round(stats.todo / stats.total * 100) : 0}% dari total</p>
                </div>
                {/* In Progress */}
                <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">In Progress</span>
                        <span className="text-xl">⚡</span>
                    </div>
                    <p className="text-3xl font-extrabold text-amber-600">{stats.inProgress}</p>
                    <p className="text-xs text-gray-400 mt-1">{stats.total > 0 ? Math.round(stats.inProgress / stats.total * 100) : 0}% dari total</p>
                </div>
                {/* Done */}
                <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Completed</span>
                        <span className="text-xl">✅</span>
                    </div>
                    <p className="text-3xl font-extrabold text-emerald-600">{stats.completed}</p>
                    <p className="text-xs text-gray-400 mt-1">{stats.total > 0 ? Math.round(stats.completed / stats.total * 100) : 0}% dari total</p>
                </div>
                {/* Completion rate */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Completion</span>
                        <span className="text-xl">🎯</span>
                    </div>
                    <p className="text-3xl font-extrabold text-gray-800">{completionRate}%</p>
                    <div className="mt-2 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                            style={{ width: `${completionRate}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* ── Filters ─────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">🔽 Filter</h2>
                    {activeFilterCount > 0 && (
                        <button
                            onClick={() => { setSelectedProject('all'); setSelectedBoard('all'); setSelectedTeam('all'); setSelectedStatus('all'); setSelectedAssignee('all'); }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                            Reset filter
                        </button>
                    )}
                </div>

                {/* Period row */}
                <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Periode</label>
                        <select
                            value={filterType}
                            onChange={(e) => {
                                setFilterType(e.target.value);
                                if (e.target.value === 'yearly') {
                                    setFilterValue(new Date().getFullYear());
                                } else if (e.target.value === 'monthly') {
                                    setFilterValue(new Date().toISOString().split('T')[0].substring(0, 7));
                                } else if (e.target.value === 'weekly') {
                                    const today = new Date();
                                    const week = String(getWeekNumber(today)).padStart(2, '0');
                                    setFilterValue(`${today.getFullYear()}-W${week}`);
                                }
                            }}
                            className="border border-gray-300 rounded-lg text-sm px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="yearly">Tahunan</option>
                            <option value="monthly">Bulanan</option>
                            <option value="weekly">Mingguan</option>
                        </select>
                    </div>

                    {/* Period value selectors */}
                    {filterType === 'yearly' && (
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-gray-500">Tahun</label>
                            <select value={filterValue} onChange={(e) => setFilterValue(parseInt(e.target.value, 10))}
                                className="border border-gray-300 rounded-lg text-sm px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {getYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    )}

                    {filterType === 'monthly' && (
                        <>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-500">Tahun</label>
                                <select value={filterValue.split('-')[0]}
                                    onChange={(e) => { const [, m] = filterValue.split('-'); setFilterValue(`${e.target.value}-${m}`); }}
                                    className="border border-gray-300 rounded-lg text-sm px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    {getYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-500">Bulan</label>
                                <select value={filterValue.split('-')[1]}
                                    onChange={(e) => { const [y] = filterValue.split('-'); setFilterValue(`${y}-${e.target.value}`); }}
                                    className="border border-gray-300 rounded-lg text-sm px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    {getMonthOptions().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                        </>
                    )}

                    {filterType === 'weekly' && (
                        <>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-500">Tahun</label>
                                <select value={filterValue.split('-W')[0]}
                                    onChange={(e) => { const [, w] = filterValue.split('-W'); setFilterValue(`${e.target.value}-W${w}`); }}
                                    className="border border-gray-300 rounded-lg text-sm px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    {getYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-500">Minggu</label>
                                <select value={filterValue.split('-W')[1]}
                                    onChange={(e) => { const [y] = filterValue.split('-W'); setFilterValue(`${y}-W${e.target.value}`); }}
                                    className="border border-gray-300 rounded-lg text-sm px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    {getWeekOptions().map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                </div>

                {/* Secondary filters */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                        {
                            label: '📁 Project',
                            value: selectedProject,
                            onChange: (v) => { setSelectedProject(v); setSelectedBoard('all'); },
                            options: [{ value: 'all', label: 'Semua Project' }, ...projects.map(p => ({ value: p.id, label: p.name }))],
                        },
                        {
                            label: '👥 Team',
                            value: selectedTeam,
                            onChange: setSelectedTeam,
                            options: [{ value: 'all', label: 'Semua Team' }, ...teams.map(t => ({ value: t.id, label: t.name }))],
                        },
                        {
                            label: '📋 Board',
                            value: selectedBoard,
                            onChange: setSelectedBoard,
                            options: [{ value: 'all', label: 'Semua Board' }, ...filteredBoardOptions.map(b => ({ value: b.id, label: `${b.name}` }))],
                        },
                        {
                            label: '🔘 Status',
                            value: selectedStatus,
                            onChange: setSelectedStatus,
                            options: [{ value: 'all', label: 'Semua Status' }, ...statusOptions.map(s => ({ value: s.value, label: s.label }))],
                        },
                        {
                            label: '👤 Assignee',
                            value: selectedAssignee,
                            onChange: setSelectedAssignee,
                            options: [
                                { value: 'all', label: 'Semua User' },
                                { value: 'unassigned', label: '— Unassigned —' },
                                ...uniqueAssignees.map(u => ({ value: u.id, label: u.name })),
                            ],
                        },
                    ].map((f) => (
                        <div key={f.label}>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
                            <select
                                value={f.value}
                                onChange={(e) => f.onChange(e.target.value)}
                                className="block w-full border border-gray-300 rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            >
                                {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Tasks Table ─────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Table header bar */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-sm font-semibold text-gray-800">
                        Task Report — {formatDateRange()}
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{filteredTasks.length} task ditemukan</span>
                        <button
                            onClick={downloadCSV}
                            disabled={filteredTasks.length === 0}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Download sebagai CSV"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            CSV
                        </button>
                    </div>
                </div>

                {filteredTasks.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Task</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignee</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Project / Board</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Team</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Start Date</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Due Date</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginated.map((task) => (
                                    <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                                        {/* Task */}
                                        <td className="px-5 py-3.5 max-w-[200px]">
                                            <p className="font-medium text-gray-900 truncate">{task.title}</p>
                                            {task.description && (
                                                <p className="text-xs text-gray-400 truncate mt-0.5">{task.description}</p>
                                            )}
                                        </td>
                                        {/* Assignee */}
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            {task.assignees?.length > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    {task.assignees.map(a => (
                                                        <div key={a.id} className="flex items-center gap-1.5">
                                                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                                                                {a.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="text-gray-800 text-xs">{a.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Unassigned</span>
                                            )}
                                        </td>
                                        {/* Project / Board */}
                                        <td className="px-5 py-3.5 max-w-[160px]">
                                            {task.board?.project?.name && (
                                                <p className="font-medium text-gray-900 truncate text-xs">{task.board.project.name}</p>
                                            )}
                                            {task.board?.name && (
                                                <p className="text-gray-400 truncate text-xs">{task.board.name}</p>
                                            )}
                                        </td>
                                        {/* Team */}
                                        <td className="px-5 py-3.5 hidden lg:table-cell">
                                            <span className="text-xs text-gray-600">
                                                {task.board?.project?.teams?.length > 0
                                                    ? task.board.project.teams.map(t => t.name).join(', ')
                                                    : <span className="text-gray-300 italic">—</span>}
                                            </span>
                                        </td>
                                        {/* Status */}
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${STATUS_STYLE[task.status] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
                                                {STATUS_LABEL[task.status] ?? task.status}
                                            </span>
                                        </td>
                                        {/* Priority */}
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${PRIORITY_STYLE[task.priority] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
                                                {task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Medium'}
                                            </span>
                                        </td>
                                        {/* Progress */}
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <div className="flex items-center gap-2 min-w-[80px]">
                                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-1.5 rounded-full ${task.progress >= 100 ? 'bg-emerald-500' : task.progress >= 50 ? 'bg-blue-500' : 'bg-amber-400'}`}
                                                        style={{ width: `${task.progress ?? 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-medium text-gray-500 w-8 text-right">{task.progress ?? 0}%</span>
                                            </div>
                                        </td>
                                        {/* Start Date */}
                                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-500 hidden md:table-cell">
                                            {task.start_date
                                                ? new Date(task.start_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
                                                : <span className="text-gray-300">—</span>}
                                        </td>
                                        {/* Due Date */}
                                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-500 hidden md:table-cell">
                                            {task.due_date
                                                ? new Date(task.due_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
                                                : <span className="text-gray-300">—</span>}
                                        </td>
                                        {/* Created */}
                                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-400 hidden md:table-cell">
                                            {new Date(task.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="text-5xl mb-3">🔍</div>
                        <p className="text-gray-700 font-medium">Tidak ada task ditemukan</p>
                        <p className="text-sm text-gray-400 mt-1">untuk periode {formatDateRange()} dengan filter yang dipilih</p>
                    </div>
                )}
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={filteredTasks.length}
                    perPage={perPage}
                    onPageChange={setPage}
                    onPerPageChange={p => { setPerPage(p); setPage(1); }}
                    label="task"
                />
            </div>
        </AppLayout>
    );
}
