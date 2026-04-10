import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '../Components/AppLayout';
import Pagination from '../Components/Pagination';

const ROLE_META = {
    admin:   { label: 'Admin',   icon: '👑', bg: 'bg-red-50',    border: 'border-red-200',   badge: 'bg-red-100 text-red-700',     ring: 'ring-red-200'   },
    manager: { label: 'Manager', icon: '🎯', bg: 'bg-amber-50',  border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', ring: 'ring-amber-200' },
    user:    { label: 'User',    icon: '👤', bg: 'bg-blue-50',   border: 'border-blue-200',  badge: 'bg-blue-100 text-blue-700',   ring: 'ring-blue-200'  },
};

const ROLE_DESC = {
    admin:   'Akses penuh ke seluruh fitur sistem. Tidak dapat dibatasi.',
    manager: 'Mengelola project, board, task, dan tim dalam lingkup mereka.',
    user:    'Akses terbatas — hanya dapat melihat dan mengerjakan task yang ditugaskan.',
};
const COLOR_PRESETS = [
    '#ef4444', '#f97316', '#f59e0b', '#10b981',
    '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
    '#06b6d4', '#84cc16', '#14b8a6', '#64748b',
];
function ToggleSwitch({ enabled, onChange }) {
    return (
        <button
            type="button"
            onClick={onChange}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
        >
            <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    enabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
            />
        </button>
    );
}

export default function ManageRoles({ auth, users, rolePermissions, permissionList, stats, roles = [] }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [search,    setSearch]    = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [page,      setPage]      = useState(1);
    const [perPage,   setPerPage]   = useState(10);

    // group permission list by category
    const categories = [...new Set(permissionList.map(p => p.category))];

    // Build a meta lookup for any role: system roles use ROLE_META, custom roles derive from roles prop
    const getRoleMeta = (roleName) => {
        if (ROLE_META[roleName]) return ROLE_META[roleName];
        const found = roles.find(r => r.name === roleName);
        const color = found?.color ?? '#64748b';
        const label = found?.display_name ?? roleName;
        return {
            label,
            icon: '\u2736',
            bg: 'bg-gray-50',
            border: 'border-gray-200',
            badge: 'bg-gray-100 text-gray-700',
            ring: 'ring-gray-200',
            color,
        };
    };

    const togglePermission = (role, permission, current) => {
        router.patch(`/roles/${role}/permissions`, {
            permission,
            enabled: !current,
        }, { preserveScroll: true });
    };

    const changeUserRole = (userId, newRole) => {
        router.patch(`/roles/users/${userId}`, { role: newRole }, { preserveScroll: true });
    };

    const filteredUsers = users.filter(u => {
        const q = search.toLowerCase();
        const matchSearch = !search || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
        const matchRole   = roleFilter === 'all' || u.role === roleFilter;
        return matchSearch && matchRole;
    });

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / perPage));
    const paginated  = filteredUsers.slice((page - 1) * perPage, page * perPage);

    useEffect(() => { setPage(1); }, [search, roleFilter]);

    // ── Roles CRUD state ───────────────────────────────────
    const [showRoleModal,   setShowRoleModal]   = useState(false);
    const [editingRole,     setEditingRole]     = useState(null);
    const [roleForm,        setRoleForm]        = useState({ name: '', display_name: '', description: '', color: '#6366f1' });
    const [roleErrors,      setRoleErrors]      = useState({});
    const [deletingRoleId,  setDeletingRoleId]  = useState(null);

    const handleDisplayNameChange = (val) => {
        const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        setRoleForm(f => ({ ...f, display_name: val, ...(editingRole ? {} : { name: slug }) }));
    };

    const openCreateRole = () => {
        setEditingRole(null);
        setRoleForm({ name: '', display_name: '', description: '', color: '#6366f1' });
        setRoleErrors({});
        setShowRoleModal(true);
    };

    const openEditRole = (role) => {
        setEditingRole(role);
        setRoleForm({ name: role.name, display_name: role.display_name, description: role.description || '', color: role.color });
        setRoleErrors({});
        setShowRoleModal(true);
    };

    const submitRole = () => {
        if (editingRole) {
            router.put(`/roles/${editingRole.id}`, roleForm, {
                preserveScroll: true,
                onSuccess: () => { setShowRoleModal(false); setRoleErrors({}); },
                onError: (errors) => setRoleErrors(errors),
            });
        } else {
            router.post('/roles', roleForm, {
                preserveScroll: true,
                onSuccess: () => { setShowRoleModal(false); setRoleErrors({}); },
                onError: (errors) => setRoleErrors(errors),
            });
        }
    };

    const deleteRole = (roleId) => {
        router.delete(`/roles/${roleId}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingRoleId(null),
        });
    };

    const tabs = [
        { key: 'overview',    label: 'Overview',    icon: '📊' },
        { key: 'roles',       label: 'Roles',       icon: '🏷️', count: roles.length },
        { key: 'permissions', label: 'Permissions', icon: '🔐' },
        { key: 'users',       label: 'Users',       icon: '👥', count: users.length },
    ];

    return (
        <AppLayout auth={auth} title="Manage Roles">
            <Head title="Manage Roles" />

            {/* Page header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manage Roles &amp; Access</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Kelola hak akses dan role untuk setiap user dalam sistem.</p>
                </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-6 w-fit">
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
                        {t.count !== undefined && (
                            <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                                activeTab === t.key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>{t.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── TAB: OVERVIEW ─────────────────────────── */}
            {activeTab === 'overview' && (() => {
                const activeRoles = roles.filter(r => (stats[r.name] ?? 0) > 0);
                const emptyRoles  = roles.filter(r => (stats[r.name] ?? 0) === 0);
                const colClass = activeRoles.length === 1 ? 'lg:grid-cols-1 max-w-sm'
                               : activeRoles.length === 2 ? 'lg:grid-cols-2 max-w-3xl'
                               : activeRoles.length === 4 ? 'lg:grid-cols-4'
                               : 'lg:grid-cols-3';
                return (
                    <div className="space-y-6">
                        {/* Cards — roles with users only */}
                        {activeRoles.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-16 text-center">
                                <p className="text-4xl mb-3">👥</p>
                                <p className="text-gray-500 font-medium">Belum ada user yang ditetapkan ke role manapun.</p>
                                <p className="text-xs text-gray-400 mt-1">Tetapkan role pada user melalui tab <span className="font-semibold">Users</span>.</p>
                            </div>
                        ) : (
                            <div className={`grid grid-cols-1 gap-6 ${colClass}`}>
                                {activeRoles.map(roleObj => {
                                    const meta      = getRoleMeta(roleObj.name);
                                    const roleUsers = users.filter(u => u.role === roleObj.name);
                                    const count     = stats[roleObj.name] ?? 0;
                                    const isSystem  = !!ROLE_META[roleObj.name];
                                    const isAdmin   = roleObj.name === 'admin';
                                    return (
                                        <div
                                            key={roleObj.id}
                                            className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col border-2"
                                            style={{ borderColor: roleObj.color + '66' }}
                                        >
                                            {/* Card header */}
                                            <div
                                                className="px-6 py-5 border-b"
                                                style={{ backgroundColor: roleObj.color + '12', borderColor: roleObj.color + '33' }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* Icon / initials */}
                                                    <div
                                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white shrink-0"
                                                        style={{ backgroundColor: roleObj.color }}
                                                    >
                                                        {isSystem ? meta.icon : roleObj.display_name.charAt(0).toUpperCase()}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="text-lg font-bold text-gray-900 truncate">{roleObj.display_name}</h3>
                                                            {!roleObj.is_system && (
                                                                <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100">✦ custom</span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500">{count} user{count !== 1 ? 's' : ''}</p>
                                                    </div>

                                                    {/* Big count */}
                                                    <div className="text-4xl font-extrabold shrink-0" style={{ color: roleObj.color }}>
                                                        {count}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card body */}
                                            <div className="px-6 py-4 flex-1">
                                                {roleObj.description && (
                                                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">{roleObj.description}</p>
                                                )}

                                                {!isAdmin && (
                                                    <p className="text-xs mb-3" style={{ color: roleObj.color }}>
                                                        💡 Konfigurasi akses di tab <span className="font-semibold">Permissions</span>.
                                                    </p>
                                                )}

                                                {/* Member list */}
                                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                                    {roleUsers.map(u => (
                                                        <div key={u.id} className="flex items-center gap-2.5 rounded-lg hover:bg-gray-50 py-1 px-1 transition">
                                                            <div
                                                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
                                                                style={{ backgroundColor: roleObj.color }}
                                                            >
                                                                {u.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium text-gray-800 truncate leading-tight">{u.name}</p>
                                                                <p className="text-xs text-gray-400 truncate">{u.email}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Empty roles summary strip */}
                        {emptyRoles.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                                    Role tanpa user ({emptyRoles.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {emptyRoles.map(r => (
                                        <span
                                            key={r.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white"
                                            style={{ backgroundColor: r.color }}
                                        >
                                            {r.display_name}
                                            <span className="opacity-70">· 0</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ── TAB: ROLES ────────────────────────────── */}
            {activeTab === 'roles' && (
                <div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div>
                                <h3 className="font-semibold text-gray-900">Daftar Roles</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{roles.length} role terdaftar · baris sistem tidak dapat dihapus</p>
                            </div>
                            <button
                                onClick={openCreateRole}
                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                            >
                                + Tambah Role
                            </button>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nama Tampilan</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Deskripsi</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Users</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipe</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {roles.map(role => (
                                        <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                                                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">{role.name}</code>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 font-medium text-gray-900">{role.display_name}</td>
                                            <td className="px-6 py-3.5 text-gray-500 text-xs hidden md:table-cell max-w-xs">
                                                <span className="line-clamp-2">{role.description || '—'}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-center">
                                                <span className="text-sm font-semibold text-gray-700">{role.users_count}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-center">
                                                {role.is_system
                                                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">🔒 System</span>
                                                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">✦ Custom</span>
                                                }
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditRole(role)}
                                                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                                                    >
                                                        Edit
                                                    </button>
                                                    {!role.is_system && (
                                                        deletingRoleId === role.id ? (
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => deleteRole(role.id)}
                                                                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition"
                                                                >
                                                                    Hapus?
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeletingRoleId(null)}
                                                                    className="px-2 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                                                                >
                                                                    Batal
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setDeletingRoleId(role.id)}
                                                                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition"
                                                            >
                                                                Hapus
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {roles.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Belum ada role.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Role Form Modal */}
                    {showRoleModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setShowRoleModal(false)}>
                            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
                                {/* Modal header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {editingRole ? 'Edit Role' : 'Tambah Role Baru'}
                                    </h2>
                                    <button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                                </div>

                                {/* Modal body */}
                                <div className="px-6 py-5 space-y-4">
                                    {/* Display Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Tampilan <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={roleForm.display_name}
                                            onChange={e => handleDisplayNameChange(e.target.value)}
                                            placeholder="Contoh: Quality Assurance"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        {roleErrors.display_name && <p className="mt-1 text-xs text-red-600">{roleErrors.display_name}</p>}
                                    </div>

                                    {/* Slug */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Slug (ID)
                                            {editingRole?.is_system && <span className="ml-1 text-xs text-gray-400">(tidak bisa diubah)</span>}
                                        </label>
                                        <input
                                            type="text"
                                            value={roleForm.name}
                                            readOnly={!!editingRole?.is_system}
                                            onChange={e => !editingRole?.is_system && setRoleForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                                            placeholder="contoh: qa_engineer"
                                            className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                editingRole?.is_system ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''
                                            }`}
                                        />
                                        {roleErrors.name && <p className="mt-1 text-xs text-red-600">{roleErrors.name}</p>}
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                                        <textarea
                                            value={roleForm.description}
                                            onChange={e => setRoleForm(f => ({ ...f, description: e.target.value }))}
                                            placeholder="Deskripsi singkat tentang role ini…"
                                            rows={2}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        />
                                    </div>

                                    {/* Color */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Warna Badge</label>
                                        <div className="flex flex-wrap gap-2">
                                            {COLOR_PRESETS.map(c => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setRoleForm(f => ({ ...f, color: c }))}
                                                    style={{ backgroundColor: c }}
                                                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                                                        roleForm.color === c ? 'border-gray-700 scale-110 ring-2 ring-offset-1 ring-gray-400' : 'border-white hover:scale-105'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        {/* Preview */}
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="text-xs text-gray-500">Preview:</span>
                                            <span
                                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
                                                style={{ backgroundColor: roleForm.color }}
                                            >
                                                {roleForm.display_name || 'Role Name'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Modal footer */}
                                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                                    <button
                                        onClick={() => setShowRoleModal(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={submitRole}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                                    >
                                        {editingRole ? 'Simpan Perubahan' : 'Buat Role'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB: PERMISSIONS ──────────────────────── */}
            {activeTab === 'permissions' && (() => {
                const configurableRoles = roles.filter(r => r.name !== 'admin');
                const totalCols = 2 + configurableRoles.length;
                return (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Info banner */}
                        <div className="px-6 py-4 border-b border-gray-100 bg-blue-50">
                            <p className="text-sm text-blue-800">
                                <span className="font-semibold">👑 Admin</span> selalu memiliki akses penuh dan tidak dapat dibatasi.
                                Gunakan toggle untuk mengatur akses role lainnya. Role baru yang ditambahkan otomatis muncul sebagai kolom baru.
                            </p>
                        </div>

                        {configurableRoles.length === 0 ? (
                            <p className="px-6 py-10 text-center text-gray-400">Belum ada role yang dapat dikonfigurasi selain Admin.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky left-0 bg-gray-50" style={{ minWidth: '260px' }}>
                                                Permission
                                            </th>
                                            <th className="text-center px-6 py-3.5 text-xs font-semibold text-red-600 uppercase tracking-wide" style={{ minWidth: '100px' }}>
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                                                    Admin
                                                </div>
                                            </th>
                                            {configurableRoles.map(role => (
                                                <th key={role.name} className="text-center px-6 py-3.5 text-xs font-semibold uppercase tracking-wide" style={{ minWidth: '120px' }}>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: role.color }} />
                                                        <span style={{ color: role.color }}>{role.display_name}</span>
                                                        {!role.is_system && (
                                                            <span className="text-gray-400 font-normal normal-case text-[10px]">custom</span>
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categories.map(category => (
                                            <React.Fragment key={category}>
                                                <tr className="bg-gray-50/60">
                                                    <td colSpan={totalCols} className="px-6 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                        {category}
                                                    </td>
                                                </tr>
                                                {permissionList.filter(p => p.category === category).map(perm => (
                                                    <tr key={perm.key} className="border-t border-gray-50 hover:bg-gray-50/50 transition">
                                                        <td className="px-6 py-3.5 sticky left-0 bg-white">
                                                            <p className="font-medium text-gray-900">{perm.label}</p>
                                                            <p className="text-xs text-gray-400 mt-0.5">{perm.description}</p>
                                                        </td>
                                                        {/* Admin: always checked */}
                                                        <td className="px-6 py-3.5 text-center">
                                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">✓</span>
                                                        </td>
                                                        {/* Dynamic columns: one per configurable role */}
                                                        {configurableRoles.map(role => {
                                                            const enabled = rolePermissions?.[role.name]?.[perm.key] ?? false;
                                                            return (
                                                                <td key={role.name} className="px-6 py-3.5 text-center">
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <ToggleSwitch
                                                                            enabled={enabled}
                                                                            onChange={() => togglePermission(role.name, perm.key, enabled)}
                                                                        />
                                                                        <span className={`text-xs font-medium ${enabled ? 'text-blue-600' : 'text-gray-400'}`}>
                                                                            {enabled ? 'Aktif' : 'Nonaktif'}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ── TAB: USERS ────────────────────────────── */}
            {activeTab === 'users' && (
                <div>
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">🔍</span>
                            <input
                                type="text"
                                placeholder="Cari nama atau email…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <select
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg text-sm px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="all">Semua Role ({users.length})</option>
                            {roles.map(r => (
                                <option key={r.name} value={r.name}>
                                    {r.display_name} ({stats[r.name] ?? 0})
                                </option>
                            ))}
                        </select>
                        {(search || roleFilter !== 'all') && (
                            <button
                                onClick={() => { setSearch(''); setRoleFilter('all'); }}
                                className="px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200"
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role Saat Ini</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ubah Role</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginated.length > 0 ? paginated.map((user, idx) => {
                                    const meta   = getRoleMeta(user.role);
                                    const isSelf = user.id === auth.user.id;
                                    return (
                                        <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${isSelf ? 'bg-blue-50/30' : ''}`}>
                                            <td className="px-5 py-3.5 text-gray-400 text-xs">{(page - 1) * perPage + idx + 1}</td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${ROLE_META[user.role] ? meta.badge : 'text-white'}`}
                                                        style={ROLE_META[user.role] ? {} : { backgroundColor: meta.color }}
                                                    >
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 flex items-center gap-1.5">
                                                            {user.name}
                                                            {isSelf && <span className="text-xs text-green-600 font-medium">(you)</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell">{user.email}</td>
                                            <td className="px-5 py-3.5">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${meta.badge} ${meta.ring}`}
                                                    style={ROLE_META[user.role] ? {} : { backgroundColor: meta.color + '20', color: meta.color, borderColor: meta.color + '40' }}
                                                >
                                                    {meta.icon} {meta.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {isSelf ? (
                                                    <span className="text-xs text-gray-400 italic">Tidak bisa ubah sendiri</span>
                                                ) : (
                                                    <select
                                                        value={user.role}
                                                        onChange={e => changeUserRole(user.id, e.target.value)}
                                                        className="border border-gray-300 rounded-md text-sm px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:border-blue-400 transition"
                                                    >
                                                        {roles.map(r => (
                                                            <option key={r.name} value={r.name}>{r.display_name}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                                            Tidak ada user yang cocok dengan filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            total={filteredUsers.length}
                            perPage={perPage}
                            onPageChange={setPage}
                            onPerPageChange={p => { setPerPage(p); setPage(1); }}
                            label="user"
                        />
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
