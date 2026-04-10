import React, { useState, useEffect } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '../Components/AppLayout';
import Pagination from '../Components/Pagination';
import ConfirmDialog from '../Components/ConfirmDialog';
import Modal, { ModalBody, ModalFooter } from '../Components/Modal';

/* ── shared modal field classes ───────────────────────── */
const inputCls = 'block w-full rounded-md border border-gray-300 shadow-sm text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

function UserFormFields({ form, idPrefix }) {
    return (
        <>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)}
                    className={inputCls} required />
                {form.errors.name && <p className="mt-1 text-xs text-red-600">{form.errors.name}</p>}
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)}
                    className={inputCls} required />
                {form.errors.email && <p className="mt-1 text-xs text-red-600">{form.errors.email}</p>}
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={form.data.role} onChange={(e) => form.setData('role', e.target.value)} className={inputCls}>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="user">User</option>
                </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password {idPrefix === 'edit' && <span className="text-gray-400 font-normal">(kosongkan jika tidak diubah)</span>}
                        {idPrefix === 'create' && <span className="text-red-500">*</span>}
                    </label>
                    <input type="password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)}
                        className={inputCls} />
                    {form.errors.password && <p className="mt-1 text-xs text-red-600">{form.errors.password}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input type="password" value={form.data.password_confirmation}
                        onChange={(e) => form.setData('password_confirmation', e.target.value)}
                        className={inputCls} />
                </div>
            </div>
        </>
    );
}

