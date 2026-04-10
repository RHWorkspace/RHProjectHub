import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import Toast from './Toast';
import { toast } from '../lib/toast';

/** Grouped sidebar navigation — each group has a label, allowed roles, and links with optional permissions. */
const NAV_GROUPS = [
    {
        label: null,
        adminOnly: false,
        links: [
            { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
            { label: 'My Tasks',  href: '/my-tasks',  icon: '✅' },
            { label: 'Projects',  href: '/projects',  icon: '🗂️' },
            { label: 'My Team',   href: '/my-team',   icon: '👥' },
            { label: 'Calendar',  href: '/calendar',  icon: '📅' },
        ],
    },
    {
        label: 'Analytics',
        adminOnly: false,
        links: [
            { label: 'Reporting', href: '/reporting', icon: '📈', permission: 'access_reporting' },
        ],
    },
    {
        label: 'Management',
        adminOnly: false,
        links: [
            { label: 'Manage Tasks', href: '/manage-tasks', icon: '📋', permission: 'access_manage_tasks' },
            { label: 'Workload',     href: '/workload',     icon: '⚖️', permission: 'access_workload'      },
        ],
    },
    {
        label: 'Administration',
        adminOnly: false,
        links: [
            { label: 'Manage Teams', href: '/teams',  icon: '🛠️', permission: 'access_manage_teams' },
            { label: 'Manage Users', href: '/users',  icon: '👤', permission: 'access_manage_users' },
            { label: 'Manage Roles', href: '/roles',  icon: '🔐', permission: 'access_manage_roles' },
        ],
    },
];

const ROLE_BADGE = {
    admin:   'bg-red-100 text-red-700',
    manager: 'bg-amber-100 text-amber-700',
    user:    'bg-blue-100 text-blue-700',
};

/* ── Notification type → icon/colour mapping ─────────────────────── */
const NOTIF_META = {
    task_assigned:       { icon: '📋', color: 'text-blue-600',   label: 'Assigned' },
    task_status_changed: { icon: '🔄', color: 'text-amber-600',  label: 'Status'   },
    deadline_approaching:{ icon: '⏰', color: 'text-red-600',    label: 'Deadline' },
};

function NotificationBell({ initialCount = 0 }) {
    const [open,         setOpen]         = useState(false);
    const [notifs,       setNotifs]       = useState([]);
    const [unreadCount,  setUnreadCount]  = useState(initialCount);
    const [loading,      setLoading]      = useState(false);
    const panelRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const fetchNotifs = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await fetch('/notifications', { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
            const data = await res.json();
            setNotifs(data);
            setUnreadCount(data.filter(n => !n.read_at).length);
        } catch (_) { /* silent */ }
        finally { setLoading(false); }
    }, []);

    const toggleOpen = () => {
        if (!open) fetchNotifs();
        setOpen(v => !v);
    };

    const markRead = async (id) => {
        await fetch(`/notifications/${id}/read`, {
            method: 'PATCH',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        setNotifs(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllRead = async () => {
        await fetch('/notifications/read-all', {
            method: 'PATCH',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
        setUnreadCount(0);
    };

    // Keep badge in sync when Inertia navigates (unreadNotifCount re-shared)
    const { props: pageProps } = usePage();
    useEffect(() => {
        setUnreadCount(pageProps.unreadNotifCount ?? 0);
    }, [pageProps.unreadNotifCount]);

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell button */}
            <button
                onClick={toggleOpen}
                className="relative flex items-center justify-center h-9 w-9 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-700"
                aria-label="Notifications"
            >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white shadow-xl border border-gray-100 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="text-sm font-semibold text-gray-900">Notifications</span>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                        {loading && (
                            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">Loading…</div>
                        )}
                        {!loading && notifs.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400 text-sm gap-2">
                                <span className="text-2xl">🔔</span>
                                <span>No notifications yet</span>
                            </div>
                        )}
                        {!loading && notifs.map(n => {
                            const meta = NOTIF_META[n.data?.type] ?? { icon: '🔔', color: 'text-gray-500' };
                            const isUnread = !n.read_at;
                            return (
                                <div
                                    key={n.id}
                                    className={`flex gap-3 px-4 py-3 cursor-pointer transition hover:bg-gray-50 ${isUnread ? 'bg-blue-50/50' : ''}`}
                                    onClick={() => isUnread && markRead(n.id)}
                                >
                                    <span className={`mt-0.5 text-lg shrink-0 ${meta.color}`}>{meta.icon}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-xs leading-snug ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                            {n.data?.message ?? 'Notification'}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-gray-400">{n.created_at}</p>
                                    </div>
                                    {isUnread && (
                                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AppLayout({ auth, title, children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const { url, props } = usePage();
    const userPermissions = props.userPermissions ?? [];
    const allRoles        = props.allRoles ?? [];

    // Find current user's role metadata from the shared roles list
    const currentRoleData = allRoles.find(r => r.name === auth.user.role) ?? null;
    const roleBadgeClass  = ROLE_BADGE[auth.user.role] ?? 'bg-gray-100 text-gray-700';
    const roleBadgeStyle  = currentRoleData && !ROLE_BADGE[auth.user.role]
        ? { backgroundColor: currentRoleData.color + '22', color: currentRoleData.color, border: '1px solid ' + currentRoleData.color + '55' }
        : {};
    const roleLabel = currentRoleData?.display_name ?? auth.user.role;

    /** Auto-show toast from Inertia flash on every successful request */
    useEffect(() => {
        return router.on('success', (event) => {
            const flash = event.detail.page.props.flash ?? {};
            if (flash.success) toast.success(flash.success);
            if (flash.error)   toast.error(flash.error);
        });
    }, []);

    const hasPermission = (perm) => {
        if (!perm) return true;
        if (userPermissions.includes('*')) return true;
        return userPermissions.includes(perm);
    };

    /** Filter groups visible to the current user */
    const visibleGroups = NAV_GROUPS
        .filter(g => !g.adminOnly || auth.user.role === 'admin')
        .map(g => ({
            ...g,
            links: g.links.filter(l => hasPermission(l.permission)),
        }))
        .filter(g => g.links.length > 0);

    return (
        <>
        <div className="flex h-screen overflow-hidden bg-gray-50">
            {/* ── Mobile backdrop ──────────────────────────────── */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-gray-900/60 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Sidebar ─────────────────────────────────────── */}
            <aside
                className={[
                    'fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-white border-r border-gray-200',
                    'transition-transform duration-200 ease-in-out',
                    'lg:static lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
                ].join(' ')}
            >
                {/* Brand */}
                <div className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 px-5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm select-none">
                        PH
                    </div>
                    <span className="text-base font-bold text-gray-900 tracking-tight">Project Hub</span>
                </div>

                {/* Nav groups */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                    {visibleGroups.map((group, gi) => (
                        <div key={gi}>
                            {group.label && (
                                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 select-none">
                                    {group.label}
                                </p>
                            )}
                            <div className="space-y-0.5">
                                {group.links.map(({ label, href, icon }) => {
                                    const active = url === href || url.startsWith(href + '/');
                                    return (
                                        <Link
                                            key={href}
                                            href={href}
                                            onClick={() => setSidebarOpen(false)}
                                            className={[
                                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors select-none',
                                                active
                                                    ? 'bg-blue-50 text-blue-700 font-semibold'
                                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                                            ].join(' ')}
                                        >
                                            <span className="text-base leading-none w-5 text-center">{icon}</span>
                                            <span className="flex-1">{label}</span>
                                            {active && (
                                                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* User card */}
                <div className="shrink-0 border-t border-gray-200 p-4">
                    <Link
                        href="/profile"
                        className="flex items-center gap-3 min-w-0 rounded-lg hover:bg-gray-50 p-1 transition group"
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-bold select-none">
                            {auth.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-900">{auth.user.name}</p>
                            <span
                                className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClass}`}
                                style={roleBadgeStyle}
                            >
                                {roleLabel}
                            </span>
                        </div>
                        <span className="text-gray-400 group-hover:text-gray-600 text-xs">&#9656;</span>
                    </Link>
                </div>
            </aside>

            {/* ── Main area ───────────────────────────────────── */}
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">

                {/* Top bar */}
                <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
                            aria-label="Open sidebar"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        {title && (
                            <h1 className="text-base font-semibold text-gray-800">{title}</h1>
                        )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Bell notification */}
                        <NotificationBell initialCount={props.unreadNotifCount ?? 0} />

                        {/* User dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setUserMenuOpen(v => !v)}
                                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition"
                            >
                                <div className="hidden sm:flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">{auth.user.name}</span>
                                    <span
                                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleBadgeClass}`}
                                        style={roleBadgeStyle}
                                    >
                                        {roleLabel}
                                    </span>
                                </div>
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-bold select-none">
                                    {auth.user.name.charAt(0).toUpperCase()}
                                </div>
                                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {userMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                                    <div className="absolute right-0 mt-1 w-48 rounded-xl bg-white shadow-lg border border-gray-100 z-20 py-1">
                                        <div className="px-4 py-2 border-b border-gray-100">
                                            <p className="text-xs font-semibold text-gray-900 truncate">{auth.user.name}</p>
                                            <p className="text-xs text-gray-400 truncate">{auth.user.email}</p>
                                        </div>
                                        <Link
                                            href="/profile"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                                        >
                                            <span>&#128100;</span> My Profile
                                        </Link>
                                        <button
                                            onClick={() => { setUserMenuOpen(false); router.post('/logout'); }}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                                        >
                                            <span>&#128682;</span> Logout
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Scrollable page content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="px-4 py-6 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>

        {/* Global toast notifications */}
        <Toast />
        </>
    );
}
