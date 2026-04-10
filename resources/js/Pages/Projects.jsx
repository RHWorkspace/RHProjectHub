import React, { useState, useMemo } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AppLayout from '../Components/AppLayout';
import ConfirmDialog from '../Components/ConfirmDialog';
import Modal, { ModalBody, ModalFooter, FieldLabel, FieldInput, FieldTextarea, FieldSelect } from '../Components/Modal';

const STATUS_COLOR = {
    todo:        'bg-slate-100 text-slate-600',
    in_progress: 'bg-blue-100 text-blue-700',
    done:        'bg-emerald-100 text-emerald-700',
};

function projectStats(project) {
    const tasks = project.boards?.flatMap(b => b.tasks ?? []) ?? [];
    return {
        boards:      project.boards?.length ?? 0,
        tasks:       tasks.length,
        done:        tasks.filter(t => t.status === 'done').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        todo:        tasks.filter(t => t.status === 'todo').length,
    };
}

export default function Projects({ auth, projects = [], managerProjectIds = [], allTeams = [] }) {
    const isAdmin   = auth.user.role === 'admin';
    const isManager = auth.user.role === 'manager';

    const canEditProject = (project) =>
        isAdmin || (isManager && (managerProjectIds.includes(project.id) || project.user_id === auth.user.id));

    const canEditBoard = (projectId, board) =>
        isAdmin || (isManager && (managerProjectIds.includes(projectId) || (board && board.user_id === auth.user.id)));

    /* ── Search / filter ─────────────────────────────────────────── */
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        if (!search.trim()) return projects;
        const q = search.toLowerCase();
        return projects.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.description ?? '').toLowerCase().includes(q)
        );
    }, [projects, search]);

    /* ── Confirm dialog ──────────────────────────────────────────── */
    const CONFIRM_INIT = { open: false, title: '', message: '', onConfirm: null, loading: false };
    const [confirmState, setConfirmState] = useState(CONFIRM_INIT);
    const openConfirm = (title, message, onConfirm) =>
        setConfirmState({ open: true, title, message, onConfirm, loading: false });
    const closeConfirm = () => setConfirmState(CONFIRM_INIT);

    /* ── Modal state ─────────────────────────────────────────────── */
    const [showCreateForm,    setShowCreateForm]    = useState(false);
    const [showCreateBoard,   setShowCreateBoard]   = useState(false);
    const [showEditProject,   setShowEditProject]   = useState(false);
    const [showEditBoard,     setShowEditBoard]     = useState(false);
    const [showTeamManager,   setShowTeamManager]   = useState(false);
    const [selectedProject,   setSelectedProject]   = useState(null);
    const [selectedBoard,     setSelectedBoard]     = useState(null);
    const [expandedProject,   setExpandedProject]   = useState(null);

    /* ── Forms ───────────────────────────────────────────────────── */
    const createProjectForm = useForm({ name: '', description: '' });
    const createBoardForm   = useForm({ name: '', description: '' });
    const editProjectForm   = useForm({ name: '', description: '' });
    const editBoardForm     = useForm({ name: '', description: '' });
    const teamForm          = useForm({ team_id: '' });

    /* ── Handlers ────────────────────────────────────────────────── */
    const submitCreateProject = (e) => {
        e.preventDefault();
        createProjectForm.post('/projects', {
            onSuccess: () => { setShowCreateForm(false); createProjectForm.reset(); },
        });
    };

    const submitCreateBoard = (e) => {
        e.preventDefault();
        createBoardForm.post(`/projects/${selectedProject.id}/boards`, {
            onSuccess: () => { setShowCreateBoard(false); createBoardForm.reset(); setSelectedProject(null); },
        });
    };

    const submitEditProject = (e) => {
        e.preventDefault();
        editProjectForm.patch(`/projects/${selectedProject.id}`, {
            onSuccess: () => { setShowEditProject(false); editProjectForm.reset(); setSelectedProject(null); },
        });
    };

    const submitEditBoard = (e) => {
        e.preventDefault();
        editBoardForm.patch(`/boards/${selectedBoard.id}`, {
            onSuccess: () => { setShowEditBoard(false); editBoardForm.reset(); setSelectedBoard(null); },
        });
    };

    const deleteProject = (project) => {
        openConfirm(
            'Hapus Project?',
            `Project "${project.name}" beserta semua board dan task-nya akan dihapus. Aksi ini tidak dapat dibatalkan.`,
            () => {
                setConfirmState(s => ({ ...s, loading: true }));
                router.delete(`/projects/${project.id}`, { onFinish: closeConfirm });
            }
        );
    };

    const deleteBoard = (board) => {
        openConfirm(
            'Hapus Board?',
            `Board "${board.name}" beserta semua task di dalamnya akan dihapus.`,
            () => {
                setConfirmState(s => ({ ...s, loading: true }));
                router.delete(`/boards/${board.id}`, { onFinish: closeConfirm });
            }
        );
    };

    const openEditProject = (project) => {
        setSelectedProject(project);
        editProjectForm.setData({ name: project.name, description: project.description || '' });
        setShowEditProject(true);
    };

    const openEditBoard = (board) => {
        setSelectedBoard(board);
        editBoardForm.setData({ name: board.name, description: board.description || '' });
        setShowEditBoard(true);
    };

    const submitAttachTeam = (e) => {
        e.preventDefault();
        teamForm.post(`/projects/${selectedProject.id}/teams`, {
            onSuccess: () => { teamForm.reset(); },
        });
    };

    const detachTeam = (project, teamId) => {
        router.delete(`/projects/${project.id}/teams/${teamId}`, {
            preserveScroll: true,
        });
    };

    /* ── Totals for admin header ─────────────────────────────────── */
    const totalBoards = projects.reduce((a, p) => a + (p.boards?.length ?? 0), 0);
    const totalTasks  = projects.reduce((a, p) => a + (p.boards?.flatMap(b => b.tasks ?? []).length ?? 0), 0);

    return (
        <AppLayout auth={auth} title={isAdmin ? 'Manage Projects' : 'My Projects'}>
            <Head title={isAdmin ? 'Manage Projects' : 'My Projects'} />

            <ConfirmDialog
                open={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={confirmState.onConfirm}
                onCancel={closeConfirm}
                loading={confirmState.loading}
            />

            {/* ── Page header ─────────────────────────────────────── */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-extrabold text-gray-900">
                        {isAdmin ? '🗂️ Manage Projects' : '📁 My Projects'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {isAdmin
                            ? 'Kelola semua project, board, dan tim yang terlibat'
                            : 'Project dari tim yang kamu ikuti'}
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

            {/* ── Admin summary strip ──────────────────────────────── */}
            {isAdmin && (
                <div className="bg-gray-100 rounded-xl overflow-hidden grid grid-cols-3 gap-px mb-6 shadow-sm">
                    {[
                        { label: 'Projects', value: projects.length,  cls: 'text-blue-600'    },
                        { label: 'Boards',   value: totalBoards,       cls: 'text-emerald-600' },
                        { label: 'Tasks',    value: totalTasks,        cls: 'text-violet-600'  },
                    ].map(({ label, value, cls }) => (
                        <div key={label} className="bg-white flex flex-col items-center py-4 px-2 select-none">
                            <p className={`text-3xl font-extrabold ${cls}`}>{value}</p>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Search ──────────────────────────────────────────── */}
            <div className="mb-5">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari project..."
                    className="w-full sm:w-80 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                />
            </div>

            {/* ── Project grid ─────────────────────────────────────── */}
            {filtered.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
                    <p className="text-4xl mb-3">📂</p>
                    <p className="text-gray-500 font-medium">
                        {search ? 'Tidak ada project yang cocok.' : 'Belum ada project.'}
                    </p>
                    {!search && (isAdmin || isManager) && (
                        <p className="text-sm text-gray-400 mt-1">Klik "+ New Project" untuk memulai.</p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filtered.map((project) => {
                        const st = projectStats(project);
                        const pct = st.tasks > 0 ? Math.round((st.done / st.tasks) * 100) : 0;
                        const isExpanded = expandedProject === project.id;

                        return (
                            <div key={project.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col">
                                {/* Card header */}
                                <div className="p-5 border-b border-gray-100">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className="bg-blue-100 text-blue-600 rounded-lg w-9 h-9 flex items-center justify-center text-lg shrink-0">
                                                📁
                                            </div>
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/projects/${project.id}`}
                                                    className="font-bold text-gray-900 hover:text-blue-600 transition block truncate"
                                                >
                                                    {project.name}
                                                </Link>
                                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                                                    {project.description || 'No description'}
                                                </p>
                                            </div>
                                        </div>
                                        {/* Action buttons */}
                                        {canEditProject(project) && (
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    onClick={() => { setSelectedProject(project); setShowCreateBoard(true); }}
                                                    className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 text-sm"
                                                    title="Add Board"
                                                >➕</button>
                                                <button
                                                    onClick={() => openEditProject(project)}
                                                    className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 text-sm"
                                                    title="Edit Project"
                                                >✏️</button>
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => { setSelectedProject(project); setShowTeamManager(true); }}
                                                        className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 text-sm"
                                                        title="Manage Teams"
                                                    >👥</button>
                                                )}
                                                {(isAdmin || project.user_id === auth.user.id) && (
                                                    <button
                                                        onClick={() => deleteProject(project)}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 text-sm"
                                                        title="Delete Project"
                                                    >🗑️</button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                                            <span>{st.tasks} tasks</span>
                                            <span>{pct}% done</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-400 rounded-full transition-all"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Meta badges */}
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                                            📋 {st.boards} board{st.boards !== 1 ? 's' : ''}
                                        </span>
                                        {st.in_progress > 0 && (
                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                                                🔄 {st.in_progress} in progress
                                            </span>
                                        )}
                                        {st.done > 0 && (
                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                                                ✅ {st.done} done
                                            </span>
                                        )}
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
                                        <>
                                            <ul className="space-y-1">
                                                {(isExpanded ? project.boards : project.boards.slice(0, 4)).map((board) => (
                                                    <li key={board.id} className="flex items-center justify-between group rounded-lg hover:bg-gray-50 px-2 py-1.5 transition">
                                                        <Link
                                                            href={`/boards/${board.id}`}
                                                            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex-1 truncate"
                                                        >
                                                            → {board.name}
                                                        </Link>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-[11px] text-gray-400 hidden group-hover:block">
                                                                {board.tasks?.length ?? 0} tasks
                                                            </span>
                                                            {canEditBoard(project.id, board) && (
                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                                    <button onClick={() => openEditBoard(board)} className="text-blue-500 hover:text-blue-700 text-xs p-0.5" title="Edit">✏️</button>
                                                                    {(isAdmin || board.user_id === auth.user.id) && (
                                                                        <button onClick={() => deleteBoard(board)} className="text-red-500 hover:text-red-700 text-xs p-0.5" title="Delete">🗑️</button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                            {project.boards.length > 4 && (
                                                <button
                                                    onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                                                    className="mt-2 text-xs text-blue-500 hover:text-blue-700 font-medium"
                                                >
                                                    {isExpanded ? '▲ Tampilkan lebih sedikit' : `▼ +${project.boards.length - 4} board lainnya`}
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">Belum ada board.</p>
                                    )}
                                </div>

                                {/* Teams footer */}
                                {project.teams && project.teams.length > 0 && (
                                    <div className="px-4 pb-4 pt-0 flex flex-wrap gap-1.5 border-t border-gray-50 pt-3">
                                        {project.teams.map((team) => (
                                            <span key={team.id} className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-100">
                                                {team.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Create Project Modal ─────────────────────────────── */}
            <Modal
                open={showCreateForm}
                onClose={() => { setShowCreateForm(false); createProjectForm.reset(); }}
                title="Buat Project Baru"
                icon="📁"
            >
                <form onSubmit={submitCreateProject}>
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
                                placeholder="Opsional — jelaskan tujuan project ini"
                                error={createProjectForm.errors.description}
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter
                        onCancel={() => { setShowCreateForm(false); createProjectForm.reset(); }}
                        submitLabel="Buat Project"
                        processing={createProjectForm.processing}
                    />
                </form>
            </Modal>

            {/* ── Create Board Modal ───────────────────────────────── */}
            <Modal
                open={showCreateBoard && !!selectedProject}
                onClose={() => { setShowCreateBoard(false); createBoardForm.reset(); setSelectedProject(null); }}
                title={selectedProject ? `Board untuk "${selectedProject.name}"` : 'Buat Board Baru'}
                icon="📋"
            >
                <form onSubmit={submitCreateBoard}>
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
                        onCancel={() => { setShowCreateBoard(false); createBoardForm.reset(); setSelectedProject(null); }}
                        submitLabel="Buat Board"
                        processing={createBoardForm.processing}
                    />
                </form>
            </Modal>

            {/* ── Edit Project Modal ───────────────────────────────── */}
            <Modal
                open={showEditProject && !!selectedProject}
                onClose={() => { setShowEditProject(false); editProjectForm.reset(); setSelectedProject(null); }}
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
                        onCancel={() => { setShowEditProject(false); editProjectForm.reset(); setSelectedProject(null); }}
                        submitLabel="Simpan Perubahan"
                        processing={editProjectForm.processing}
                    />
                </form>
            </Modal>

            {/* ── Edit Board Modal ─────────────────────────────────── */}
            <Modal
                open={showEditBoard && !!selectedBoard}
                onClose={() => { setShowEditBoard(false); editBoardForm.reset(); setSelectedBoard(null); }}
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
                        onCancel={() => { setShowEditBoard(false); editBoardForm.reset(); setSelectedBoard(null); }}
                        submitLabel="Simpan Perubahan"
                        processing={editBoardForm.processing}
                    />
                </form>
            </Modal>

            {/* ── Team Manager Modal (admin only) ──────────────────── */}
            {isAdmin && (
                <Modal
                    open={showTeamManager && !!selectedProject}
                    onClose={() => { setShowTeamManager(false); teamForm.reset(); setSelectedProject(null); }}
                    title={selectedProject ? `Tim untuk "${selectedProject.name}"` : 'Kelola Tim'}
                    icon="👥"
                >
                    <ModalBody>
                        {/* Current teams */}
                        <div className="mb-4">
                            <FieldLabel>Tim yang sudah terhubung</FieldLabel>
                            {selectedProject?.teams?.length > 0 ? (
                                <ul className="space-y-2 mt-1">
                                    {selectedProject.teams.map((team) => (
                                        <li key={team.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                            <span className="text-sm font-medium text-gray-700">👥 {team.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => detachTeam(selectedProject, team.id)}
                                                className="text-xs text-red-500 hover:text-red-700 font-medium"
                                            >
                                                Hapus
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-gray-400 italic mt-1">Belum ada tim terhubung.</p>
                            )}
                        </div>
                        {/* Attach team */}
                        <form onSubmit={submitAttachTeam}>
                            <FieldLabel>Tambah Tim</FieldLabel>
                            <div className="flex gap-2 mt-1">
                                <select
                                    value={teamForm.data.team_id}
                                    onChange={(e) => teamForm.setData('team_id', e.target.value)}
                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                                >
                                    <option value="">-- Pilih Tim --</option>
                                    {allTeams
                                        .filter(t => !selectedProject?.teams?.find(st => st.id === t.id))
                                        .map((team) => (
                                            <option key={team.id} value={team.id}>{team.name}</option>
                                        ))
                                    }
                                </select>
                                <button
                                    type="submit"
                                    disabled={!teamForm.data.team_id || teamForm.processing}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition"
                                >
                                    Tambah
                                </button>
                            </div>
                            {teamForm.errors.team_id && (
                                <p className="text-xs text-red-500 mt-1">{teamForm.errors.team_id}</p>
                            )}
                        </form>
                    </ModalBody>
                    <div className="px-6 pb-5">
                        <button
                            type="button"
                            onClick={() => { setShowTeamManager(false); teamForm.reset(); setSelectedProject(null); }}
                            className="w-full px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                        >
                            Tutup
                        </button>
                    </div>
                </Modal>
            )}
        </AppLayout>
    );
}