export default function Users({ auth, users }) {
    const [showCreateUserForm, setShowCreateUserForm] = useState(false);
    const [showEditUserForm, setShowEditUserForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    // ── Confirm dialog ──────────────────────────────────────
    const CONFIRM_INIT = { open: false, title: '', message: '', onConfirm: null, loading: false };
    const [confirmState, setConfirmState] = useState(CONFIRM_INIT);
    const openConfirm = (title, message, onConfirm) =>
        setConfirmState({ open: true, title, message, onConfirm, loading: false });
    const closeConfirm = () => setConfirmState(CONFIRM_INIT);

    const createUserForm = useForm({
        name: '',
        email: '',
        role: 'user',
        password: '',
        password_confirmation: '',
    });

    const editUserForm = useForm({
        name: '',
        email: '',
        role: 'user',
        password: '',
        password_confirmation: '',
    });

    const submitUser = (e) => {
        e.preventDefault();
        createUserForm.post('/users', {
            onSuccess: () => {
                setShowCreateUserForm(false);
                createUserForm.reset();
            },
            preserveScroll: true,
        });
    };

    const startEditUser = (user) => {
        setEditingUser(user);
        editUserForm.setData('name', user.name || '');
        editUserForm.setData('email', user.email || '');
        editUserForm.setData('role', user.role || 'user');
        editUserForm.setData('password', '');
        editUserForm.setData('password_confirmation', '');
        setShowEditUserForm(true);
    };

    const updateUser = (e) => {
        e.preventDefault();
        // Use editUserForm.patch() so editUserForm.processing is correctly set
        editUserForm.patch(`/users/${editingUser.id}`, {
            onSuccess: () => {
                setShowEditUserForm(false);
                setEditingUser(null);
                editUserForm.reset();
            },
            preserveScroll: true,
        });
    };

    const deleteUser = (userId, userName) => {
        openConfirm(
            `Hapus User "${userName}"?`,
            'Akun user ini akan dihapus permanen dari sistem.',
            () => {
                setConfirmState(s => ({ ...s, loading: true }));
                router.delete(`/users/${userId}`, {
                    preserveScroll: true,
                    onFinish: closeConfirm,
                });
            }
        );
    };

    const getInitials = (name) =>
        name ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : '?';

    const roleColor = (role) => {
        if (role === 'admin')   return 'bg-red-100 text-red-700 ring-red-200';
        if (role === 'manager') return 'bg-amber-100 text-amber-700 ring-amber-200';
        return 'bg-blue-100 text-blue-700 ring-blue-200';
    };

    const avatarColor = (role) => {
        if (role === 'admin')   return 'bg-red-100 text-red-700';
        if (role === 'manager') return 'bg-amber-100 text-amber-700';
        return 'bg-blue-100 text-blue-700';
    };

    const PER_PAGE = 10;
    const [page, setPage] = useState(1);

    const filteredUsers = users.filter((u) => {
        const matchSearch = search === '' ||
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase());
        const matchRole = roleFilter === 'all' || u.role === roleFilter;
        return matchSearch && matchRole;
    });

    const totalPages  = Math.max(1, Math.ceil(filteredUsers.length / PER_PAGE));
    const paginated   = filteredUsers.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    useEffect(() => { setPage(1); }, [search, roleFilter]);

    const counts = {
        total:   users.length,
        admin:   users.filter((u) => u.role === 'admin').length,
        manager: users.filter((u) => u.role === 'manager').length,
        user:    users.filter((u) => u.role === 'user').length,
    };

    return (
        <AppLayout auth={auth} title="Manage Users">
            <Head title="Manage Users" />

            {/* ── Page header ──────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Manage Users</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{counts.total} user{counts.total !== 1 ? 's' : ''} terdaftar di sistem</p>
                </div>
                <button
                    onClick={() => setShowCreateUserForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
                >
                    + Add User
                </button>
            </div>

            {/* ── Stats bar ────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[{ label: 'Total Users', value: counts.total, color: 'text-gray-700', bg: 'bg-white' },
                  { label: 'Admin',       value: counts.admin,   color: 'text-red-600',  bg: 'bg-red-50' },
                  { label: 'Manager',     value: counts.manager, color: 'text-amber-600',bg: 'bg-amber-50' },
                  { label: 'User',        value: counts.user,    color: 'text-blue-600', bg: 'bg-blue-50' },
                ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`${bg} rounded-xl border border-gray-100 shadow-sm px-5 py-4`}>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
                    </div>
                ))}
            </div>

            {/* ── Search + Role filter ─────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">🔍</span>
                    <input
                        type="text"
                        placeholder="Cari nama atau email…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg text-sm px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="all">Semua Role</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="user">User</option>
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

            {/* ── Table ────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.length > 0 ? (
                                paginated.map((user, idx) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-5 py-3.5 text-gray-400">{(page - 1) * PER_PAGE + idx + 1}</td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold select-none ${avatarColor(user.role)}`}>
                                                    {getInitials(user.name)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{user.name}</div>
                                                    {user.id === auth.user.id && (
                                                        <span className="text-xs text-green-600 font-medium">(you)</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-500">{user.email}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${roleColor(user.role)}`}>
                                                {user.role === 'admin' ? '🔴' : user.role === 'manager' ? '🟡' : '🔵'} {user.role}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => startEditUser(user)}
                                                    className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    onClick={() => deleteUser(user.id, user.name)}
                                                    className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
                                                >
                                                    🗑️ Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-5 py-10 text-center text-gray-400">
                                        {search || roleFilter !== 'all' ? 'Tidak ada user yang cocok dengan filter.' : 'Belum ada user.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={filteredUsers.length}
                    perPage={PER_PAGE}
                    onPageChange={setPage}
                    label="user"
                />
            </div>

            {/* ── Create User Modal ────────────────────────── */}
            <Modal open={showCreateUserForm} onClose={() => { setShowCreateUserForm(false); createUserForm.reset(); }} title="Tambah User Baru" icon="👤">
                <form onSubmit={submitUser}>
                    <ModalBody>
                        <UserFormFields form={createUserForm} idPrefix="create" />
                    </ModalBody>
                    <ModalFooter
                        onCancel={() => { setShowCreateUserForm(false); createUserForm.reset(); }}
                        submitLabel="Buat User"
                        processing={createUserForm.processing}
                    />
                </form>
            </Modal>

            {/* ── Edit User Modal ───────────────────────────── */}
            <Modal open={showEditUserForm && !!editingUser} onClose={() => { setShowEditUserForm(false); setEditingUser(null); editUserForm.reset(); }} title="Edit User" icon="✏️">
                <form onSubmit={updateUser}>
                    <ModalBody>
                        {editingUser && (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-2">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${avatarColor(editingUser.role)}`}>
                                    {getInitials(editingUser.name)}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">{editingUser.name}</p>
                                    <p className="text-xs text-gray-400">{editingUser.email}</p>
                                </div>
                            </div>
                        )}
                        <UserFormFields form={editUserForm} idPrefix="edit" />
                    </ModalBody>
                    <ModalFooter
                        onCancel={() => { setShowEditUserForm(false); setEditingUser(null); editUserForm.reset(); }}
                        submitLabel="Simpan Perubahan"
                        processing={editUserForm.processing}
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
