import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '../Components/AppLayout';

const ROLE_BADGE = {
    admin:   'bg-red-100 text-red-700',
    manager: 'bg-amber-100 text-amber-700',
    user:    'bg-blue-100 text-blue-700',
};

function Alert({ type, message }) {
    if (!message) return null;
    const styles = type === 'success'
        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        : 'bg-red-50 border border-red-200 text-red-700';
    return <div className={`rounded-lg px-4 py-3 text-sm font-medium ${styles} mb-4`}>{message}</div>;
}

export default function Profile({ auth, stats, teams }) {
    const [activeTab, setActiveTab] = useState('info');

    const profileForm = useForm({
        name:  auth.user.name,
        email: auth.user.email,
    });

    const passwordForm = useForm({
        current_password: '',
        password:         '',
        password_confirmation: '',
    });

    const submitProfile = (e) => {
        e.preventDefault();
        profileForm.patch('/profile', {
            onSuccess: () => {},
        });
    };

    const submitPassword = (e) => {
        e.preventDefault();
        passwordForm.patch('/profile/password', {
            onSuccess: () => passwordForm.reset(),
        });
    };

    const initials = auth.user.name
        .split(' ')
        .slice(0, 2)
        .map(w => w.charAt(0).toUpperCase())
        .join('');

    const tabs = [
        { key: 'info',     label: 'Personal Info',  icon: '👤' },
        { key: 'password', label: 'Change Password', icon: '🔒' },
        { key: 'activity', label: 'Activity',        icon: '📊' },
    ];

    return (
        <AppLayout auth={auth} title="Profile">
            <Head title="Profile" />

            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold select-none shadow-md">
                            {initials}
                        </div>
                        <span className={`absolute -bottom-1 -right-1 text-xs font-semibold px-2 py-0.5 rounded-full border-2 border-white ${ROLE_BADGE[auth.user.role] ?? 'bg-gray-100 text-gray-700'}`}>
                            {auth.user.role}
                        </span>
                    </div>
                    {/* Info */}
                    <div className="text-center sm:text-left flex-1">
                        <h2 className="text-xl font-bold text-gray-900">{auth.user.name}</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{auth.user.email}</p>
                        {teams.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5 justify-center sm:justify-start">
                                {teams.map(t => (
                                    <span key={t.id} className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 font-medium">
                                        👥 {t.name}
                                        {t.role && <span className="opacity-60">· {t.role}</span>}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Quick stats */}
                    <div className="flex gap-4 shrink-0">
                        {[
                            { label: 'Total',       value: stats.total,       color: 'text-gray-700' },
                            { label: 'In Progress', value: stats.in_progress, color: 'text-blue-600' },
                            { label: 'Done',        value: stats.done,        color: 'text-emerald-600' },
                        ].map(s => (
                            <div key={s.label} className="text-center">
                                <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-6 w-fit">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === t.key
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <span>{t.icon}</span>{t.label}
                    </button>
                ))}
            </div>

            {/* Tab: Personal Info */}
            {activeTab === 'info' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-lg">
                    <h3 className="text-base font-bold text-gray-800 mb-4">Update Personal Info</h3>
                    <Alert type="success" message={profileForm.recentlySuccessful ? 'Profile updated successfully.' : null} />
                    <form onSubmit={submitProfile} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                value={profileForm.data.name}
                                onChange={e => profileForm.setData('name', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                            {profileForm.errors.name && <p className="mt-1 text-xs text-red-600">{profileForm.errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                value={profileForm.data.email}
                                onChange={e => profileForm.setData('email', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                            {profileForm.errors.email && <p className="mt-1 text-xs text-red-600">{profileForm.errors.email}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <input
                                type="text"
                                value={auth.user.role}
                                disabled
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                            <p className="mt-1 text-xs text-gray-400">Role can only be changed by an administrator.</p>
                        </div>
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={profileForm.processing}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
                            >
                                {profileForm.processing ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tab: Change Password */}
            {activeTab === 'password' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-lg">
                    <h3 className="text-base font-bold text-gray-800 mb-4">Change Password</h3>
                    <Alert type="success" message={passwordForm.recentlySuccessful ? 'Password changed successfully.' : null} />
                    <form onSubmit={submitPassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                            <input
                                type="password"
                                value={passwordForm.data.current_password}
                                onChange={e => passwordForm.setData('current_password', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                            {passwordForm.errors.current_password && <p className="mt-1 text-xs text-red-600">{passwordForm.errors.current_password}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <input
                                type="password"
                                value={passwordForm.data.password}
                                onChange={e => passwordForm.setData('password', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                            {passwordForm.errors.password && <p className="mt-1 text-xs text-red-600">{passwordForm.errors.password}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                value={passwordForm.data.password_confirmation}
                                onChange={e => passwordForm.setData('password_confirmation', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={passwordForm.processing}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
                            >
                                {passwordForm.processing ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tab: Activity */}
            {activeTab === 'activity' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Tasks',    value: stats.total,       icon: '📋', accent: 'border-gray-400',    bg: 'bg-gray-50',    val: 'text-gray-700'   },
                        { label: 'To Do',          value: stats.todo,        icon: '⏳', accent: 'border-slate-400',   bg: 'bg-slate-50',   val: 'text-slate-700'  },
                        { label: 'In Progress',    value: stats.in_progress, icon: '🔄', accent: 'border-blue-500',    bg: 'bg-blue-50',    val: 'text-blue-700'   },
                        { label: 'Done',           value: stats.done,        icon: '✅', accent: 'border-emerald-500', bg: 'bg-emerald-50', val: 'text-emerald-700'},
                    ].map(s => (
                        <div key={s.label} className={`bg-white rounded-xl shadow-sm border-l-4 ${s.accent} p-5 flex items-center gap-4`}>
                            <div className={`${s.bg} rounded-xl w-12 h-12 flex items-center justify-center text-xl shrink-0`}>{s.icon}</div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{s.label}</p>
                                <p className={`text-3xl font-extrabold ${s.val}`}>{s.value}</p>
                            </div>
                        </div>
                    ))}

                    {teams.length > 0 && (
                        <div className="sm:col-span-2 lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <h4 className="text-sm font-bold text-gray-700 mb-3">Team Memberships</h4>
                            <div className="flex flex-wrap gap-2">
                                {teams.map(t => (
                                    <div key={t.id} className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                                        <span className="text-lg">👥</span>
                                        <div>
                                            <p className="text-sm font-semibold text-purple-800">{t.name}</p>
                                            {t.role && <p className="text-xs text-purple-500">{t.role}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </AppLayout>
    );
}
