import React, { useState, useMemo } from 'react';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import AppLayout from '../Components/AppLayout';
import ConfirmDialog from '../Components/ConfirmDialog';
import Modal, { ModalBody, ModalFooter, FieldLabel, FieldError, FieldInput, FieldTextarea, FieldSelect } from '../Components/Modal';

export default function Teams({ auth, teams, users, projects, teamRoles = [] }) {
    const { allRoles = [] } = usePage().props;

    const [showCreateTeamForm, setShowCreateTeamForm] = useState(false);
    const [showEditTeamForm, setShowEditTeamForm] = useState(false);
    const [showAddMemberForm, setShowAddMemberForm] = useState(false);
    const [showMapProjectForm, setShowMapProjectForm] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);

    // ── Confirm dialog ──────────────────────────────────────
    const CONFIRM_INIT = { open: false, title: '', message: '', onConfirm: null, loading: false };
    const [confirmState, setConfirmState] = useState(CONFIRM_INIT);
    const openConfirm = (title, message, onConfirm) =>
        setConfirmState({ open: true, title, message, onConfirm, loading: false });
    const closeConfirm = () => setConfirmState(CONFIRM_INIT);

    const createTeamForm = useForm({
        name: '',
        description: '',
    });

    const editTeamForm = useForm({
        name: '',
        description: '',
    });

    // Display names from DB roles — used as values in pivot + dropdowns
    const teamRoleDisplayNames = useMemo(() => teamRoles.map(r => r.display_name), [teamRoles]);

    // Map system role name → suggested team role (display_name)
    const SYSTEM_ROLE_MAP = { admin: 'Administrator', manager: 'Manager', user: 'Guest' };

    // Resolve best-match team role display_name from a user's system role name
    const getDefaultTeamRole = (userRoleName) => {
        if (!userRoleName) return teamRoleDisplayNames[0] ?? '';
        // 1. Direct system map
        const sys = SYSTEM_ROLE_MAP[userRoleName];
        if (sys && teamRoleDisplayNames.includes(sys)) return sys;
        // 2. Match user's display_name against available team roles
        const roleObj = allRoles.find(r => r.name === userRoleName);
        if (roleObj) {
            const match = teamRoleDisplayNames.find(
                tr => tr.toLowerCase() === roleObj.display_name.toLowerCase()
            );
            if (match) return match;
        }
        // 3. Match raw role slug (e.g. 'developer' → 'Developer')
        const direct = teamRoleDisplayNames.find(
            tr => tr.toLowerCase().replace(/\s+/g, '_') === userRoleName.toLowerCase().replace(/\s+/g, '_')
        );
        if (direct) return direct;
        return teamRoleDisplayNames[0] ?? '';
    };

    const handleAddMemberUserChange = (userId) => {
        addMemberForm.setData('user_id', userId);
        if (userId) {
            const picked = users.find(u => String(u.id) === String(userId));
            addMemberForm.setData('role', picked ? getDefaultTeamRole(picked.role) : (teamRoleDisplayNames[0] ?? ''));
        } else {
            addMemberForm.setData('role', teamRoleDisplayNames[0] ?? '');
        }
    };

    const addMemberForm = useForm({
        user_id: '',
        role: '',
    });

    // Users that are NOT yet members of the selected team
    const availableUsers = useMemo(() => {
        if (!selectedTeam) return users;
        const memberIds = new Set((selectedTeam.users ?? []).map(u => u.id));
        return users.filter(u => !memberIds.has(u.id));
    }, [users, selectedTeam]);

    const mapProjectForm = useForm({
        project_id: '',
    });

    const openEditTeam = (team) => {
        setSelectedTeam(team);
        editTeamForm.setData('name', team.name);
        editTeamForm.setData('description', team.description || '');
        setShowEditTeamForm(true);
    };

    const openAddMember = (team) => {
        setSelectedTeam(team);
        addMemberForm.setData('user_id', '');
        addMemberForm.setData('role', teamRoleDisplayNames[0] ?? '');
        setShowAddMemberForm(true);
    };

    const openMapProject = (team) => {
        setSelectedTeam(team);
        mapProjectForm.setData('project_id', '');
        setShowMapProjectForm(true);
    };

    const submitCreateTeam = (e) => {
        e.preventDefault();
        createTeamForm.post('/teams', {
            onSuccess: () => {
                setShowCreateTeamForm(false);
                createTeamForm.reset();
            },
        });
    };

    const submitEditTeam = (e) => {
        e.preventDefault();
        // Use editTeamForm.patch() so editTeamForm.processing is correctly tracked
        editTeamForm.patch(`/teams/${selectedTeam.id}`, {
            onSuccess: () => {
                setShowEditTeamForm(false);
                setSelectedTeam(null);
                editTeamForm.reset();
            },
        });
    };

    const deleteTeam = (team) => {
        openConfirm(
            `Hapus Tim "${team.name}"?`,
            'Semua mapping project dan anggota tim akan ikut dihapus.',
            () => {
                setConfirmState(s => ({ ...s, loading: true }));
                router.delete(`/teams/${team.id}`, { onFinish: closeConfirm });
            }
        );
    };

    const submitAddMember = (e) => {
        e.preventDefault();
        router.post(`/teams/${selectedTeam.id}/members`, addMemberForm.data, {
            onSuccess: () => {
                setShowAddMemberForm(false);
                setSelectedTeam(null);
                addMemberForm.reset();
            },
        });
    };

    const removeMember = (team, user) => {
        openConfirm(
            `Hapus ${user.name} dari tim?`,
            `${user.name} akan dikeluarkan dari tim "${team.name}".`,
            () => {
                setConfirmState(s => ({ ...s, loading: true }));
                router.delete(`/teams/${team.id}/members/${user.id}`, { onFinish: closeConfirm });
            }
        );
    };

    const submitMapProject = (e) => {
        e.preventDefault();
        router.post(`/projects/${mapProjectForm.data.project_id}/teams`, {
            team_id: selectedTeam.id,
        }, {
            onSuccess: () => {
                setShowMapProjectForm(false);
                setSelectedTeam(null);
                mapProjectForm.reset();
            },
        });
    };

    const unmapProject = (team, project) => {
        openConfirm(
            `Lepas Mapping Project?`,
            `Tim "${team.name}" akan dilepas dari project "${project.name}".`,
            () => {
                setConfirmState(s => ({ ...s, loading: true }));
                router.delete(`/projects/${project.id}/teams/${team.id}`, { onFinish: closeConfirm });
            }
        );
    };

    const handleLogout = () => {
        router.post('/logout');
    };

    // ── Filter / Sort / View state ─────────────────────────────────────
    const [searchQuery,    setSearchQuery]    = useState('');
    const [sortBy,         setSortBy]         = useState('name');
    const [viewMode,       setViewMode]       = useState('card');
    const [collapsedTeams, setCollapsedTeams] = useState({});

    const filteredTeams = useMemo(() => {
        let t = teams ?? [];
        const q = searchQuery.toLowerCase();
        if (q) t = t.filter(x => x.name.toLowerCase().includes(q) || (x.description || '').toLowerCase().includes(q));
        if (sortBy === 'name')     t = [...t].sort((a, b) => a.name.localeCompare(b.name));
        if (sortBy === 'members')  t = [...t].sort((a, b) => (b.users?.length || 0) - (a.users?.length || 0));
        if (sortBy === 'projects') t = [...t].sort((a, b) => (b.projects?.length || 0) - (a.projects?.length || 0));
        return t;
    }, [teams, searchQuery, sortBy]);

    const teamStats = useMemo(() => ({
        total:    (teams ?? []).length,
        members:  (teams ?? []).reduce((s, t) => s + (t.users?.length || 0), 0),
        projects: (teams ?? []).reduce((s, t) => s + (t.projects?.length || 0), 0),
    }), [teams]);

    const toggleCollapse = (id) => setCollapsedTeams(prev => ({ ...prev, [id]: !prev[id] }));
    const collapseAll    = ()   => { const c = {}; (teams ?? []).forEach(t => { c[t.id] = true; }); setCollapsedTeams(c); };
    const expandAll      = ()   => setCollapsedTeams({});
    const allCollapsed   = (teams ?? []).length > 0 && (teams ?? []).every(t => !!collapsedTeams[t.id]);

    return (
        <AppLayout auth={auth} title="Teams">
            <Head title="Teams" />
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Manage Teams</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {teamStats.total} tim &mdash; {teamStats.members} anggota &mdash; {teamStats.projects} project
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={allCollapsed ? expandAll : collapseAll}
                        className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                        {allCollapsed ? '↕ Expand All' : '↕ Collapse All'}
                    </button>
                    <button
                        onClick={() => setShowCreateTeamForm(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
                    >
                        + Create Team
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                    { label: 'Total Tim',     value: teamStats.total,    icon: '👥', color: 'text-blue-600',    border: 'border-blue-200'    },
                    { label: 'Total Anggota', value: teamStats.members,  icon: '👤', color: 'text-emerald-600', border: 'border-emerald-200' },
                    { label: 'Total Project', value: teamStats.projects, icon: '📁', color: 'text-purple-600',  border: 'border-purple-200'  },
                ].map(({ label, value, icon, color, border }) => (
                    <div key={label} className={`bg-white rounded-xl border ${border} px-4 py-3 flex items-center gap-3`}>
                        <span className="text-2xl">{icon}</span>
                        <div>
                            <p className={`text-2xl font-bold ${color}`}>{value}</p>
                            <p className="text-xs text-gray-500">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search + Sort + View toggle */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="🔍 Cari tim..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-3 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600">&times;</button>
                    )}
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-blue-500">
                    <option value="name">Sort: Nama</option>
                    <option value="members">Sort: Anggota {'\u2193'}</option>
                    <option value="projects">Sort: Project {'\u2193'}</option>
                </select>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    <button type="button" onClick={() => setViewMode('card')}
                        className={`px-2.5 py-1.5 text-xs font-medium transition ${viewMode === 'card' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                        ☰ Card
                    </button>
                    <button type="button" onClick={() => setViewMode('table')}
                        className={`px-2.5 py-1.5 text-xs font-medium border-l border-gray-200 transition ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                        ≡ Table
                    </button>
                </div>
            </div>

            {/* Filter summary */}
            {searchQuery && (
                <p className="text-xs text-gray-500 mb-3">
                    Menampilkan <strong>{filteredTeams.length}</strong> dari <strong>{teamStats.total}</strong> tim &mdash;{' '}
                    <button type="button" onClick={() => setSearchQuery('')} className="text-blue-500 hover:underline">Hapus filter</button>
                </p>
            )}

            {/* Empty state */}
            {filteredTeams.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <p className="text-4xl mb-3">{searchQuery ? '🔍' : '👥'}</p>
                    <p className="text-gray-500">{searchQuery ? 'Tidak ada tim yang sesuai pencarian.' : 'No teams yet. Create one to get started!'}</p>
                </div>
            )}

            {/* Table view */}
            {viewMode === 'table' && filteredTeams.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tim</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Anggota</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Project</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTeams.map(team => (
                                <tr key={team.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-semibold text-gray-900">{team.name}</p>
                                        {team.description && <p className="text-xs text-gray-400 truncate max-w-xs">{team.description}</p>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <div className="flex -space-x-1.5">
                                                {(team.users || []).slice(0, 5).map(u => (
                                                    <div key={u.id} title={u.name}
                                                        className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 border-2 border-white flex items-center justify-center text-xs font-bold">
                                                        {u.name.split(' ').map(n => n[0]).slice(0, 1).join('')}
                                                    </div>
                                                ))}
                                                {(team.users?.length || 0) > 5 && (
                                                    <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                                                        +{(team.users?.length || 0) - 5}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-500">{team.users?.length || 0}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                                            📁 {team.projects?.length || 0}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button onClick={() => openAddMember(team)} className="text-xs text-gray-600 px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 transition">+ Member</button>
                                            <button onClick={() => openMapProject(team)} className="text-xs text-purple-600 px-2 py-1 border border-purple-200 rounded hover:bg-purple-50 transition">+ Project</button>
                                            <button onClick={() => openEditTeam(team)} className="text-xs text-blue-600 px-2 py-1 border border-blue-200 rounded hover:bg-blue-50 transition">✏️ Edit</button>
                                            <Link href={`/teams/${team.id}`} className="text-xs text-gray-600 px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 transition">🔍</Link>
                                            <button onClick={() => deleteTeam(team)} className="text-xs text-red-600 px-2 py-1 border border-red-200 rounded hover:bg-red-50 transition">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Card view */}
            {viewMode === 'card' && filteredTeams.length > 0 && (
                <div className="space-y-4">
                    {filteredTeams.map((team) => {
                        const isCollapsed = !!collapsedTeams[team.id];
                        return (
                        <div key={team.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                            {/* Team Header */}
                            <div className="flex items-start justify-between gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => toggleCollapse(team.id)}
                                    className="flex-1 min-w-0 text-left flex items-start gap-3 group"
                                >
                                    <span className={`mt-0.5 text-gray-400 text-sm shrink-0 transition-transform duration-200 inline-block ${isCollapsed ? '-rotate-90' : ''}`}>▾</span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{team.name}</h3>
                                            <span className="inline-flex items-center bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                                                👥 {team.users?.length || 0} member{(team.users?.length || 0) !== 1 ? 's' : ''}
                                            </span>
                                            <span className="inline-flex items-center bg-purple-50 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                                                📁 {team.projects?.length || 0} project{(team.projects?.length || 0) !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        {team.description && (
                                            <p className="text-xs text-gray-500 mt-1 truncate max-w-2xl">{team.description}</p>
                                        )}
                                    </div>
                                </button>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => openAddMember(team)}
                                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                                    >
                                        + Member
                                    </button>
                                    <button
                                        onClick={() => openMapProject(team)}
                                        className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
                                    >
                                        + Project
                                    </button>
                                    <button
                                        onClick={() => openEditTeam(team)}
                                        className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        onClick={() => deleteTeam(team)}
                                        className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                                    >
                                        🗑️ Delete
                                    </button>
                                    <Link
                                        href={`/teams/${team.id}`}
                                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                                    >
                                        🔍 Detail
                                    </Link>
                                </div>
                            </div>

                            {/* Body: Members | Projects (collapsible) */}
                            {!isCollapsed && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">

                                {/* Members column */}
                                <div className="px-6 py-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-semibold text-gray-700">
                                            Members
                                            {(team.users?.length || 0) > 0 && (
                                                <span className="ml-1.5 text-xs font-normal text-gray-400">({team.users.length})</span>
                                            )}
                                        </span>
                                        <button
                                            onClick={() => openAddMember(team)}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                                        >
                                            + Add Member
                                        </button>
                                    </div>
                                    {team.users && team.users.length > 0 ? (
                                        <div className="overflow-y-auto max-h-52 space-y-0.5 pr-1">
                                            {team.users.map((user) => (
                                                <div key={user.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 group">
                                                    <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold uppercase select-none">
                                                        {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs text-gray-400 truncate max-w-[140px]">{user.email}</span>
                                                            <span className="shrink-0 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">{user.pivot.role}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeMember(team, user)}
                                                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-red-400 hover:text-red-600 px-1"
                                                        title="Remove from team"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">No members yet.</p>
                                    )}
                                </div>

                                {/* Projects column */}
                                <div className="px-6 py-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-semibold text-gray-700">
                                            Mapped Projects
                                            {(team.projects?.length || 0) > 0 && (
                                                <span className="ml-1.5 text-xs font-normal text-gray-400">({team.projects.length})</span>
                                            )}
                                        </span>
                                        <button
                                            onClick={() => openMapProject(team)}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                                        >
                                            + Map Project
                                        </button>
                                    </div>
                                    {team.projects && team.projects.length > 0 ? (
                                        <div className="overflow-y-auto max-h-52 space-y-1 pr-1">
                                            {team.projects.map((project) => (
                                                <div key={project.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 group transition-colors">
                                                    <span className="text-sm font-medium text-purple-900 truncate">📁 {project.name}</span>
                                                    <button
                                                        onClick={() => unmapProject(team, project)}
                                                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-purple-400 hover:text-red-600 px-1"
                                                        title="Unmap project"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">No projects mapped.</p>
                                    )}
                                </div>
                            </div>
                            )}
                        </div>
                        );
                    })}
                </div>
            )}

            <Modal open={showCreateTeamForm} onClose={() => setShowCreateTeamForm(false)} title="Buat Tim Baru" icon="👥" size="sm">
                    <form onSubmit={submitCreateTeam}>
                        <ModalBody>
                            <div>
                                <FieldLabel required>Nama Tim</FieldLabel>
                                <FieldInput
                                    type="text"
                                    value={createTeamForm.data.name}
                                    onChange={(e) => createTeamForm.setData('name', e.target.value)}
                                    error={createTeamForm.errors.name}
                                    required
                                />
                                <FieldError>{createTeamForm.errors.name}</FieldError>
                            </div>
                            <div>
                                <FieldLabel>Deskripsi</FieldLabel>
                                <FieldTextarea
                                    value={createTeamForm.data.description}
                                    onChange={(e) => createTeamForm.setData('description', e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </ModalBody>
                        <ModalFooter
                            onCancel={() => setShowCreateTeamForm(false)}
                            submitLabel="Buat Tim"
                            processing={createTeamForm.processing}
                        />
                    </form>
                </Modal>

                <Modal open={showEditTeamForm && !!selectedTeam} onClose={() => { setShowEditTeamForm(false); setSelectedTeam(null); }} title="Edit Tim" icon="✏️" size="sm">
                    <form onSubmit={submitEditTeam}>
                        <ModalBody>
                            <div>
                                <FieldLabel required>Nama Tim</FieldLabel>
                                <FieldInput
                                    type="text"
                                    value={editTeamForm.data.name}
                                    onChange={(e) => editTeamForm.setData('name', e.target.value)}
                                    error={editTeamForm.errors.name}
                                    required
                                />
                                <FieldError>{editTeamForm.errors.name}</FieldError>
                            </div>
                            <div>
                                <FieldLabel>Deskripsi</FieldLabel>
                                <FieldTextarea
                                    value={editTeamForm.data.description}
                                    onChange={(e) => editTeamForm.setData('description', e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </ModalBody>
                        <ModalFooter
                            onCancel={() => { setShowEditTeamForm(false); setSelectedTeam(null); }}
                            submitLabel="Simpan Perubahan"
                            processing={editTeamForm.processing}
                        />
                    </form>
                </Modal>

                <Modal open={showAddMemberForm && !!selectedTeam} onClose={() => { setShowAddMemberForm(false); setSelectedTeam(null); }} title={selectedTeam ? `Tambah Anggota — ${selectedTeam.name}` : 'Tambah Anggota'} icon="👤" size="sm">
                    <form onSubmit={submitAddMember}>
                        <ModalBody>
                            <div>
                                <FieldLabel required>Pengguna</FieldLabel>
                                <FieldSelect
                                    value={addMemberForm.data.user_id}
                                    onChange={(e) => handleAddMemberUserChange(e.target.value)}
                                    error={addMemberForm.errors.user_id}
                                    required
                                >
                                    <option value="">— Pilih pengguna —</option>
                                    {availableUsers.length === 0 && (
                                        <option disabled value="">Semua pengguna sudah menjadi anggota</option>
                                    )}
                                    {availableUsers.map((user) => {
                                        const roleObj = allRoles.find(r => r.name === user.role);
                                        const roleLabel = roleObj?.display_name ?? user.role;
                                        return (
                                            <option key={user.id} value={user.id}>
                                                {user.name} ({user.email}) — {roleLabel}
                                            </option>
                                        );
                                    })}
                                </FieldSelect>
                                <FieldError>{addMemberForm.errors.user_id}</FieldError>
                            </div>
                            <div>
                                <FieldLabel>Role dalam Tim</FieldLabel>
                                <FieldSelect
                                    value={addMemberForm.data.role}
                                    onChange={(e) => addMemberForm.setData('role', e.target.value)}
                                >
                                    {teamRoles.map((r) => (
                                        <option key={r.name} value={r.display_name}>{r.display_name}</option>
                                    ))}
                                </FieldSelect>
                                {addMemberForm.data.user_id && (() => {
                                    const picked = users.find(u => String(u.id) === String(addMemberForm.data.user_id));
                                    if (!picked) return null;
                                    const roleObj = allRoles.find(r => r.name === picked.role);
                                    const sysLabel = roleObj?.display_name ?? picked.role;
                                    return (
                                        <p className="mt-1.5 text-xs text-blue-600 flex items-center gap-1">
                                            <span>ℹ️</span>
                                            <span>Role sistem: <strong>{sysLabel}</strong> → disarankan: <strong>{addMemberForm.data.role}</strong>. Bisa diubah sesuai kebutuhan.</span>
                                        </p>
                                    );
                                })()}
                            </div>
                        </ModalBody>
                        <ModalFooter
                            onCancel={() => { setShowAddMemberForm(false); setSelectedTeam(null); }}
                            submitLabel="Tambah Anggota"
                            processing={addMemberForm.processing}
                        />
                    </form>
                </Modal>

                <Modal open={showMapProjectForm && !!selectedTeam} onClose={() => { setShowMapProjectForm(false); setSelectedTeam(null); }} title={selectedTeam ? `Hubungkan Project — ${selectedTeam.name}` : 'Hubungkan Project'} icon="📁" size="sm">
                    <form onSubmit={submitMapProject}>
                        <ModalBody>
                            <div>
                                <FieldLabel required>Project</FieldLabel>
                                <FieldSelect
                                    value={mapProjectForm.data.project_id}
                                    onChange={(e) => mapProjectForm.setData('project_id', e.target.value)}
                                    error={mapProjectForm.errors.project_id}
                                    required
                                >
                                    <option value="">Pilih project</option>
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </FieldSelect>
                                <FieldError>{mapProjectForm.errors.project_id}</FieldError>
                            </div>
                        </ModalBody>
                        <ModalFooter
                            onCancel={() => { setShowMapProjectForm(false); setSelectedTeam(null); }}
                            submitLabel="Hubungkan"
                            processing={mapProjectForm.processing}
                        />
                    </form>
                </Modal>

            <ConfirmDialog
                open={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={confirmState.onConfirm}
                onCancel={closeConfirm}
                loading={confirmState.loading}
            />
        </AppLayout>
    );
}
