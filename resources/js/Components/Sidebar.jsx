import React from 'react';
import { Link } from '@inertiajs/react';

export default function Sidebar({ auth }) {
    const links = [
        { label: 'Dashboard', href: '/dashboard', role: 'all' },
        { label: 'My Tasks', href: '/my-tasks', role: 'all' },
        { label: 'My Team', href: '/my-team', role: 'all' },
        { label: 'Reporting', href: '/reporting', role: 'all' },
    ];

    if (auth.user.role === 'admin') {
        links.push({ label: 'Manage Teams', href: '/teams', role: 'admin' });
        links.push({ label: 'Manage Users', href: '/users', role: 'admin' });
    }

    return (
        <aside className="w-full lg:w-72 bg-white border-r border-gray-200 shadow-sm">
            <div className="p-6">
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-900">Project Hub</h2>
                    <p className="mt-2 text-sm text-gray-600">Easy task management for your team.</p>
                </div>

                <nav className="space-y-2">
                    {links.map((link) => (
                        <Link
                            key={link.label}
                            href={link.href}
                            className="block rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="mt-10 px-4 py-5 rounded-xl bg-gray-50">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Logged in as</p>
                    <p className="mt-2 font-semibold text-gray-900">{auth.user.name}</p>
                    <p className="text-sm text-gray-600">{auth.user.role}</p>
                </div>
            </div>
        </aside>
    );
}
