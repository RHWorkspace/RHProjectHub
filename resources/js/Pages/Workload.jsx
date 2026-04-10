import React, { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import AppLayout from '@/Components/AppLayout';

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(name = '') {
    return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
}

function avatarColor(name = '') {
    const COLORS = [
        'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
        'bg-amber-500',  'bg-rose-500', 'bg-cyan-500',
        'bg-pink-500',   'bg-lime-600', 'bg-orange-500',
    ];
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) % COLORS.length;
    return COLORS[h];
}

function roleMeta(systemRole, teamRole = null) {
    const display = teamRole ?? systemRole;
    const lower   = (display ?? '').toLowerCase();

    if (lower === 'admin'    || lower.includes('admin'))      return { cls: 'bg-red-100 text-red-700 border-red-200',        label: display };
    if (lower.includes('chief'))                              return { cls: 'bg-amber-100 text-amber-700 border-amber-200',  label: display };
    if (lower === 'manager'  || lower.includes('manager'))   return { cls: 'bg-amber-100 text-amber-700 border-amber-200',  label: display };
    if (lower.includes('analyst'))                            return { cls: 'bg-purple-100 text-purple-700 border-purple-200', label: display };
    if (lower.includes('develop'))                            return { cls: 'bg-blue-100 text-blue-700 border-blue-200',     label: display };
    if (lower.includes('qa') || lower.includes('quality') || lower.includes('test'))
                                                              return { cls: 'bg-orange-100 text-orange-700 border-orange-200', label: display };
    if (lower.includes('writer') || lower === 'tw')          return { cls: 'bg-cyan-100 text-cyan-700 border-cyan-200',     label: display };
    if (lower === 'user'  || lower === 'guest')               return { cls: 'bg-gray-100 text-gray-500 border-gray-200',    label: display };
    if (lower === 'member')                                   return { cls: 'bg-blue-100 text-blue-700 border-blue-200',    label: teamRole ? display : 'Member' };
    return { cls: 'bg-gray-100 text-gray-600 border-gray-200', label: display ?? 'Member' };
}

