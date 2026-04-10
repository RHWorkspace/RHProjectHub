import React, { useMemo, useState } from 'react';
import { useForm } from '@inertiajs/react';
import AppLayout from '@/Components/AppLayout';
import Modal, { ModalBody, ModalFooter, FieldLabel, FieldInput, FieldSelect } from '../Components/Modal';

// ── Helpers ──────────────────────────────────────────────────────────────────
const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function pad(n) { return String(n).padStart(2, '0'); }
function ymd(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

const STATUS_META = {
    todo:        { label: 'To Do',       dot: 'bg-slate-400',  pill: 'bg-slate-100 text-slate-700',   ring: 'border-l-4 border-l-slate-400' },
    in_progress: { label: 'In Progress', dot: 'bg-blue-500',   pill: 'bg-blue-100 text-blue-700',     ring: 'border-l-4 border-l-blue-500'  },
    done:        { label: 'Done',        dot: 'bg-emerald-500',pill: 'bg-emerald-100 text-emerald-700',ring: 'border-l-4 border-l-emerald-500'},
    overdue:     { label: 'Overdue',     dot: 'bg-red-500',    pill: 'bg-red-100 text-red-700',       ring: 'border-l-4 border-l-red-500'   },
};

const PRIORITY_COLOR = {
    critical: 'text-red-600',
    high:     'text-orange-500',
    medium:   'text-amber-500',
    low:      'text-slate-400',
};

function statusKey(task) { return task.is_overdue ? 'overdue' : task.status; }

function initials(name = '') {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function avatarColor(name = '') {
    const COLORS = ['bg-violet-500','bg-sky-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-indigo-500','bg-pink-500'];
    let h = 0;
    for (let c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return COLORS[h % COLORS.length];
}

// ── Mini components ───────────────────────────────────────────────────────────
function Chip({ label, colorCls }) {
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorCls}`}>{label}</span>;
}

function TaskPill({ task, onClick }) {
    const sk = statusKey(task);
    const meta = STATUS_META[sk] ?? STATUS_META.todo;
    const dayType = task._dayType ?? 'single';

    const COLOR = {
        todo:        { bg: 'bg-slate-100 text-slate-800 hover:bg-slate-200',       bar: 'bg-slate-300'   },
        in_progress: { bg: 'bg-blue-100  text-blue-900  hover:bg-blue-200',        bar: 'bg-blue-300'    },
        done:        { bg: 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200', bar: 'bg-emerald-300' },
        overdue:     { bg: 'bg-red-100   text-red-900   hover:bg-red-200',         bar: 'bg-red-300'     },
    };
    const c = COLOR[sk] ?? COLOR.todo;

    if (dayType === 'mid') {
        return (
            <button
                onClick={onClick}
                className={`w-full h-4 mb-0.5 transition ${c.bar} opacity-60 hover:opacity-90`}
                title={task.title}
            />
        );
    }

    const roundCls = dayType === 'start' ? 'rounded-l-md rounded-r-none'
                   : dayType === 'end'   ? 'rounded-r-md rounded-l-none'
                   : 'rounded-md';

    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-1.5 py-0.5 text-xs font-medium truncate transition mb-0.5 flex items-center gap-1 ${c.bg} ${roundCls}`}
            title={task.title}
        >
            {dayType === 'start'
                ? <span className="shrink-0 text-[9px] leading-none">▶</span>
                : <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${meta.dot}`} />}
            <span className="truncate">{task.title}</span>
        </button>
    );
}

// ── Quick Add Task Modal ──────────────────────────────────────────────────────
const STATUS_OPTS   = [['todo','To Do'],['in_progress','In Progress'],['done','Done']];
const PRIORITY_OPTS = [['low','Low'],['medium','Medium'],['high','High'],['critical','Critical']];

const STATUS_BTN = {
    todo:        'bg-slate-500 text-white',
    in_progress: 'bg-blue-600 text-white',
    done:        'bg-emerald-600 text-white',
};
const PRIORITY_BTN = {
    low:      'bg-slate-400 text-white',
    medium:   'bg-amber-500 text-white',
    high:     'bg-orange-500 text-white',
    critical: 'bg-red-600 text-white',
};
const BTN_IDLE = 'bg-gray-100 text-gray-600 hover:bg-gray-200';

function QuickAddModal({ date, boards, users, onClose }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        board_id:   '',
        title:      '',
        status:     'todo',
        priority:   'medium',
        progress:   0,
        due_date:   date ?? '',
        start_date: '',
        assigned_to: '',
    });

    function submit(e) {
        e.preventDefault();
        post('/manage-tasks', { onSuccess: () => { reset(); onClose(); } });
    }

    return (
        <Modal open onClose={onClose} title={`Add Task — ${date}`} icon="📋" size="md">
            <form onSubmit={submit}>
                <ModalBody>
                    {/* Board */}
                    <div>
                        <FieldLabel required>Board</FieldLabel>
                        <FieldSelect
                            value={data.board_id}
                            onChange={e => setData('board_id', e.target.value)}
                            error={errors.board_id}
                        >
                            <option value="">— Select board —</option>
                            {boards.map(b => (
                                <option key={b.id} value={b.id}>
                                    {b.project ? `${b.project} / ${b.name}` : b.name}
                                </option>
                            ))}
                        </FieldSelect>
                    </div>

                    {/* Title */}
                    <div>
                        <FieldLabel required>Task Title</FieldLabel>
                        <FieldInput
                            value={data.title}
                            onChange={e => setData('title', e.target.value)}
                            placeholder="Enter task title…"
                            error={errors.title}
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <FieldLabel>Status</FieldLabel>
                        <div className="flex gap-1.5 flex-wrap">
                            {STATUS_OPTS.map(([v, l]) => (
                                <button
                                    type="button" key={v}
                                    onClick={() => setData('status', v)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${data.status === v ? STATUS_BTN[v] : BTN_IDLE}`}
                                >{l}</button>
                            ))}
                        </div>
                    </div>

                    {/* Priority */}
                    <div>
                        <FieldLabel>Priority</FieldLabel>
                        <div className="flex gap-1.5 flex-wrap">
                            {PRIORITY_OPTS.map(([v, l]) => (
                                <button
                                    type="button" key={v}
                                    onClick={() => setData('priority', v)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${data.priority === v ? PRIORITY_BTN[v] : BTN_IDLE}`}
                                >{l}</button>
                            ))}
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <FieldLabel>Start Date</FieldLabel>
                            <FieldInput
                                type="date"
                                value={data.start_date}
                                onChange={e => setData('start_date', e.target.value)}
                            />
                        </div>
                        <div>
                            <FieldLabel>Due Date</FieldLabel>
                            <FieldInput
                                type="date"
                                value={data.due_date}
                                onChange={e => setData('due_date', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Assignee */}
                    <div>
                        <FieldLabel>Assign To</FieldLabel>
                        <FieldSelect
                            value={data.assigned_to}
                            onChange={e => setData('assigned_to', e.target.value)}
                        >
                            <option value="">— Unassigned —</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </FieldSelect>
                    </div>
                </ModalBody>
                <ModalFooter
                    onCancel={onClose}
                    submitLabel="Create Task"
                    processing={processing}
                />
            </form>
        </Modal>
    );
}

// ── helpers for TaskModal ─────────────────────────────────────────────────────
const PRIORITY_META = {
    critical: { label: 'Critical', icon: '🔴', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'    },
    high:     { label: 'High',     icon: '🟠', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    medium:   { label: 'Medium',   icon: '🟡', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
    low:      { label: 'Low',      icon: '⚪', bg: 'bg-slate-50',  text: 'text-slate-600',  border: 'border-slate-200'  },
};
const STATUS_ACCENT = {
    todo:        'bg-slate-400',
    in_progress: 'bg-blue-500',
    done:        'bg-emerald-500',
    overdue:     'bg-red-500',
};
function daysRelative(dueFmt) {
    const today = new Date(); today.setHours(0,0,0,0);
    const due   = new Date(dueFmt + 'T00:00:00'); due.setHours(0,0,0,0);
    const diff  = Math.round((due - today) / 86400000);
    if (diff === 0)  return { label: 'Due today', cls: 'text-amber-600 bg-amber-50 border-amber-200' };
    if (diff < 0)    return { label: `${Math.abs(diff)}d overdue`, cls: 'text-red-600 bg-red-50 border-red-200' };
    if (diff === 1)  return { label: 'Due tomorrow', cls: 'text-blue-600 bg-blue-50 border-blue-200' };
    return { label: `${diff}d remaining`, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
}
function durationDays(startFmt, endFmt) {
    if (!startFmt || !endFmt || startFmt === endFmt) return null;
    const s = new Date(startFmt + 'T00:00:00'), e = new Date(endFmt + 'T00:00:00');
    return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

// ── Task Detail Modal ─────────────────────────────────────────────────────────
function TaskModal({ task, onClose }) {
    if (!task) return null;
    const sk      = statusKey(task);
    const meta    = STATUS_META[sk] ?? STATUS_META.todo;
    const pmeta   = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;
    const rel     = daysRelative(task.due_date_fmt);
    const dur     = durationDays(task.start_date_fmt, task.due_date_fmt);
    const hasRange = task.start_date_fmt && task.start_date_fmt !== task.due_date_fmt;

    // progress fill fill percent for timeline
    const fillPct = Math.min(100, Math.max(0, task.progress ?? 0));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in"
                onClick={e => e.stopPropagation()}
            >
                {/* ── Colored accent bar ── */}
                <div className={`h-1.5 w-full ${STATUS_ACCENT[sk] ?? 'bg-gray-300'}`} />

                {/* ── Header ── */}
                <div className="px-6 pt-5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            {/* Breadcrumb */}
                            <div className="flex items-center gap-1 text-xs text-gray-400 mb-1.5 flex-wrap">
                                <span className="font-medium text-gray-500">{task.project}</span>
                                <span>›</span>
                                <span>{task.board}</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 leading-snug break-words">{task.title}</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition text-base leading-none"
                        >✕</button>
                    </div>

                    {/* Status + Priority badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.pill}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                        </span>
                        {task.priority && (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${pmeta.bg} ${pmeta.text} ${pmeta.border}`}>
                                {pmeta.icon} {pmeta.label}
                            </span>
                        )}
                        {/* Days remaining chip */}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${rel.cls}`}>
                            {rel.label}
                        </span>
                    </div>
                </div>

                {/* ── Divider ── */}
                <div className="border-t border-gray-100 mx-6" />

                {/* ── Body ── */}
                <div className="px-6 py-4 space-y-4">

                    {/* Progress */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Progress</span>
                            <span className={`text-sm font-bold ${
                                fillPct === 100 ? 'text-emerald-600' : fillPct >= 60 ? 'text-blue-600' : 'text-gray-700'
                            }`}>{fillPct}%</span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    sk === 'done' ? 'bg-emerald-400' : sk === 'overdue' ? 'bg-red-400' : fillPct >= 60 ? 'bg-blue-500' : 'bg-blue-400'
                                }`}
                                style={{ width: `${fillPct}%` }}
                            />
                        </div>
                    </div>

                    {/* Date range */}
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Timeline</p>
                        {hasRange ? (
                            <div className="flex items-center gap-0">
                                {/* Start */}
                                <div className="text-center">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Start</p>
                                    <p className="text-sm font-bold text-gray-800">{task.start_date_fmt}</p>
                                </div>
                                {/* Bar */}
                                <div className="flex-1 mx-3 flex flex-col items-center gap-0.5">
                                    <div className="relative w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="absolute inset-y-0 left-0 bg-blue-400 rounded-full" style={{ width: `${fillPct}%` }} />
                                    </div>
                                    {dur && <p className="text-[10px] text-gray-400">{dur} days</p>}
                                </div>
                                {/* Due */}
                                <div className="text-center">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Due</p>
                                    <p className={`text-sm font-bold ${task.is_overdue ? 'text-red-600' : 'text-gray-800'}`}>{task.due_date_fmt}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Due Date</p>
                                    <p className={`text-sm font-bold ${task.is_overdue ? 'text-red-600' : 'text-gray-800'}`}>{task.due_date_fmt}</p>
                                </div>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${rel.cls}`}>{rel.label}</span>
                            </div>
                        )}
                    </div>

                    {/* Assignee */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-16 shrink-0">Assignee</span>
                        {task.assignee ? (
                            <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-white shadow-sm ${avatarColor(task.assignee.name)}`}>
                                    {initials(task.assignee.name)}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-800 leading-tight">{task.assignee.name}</p>
                                    <p className="text-xs text-gray-400">{task.assignee.email}</p>
                                </div>
                            </div>
                        ) : (
                            <span className="text-sm text-gray-400 italic">Unassigned</span>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Calendar({ auth, tasks = [], currentDate, boards = [], projects = [], users = [] }) {
    const today = new Date(currentDate);

    const [year,  setYear]  = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth()); // 0-indexed
    const [activeStatus, setActiveStatus] = useState('all');
    const [filterProject, setFilterProject] = useState('');
    const [filterBoard,   setFilterBoard]   = useState('');
    const [selectedTask, setSelectedTask] = useState(null);
    const [view, setView] = useState('month'); // 'month' | 'list'
    const [quickAddDate, setQuickAddDate] = useState(null); // null = closed

    const canManage = auth.user.role === 'admin' || auth.user.role === 'manager';

    // ── Boards visible in board dropdown (restricted by project filter) ──
    const filteredBoardOptions = useMemo(() => {
        if (!filterProject) return boards;
        return boards.filter(b => String(b.project_id) === filterProject);
    }, [boards, filterProject]);

    // ── Filter ───────────────────────────────────────────────────────
    const filteredTasks = useMemo(() => {
        let result = tasks;
        if (filterProject) result = result.filter(t => String(t.project_id) === filterProject);
        if (filterBoard)   result = result.filter(t => String(t.board_id)   === filterBoard);
        if (activeStatus === 'overdue') return result.filter(t => t.is_overdue);
        if (activeStatus !== 'all') return result.filter(t => !t.is_overdue && t.status === activeStatus);
        return result;
    }, [tasks, activeStatus, filterProject, filterBoard]);

    // ── Task map keyed by date (spans from start_date to due_date) ──
    const tasksByDate = useMemo(() => {
        const map = {};
        for (const t of filteredTasks) {
            const startStr = t.start_date_fmt;
            const endStr   = t.due_date_fmt;

            if (!startStr || startStr >= endStr) {
                // No start date or same day → single point on due_date
                if (!map[endStr]) map[endStr] = [];
                map[endStr].push({ ...t, _dayType: 'single' });
            } else {
                // Multi-day span: expand every day from start → end
                let cur = new Date(startStr + 'T00:00:00');
                const end = new Date(endStr + 'T00:00:00');
                while (cur <= end) {
                    const ds = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
                    const dayType = ds === startStr ? 'start' : ds === endStr ? 'end' : 'mid';
                    if (!map[ds]) map[ds] = [];
                    map[ds].push({ ...t, _dayType: dayType });
                    cur.setDate(cur.getDate() + 1);
                }
            }
        }
        // Sort each day: start/end/single (labeled) before mid (bars)
        for (const ds of Object.keys(map)) {
            map[ds].sort((a, b) => (a._dayType === 'mid' ? 1 : 0) - (b._dayType === 'mid' ? 1 : 0));
        }
        return map;
    }, [filteredTasks]);

    // ── Calendar grid ────────────────────────────────────────────────
    const { cells, daysInMonth } = useMemo(() => {
        const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
        const dim = new Date(year, month + 1, 0).getDate();
        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= dim; d++) cells.push(d);
        return { cells, daysInMonth: dim };
    }, [year, month]);

    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    function prevMonth() {
        if (month === 0) { setMonth(11); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    }
    function nextMonth() {
        if (month === 11) { setMonth(0); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    }
    function goToday() {
        setYear(today.getFullYear());
        setMonth(today.getMonth());
    }

    // ── KPI counts ───────────────────────────────────────────────────
    const kpi = useMemo(() => {
        const all      = tasks.length;
        const overdue  = tasks.filter(t => t.is_overdue).length;
        const done     = tasks.filter(t => t.status === 'done').length;
        const inProg   = tasks.filter(t => !t.is_overdue && t.status === 'in_progress').length;
        const thisMonth = filteredTasks.filter(t => {
            const inMonth = (ds) => {
                if (!ds) return false;
                const d = new Date(ds);
                return d.getFullYear() === year && d.getMonth() === month;
            };
            return inMonth(t.due_date_fmt) || inMonth(t.start_date_fmt);
        }).length;
        return { all, overdue, done, inProg, thisMonth };
    }, [tasks, filteredTasks, year, month]);

    // ── List view: tasks in current month (by due or start) ─────────
    const monthTasks = useMemo(() => {
        const inMonth = (ds) => {
            if (!ds) return false;
            const d = new Date(ds);
            return d.getFullYear() === year && d.getMonth() === month;
        };
        return filteredTasks
            .filter(t => inMonth(t.due_date_fmt) || inMonth(t.start_date_fmt))
            .sort((a, b) => {
                const aDate = a.start_date_fmt ?? a.due_date_fmt;
                const bDate = b.start_date_fmt ?? b.due_date_fmt;
                return aDate > bDate ? 1 : -1;
            });
    }, [filteredTasks, year, month]);

    return (
        <AppLayout auth={auth} title="Calendar">
            <div className="space-y-5">

                {/* ── Page header ───────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">📅 Calendar</h1>
                        <p className="text-sm text-gray-500 mt-0.5">View task due dates across your projects</p>
                    </div>
                    {/* View toggle */}
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                            <button
                                onClick={() => setView('month')}
                                className={`px-3 py-1.5 font-medium transition ${view === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                            >🗓 Month</button>
                            <button
                                onClick={() => setView('list')}
                                className={`px-3 py-1.5 font-medium transition ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                            >📋 List</button>
                        </div>
                    </div>
                </div>

                {/* ── KPI Cards ─────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                        { label: 'Total Tasks', value: kpi.all,       icon: '📌', color: 'text-gray-800',    bg: 'bg-white',      border: 'border-gray-200'    },
                        { label: 'This Month',  value: kpi.thisMonth,  icon: '📅', color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200'    },
                        { label: 'In Progress', value: kpi.inProg,     icon: '⚙️', color: 'text-blue-600',   bg: 'bg-white',      border: 'border-gray-200'    },
                        { label: 'Done',        value: kpi.done,       icon: '✅', color: 'text-emerald-600',bg: 'bg-emerald-50', border: 'border-emerald-200' },
                        { label: 'Overdue',     value: kpi.overdue,    icon: '⚠️', color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-200'     },
                    ].map(({ label, value, icon, color, bg, border }) => (
                        <div key={label} className={`rounded-xl border ${border} ${bg} px-4 py-3 shadow-sm flex items-center gap-3`}>
                            <span className="text-2xl leading-none">{icon}</span>
                            <div>
                                <p className="text-xs text-gray-500 font-medium">{label}</p>
                                <p className={`text-2xl font-bold leading-tight ${color}`}>{value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Project / Board filter + Status tabs ──── */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                    {/* Project dropdown */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-500 shrink-0">🗂 Project</span>
                        <select
                            value={filterProject}
                            onChange={e => { setFilterProject(e.target.value); setFilterBoard(''); }}
                            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[140px]"
                        >
                            <option value="">All Projects</option>
                            {projects.map(p => (
                                <option key={p.id} value={String(p.id)}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Board dropdown */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-500 shrink-0">📋 Board</span>
                        <select
                            value={filterBoard}
                            onChange={e => setFilterBoard(e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[140px]"
                        >
                            <option value="">All Boards</option>
                            {filteredBoardOptions.map(b => (
                                <option key={b.id} value={String(b.id)}>
                                    {filterProject ? b.name : (b.project ? `${b.project} / ${b.name}` : b.name)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Reset filter */}
                    {(filterProject || filterBoard) && (
                        <button
                            onClick={() => { setFilterProject(''); setFilterBoard(''); }}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition font-medium"
                        >
                            ✕ Reset
                        </button>
                    )}

                    {/* Separator */}
                    <div className="hidden sm:block w-px h-6 bg-gray-200" />

                    {/* Status filter tabs */}
                    <div className="flex flex-wrap gap-2">
                        {[
                            { key: 'all',        label: 'All',         dot: 'bg-gray-400' },
                            { key: 'todo',       label: 'To Do',       dot: 'bg-slate-400' },
                            { key: 'in_progress',label: 'In Progress', dot: 'bg-blue-500' },
                            { key: 'done',       label: 'Done',        dot: 'bg-emerald-500' },
                            { key: 'overdue',    label: 'Overdue',     dot: 'bg-red-500' },
                        ].map(({ key, label, dot }) => (
                            <button
                                key={key}
                                onClick={() => setActiveStatus(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                                    activeStatus === key
                                        ? 'bg-gray-900 text-white border-gray-900'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${dot}`} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Month Navigator ───────────────────────── */}
                <div className="flex items-center justify-between">
                    <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition">◀</button>
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-gray-800">{MONTHS[month]} {year}</h2>
                        <button onClick={goToday} className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition">
                            Today
                        </button>
                    </div>
                    <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition">▶</button>
                </div>

                {/* ── Month View ────────────────────────────── */}
                {view === 'month' && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Day labels */}
                        <div className="grid grid-cols-7 border-b border-gray-200">
                            {DAYS.map((d, i) => (
                                <div key={d} className={`py-2.5 text-center text-xs font-bold uppercase tracking-wider ${
                                    i === 0 || i === 6 ? 'text-red-400 bg-red-50/50' : 'text-gray-500 bg-gray-50'
                                }`}>
                                    {d}
                                </div>
                            ))}
                        </div>
                        {/* Cells */}
                        <div className="grid grid-cols-7">
                            {cells.map((day, i) => {
                                const dateStr = day ? ymd(year, month, day) : null;
                                const dayTasks = dateStr ? (tasksByDate[dateStr] ?? []) : [];
                                const isToday = dateStr === todayStr;
                                const dow     = day ? new Date(year, month, day).getDay() : null;
                                const isWeekend = dow === 0 || dow === 6;
                                const MAX_PILLS = 3;
                                const extra = dayTasks.length - MAX_PILLS;

                                return (
                                    <div
                                        key={i}
                                        className={[
                                            'min-h-[120px] border-b border-r border-gray-100 p-1.5',
                                            !day      ? 'bg-gray-50/60' :
                                            isToday   ? 'bg-blue-50/60' :
                                            isWeekend ? 'bg-slate-50/60' : 'bg-white',
                                        ].join(' ')}
                                    >
                                        {day && (
                                            <>
                                                <div className="flex items-center justify-between mb-1 group/daycell">
                                                    {canManage ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setQuickAddDate(dateStr)}
                                                            className="opacity-0 group-hover/daycell:opacity-100 w-5 h-5 rounded flex items-center justify-center text-blue-600 hover:bg-blue-100 text-sm font-bold transition-opacity leading-none"
                                                            title={`Add task on ${dateStr}`}
                                                        >+</button>
                                                    ) : <span />}
                                                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ${
                                                        isToday
                                                            ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-200'
                                                            : isWeekend ? 'text-red-400' : 'text-gray-500'
                                                    }`}>
                                                        {day}
                                                    </span>
                                                </div>
                                                {dayTasks.slice(0, MAX_PILLS).map(t => (
                                                    <TaskPill key={t.id} task={t} onClick={() => setSelectedTask(t)} />
                                                ))}
                                                {extra > 0 && (
                                                    <button
                                                        className="text-xs text-blue-600 hover:underline font-medium px-1"
                                                        onClick={() => {
                                                            setView('list');
                                                            // scroll / no-op; list shows current month
                                                        }}
                                                    >
                                                        +{extra} more
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── List View (grouped by date) ─────────── */}
                {view === 'list' && (
                    <div className="space-y-4">
                        {monthTasks.length === 0 && (
                            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                                <p className="text-4xl mb-2">📭</p>
                                <p className="text-gray-500 font-medium">No tasks due this month</p>
                            </div>
                        )}
                        {(() => {
                            // Group tasks by earliest date (start_date_fmt ?? due_date_fmt)
                            const groups = {};
                            monthTasks.forEach(t => {
                                const key = t.start_date_fmt ?? t.due_date_fmt;
                                if (!groups[key]) groups[key] = [];
                                groups[key].push(t);
                            });
                            return Object.entries(groups).map(([dateStr, dayTasks]) => {
                                const d = new Date(dateStr);
                                const isToday = dateStr === todayStr;
                                const dow = d.getDay();
                                const isWknd = dow === 0 || dow === 6;
                                const dayLabel = d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
                                return (
                                    <div key={dateStr} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                        {/* Date header */}
                                        <div className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 ${
                                            isToday ? 'bg-blue-50' : isWknd ? 'bg-slate-50' : 'bg-gray-50'
                                        }`}>
                                            <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                                isToday ? 'bg-blue-600 text-white shadow ring-2 ring-blue-200' : 'bg-white border border-gray-200 text-gray-700'
                                            }`}>
                                                {d.getDate()}
                                            </span>
                                            <span className={`text-sm font-semibold ${
                                                isToday ? 'text-blue-700' : isWknd ? 'text-red-500' : 'text-gray-700'
                                            }`}>{dayLabel}</span>
                                            {isToday && <span className="ml-1 text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Today</span>}
                                            <span className="ml-auto text-xs text-gray-400">{dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}</span>
                                        </div>
                                        {/* Task rows */}
                                        <div className="divide-y divide-gray-50">
                                            {dayTasks.map(task => {
                                                const sk     = statusKey(task);
                                                const meta   = STATUS_META[sk] ?? STATUS_META.todo;
                                                const pmeta  = PRIORITY_META[task.priority];
                                                const rel    = daysRelative(task.due_date_fmt);
                                                const hasRange = task.start_date_fmt && task.start_date_fmt !== task.due_date_fmt;
                                                const dur    = durationDays(task.start_date_fmt, task.due_date_fmt);
                                                return (
                                                    <button
                                                        key={task.id}
                                                        onClick={() => setSelectedTask(task)}
                                                        className={`w-full text-left px-4 py-3 flex items-start gap-4 hover:bg-gray-50/80 transition group ${meta.ring}`}
                                                    >
                                                        {/* Left: avatar */}
                                                        <div className="shrink-0 mt-0.5">
                                                            {task.assignee ? (
                                                                <div title={task.assignee.name} className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm ${avatarColor(task.assignee.name)}`}>
                                                                    {initials(task.assignee.name)}
                                                                </div>
                                                            ) : (
                                                                <div className="w-9 h-9 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">?</div>
                                                            )}
                                                        </div>

                                                        {/* Middle: info */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-blue-700 transition truncate">{task.title}</p>
                                                            <p className="text-xs text-gray-400 mt-0.5 truncate">{task.project} › {task.board}</p>

                                                            {/* Date range */}
                                                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                                                {hasRange ? (
                                                                    <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 font-medium">
                                                                        📅 {task.start_date_fmt} → {task.due_date_fmt}{dur ? ` (${dur}d)` : ''}
                                                                    </span>
                                                                ) : (
                                                                    <span className={`text-xs rounded px-1.5 py-0.5 font-medium border ${
                                                                        task.is_overdue
                                                                            ? 'text-red-600 bg-red-50 border-red-200'
                                                                            : 'text-gray-500 bg-gray-50 border-gray-200'
                                                                    }`}>📅 {task.due_date_fmt}</span>
                                                                )}
                                                                <span className={`text-xs rounded px-1.5 py-0.5 font-medium border ${rel.cls}`}>{rel.label}</span>
                                                            </div>

                                                            {/* Progress */}
                                                            <div className="mt-2 flex items-center gap-2">
                                                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                    <div className={`h-full rounded-full ${
                                                                        sk === 'done' ? 'bg-emerald-400' : sk === 'overdue' ? 'bg-red-400' : 'bg-blue-400'
                                                                    }`} style={{ width: `${task.progress}%` }} />
                                                                </div>
                                                                <span className="shrink-0 text-xs font-medium text-gray-400">{task.progress}%</span>
                                                            </div>
                                                        </div>

                                                        {/* Right: badges */}
                                                        <div className="shrink-0 flex flex-col items-end gap-1.5 mt-0.5">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${meta.pill}`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                                                {meta.label}
                                                            </span>
                                                            {pmeta && (
                                                                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${pmeta.bg} ${pmeta.text} ${pmeta.border}`}>
                                                                    {pmeta.icon} {pmeta.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                )}

                {/* ── Legend ────────────────────────────────── */}
                <div className="flex flex-wrap gap-4 pt-1">
                    {Object.entries(STATUS_META).map(([key, meta]) => (
                        <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Quick Add Modal ───────────────────────────── */}
            {canManage && quickAddDate && (
                <QuickAddModal
                    date={quickAddDate}
                    boards={boards}
                    users={users}
                    onClose={() => setQuickAddDate(null)}
                />
            )}

            {/* ── Task Detail Modal ─────────────────────────── */}
            <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
        </AppLayout>
    );
}
