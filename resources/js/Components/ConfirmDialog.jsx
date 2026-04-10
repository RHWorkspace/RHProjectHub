import React from 'react';

/**
 * Modal confirmation dialog — replaces native browser confirm().
 *
 * Props:
 *   open          boolean
 *   title         string
 *   message       string (optional)
 *   onConfirm     () => void
 *   onCancel      () => void
 *   confirmLabel  string   (default: 'Hapus')
 *   variant       'danger' | 'warning' | 'primary'  (default: 'danger')
 *   loading       boolean  (disables confirm button while request is in-flight)
 */
export default function ConfirmDialog({
    open,
    title,
    message,
    onConfirm,
    onCancel,
    confirmLabel = 'Hapus',
    variant = 'danger',
    loading = false,
}) {
    if (!open) return null;

    const VARIANT = {
        danger:  { icon: '🗑️', iconBg: 'bg-red-100',    btn: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500' },
        warning: { icon: '⚠️',  iconBg: 'bg-amber-100',  btn: 'bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-400' },
        primary: { icon: '❓',  iconBg: 'bg-blue-100',   btn: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500' },
    };
    const v = VARIANT[variant] ?? VARIANT.danger;

    return (
        <div
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-[fadeInUp_0.2s_ease-out]"
                onClick={e => e.stopPropagation()}
            >
                {/* Icon + Title */}
                <div className="flex items-start gap-4 mb-4">
                    <div className={`shrink-0 flex h-11 w-11 items-center justify-center rounded-full text-2xl ${v.iconBg}`}>
                        {v.icon}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                        <h3 className="text-base font-bold text-gray-900 leading-snug">{title}</h3>
                        {message && (
                            <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{message}</p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-5">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed ${v.btn}`}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Memproses…
                            </span>
                        ) : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