function loadLevel(total, overdue) {
    if (overdue > 0 || total > 7) return { label: 'Heavy',    cls: 'bg-red-100 text-red-700',         dot: 'bg-red-500' };
    if (total >= 3)               return { label: 'Moderate', cls: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' };
    if (total >= 1)               return { label: 'Normal',   cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' };
    return                               { label: 'Idle',     cls: 'bg-gray-100 text-gray-500',       dot: 'bg-gray-400' };
}

function teamHealth(team) {
    const overdueRate = team.total > 0 ? team.overdue / team.total : 0;
    if (overdueRate > 0.3 || team.overdue > 3) return { icon: '🔴', label: 'At Risk',  ringColor: '#ef4444' };
    if (overdueRate > 0)                       return { icon: '🟡', label: 'Warning',  ringColor: '#f59e0b' };
    if (team.total === 0)                      return { icon: '⚪', label: 'No Tasks', ringColor: '#d1d5db' };
    return                                            { icon: '🟢', label: 'On Track', ringColor: '#10b981' };
}

function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }

// ── Donut Ring ────────────────────────────────────────────────────────────────
function DonutRing({ done, total, size = 60 }) {
    const p = pct(done, total);
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (p / 100) * circ;
    return (
        <svg width={size} height={size} className="flex-shrink-0">
            <circle cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke="#e5e7eb" strokeWidth="7" />
            <circle cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke="#10b981" strokeWidth="7"
                strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
            <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle"
                fill="#374151" fontSize="11" fontWeight="700">
                {p}%
            </text>
        </svg>
    );
}

// ── Stacked Progress Bar ──────────────────────────────────────────────────────
function StackedBar({ todo, in_progress, done, total, height = 'h-2.5' }) {
    if (!total) return <div className={`${height} rounded-full bg-gray-100 w-full`} />;
    return (
        <div className={`flex ${height} rounded-full overflow-hidden w-full bg-gray-100`}>
            <div style={{ width: `${pct(done, total)}%` }}        className="bg-emerald-500 transition-all duration-500" />
            <div style={{ width: `${pct(in_progress, total)}%` }} className="bg-indigo-400 transition-all duration-500" />
            <div style={{ width: `${pct(todo, total)}%` }}        className="bg-slate-300  transition-all duration-500" />
        </div>
    );
}

// ── Small stat chip ───────────────────────────────────────────────────────────
function Chip({ value, label, cls }) {
    return (
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${cls}`}>
            <span className="font-bold">{value}</span>
            <span className="opacity-70">{label}</span>
        </div>
    );
}

// ── Member Row (inside team card) ─────────────────────────────────────────────
function MemberRow({ m }) {
    const load = loadLevel(m.total, m.overdue);
    const role = roleMeta(m.role, m.team_role);
    return (
        <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-center py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(m.name)}`}>
                {initials(m.name)}
            </div>
            <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="font-medium text-gray-800 text-sm leading-tight truncate max-w-[150px]">{m.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${role.cls}`}>{role.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${load.cls}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${load.dot}`} />{load.label}
                    </span>
                    {m.overdue > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">⚠ {m.overdue} overdue</span>
                    )}
                </div>
                <StackedBar todo={m.todo} in_progress={m.in_progress} done={m.done} total={m.total} height="h-2" />
            </div>
            <div className="flex items-center gap-3 text-xs shrink-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 tabular-nums w-5 text-right" title="Todo">{m.todo}</span>
                    <span className="text-indigo-500 font-semibold tabular-nums w-5 text-right" title="In Progress">{m.in_progress}</span>
                    <span className="text-emerald-600 font-semibold tabular-nums w-5 text-right" title="Done">{m.done}</span>
                </div>
                <div className={`font-bold w-10 text-right tabular-nums ${pct(m.done, m.total) === 100 ? 'text-emerald-600' : 'text-gray-600'}`}>
                    {pct(m.done, m.total)}%
                </div>
            </div>
        </div>
    );
}

