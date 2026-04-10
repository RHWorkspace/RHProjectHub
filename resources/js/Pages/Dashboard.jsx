import React, { useState, useMemo } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AppLayout from '../Components/AppLayout';
import ConfirmDialog from '../Components/ConfirmDialog';
import Modal, { ModalBody, ModalFooter, FieldLabel, FieldInput, FieldTextarea } from '../Components/Modal';

const PC = {
    critical: 'bg-red-100 text-red-700',
    high:     'bg-orange-100 text-orange-700',
    medium:   'bg-yellow-100 text-yellow-700',
    low:      'bg-green-100 text-green-700',
};

function relDate(dateStr) {
    const d = new Date(dateStr);
    const diffDays = Math.floor((new Date() - d) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7)  return `${diffDays}d ago`;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function TaskMiniCard({ task }) {
    const priority = task.priority || 'medium';
    return (
        <div className="flex items-start gap-2.5 py-2.5 border-b border-gray-50 last:border-0">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate leading-snug">{task.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {task.board?.project?.name && <span className="text-gray-500">{task.board.project.name} / </span>}{task.board?.name ?? '�'}
                </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${PC[priority]}`}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </span>
                {task._dateLabel && <span className="text-[10px] text-gray-400 whitespace-nowrap">{task._dateLabel}</span>}
            </div>
        </div>
    );
}

function TaskListWidget({ title, icon, tasks = [], emptyMsg, accentCls = 'border-blue-400' }) {
    return (
        <div className={`bg-white rounded-xl border border-gray-200 border-t-4 ${accentCls} flex flex-col overflow-hidden`}>
            <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100">
                <span className="text-base">{icon}</span>
                <h3 className="text-sm font-bold text-gray-800">{title}</h3>
                <span className="ml-auto text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{tasks.length}</span>
            </div>
            <div className="px-4 py-1 overflow-y-auto" style={{ maxHeight: '280px' }}>
                {tasks.length > 0 ? tasks.map(t => <TaskMiniCard key={t.id} task={t} />) : (
                    <p className="text-xs text-gray-400 py-6 text-center italic">{emptyMsg}</p>
                )}
            </div>
        </div>
    );
}

function WeeklyTrendChart({ data = [] }) {
    const max = Math.max(...data.flatMap(d => [d.created, d.completed]), 1);
    const BAR_H = 80;
    return (
        <div>
            <div className="flex items-end gap-1.5" style={{ height: `${BAR_H + 28}px` }}>
                {data.map((d) => {
                    const cH = d.created   > 0 ? Math.max(4, Math.round((d.created   / max) * BAR_H)) : 0;
                    const dH = d.completed > 0 ? Math.max(4, Math.round((d.completed / max) * BAR_H)) : 0;
                    return (
                        <div key={d.date} className="flex-1 flex flex-col items-center">
                            <div className="w-full flex items-end gap-px" style={{ height: `${BAR_H}px` }}>
                                <div title={`Created: ${d.created}`}
                                    className="flex-1 bg-blue-400 hover:bg-blue-500 rounded-t transition-all cursor-default"
                                    style={{ height: `${cH}px` }} />
                                <div title={`Done: ${d.completed}`}
                                    className="flex-1 bg-emerald-400 hover:bg-emerald-500 rounded-t transition-all cursor-default"
                                    style={{ height: `${dH}px` }} />
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1.5 select-none">{d.label}</span>
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="inline-block w-3 h-3 rounded-sm bg-blue-400" /> Created
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="inline-block w-3 h-3 rounded-sm bg-emerald-400" /> Completed
                </span>
            </div>
        </div>
    );
}

/* -- Section separator with pill-label + horizontal rule --- */
function SectionLabel({ icon, title, subtitle }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <div className="shrink-0 flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
                <span className="text-base leading-none">{icon}</span>
                <span className="text-sm font-bold text-gray-700">{title}</span>
            </div>
            <div className="flex-1 h-px bg-gray-100" />
            {subtitle && <span className="shrink-0 text-xs text-gray-400 hidden sm:block">{subtitle}</span>}
        </div>
    );
}

export default function Dashboard({ auth, projects, unassignedTasks = [], managerProjectIds = [], totalTeams = 0, totalUsers = 0, totalTasks = 0, tasksDueToday = [], myOverdueTasks = [], recentlyUpdated = [], weeklyTrend = [] }) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showCreateBoardForm, setShowCreateBoardForm] = useState(false);
    const [showEditProjectForm, setShowEditProjectForm] = useState(false);
    const [showEditBoardForm, setShowEditBoardForm] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedBoard, setSelectedBoard] = useState(null);

    // -- Confirm dialog state ---------------------------------
    const CONFIRM_INIT = { open: false, title: '', message: '', onConfirm: null, loading: false };
    const [confirmState, setConfirmState] = useState(CONFIRM_INIT);
    const openConfirm = (title, message, onConfirm) =>
        setConfirmState({ open: true, title, message, onConfirm, loading: false });
    const closeConfirm = () => setConfirmState(CONFIRM_INIT);

    const isAdmin = auth.user.role === 'admin';
    const isManager = auth.user.role === 'manager';
    const canEditProject = (project) => isAdmin || (isManager && (managerProjectIds.includes(project.id) || project.user_id === auth.user.id));
    const canEditBoard = (projectId, board) => isAdmin || (isManager && (managerProjectIds.includes(projectId) || (board && board.user_id === auth.user.id)));

    const completedThisWeek = useMemo(() => weeklyTrend.reduce((a, d) => a + d.completed, 0), [weeklyTrend]);
    const createdThisWeek   = useMemo(() => weeklyTrend.reduce((a, d) => a + d.created,   0), [weeklyTrend]);

    const dueTodayList = tasksDueToday.map(t => ({
        ...t,
        _dateLabel: t.due_date ? new Date(t.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : null,
    }));
    const overdueList = myOverdueTasks.map(t => {
        const diffDays = t.due_date ? Math.round((new Date() - new Date(t.due_date)) / 86400000) : null;
        return { ...t, _dateLabel: diffDays !== null ? `${diffDays}d overdue` : null };
    });
    const recentList = recentlyUpdated.map(t => ({ ...t, _dateLabel: relDate(t.updated_at) }));

    const createProjectForm = useForm({
        name: '',
        description: '',
    });

    const createBoardForm = useForm({
        name: '',
        description: '',
    });

    const editProjectForm = useForm({
        name: '',
        description: '',
    });

    const editBoardForm = useForm({
        name: '',
        description: '',
    });

    const submit = (e) => {
        e.preventDefault();
        createProjectForm.post('/projects', {
            onSuccess: () => {
                setShowCreateForm(false);
                createProjectForm.reset();
            },
        });
    };

    const submitBoard = (e) => {
        e.preventDefault();
        createBoardForm.post(`/projects/${selectedProject.id}/boards`, {
            onSuccess: () => {
                setShowCreateBoardForm(false);
                createBoardForm.reset();
                setSelectedProject(null);
            },
        });
    };

    const deleteProject = (projectId) => {
        openConfirm(
            'Hapus Project?',
            'Semua board dan task di dalamnya akan ikut terhapus. Aksi ini tidak dapat dibatalkan.',
            () => {
                setConfirmState(s => ({ ...s, loading: true }));
                router.delete(`/projects/${projectId}`, {
                    onFinish: closeConfirm,
                });
            }
        );
    };

    const openEditProject = (project) => {
        setSelectedProject(project);
        editProjectForm.setData('name', project.name);
        editProjectForm.setData('description', project.description || '');
        setShowEditProjectForm(true);
    };

    const submitEditProject = (e) => {
        e.preventDefault();
        editProjectForm.patch(`/projects/${selectedProject.id}`, {
            onSuccess: () => {
                setShowEditProjectForm(false);
                editProjectForm.reset();
                setSelectedProject(null);
            },
        });
    };

    const openEditBoard = (board) => {
        setSelectedBoard(board);
        editBoardForm.setData('name', board.name);
        editBoardForm.setData('description', board.description || '');
        setShowEditBoardForm(true);
    };

    const submitEditBoard = (e) => {
        e.preventDefault();
        editBoardForm.patch(`/boards/${selectedBoard.id}`, {
            onSuccess: () => {
                setShowEditBoardForm(false);
                editBoardForm.reset();
                setSelectedBoard(null);
            },
        });
    };

    const deleteBoard = (boardId) => {
        openConfirm(
            'Hapus Board?',
            'Semua task di dalam board ini akan ikut terhapus.',
            () => {
                setConfirmState(s => ({ ...s, loading: true }));
                router.delete(`/boards/${boardId}`, {
                    onFinish: closeConfirm,
                });
            }
        );
    };

    const handleLogout = () => {
        router.post('/logout');
    };

    return (
        <AppLayout auth={auth} title="Dashboard">
            <Head title="Dashboard" />

            <ConfirmDialog
                open={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={confirmState.onConfirm}
                onCancel={closeConfirm}
                loading={confirmState.loading}
            />

            {/* -- Page Header -------------------------------------------- */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-extrabold text-gray-900">
                        Welcome back, {auth.user.name}! 👋
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isAdmin ? 'bg-red-100 text-red-700' : isManager ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                            {auth.user.role.charAt(0).toUpperCase() + auth.user.role.slice(1)}
                        </span>
                        <span>{auth.user.email}</span>
                    </p>
                </div>
                {(isAdmin || isManager) && (
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition"
                    >
                        + New Project
                    </button>
                )}
            </div>

            {/* -- SECTION 1 � OVERVIEW ------------------------------------ */}
            <section className="mb-8">
                <SectionLabel icon="📊" title="Overview" subtitle="Ringkasan sistem & aktivitas task" />

                {/* Admin � compact system stats (gap-px trick for clean divider lines) */}
                {isAdmin && (
                    <div className="bg-gray-100 rounded-xl overflow-hidden grid grid-cols-3 md:grid-cols-6 gap-px mb-4 shadow-sm">
                        {[
                            { label: 'Projects',   value: projects?.length || 0,                                cls: 'text-blue-600'    },
                            { label: 'Boards',     value: projects?.reduce((a,p)=>a+(p.boards?.length||0),0)||0, cls: 'text-emerald-600' },
                            { label: 'Tasks',      value: totalTasks,                                           cls: 'text-violet-600'  },
                            { label: 'Teams',      value: totalTeams,                                           cls: 'text-purple-600'  },
                            { label: 'Users',      value: totalUsers,                                           cls: 'text-indigo-600'  },
                            { label: 'Unassigned', value: unassignedTasks?.length || 0,                         cls: 'text-amber-600'   },
                        ].map(({ label, value, cls }) => (
                            <div key={label} className="bg-white flex flex-col items-center justify-center py-4 px-2 select-none">
                                <p className={`text-2xl font-extrabold ${cls}`}>{value}</p>
                                <p className="text-[11px] text-gray-400 font-medium text-center mt-0.5 leading-tight">{label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* All users � personal task-activity stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Due Today',         value: tasksDueToday.length,  icon: '📅', bg: 'bg-blue-50',    border: 'border-blue-200',    cls: 'text-blue-700'    },
                        { label: 'Overdue',           value: myOverdueTasks.length, icon: '🔥', bg: 'bg-red-50',     border: 'border-red-200',     cls: 'text-red-700'     },
                        { label: 'Created This Week', value: createdThisWeek,       icon: '📝', bg: 'bg-amber-50',   border: 'border-amber-200',   cls: 'text-amber-700'   },
                        { label: 'Done This Week',    value: completedThisWeek,     icon: '✅', bg: 'bg-emerald-50', border: 'border-emerald-200', cls: 'text-emerald-700' },
                    ].map(({ label, value, icon, bg, border, cls }) => (
                        <div key={label} className={`${bg} border ${border} rounded-xl px-4 py-4 flex items-center gap-3`}>
                            <span className="text-2xl shrink-0">{icon}</span>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 leading-none mb-1">{label}</p>
                                <p className={`text-2xl font-extrabold ${cls}`}>{value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* -- SECTION 2 — MY WORK / ALL TASKS ------------------------- */}
            <section className="mb-8">
                <SectionLabel
                    icon={isAdmin ? '📋' : '🎯'}
                    title={isAdmin ? 'All Tasks' : 'My Work'}
                    subtitle={isAdmin ? 'Semua task aktif di sistem' : 'Task yang perlu perhatian & aktivitas terkini'}
                />

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    {/* Left 2/3 � task list widgets */}
                    <div className="xl:col-span-2 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <TaskListWidget
                                title={isAdmin ? 'Due Today — All' : 'Due Today'}
                                icon="📅"
                                tasks={dueTodayList}
                                accentCls="border-blue-400"
                                emptyMsg="Tidak ada task yang jatuh tempo hari ini 🎉"
                            />
                            <TaskListWidget
                                title={isAdmin ? 'Overdue — All' : 'Overdue Tasks'}
                                icon="🔥"
                                tasks={overdueList}
                                accentCls="border-red-400"
                                emptyMsg="Tidak ada task yang overdue 👍"
                            />
                        </div>
                        <TaskListWidget
                            title={isAdmin ? 'Recently Updated — All' : 'Recently Updated'}
                            icon="🔄"
                            tasks={recentList}
                            accentCls="border-amber-400"
                            emptyMsg="Belum ada task yang diperbarui."
                        />
                    </div>

                    {/* Right 1/3 � weekly trend chart */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-bold text-gray-800">Weekly Trend</h3>
                            <span className="text-xs text-gray-400">7 hari terakhir</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-4">{isAdmin ? 'Semua task di sistem — dibuat vs selesai' : 'Task saya — dibuat vs diselesaikan'}</p>
                        <div className="flex-1">
                            <WeeklyTrendChart data={weeklyTrend} />
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                            <div className="bg-blue-50 rounded-lg px-3 py-2.5 text-center">
                                <p className="text-xl font-extrabold text-blue-700">{createdThisWeek}</p>
                                <p className="text-[11px] text-blue-500 font-medium mt-0.5">Created</p>
                            </div>
                            <div className="bg-emerald-50 rounded-lg px-3 py-2.5 text-center">
                                <p className="text-xl font-extrabold text-emerald-700">{completedThisWeek}</p>
                                <p className="text-[11px] text-emerald-500 font-medium mt-0.5">Completed</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* -- SECTION 3 � PROJECTS ------------------------------------- */}
            <section className="mb-2">
                <SectionLabel
                    icon="📁"
                    title="Projects"
                    subtitle={isAdmin
                        ? `${projects?.length || 0} project aktif di sistem`
                        : `${projects?.length || 0} project${projects?.length !== 1 ? 's' : ''} saya`}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {projects && projects.map((project) => (
                        <div key={project.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col">
                            {/* Card Header */}
                            <div className="p-5 border-b border-gray-100">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="bg-blue-100 text-blue-600 rounded-lg w-9 h-9 flex items-center justify-center text-lg shrink-0">📁</div>
                                        <div className="min-w-0">
                                            <Link href={`/projects/${project.id}`} className="font-bold text-gray-900 truncate hover:text-blue-600 transition block">{project.name}</Link>
                                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{project.description || 'No description'}</p>
                                        </div>
                                    </div>
                                    {canEditProject(project) && (
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => { setSelectedProject(project); setShowCreateBoardForm(true); }}
                                                className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 text-sm" title="Add Board"
                                            >➕</button>
                                            <button
                                                onClick={() => openEditProject(project)}
                                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 text-sm" title="Edit Project"
                                            >✏️</button>
                                            {(isAdmin || project.user_id === auth.user.id) && (
                                                <button
                                                    onClick={() => deleteProject(project.id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 text-sm" title="Delete Project"
                                                >🗑️</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {/* Meta badges */}
                                <div className="flex gap-2 mt-3">
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                                        📋 {project.boards?.length || 0} board{project.boards?.length !== 1 ? 's' : ''}
                                    </span>
                                    {project.teams?.length > 0 && (
                                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                                            👥 {project.teams.length} team{project.teams.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {/* Boards list */}
                            <div className="p-4 flex-1">
                                {project.boards && project.boards.length > 0 ? (
                                    <ul className="space-y-1">
                                        {project.boards.map((board) => (
                                            <li key={board.id} className="flex items-center justify-between group rounded-lg hover:bg-gray-50 px-2 py-1.5 transition">
                                                <Link href={`/boards/${board.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex-1 truncate">
                                                    → {board.name}
                                                </Link>
                                                {canEditBoard(project.id, board) && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                        <button onClick={() => openEditBoard(board)} className="text-blue-500 hover:text-blue-700 text-xs p-0.5" title="Edit">✏️</button>
                                                        {(isAdmin || board.user_id === auth.user.id) && (
                                                            <button onClick={() => deleteBoard(board.id)} className="text-red-500 hover:text-red-700 text-xs p-0.5" title="Delete">🗑️</button>
                                                        )}
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">No boards yet</p>
                                )}
                            </div>
                            {/* Teams */}
                            {project.teams && project.teams.length > 0 && (
                                <div className="px-4 pb-4 flex flex-wrap gap-1.5">
                                    {project.teams.map((team) => (
                                        <span key={team.id} className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-100">
                                            {team.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {(!projects || projects.length === 0) && (
                    <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                        <p className="text-4xl mb-3">📂</p>
                        <p className="text-gray-500 font-medium">No projects yet.</p>
                        {(isAdmin || isManager) && <p className="text-sm text-gray-400 mt-1">Click "+ New Project" to get started.</p>}
                    </div>
                )}
            </section>

            {/* -- Modals ---------------------------------------------------- */}
            {/* Create Project */}
            <Modal
                open={showCreateForm}
                onClose={() => setShowCreateForm(false)}
                title="Buat Project Baru"
                icon="📁"
            >
                <form onSubmit={submit}>
                    <ModalBody>
                        <div>
                            <FieldLabel required>Nama Project</FieldLabel>
                            <FieldInput
                                type="text"
                                value={createProjectForm.data.name}
                                onChange={(e) => createProjectForm.setData('name', e.target.value)}
                                placeholder="Contoh: Website Revamp"
                                error={createProjectForm.errors.name}
                                required
                            />
                        </div>
                        <div>
                            <FieldLabel>Deskripsi</FieldLabel>
                            <FieldTextarea
                                value={createProjectForm.data.description}
                                onChange={(e) => createProjectForm.setData('description', e.target.value)}
                                placeholder="Opsional � jelaskan tujuan project ini"
                                error={createProjectForm.errors.description}
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter
                        onCancel={() => setShowCreateForm(false)}
                        submitLabel="Buat Project"
                        processing={createProjectForm.processing}
                    />
                </form>
            </Modal>

            {/* Create Board */}
            <Modal
                open={showCreateBoardForm && !!selectedProject}
                onClose={() => { setShowCreateBoardForm(false); setSelectedProject(null); createBoardForm.reset(); }}
                title={selectedProject ? `Board untuk "${selectedProject.name}"` : 'Buat Board Baru'}
                icon="📋"
            >
                <form onSubmit={submitBoard}>
                    <ModalBody>
                        <div>
                            <FieldLabel required>Nama Board</FieldLabel>
                            <FieldInput
                                type="text"
                                value={createBoardForm.data.name}
                                onChange={(e) => createBoardForm.setData('name', e.target.value)}
                                placeholder="Contoh: Sprint 1"
                                error={createBoardForm.errors.name}
                                required
                            />
                        </div>
                        <div>
                            <FieldLabel>Deskripsi</FieldLabel>
                            <FieldTextarea
                                value={createBoardForm.data.description}
                                onChange={(e) => createBoardForm.setData('description', e.target.value)}
                                placeholder="Opsional"
                                error={createBoardForm.errors.description}
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter
                        onCancel={() => { setShowCreateBoardForm(false); setSelectedProject(null); createBoardForm.reset(); }}
                        submitLabel="Buat Board"
                        processing={createBoardForm.processing}
                    />
                </form>
            </Modal>

            {/* Edit Project */}
            <Modal
                open={showEditProjectForm && !!selectedProject}
                onClose={() => { setShowEditProjectForm(false); editProjectForm.reset(); setSelectedProject(null); }}
                title="Edit Project"
                icon="✏️"
            >
                <form onSubmit={submitEditProject}>
                    <ModalBody>
                        <div>
                            <FieldLabel required>Nama Project</FieldLabel>
                            <FieldInput
                                type="text"
                                value={editProjectForm.data.name}
                                onChange={(e) => editProjectForm.setData('name', e.target.value)}
                                error={editProjectForm.errors.name}
                                required
                            />
                        </div>
                        <div>
                            <FieldLabel>Deskripsi</FieldLabel>
                            <FieldTextarea
                                value={editProjectForm.data.description}
                                onChange={(e) => editProjectForm.setData('description', e.target.value)}
                                error={editProjectForm.errors.description}
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter
                        onCancel={() => { setShowEditProjectForm(false); editProjectForm.reset(); setSelectedProject(null); }}
                        submitLabel="Simpan Perubahan"
                        processing={editProjectForm.processing}
                    />
                </form>
            </Modal>

            {/* Edit Board */}
            <Modal
                open={showEditBoardForm && !!selectedBoard}
                onClose={() => { setShowEditBoardForm(false); editBoardForm.reset(); setSelectedBoard(null); }}
                title="Edit Board"
                icon="✏️"
            >
                <form onSubmit={submitEditBoard}>
                    <ModalBody>
                        <div>
                            <FieldLabel required>Nama Board</FieldLabel>
                            <FieldInput
                                type="text"
                                value={editBoardForm.data.name}
                                onChange={(e) => editBoardForm.setData('name', e.target.value)}
                                error={editBoardForm.errors.name}
                                required
                            />
                        </div>
                        <div>
                            <FieldLabel>Deskripsi</FieldLabel>
                            <FieldTextarea
                                value={editBoardForm.data.description}
                                onChange={(e) => editBoardForm.setData('description', e.target.value)}
                                error={editBoardForm.errors.description}
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter
                        onCancel={() => { setShowEditBoardForm(false); editBoardForm.reset(); setSelectedBoard(null); }}
                        submitLabel="Simpan Perubahan"
                        processing={editBoardForm.processing}
                    />
                </form>
            </Modal>
        </AppLayout>
    );
}
