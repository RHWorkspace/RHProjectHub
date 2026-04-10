import React, { useState, useMemo, useRef } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '../Components/AppLayout';
import { useReactToPrint } from 'react-to-print';

// ── Helpers ───────────────────────────────────────────────────────────────────
function dueDiff(due_date) {
    if (!due_date) return null;
    const due = new Date(due_date); due.setHours(0, 0, 0, 0);
    const now = new Date();         now.setHours(0, 0, 0, 0);
    return Math.round((due - now) / 86400000);
}

function initials(name = '') {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL  = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

// ── Main Component ────────────────────────────────────────────────────────────
export default function ExecutiveReport({ auth, tasks, projects, teams }) {

    // ── Filter state ──────────────────────────────────────────────────────────
    const [periodType,     setPeriodType]     = useState('monthly');
    const [filterYear,     setFilterYear]     = useState(new Date().getFullYear());
    const [filterMonth,    setFilterMonth]    = useState(new Date().getMonth() + 1);
    const [filterProject,  setFilterProject]  = useState('all');
    const [filterTeam,     setFilterTeam]     = useState('all');

    const yearOptions = useMemo(() => {
        const y = new Date().getFullYear();
        return Array.from({ length: 6 }, (_, i) => y - 5 + i);
    }, []);

    const periodLabel = periodType === 'yearly'
        ? `Tahun ${filterYear}`
        : `${MONTHS_FULL[filterMonth - 1]} ${filterYear}`;

    // ── Tasks filtered by period + project + team ─────────────────────────────
    const periodTasks = useMemo(() => {
        return tasks.filter(t => {
            if (!t.created_at) return false;
            const d = new Date(t.created_at);
            if (periodType === 'yearly'  && d.getFullYear() !== filterYear) return false;
            if (periodType === 'monthly' && (d.getFullYear() !== filterYear || (d.getMonth() + 1) !== filterMonth)) return false;
            if (filterProject !== 'all' && t.board?.project?.id !== parseInt(filterProject)) return false;
            if (filterTeam    !== 'all') {
                const pt = t.board?.project?.teams ?? [];
                if (!pt.some(tm => tm.id === parseInt(filterTeam))) return false;
            }
            return true;
        });
    }, [tasks, periodType, filterYear, filterMonth, filterProject, filterTeam]);

    // ── All active tasks (not done) filtered by project/team only (for risk matrix) ──
    const activeTasks = useMemo(() => {
        return tasks.filter(t => {
            if (t.status === 'done') return false;
            if (filterProject !== 'all' && t.board?.project?.id !== parseInt(filterProject)) return false;
            if (filterTeam    !== 'all') {
                const pt = t.board?.project?.teams ?? [];
                if (!pt.some(tm => tm.id === parseInt(filterTeam))) return false;
            }
            return true;
        });
    }, [tasks, filterProject, filterTeam]);

    // ── KPI Stats ─────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const total      = periodTasks.length;
        const done       = periodTasks.filter(t => t.status === 'done').length;
        const inProgress = periodTasks.filter(t => t.status === 'in_progress').length;
        const todo       = periodTasks.filter(t => t.status === 'todo').length;
        const overdue    = periodTasks.filter(t => {
            const d = dueDiff(t.due_date);
            return d !== null && d < 0;
        }).length;
        const avgProgress = total > 0
            ? Math.round(periodTasks.reduce((s, t) => s + (t.progress ?? 0), 0) / total)
            : 0;
        const completionRate = total > 0 ? Math.round(done / total * 100) : 0;
        return { total, done, inProgress, todo, overdue, completionRate, avgProgress };
    }, [periodTasks]);

    // ── Project Health ────────────────────────────────────────────────────────
    const projectHealth = useMemo(() => {
        const map = new Map();
        periodTasks.forEach(t => {
            const proj = t.board?.project;
            if (!proj) return;
            if (!map.has(proj.id)) map.set(proj.id, { id: proj.id, name: proj.name, total: 0, done: 0, inProgress: 0, todo: 0, overdue: 0 });
            const p = map.get(proj.id);
            p.total++;
            if (t.status === 'done')        p.done++;
            else if (t.status === 'in_progress') p.inProgress++;
            else                            p.todo++;
            const d = dueDiff(t.due_date);
            if (t.status !== 'done' && d !== null && d < 0) p.overdue++;
        });
        return Array.from(map.values()).sort((a, b) => b.total - a.total);
    }, [periodTasks]);

    // ── Team Member Workload ──────────────────────────────────────────────────
    const workload = useMemo(() => {
        const map = new Map();
        periodTasks.forEach(t => {
            const key  = t.assignees?.length ? t.assignees[0].id : '_unassigned';
            const name = t.assignees?.length ? t.assignees.map(a => a.name).join(', ') : 'Unassigned';
            if (!map.has(key)) map.set(key, { key, name, total: 0, done: 0, inProgress: 0, todo: 0, overdue: 0 });
            const m = map.get(key);
            m.total++;
            if (t.status === 'done')             m.done++;
            else if (t.status === 'in_progress') m.inProgress++;
            else                                 m.todo++;
            const d = dueDiff(t.due_date);
            if (t.status !== 'done' && d !== null && d < 0) m.overdue++;
        });
        return Array.from(map.values())
            .filter(m => m.total > 0)
            .sort((a, b) => b.total - a.total);
    }, [periodTasks]);

    // ── Risk Tasks (critical/high, active, overdue or due ≤ 7 days) ──────────
    const riskTasks = useMemo(() => {
        return activeTasks
            .filter(t => {
                if (!['critical', 'high'].includes(t.priority)) return false;
                const d = dueDiff(t.due_date);
                return t.priority === 'critical' || (d !== null && d <= 7);
            })
            .sort((a, b) => {
                const po = { critical: 0, high: 1 };
                if (po[a.priority] !== po[b.priority]) return po[a.priority] - po[b.priority];
                const da = a.due_date ? new Date(a.due_date) : new Date('9999-12-31');
                const db = b.due_date ? new Date(b.due_date) : new Date('9999-12-31');
                return da - db;
            });
    }, [activeTasks]);

    // ── Completion Trend ──────────────────────────────────────────────────────
    const trendData = useMemo(() => {
        if (periodType === 'monthly') {
            const weeks = Array.from({ length: 5 }, (_, i) => ({ label: `W${i + 1}`, created: 0, done: 0 }));
            periodTasks.forEach(t => {
                if (!t.created_at) return;
                const w = Math.min(4, Math.ceil(new Date(t.created_at).getDate() / 7) - 1);
                weeks[w].created++;
                if (t.status === 'done') weeks[w].done++;
            });
            return weeks.filter(w => w.created > 0 || w.done > 0 || w.label === 'W1');
        } else {
            const months = MONTHS_SHORT.map((label, i) => ({ label, month: i + 1, created: 0, done: 0 }));
            periodTasks.forEach(t => {
                if (!t.created_at) return;
                const m = new Date(t.created_at).getMonth();
                months[m].created++;
                if (t.status === 'done') months[m].done++;
            });
            return months;
        }
    }, [periodTasks, periodType]);

    const maxTrend = Math.max(1, ...trendData.map(d => d.created));

    // ── Print ─────────────────────────────────────────────────────────────────
    const contentRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef,
        documentTitle: `Executive Report - ${periodLabel}`,
        pageStyle: `
            @page { margin: 1.5cm; size: A4; }
            *, *::before, *::after {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                box-shadow: none !important;
            }
            .no-print  { display: none !important; }
            .print-only { display: block !important; }
            .print-break { break-before: page !important; }
            a { color: inherit !important; text-decoration: none !important; }
            table { border-collapse: collapse; width: 100%; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
        `,
    });

    return (
        <AppLayout auth={auth} title="Executive Report">
            <Head title="Executive Report" />

            <div ref={contentRef}>

            {/* ── Page Header ─────────────────────────────────── */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1 no-print">
                        <Link href="/reporting" className="hover:text-gray-800">Reporting</Link>
                        <span>/</span>
                        <span className="text-gray-900 font-semibold">Executive Report</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Executive Report</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{periodLabel} · {periodTasks.length} tasks</p>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2 no-print">
                    <select value={periodType} onChange={e => setPeriodType(e.target.value)}
                        className="border border-gray-200 rounded-lg text-sm px-3 py-1.5 bg-white focus:ring-2 focus:ring-violet-400">
                        <option value="monthly">Bulanan</option>
                        <option value="yearly">Tahunan</option>
                    </select>
                    <select value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))}
                        className="border border-gray-200 rounded-lg text-sm px-3 py-1.5 bg-white focus:ring-2 focus:ring-violet-400">
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {periodType === 'monthly' && (
                        <select value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))}
                            className="border border-gray-200 rounded-lg text-sm px-3 py-1.5 bg-white focus:ring-2 focus:ring-violet-400">
                            {MONTHS_FULL.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                        </select>
                    )}
                    <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
                        className="border border-gray-200 rounded-lg text-sm px-3 py-1.5 bg-white focus:ring-2 focus:ring-violet-400">
                        <option value="all">Semua Project</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
                        className="border border-gray-200 rounded-lg text-sm px-3 py-1.5 bg-white focus:ring-2 focus:ring-violet-400">
                        <option value="all">Semua Team</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <button onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition shadow-sm">
                        🖨️ Print PDF
                    </button>
                </div>
            </div>

            {/* Print header */}
            <div className="hidden print-only mb-4">
                <h1 className="text-xl font-bold">Executive Report — {periodLabel}</h1>
                <p className="text-sm text-gray-500">Generated {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })} · {auth.user.name}</p>
                <hr className="mt-2" />
            </div>

            {/* ── KPI Summary Row ──────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {[
                    { label: 'Total Tasks',      value: stats.total,          sub: 'dalam periode',        icon: '📋', val: null },
                    { label: 'Selesai',           value: stats.done,           sub: `dari ${stats.total}`,  icon: '✅', val: null },
                    { label: 'In Progress',      value: stats.inProgress,     sub: 'sedang berjalan',      icon: '⚡', val: null },
                    { label: 'Todo',             value: stats.todo,           sub: 'belum dimulai',        icon: '📌', val: null },
                    { label: 'Overdue',          value: stats.overdue,        sub: 'task terlambat',       icon: stats.overdue > 0 ? '🔴' : '🟢', val: null },
                    { label: 'Completion Rate',  value: `${stats.completionRate}%`, sub: 'task selesai', icon: '🎯', val: stats.completionRate },
                ].map(({ label, value, sub, icon, val }) => {
                    const rate = val;
                    const rateColor = rate === null ? 'text-gray-900'
                        : rate >= 70 ? 'text-emerald-700' : rate >= 40 ? 'text-amber-700' : 'text-red-700';
                    const rateBg = rate === null ? 'bg-white'
                        : rate >= 70 ? 'bg-emerald-50' : rate >= 40 ? 'bg-amber-50' : 'bg-red-50';
                    const rateBorder = rate === null ? 'border-gray-200'
                        : rate >= 70 ? 'border-emerald-200' : rate >= 40 ? 'border-amber-200' : 'border-red-200';
                    return (
                        <div key={label} className={`${rateBg} border ${rateBorder} rounded-xl p-4`}>
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-none">{label}</p>
                                <span className="text-base">{icon}</span>
                            </div>
                            <p className={`text-3xl font-extrabold leading-tight mt-1 ${rateColor}`}>{value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                            {rate !== null && (
                                <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-1.5 rounded-full ${rate >= 70 ? 'bg-emerald-500' : rate >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                                        style={{ width: `${rate}%` }} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Overall Progress Bar ─────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-bold text-gray-800">Overall Completion — {periodLabel}</h2>
                    <span className={`text-sm font-extrabold ${stats.completionRate >= 70 ? 'text-emerald-600' : stats.completionRate >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                        {stats.completionRate}%
                    </span>
                </div>
                <div className="h-5 bg-gray-100 rounded-full overflow-hidden flex">
                    <div title={`Done: ${stats.done}`}
                        className="h-full bg-emerald-500 transition-all duration-700"
                        style={{ width: `${stats.total > 0 ? stats.done / stats.total * 100 : 0}%` }} />
                    <div title={`In Progress: ${stats.inProgress}`}
                        className="h-full bg-blue-400 transition-all duration-700"
                        style={{ width: `${stats.total > 0 ? stats.inProgress / stats.total * 100 : 0}%` }} />
                    <div title={`Todo: ${stats.todo}`}
                        className="h-full bg-slate-300 transition-all duration-700"
                        style={{ width: `${stats.total > 0 ? stats.todo / stats.total * 100 : 0}%` }} />
                </div>
                <div className="flex items-center gap-5 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"/> Done ({stats.done})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block"/> In Progress ({stats.inProgress})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block"/> Todo ({stats.todo})</span>
                    {stats.overdue > 0 && <span className="flex items-center gap-1.5 text-red-500 font-semibold">⚠ {stats.overdue} overdue</span>}
                </div>
            </div>

            {/* ── Project Health + Team Workload ────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

                {/* Project Health */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h2 className="text-sm font-bold text-gray-800 mb-4">📁 Project Health</h2>
                    {projectHealth.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-10">Tidak ada data project untuk periode ini.</p>
                    ) : (
                        <div className="space-y-4">
                            {projectHealth.map(p => {
                                const rate = p.total > 0 ? Math.round(p.done / p.total * 100) : 0;
                                return (
                                    <div key={p.id}>
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-sm font-semibold text-gray-800 truncate max-w-[200px]" title={p.name}>{p.name}</p>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {p.overdue > 0 && (
                                                    <span className="text-xs font-bold text-red-600">⚠ {p.overdue} OD</span>
                                                )}
                                                <span className={`text-xs font-extrabold ${rate >= 70 ? 'text-emerald-600' : rate >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{rate}%</span>
                                            </div>
                                        </div>
                                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                                            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${p.total > 0 ? p.done / p.total * 100 : 0}%` }} />
                                            <div className="bg-blue-400 h-full transition-all"    style={{ width: `${p.total > 0 ? p.inProgress / p.total * 100 : 0}%` }} />
                                            <div className="bg-slate-200 h-full transition-all"   style={{ width: `${p.total > 0 ? p.todo / p.total * 100 : 0}%` }} />
                                        </div>
                                        <div className="flex gap-3 mt-1 text-xs text-gray-400">
                                            <span className="text-emerald-600">✅ {p.done}</span>
                                            <span className="text-blue-600">⚡ {p.inProgress}</span>
                                            <span className="text-slate-500">📌 {p.todo}</span>
                                            <span className="ml-auto">{p.total} tasks</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Team Workload */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h2 className="text-sm font-bold text-gray-800 mb-4">👥 Member Workload</h2>
                    {workload.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-10">Tidak ada data untuk periode ini.</p>
                    ) : (
                        <div className="space-y-3">
                            {workload.map(m => {
                                const rate = m.total > 0 ? Math.round(m.done / m.total * 100) : 0;
                                return (
                                    <div key={m.key} className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${m.key === '_unassigned' ? 'bg-gray-100 text-gray-500' : 'bg-violet-100 text-violet-700'}`}>
                                            {m.key === '_unassigned' ? '?' : initials(m.name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5 gap-2">
                                                <p className="text-xs font-semibold text-gray-800 truncate">{m.name}</p>
                                                <div className="flex items-center gap-2 shrink-0 text-xs">
                                                    {m.overdue > 0 && <span className="text-red-500 font-semibold">⚠{m.overdue}</span>}
                                                    <span className={`font-bold ${rate >= 70 ? 'text-emerald-600' : rate >= 40 ? 'text-amber-600' : 'text-gray-500'}`}>{rate}%</span>
                                                    <span className="text-gray-400">{m.done}/{m.total}</span>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                                                <div className="bg-emerald-400 h-full" style={{ width: `${m.total > 0 ? m.done / m.total * 100 : 0}%` }} />
                                                <div className="bg-blue-400 h-full"    style={{ width: `${m.total > 0 ? m.inProgress / m.total * 100 : 0}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="flex items-center gap-4 pt-2 border-t border-gray-100 text-xs text-gray-400">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/> Done</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/> In Progress</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block"/> Todo</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Completion Trend ─────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-800">
                        📊 Task Trend — {periodType === 'monthly' ? 'per Minggu' : 'per Bulan'}
                    </h2>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 inline-block"/> Dibuat</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400 inline-block"/> Selesai</span>
                    </div>
                </div>
                {trendData.every(d => d.created === 0) ? (
                    <p className="text-sm text-gray-400 text-center py-8">Tidak ada data task untuk periode ini.</p>
                ) : (
                    <div className="flex items-end gap-1.5 h-36 px-1">
                        {trendData.map((d, i) => {
                            const totalPct = Math.round(d.created / maxTrend * 100);
                            const donePct  = Math.round(d.done    / maxTrend * 100);
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1 group min-w-0">
                                    <div className="relative w-full" style={{ height: '112px' }}>
                                        {/* total bar (bg) */}
                                        <div className="absolute bottom-0 w-full bg-blue-100 rounded-t transition-all"
                                            style={{ height: `${totalPct}%` }} />
                                        {/* done bar (fg) */}
                                        <div className="absolute bottom-0 w-full bg-emerald-400 rounded-t transition-all"
                                            style={{ height: `${donePct}%` }} />
                                        {/* Hover tooltip */}
                                        {d.created > 0 && (
                                            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-800 text-white text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 shadow-lg">
                                                📋 {d.created} dibuat · ✅ {d.done} selesai
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400 truncate w-full text-center leading-none">{d.label}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Priority Risk Matrix ──────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6 print-break">
                <div className="flex items-center justify-between px-5 py-4 border-b border-red-100 bg-red-50/60">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-gray-900">🚨 Priority Risk Matrix</h2>
                        {riskTasks.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 ring-1 ring-red-200">
                                {riskTasks.length} item
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500">Critical (semua) + High (overdue / due ≤ 7 hari) · Semua periode aktif</p>
                </div>

                {riskTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                        <p className="text-4xl mb-3">🎉</p>
                        <p className="text-sm font-semibold text-emerald-700">Tidak ada task berisiko!</p>
                        <p className="text-xs text-gray-400 mt-1">Semua critical/high task tidak overdue atau hampir jatuh tempo.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Task</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignee</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Project / Board</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Risk</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {riskTasks.map(task => {
                                    const diff = dueDiff(task.due_date);
                                    const isOverdue = diff !== null && diff < 0;
                                    const isCritical = task.priority === 'critical';
                                    const rowBg = isCritical ? 'bg-red-50/60' : isOverdue ? 'bg-orange-50/60' : 'bg-yellow-50/40';
                                    const riskLabel = isCritical && isOverdue ? '🔴 Critical + Overdue'
                                        : isCritical ? '🔴 Critical'
                                        : isOverdue  ? '🟠 Overdue'
                                        : '🟡 Due Soon';
                                    return (
                                        <tr key={task.id} className={`${rowBg} hover:brightness-95 transition`}>
                                            <td className="px-5 py-3 max-w-[200px]">
                                                <p className="font-semibold text-gray-900 truncate">{task.title}</p>
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${isCritical ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {isCritical ? '🔴' : '🟠'} {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {task.status === 'in_progress' ? 'In Progress' : 'Todo'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-gray-700">
                                                {task.assignees?.length
                                                    ? task.assignees.map(a => a.name).join(', ')
                                                    : <span className="italic text-gray-400">Unassigned</span>}
                                            </td>
                                            <td className="px-5 py-3 text-xs text-gray-500">
                                                <p className="font-medium text-gray-700">{task.board?.project?.name ?? '—'}</p>
                                                {task.board?.name && <p className="text-gray-400">{task.board.name}</p>}
                                            </td>
                                            <td className="px-5 py-3 text-xs whitespace-nowrap">
                                                {task.due_date ? (
                                                    <span className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                                                        {new Date(task.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        {isOverdue && <span className="ml-1 text-red-500">({Math.abs(diff)}d OD)</span>}
                                                        {!isOverdue && diff !== null && <span className="ml-1 text-amber-500">({diff}d left)</span>}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-xs font-bold whitespace-nowrap">{riskLabel}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Footer ───────────────────────────────────────── */}
            <div className="text-xs text-gray-400 text-center pb-2 no-print">
                Executive Report · {periodLabel} · Generated {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
            </div>

            </div>{/* /contentRef */}
        </AppLayout>
    );
}