// ── Team Card ─────────────────────────────────────────────────────────────────
function TeamCard({ team, defaultExpanded }) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const health = teamHealth(team);
    const avgLoad = team.member_count > 0 ? (team.total / team.member_count).toFixed(1) : '0';
    const sortedMembers = [...(team.members ?? [])].sort(
        (a, b) => (b.overdue - a.overdue) || (b.in_progress - a.in_progress) || (b.total - a.total)
    );

    return (
        <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden border-l-4 ${
            health.label === 'At Risk'  ? 'border-l-red-400' :
            health.label === 'Warning'  ? 'border-l-amber-400' :
            health.label === 'No Tasks' ? 'border-l-gray-300' :
            'border-l-emerald-400'
        }`}>
            {/* Header */}
            <div className="px-5 py-4 flex items-start gap-4">
                <DonutRing done={team.done} total={team.total} size={60} />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-gray-900 text-base leading-tight">{team.name}</h3>
                        <span title={health.label}>{health.icon}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            health.label === 'At Risk'  ? 'bg-red-100 text-red-700' :
                            health.label === 'Warning'  ? 'bg-amber-100 text-amber-700' :
                            health.label === 'No Tasks' ? 'bg-gray-100 text-gray-500' :
                            'bg-emerald-100 text-emerald-700'
                        }`}>{health.label}</span>
                    </div>

                    {team.description && <p className="text-xs text-gray-400 mb-2 truncate">{team.description}</p>}

                    <div className="flex flex-wrap gap-1.5 mb-2">
                        <Chip value={team.member_count}     label="members"    cls="bg-gray-100 text-gray-600" />
                        <Chip value={team.projects.length}  label="projects"   cls="bg-indigo-50 text-indigo-600" />
                        <Chip value={team.total}            label="tasks"      cls="bg-slate-100 text-slate-600" />
                        <Chip value={team.in_progress}      label="active"     cls="bg-blue-50 text-blue-600" />
                        <Chip value={team.done}             label="done"       cls="bg-emerald-50 text-emerald-700" />
                        {team.todo > 0     && <Chip value={team.todo}    label="todo"    cls="bg-gray-100 text-gray-500" />}
                        {team.overdue > 0  && <Chip value={team.overdue} label="overdue" cls="bg-red-100 text-red-600" />}
                        <Chip value={avgLoad}               label="avg/member" cls="bg-purple-50 text-purple-600" />
                    </div>

                    {team.projects.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {team.projects.map(p => (
                                <span key={p.id} className="text-xs bg-indigo-50 text-indigo-500 border border-indigo-100 rounded px-2 py-0.5">
                                    📁 {p.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <button onClick={() => setExpanded(v => !v)}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-xs mt-1">
                    {expanded ? '▲' : '▼'}
                </button>
                <Link
                    href={`/teams/${team.id}`}
                    className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium transition-colors mt-1"
                    title="View team detail"
                >
                    Detail →
                </Link>
            </div>

            {/* Progress bar */}
            <div className="px-5 pb-3">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-400">Team Progress</span>
                    <span className="text-xs font-semibold text-gray-600">{pct(team.done, team.total)}% complete</span>
                </div>
                <StackedBar todo={team.todo} in_progress={team.in_progress} done={team.done} total={team.total} height="h-3" />
                <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />Done {pct(team.done, team.total)}%</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-400 inline-block" />Active {pct(team.in_progress, team.total)}%</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-300 inline-block" />Todo {pct(team.todo, team.total)}%</span>
                </div>
            </div>

            {/* Members */}
            {expanded && (
                <div className="border-t border-gray-100">
                    <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Members ({sortedMembers.length})</span>
                        <div className="flex items-center gap-3 pr-1 text-xs font-semibold uppercase tracking-wide">
                            <span className="text-slate-400 w-5 text-right" title="Todo">T</span>
                            <span className="text-indigo-400 w-5 text-right" title="In Progress">A</span>
                            <span className="text-emerald-500 w-5 text-right" title="Done">D</span>
                            <span className="text-gray-400 w-10 text-right">%</span>
                        </div>
                    </div>
                    <div className="px-2 py-1 max-h-72 overflow-y-auto">
                        {sortedMembers.length === 0
                            ? <p className="text-xs text-gray-400 text-center py-6">No members assigned</p>
                            : sortedMembers.map(m => <MemberRow key={m.id} m={m} />)
                        }
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Member Card (grid card for member view) ────────────────────────────────────
function MemberCard({ m, rank }) {
    const load = loadLevel(m.total, m.overdue);
    const role = roleMeta(m.role, m.team_role);
    const comp = pct(m.done, m.total);
    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
                <div className="w-5 text-xs font-bold text-gray-300 pt-3 text-right flex-shrink-0">#{rank}</div>
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${avatarColor(m.name)}`}>
                    {initials(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm">{m.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${role.cls}`}>{role.label}</span>
                    </div>
                    <div className="text-xs text-gray-400 truncate mt-0.5">{m.email}</div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${load.cls}`}>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${load.dot}`} />{load.label}
                        </span>
                        {m.overdue > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">⚠ {m.overdue} overdue</span>}
                        {comp === 100 && m.total > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">✓ All done</span>}
                    </div>
                </div>
                <DonutRing done={m.done} total={m.total} size={48} />
            </div>

            <StackedBar todo={m.todo} in_progress={m.in_progress} done={m.done} total={m.total} height="h-2.5" />

            <div className="grid grid-cols-4 gap-1 mt-3">
                {[
                    { v: m.total,       l: 'Total',   cls: 'text-gray-700' },
                    { v: m.todo,        l: 'Todo',    cls: 'text-slate-500' },
                    { v: m.in_progress, l: 'Active',  cls: 'text-indigo-600' },
                    { v: m.done,        l: 'Done',    cls: 'text-emerald-600' },
                ].map(s => (
                    <div key={s.l} className="text-center bg-gray-50 rounded-lg py-1.5">
                        <div className={`text-base font-bold ${s.cls}`}>{s.v}</div>
                        <div className="text-xs text-gray-400">{s.l}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Team Table (compact list view for many teams) ──────────────────────────
function TeamTable({ teams }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">#</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Team</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Health</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Members</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Todo</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-indigo-400 uppercase tracking-wider">Active</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-emerald-500 uppercase tracking-wider">Done</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-red-400 uppercase tracking-wider">Overdue</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[180px]">Progress</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {teams.map((team, i) => {
                            const health = teamHealth(team);
                            const comp   = pct(team.done, team.total);
                            return (
                                <tr key={team.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-xs font-bold text-gray-300">#{i + 1}</td>
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="font-semibold text-gray-900 truncate max-w-[180px]">{team.name}</p>
                                            {team.description && (
                                                <p className="text-xs text-gray-400 truncate max-w-[180px]">{team.description}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                            health.label === 'At Risk'  ? 'bg-red-100 text-red-700' :
                                            health.label === 'Warning'  ? 'bg-amber-100 text-amber-700' :
                                            health.label === 'No Tasks' ? 'bg-gray-100 text-gray-500' :
                                            'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {health.icon} {health.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm font-medium text-gray-700">{team.member_count}</td>
                                    <td className="px-4 py-3 text-center text-sm font-medium text-gray-700">{team.projects.length}</td>
                                    <td className="px-4 py-3 text-center text-sm text-slate-500 font-medium">{team.todo}</td>
                                    <td className="px-4 py-3 text-center text-sm text-indigo-600 font-semibold">{team.in_progress}</td>
                                    <td className="px-4 py-3 text-center text-sm text-emerald-600 font-semibold">{team.done}</td>
                                    <td className="px-4 py-3 text-center">
                                        {team.overdue > 0
                                            ? <span className="text-sm font-bold text-red-500">⚠ {team.overdue}</span>
                                            : <span className="text-gray-300 text-sm">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm font-bold text-gray-700">{team.total}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 min-w-[100px]">
                                                <StackedBar todo={team.todo} in_progress={team.in_progress} done={team.done} total={team.total} height="h-2" />
                                            </div>
                                            <span className={`text-xs font-bold w-8 text-right shrink-0 ${comp === 100 ? 'text-emerald-600' : 'text-gray-500'}`}>{comp}%</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link
                                            href={`/teams/${team.id}`}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium transition-colors whitespace-nowrap"
                                        >
                                            Detail →
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Member Table (list view) ──────────────────────────────────────────────────
function MemberTable({ members }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">#</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Member</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Load</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Todo</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-indigo-400 uppercase tracking-wider">Active</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-emerald-500 uppercase tracking-wider">Done</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-red-400 uppercase tracking-wider">Overdue</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[180px]">Progress</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {members.map((m, i) => {
                            const load = loadLevel(m.total, m.overdue);
                            const comp = pct(m.done, m.total);
                            return (
                                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-xs font-bold text-gray-300">#{i + 1}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(m.name)}`}>
                                                {initials(m.name)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-gray-900 truncate max-w-[160px]">{m.name}</p>
                                                <p className="text-xs text-gray-400 truncate max-w-[160px]">{m.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${load.cls}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${load.dot}`} />
                                            {load.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-slate-500 font-medium">{m.todo}</td>
                                    <td className="px-4 py-3 text-center text-sm text-indigo-600 font-semibold">{m.in_progress}</td>
                                    <td className="px-4 py-3 text-center text-sm text-emerald-600 font-semibold">{m.done}</td>
                                    <td className="px-4 py-3 text-center">
                                        {m.overdue > 0
                                            ? <span className="text-sm font-bold text-red-500">⚠ {m.overdue}</span>
                                            : <span className="text-gray-300 text-sm">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm font-bold text-gray-700">{m.total}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 min-w-[100px]">
                                                <StackedBar todo={m.todo} in_progress={m.in_progress} done={m.done} total={m.total} height="h-2" />
                                            </div>
                                            <span className={`text-xs font-bold w-8 text-right shrink-0 ${comp === 100 ? 'text-emerald-600' : 'text-gray-500'}`}>{comp}%</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Workload({ auth, teamWorkload = [], memberWorkload = [] }) {
    const [search,         setSearch]     = useState('');
    const [sortBy,         setSortBy]     = useState('name');
    const [viewMode,       setViewMode]   = useState('teams');
    const [overdueOnly,    setOverdueOnly]= useState(false);
    const [memberViewMode, setMemberView] = useState('card'); // 'card' | 'table'
    const [teamViewMode,   setTeamView]   = useState('card'); // 'card' | 'table'
    const [expandKey,      setExpandKey]  = useState(0);      // bump to force re-init TeamCards
    const [forceExpand,    setForceExpand]= useState(null);   // null=auto, true=all, false=none
    const [selectedTeam,   setSelectedTeam] = useState('all');

    // Global KPIs
    const global = useMemo(() => {
        const total   = memberWorkload.reduce((s, m) => s + m.total, 0);
        const done    = memberWorkload.reduce((s, m) => s + m.done, 0);
        const ip      = memberWorkload.reduce((s, m) => s + m.in_progress, 0);
        const todo    = memberWorkload.reduce((s, m) => s + m.todo, 0);
        const overdue = memberWorkload.reduce((s, m) => s + m.overdue, 0);
        const idle    = memberWorkload.filter(m => m.total === 0).length;
        const heavy   = memberWorkload.filter(m => m.overdue > 0 || m.total > 7).length;
        return { total, done, ip, todo, overdue, idle, heavy, members: memberWorkload.length, compRate: pct(done, total) };
    }, [memberWorkload]);

    // Filtered + sorted teams
    const filteredTeams = useMemo(() => {
        let list = overdueOnly ? teamWorkload.filter(t => t.overdue > 0) : teamWorkload;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(t =>
                t.name.toLowerCase().includes(q) ||
                t.projects.some(p => p.name.toLowerCase().includes(q)) ||
                t.members.some(m => m.name.toLowerCase().includes(q))
            );
        }
        return [...list].sort((a, b) => {
            if (sortBy === 'total')      return b.total - a.total;
            if (sortBy === 'in_progress')return b.in_progress - a.in_progress;
            if (sortBy === 'overdue')    return b.overdue - a.overdue;
            if (sortBy === 'done')       return b.done - a.done;
            if (sortBy === 'completion') return pct(b.done, b.total) - pct(a.done, a.total);
            return a.name.localeCompare(b.name);
        });
    }, [teamWorkload, search, sortBy, overdueOnly]);

    // Filtered + sorted members
    const filteredMembers = useMemo(() => {
        let list = overdueOnly ? memberWorkload.filter(m => m.overdue > 0) : memberWorkload;

        // Filter by selected team
        if (selectedTeam !== 'all') {
            const tid = parseInt(selectedTeam, 10);
            const team = teamWorkload.find(t => t.id === tid);
            const ids  = new Set((team?.members ?? []).map(m => m.id));
            list = list.filter(m => ids.has(m.id));
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(m =>
                m.name.toLowerCase().includes(q) ||
                m.email.toLowerCase().includes(q) ||
                m.role.toLowerCase().includes(q)
            );
        }
        return [...list].sort((a, b) => {
            if (sortBy === 'total')      return b.total - a.total;
            if (sortBy === 'in_progress')return b.in_progress - a.in_progress;
            if (sortBy === 'overdue')    return b.overdue - a.overdue;
            if (sortBy === 'done')       return b.done - a.done;
            if (sortBy === 'completion') return pct(b.done, b.total) - pct(a.done, a.total);
            return a.name.localeCompare(b.name);
        });
    }, [memberWorkload, search, sortBy, overdueOnly, selectedTeam, teamWorkload]);

    return (
        <AppLayout auth={auth}>
            <div className="space-y-5">

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">⚖️ Workload Overview</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Task distribution across {teamWorkload.length} team{teamWorkload.length !== 1 ? 's' : ''} · {global.members} member{global.members !== 1 ? 's' : ''}
                        </p>
                    </div>
                    {global.overdue > 0 && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 shrink-0">
                            <span className="text-xl">⚠️</span>
                            <div>
                                <div className="text-sm font-semibold text-red-700">{global.overdue} overdue task{global.overdue !== 1 ? 's' : ''}</div>
                                <div className="text-xs text-red-400">requires attention</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { icon: '📋', label: 'Total Tasks',   value: global.total,          bg: 'bg-white',      border: 'border-gray-200',    val: 'text-gray-800'    },
                        { icon: '⏳', label: 'Todo',           value: global.todo,           bg: 'bg-white',      border: 'border-gray-200',    val: 'text-slate-700'   },
                        { icon: '▶️',  label: 'In Progress',   value: global.ip,             bg: 'bg-indigo-50',  border: 'border-indigo-200',  val: 'text-indigo-700'  },
                        { icon: '✅', label: 'Done',           value: global.done,           bg: 'bg-emerald-50', border: 'border-emerald-200', val: 'text-emerald-700' },
                        { icon: '🔥', label: 'Overdue',        value: global.overdue,        bg: global.overdue > 0 ? 'bg-red-50'    : 'bg-white',      border: global.overdue > 0 ? 'border-red-200'    : 'border-gray-200', val: global.overdue > 0 ? 'text-red-700'    : 'text-gray-400' },
                        { icon: '📊', label: 'Completion',     value: `${global.compRate}%`, bg: 'bg-white',      border: 'border-gray-200',    val: 'text-gray-800'    },
                        { icon: '😴', label: 'Idle Members',   value: global.idle,           bg: 'bg-white',      border: 'border-gray-200',    val: 'text-gray-400'    },
                        { icon: '💪', label: 'Heavy Load',     value: global.heavy,          bg: global.heavy > 0  ? 'bg-orange-50' : 'bg-white',      border: global.heavy > 0  ? 'border-orange-200' : 'border-gray-200', val: global.heavy > 0  ? 'text-orange-700' : 'text-gray-400' },
                    ].map(s => (
                        <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl px-4 py-3 shadow-sm flex items-center gap-3`}>
                            <span className="text-2xl leading-none shrink-0">{s.icon}</span>
                            <div>
                                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                                <p className={`text-2xl font-bold leading-tight ${s.val}`}>{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Overall completion bar ── */}
                <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">Overall Task Completion</span>
                        <span className="text-sm font-bold text-gray-700">{global.done} / {global.total} tasks &nbsp;({global.compRate}%)</span>
                    </div>
                    <StackedBar todo={global.todo} in_progress={global.ip} done={global.done} total={global.total} height="h-4" />
                    <div className="flex flex-wrap gap-5 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Done ({global.done})</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-400 inline-block" />In Progress ({global.ip})</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block" />Todo ({global.todo})</span>
                        {global.overdue > 0 && (
                            <span className="flex items-center gap-1.5 text-red-500 font-medium"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />Overdue ({global.overdue})</span>
                        )}
                    </div>
                </div>

                {/* ── Controls ── */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm bg-white shadow-sm">
                        {['teams', 'members'].map(v => (
                            <button key={v} onClick={() => setViewMode(v)}
                                className={`px-4 py-2 font-medium transition-colors ${viewMode === v
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-50'}`}>
                                {v === 'teams' ? '🏢 Teams' : '👥 Members'}
                            </button>
                        ))}
                    </div>

                    {viewMode === 'teams' && (
                        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm bg-white shadow-sm">
                            <button onClick={() => setTeamView('card')}
                                className={`px-3 py-2 font-medium transition-colors ${teamViewMode === 'card' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                                ⊞ Cards
                            </button>
                            <button onClick={() => setTeamView('table')}
                                className={`px-3 py-2 font-medium transition-colors ${teamViewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                                ☰ Table
                            </button>
                        </div>
                    )}

                    {viewMode === 'members' && (
                        <>
                            <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm bg-white shadow-sm">
                                <button onClick={() => setMemberView('card')}
                                    className={`px-3 py-2 font-medium transition-colors ${memberViewMode === 'card' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                                    ⊞ Cards
                                </button>
                                <button onClick={() => setMemberView('table')}
                                    className={`px-3 py-2 font-medium transition-colors ${memberViewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                                    ☰ Table
                                </button>
                            </div>

                            {/* Team filter dropdown (members view) */}
                            <select
                                value={selectedTeam}
                                onChange={e => setSelectedTeam(e.target.value)}
                                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            >
                                <option value="all">🏢 All Teams</option>
                                {teamWorkload.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </>
                    )}

                    <div className="relative flex-1 min-w-48">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
                        <input type="text"
                            placeholder={viewMode === 'teams' ? 'Search teams, projects, members…' : 'Search name, email, role…'}
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    </div>

                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                        <option value="name">Sort: Name</option>
                        <option value="total">Sort: Most Tasks</option>
                        <option value="in_progress">Sort: Most Active</option>
                        <option value="overdue">Sort: Most Overdue</option>
                        <option value="done">Sort: Most Done</option>
                        <option value="completion">Sort: Completion %</option>
                    </select>

                    <button onClick={() => setOverdueOnly(v => !v)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors shadow-sm ${
                            overdueOnly
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                        }`}>
                        🔥 Overdue only
                    </button>

                    <span className="text-xs text-gray-400 ml-auto">
                        {viewMode === 'teams'
                            ? `${filteredTeams.length} team${filteredTeams.length !== 1 ? 's' : ''}`
                            : `${filteredMembers.length} member${filteredMembers.length !== 1 ? 's' : ''}`}
                    </span>
                </div>

                {/* ── Team View ── */}
                {viewMode === 'teams' && (
                    filteredTeams.length === 0 ? (
                        <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl text-gray-400">
                            <div className="text-4xl mb-2">🏢</div>
                            <div className="font-medium">No teams found</div>
                            {overdueOnly && <div className="text-sm mt-1">No teams with overdue tasks</div>}
                        </div>
                    ) : teamViewMode === 'table' ? (
                        <TeamTable teams={filteredTeams} />
                    ) : (
                        <div className="space-y-4">
                            {/* Collapse/Expand All toolbar */}
                            {filteredTeams.length > 2 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">{filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''}</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setForceExpand(true);  setExpandKey(k => k + 1); }}
                                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-medium transition"
                                        >▼ Expand All</button>
                                        <button
                                            onClick={() => { setForceExpand(false); setExpandKey(k => k + 1); }}
                                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-medium transition"
                                        >▲ Collapse All</button>
                                    </div>
                                </div>
                            )}
                            {filteredTeams.map(team => (
                                <TeamCard
                                    key={`${team.id}-${expandKey}`}
                                    team={team}
                                    defaultExpanded={forceExpand !== null ? forceExpand : filteredTeams.length <= 3}
                                />
                            ))}
                        </div>
                    )
                )}

                {/* ── Member View ── */}
                {viewMode === 'members' && (
                    filteredMembers.length === 0 ? (
                        <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl text-gray-400">
                            <div className="text-4xl mb-2">👥</div>
                            <div className="font-medium">No members found</div>
                            {overdueOnly && <div className="text-sm mt-1">No members with overdue tasks</div>}
                        </div>
                    ) : memberViewMode === 'table' ? (
                        <MemberTable members={filteredMembers} />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredMembers.map((m, i) => <MemberCard key={m.id} m={m} rank={i + 1} />)}
                        </div>
                    )
                )}
            </div>
        </AppLayout>
    );
}
