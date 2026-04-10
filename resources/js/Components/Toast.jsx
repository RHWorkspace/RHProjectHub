import React, { useState, useEffect, useCallback } from 'react';
import { toast } from '../lib/toast';

const TYPE_META = {
    success: {
        bar:  'bg-emerald-500',
        icon: '✓',
        iconBg: 'bg-emerald-100 text-emerald-700',
        ring: 'ring-emerald-200',
        title: 'Berhasil',
    },
    error: {
        bar:  'bg-red-500',
        icon: '✕',
        iconBg: 'bg-red-100 text-red-600',
        ring: 'ring-red-200',
        title: 'Gagal',
    },
    warning: {
        bar:  'bg-amber-400',
        icon: '!',
        iconBg: 'bg-amber-100 text-amber-700',
        ring: 'ring-amber-200',
        title: 'Peringatan',
    },
    info: {
        bar:  'bg-blue-500',
        icon: 'i',
        iconBg: 'bg-blue-100 text-blue-700',
        ring: 'ring-blue-200',
        title: 'Info',
    },
};

function ToastItem({ item, onDismiss }) {
    const [visible, setVisible] = useState(false);
    const meta = TYPE_META[item.type] ?? TYPE_META.info;

    const dismiss = useCallback(() => {
        setVisible(false);
        setTimeout(() => onDismiss(item.id), 320);
    }, [item.id, onDismiss]);

    useEffect(() => {
        const t1 = setTimeout(() => setVisible(true), 16);
        const t2 = setTimeout(dismiss, item.duration);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    return (
        <div
            className={[
                'relative flex items-start gap-3 bg-white rounded-xl shadow-lg ring-1 px-4 py-3.5',
                'w-80 max-w-[calc(100vw-2rem)] overflow-hidden cursor-pointer select-none',
                'transition-all duration-300 ease-out',
                meta.ring,
                visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10',
            ].join(' ')}
            onClick={dismiss}
        >
            {/* Left colour bar */}
            <span className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${meta.bar}`} />

            {/* Icon */}
            <div className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ml-1 ${meta.iconBg}`}>
                {meta.icon}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide leading-none mb-0.5">{meta.title}</p>
                <p className="text-sm font-medium text-gray-800 leading-snug">{item.message}</p>
            </div>

            {/* Close */}
            <button
                onClick={(e) => { e.stopPropagation(); dismiss(); }}
                className="shrink-0 text-gray-300 hover:text-gray-600 text-xl leading-none transition-colors mt-0.5"
                aria-label="Tutup notifikasi"
            >
                &times;
            </button>
        </div>
    );
}

export default function Toast() {
    const [items, setItems] = useState([]);

    const dismiss = useCallback((id) => {
        setItems(prev => prev.filter(i => i.id !== id));
    }, []);

    useEffect(() => {
        return toast._subscribe((action, payload) => {
            if (action === 'add') {
                setItems(prev => [...prev, payload]);
            } else {
                setItems(prev => prev.filter(i => i.id !== payload));
            }
        });
    }, []);

    return (
        <div
            className="fixed top-4 right-4 z-[200] flex flex-col gap-2.5 items-end pointer-events-none"
            aria-live="polite"
        >
            {items.map(item => (
                <div key={item.id} className="pointer-events-auto">
                    <ToastItem item={item} onDismiss={dismiss} />
                </div>
            ))}
        </div>
    );
}
