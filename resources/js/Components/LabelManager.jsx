import React, { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';

// ── Swatch palette for quick color picking ──────────────────────────────────
const PALETTE = [
    '#ef4444','#f97316','#f59e0b','#84cc16',
    '#10b981','#06b6d4','#3b82f6','#6366f1',
    '#8b5cf6','#ec4899','#64748b','#1e293b',
];

// ── Inline badge chip ────────────────────────────────────────────────────────
export function LabelChip({ label, onRemove }) {
    // Determine readable text color (white vs black) based on background
    function textColor(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#1e293b' : '#ffffff';
    }
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: label.color, color: textColor(label.color) }}
        >
            {label.name}
            {onRemove && (
                <button
                    type="button"
                    onClick={() => onRemove(label.id)}
                    className="hover:opacity-70 leading-none"
                    aria-label={`Remove ${label.name}`}
                >×</button>
            )}
        </span>
    );
}

// ── Dropdown picker for attaching labels to a task ───────────────────────────
export function LabelPicker({ allLabels = [], selected = [], onChange, disabled }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggle = (id) => {
        const next = selected.includes(id)
            ? selected.filter(x => x !== id)
            : [...selected, id];
        onChange(next);
    };

    const selectedLabels = allLabels.filter(l => selected.includes(l.id));

    return (
        <div ref={ref} className="relative">
            {/* Selected chips + open button */}
            <div
                onClick={() => !disabled && setOpen(o => !o)}
                className={`flex flex-wrap gap-1 min-h-[36px] cursor-pointer border rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 dark:border-gray-700 ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-violet-400'}`}
            >
                {selectedLabels.length === 0 && (
                    <span className="text-sm text-gray-400 select-none">Add labels…</span>
                )}
                {selectedLabels.map(l => (
                    <LabelChip
                        key={l.id}
                        label={l}
                        onRemove={disabled ? undefined : (id) => toggle(id)}
                    />
                ))}
            </div>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 mt-1 w-56 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-lg py-1 max-h-60 overflow-y-auto">
                    {allLabels.length === 0 && (
                        <p className="px-3 py-2 text-sm text-gray-400">No labels for this project yet.</p>
                    )}
                    {allLabels.map(l => {
                        const active = selected.includes(l.id);
                        return (
                            <button
                                key={l.id}
                                type="button"
                                onClick={() => toggle(l.id)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${active ? 'font-semibold' : ''}`}
                            >
                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: l.color }} />
                                <span className="flex-1 text-left text-gray-800 dark:text-gray-200">{l.name}</span>
                                {active && <span className="text-violet-500 text-xs">✓</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Label management CRUD panel (used inside Board settings or a modal) ───────
export default function LabelManager({ projectId, labels, onLabelsChange }) {
    const [name,    setName]    = useState('');
    const [color,   setColor]   = useState('#6366f1');
    const [editId,  setEditId]  = useState(null);
    const [editName, setEditName]   = useState('');
    const [editColor, setEditColor] = useState('');
    const [saving,  setSaving]  = useState(false);

    const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.content;
    const jsonHeaders = () => ({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-TOKEN': csrfToken(),
    });

    const handleCreate = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            const res = await fetch(`/projects/${projectId}/labels`, {
                method: 'POST',
                headers: jsonHeaders(),
                body: JSON.stringify({ name: name.trim(), color }),
            });
            if (res.ok) {
                const newLabel = await res.json();
                onLabelsChange([...labels, newLabel]);
                setName('');
                setColor('#6366f1');
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.message ?? `Error ${res.status}`);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (id) => {
        setSaving(true);
        try {
            const res = await fetch(`/labels/${id}`, {
                method: 'PATCH',
                headers: jsonHeaders(),
                body: JSON.stringify({ name: editName.trim(), color: editColor }),
            });
            if (res.ok) {
                const updated = await res.json();
                onLabelsChange(labels.map(l => l.id === id ? updated : l));
                setEditId(null);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.message ?? `Error ${res.status}`);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Hapus label ini?')) return;
        const res = await fetch(`/labels/${id}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
        });
        if (res.ok) {
            onLabelsChange(labels.filter(l => l.id !== id));
        }
    };

    const startEdit = (label) => {
        setEditId(label.id);
        setEditName(label.name);
        setEditColor(label.color);
    };

    return (
        <div className="space-y-3">
            {/* Existing labels */}
            {labels.map(label => (
                <div key={label.id} className="flex items-center gap-2">
                    {editId === label.id ? (
                        <>
                            <input
                                type="color"
                                value={editColor}
                                onChange={e => setEditColor(e.target.value)}
                                className="w-8 h-8 p-0 rounded cursor-pointer border border-gray-200"
                            />
                            <input
                                type="text"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className="flex-1 border rounded-lg px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                            />
                            <button onClick={() => handleUpdate(label.id)} disabled={saving}
                                className="text-xs px-2 py-1 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50">Save</button>
                            <button onClick={() => setEditId(null)}
                                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">Cancel</button>
                        </>
                    ) : (
                        <>
                            <LabelChip label={label} />
                            <div className="flex-1" />
                            <button onClick={() => startEdit(label)}
                                className="text-xs text-gray-400 hover:text-violet-600">Edit</button>
                            <button onClick={() => handleDelete(label.id)}
                                className="text-xs text-gray-400 hover:text-red-500">Delete</button>
                        </>
                    )}
                </div>
            ))}

            {/* Create new */}
            <div className="flex items-center gap-2 pt-2 border-t dark:border-gray-700">
                <div className="relative">
                    <input
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        className="w-8 h-8 p-0 rounded cursor-pointer border border-gray-200"
                        title="Pick color"
                    />
                </div>
                {/* Quick palette */}
                <div className="flex gap-1 flex-wrap">
                    {PALETTE.map(c => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            className={`w-5 h-5 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                            style={{ background: c }}
                            title={c}
                        />
                    ))}
                </div>
                <input
                    type="text"
                    placeholder="Label name…"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    className="flex-1 border rounded-lg px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
                <button
                    onClick={handleCreate}
                    disabled={saving || !name.trim()}
                    className="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 whitespace-nowrap"
                >+ Add</button>
            </div>
        </div>
    );
}
