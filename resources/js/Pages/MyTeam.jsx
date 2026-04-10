import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '../Components/AppLayout';

export default function MyTeam({ auth, teams }) {
    return (
        <AppLayout auth={auth} title="My Team">
            <Head title="My Team" />

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-gray-900">My Team</h2>
                    <p className="mt-1 text-sm text-gray-500">Tim yang Anda ikuti beserta anggota dan project terkait.</p>
                </div>
                <div className="rounded-xl bg-white border border-gray-200 px-5 py-2.5 shadow-sm text-center">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Teams</div>
                    <div className="text-2xl font-bold text-gray-900">{teams.length}</div>
                </div>
            </div>

            {teams.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
                    <p className="text-base font-semibold text-gray-900">Anda belum menjadi anggota tim apapun.</p>
                    <p className="mt-2 text-sm text-gray-500">Hubungi admin untuk menambahkan Anda ke tim.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {teams.map((team) => (
                        <div key={team.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="px-6 py-5 sm:px-8">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900">{team.name}</h3>
                                        <p className="mt-1 max-w-2xl text-sm text-gray-600">{team.description || 'Deskripsi tim belum ditambahkan.'}</p>
                                    </div>
                                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700 shrink-0">
                                        <span>{team.projects.length}</span>
                                        <span className="text-blue-500">Project{team.projects.length !== 1 ? 's' : ''}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-6 border-t border-gray-100 bg-gray-50 px-6 py-6 sm:grid-cols-2 sm:px-8">
                                <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                                    <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Anggota Tim</h4>
                                    <div className="space-y-3">
                                        {team.users.map((user) => (
                                            <div key={user.id} className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                                    <p className="text-xs text-gray-500">{user.email}</p>
                                                </div>
                                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                                                    {user.pivot.role}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                                    <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Project Terkait</h4>
                                    {team.projects.length === 0 ? (
                                        <p className="text-sm text-gray-500">Belum ada project yang dipetakan ke tim ini.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {team.projects.map((project) => (
                                                <div key={project.id} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                                                    <p className="text-sm font-medium text-gray-900">{project.name}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </AppLayout>
    );
}

