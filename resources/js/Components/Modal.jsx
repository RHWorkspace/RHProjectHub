import React from 'react';

/**
 * Shared modal wrapper — consistent overlay, rounded container, header, close button.
 *
 * Props:
 *   open       boolean        — controls visibility
 *   onClose    () => void     — called when backdrop or ✕ is clicked
 *   title      string         — modal heading
 *   icon       string         — emoji/icon shown left of title (optional)
 *   size       'sm'|'md'|'lg'|'xl' — max-width (default 'md')
 *   children   ReactNode      — body + footer content (use ModalBody / ModalFooter helpers, or raw JSX)
 */
export default function Modal({ open, onClose, title, icon, size = 'md', processing = false, children }) {
    if (!open) return null;

    const MAX_W = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
            onClick={processing ? undefined : onClose}
        >
            <div
                className={`w-full ${MAX_W[size] ?? MAX_W.md} bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 shrink-0">
                    {icon && (
                        <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-lg">
                            {icon}
                        </div>
                    )}
                    <h3 className="flex-1 text-base font-semibold text-gray-900 leading-snug">{title}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xl leading-none disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Tutup"
                    >
                        &times;
                    </button>
                </div>

                {/* Scrollable body — overlaid when processing */}
                <div className="overflow-y-auto flex-1 relative">
                    {processing && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px] rounded-b-2xl">
                            <div className="flex flex-col items-center gap-2">
                                <svg className="animate-spin h-7 w-7 text-violet-600" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                <span className="text-xs font-medium text-gray-500">Menyimpan…</span>
                            </div>
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </div>
    );
}

/* ── Sub-components for consistent body / footer padding ───────── */

/** Scrollable form body area */
export function ModalBody({ children, className = '' }) {
    return (
        <div className={`px-6 py-5 space-y-4 ${className}`}>
            {children}
        </div>
    );
}

/** Sticky footer with Cancel + Submit buttons */
export function ModalFooter({ onCancel, submitLabel = 'Simpan', processing = false, cancelLabel = 'Batal', variant = 'blue' }) {
    const BTN = {
        blue:  'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        green: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
        red:   'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    };
    return (
        <div className="shrink-0 border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
            <button
                type="button"
                onClick={onCancel}
                disabled={processing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
            >
                {cancelLabel}
            </button>
            <button
                type="submit"
                disabled={processing}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed ${BTN[variant] ?? BTN.blue}`}
            >
                {processing ? (
                    <>
                        <svg className="animate-spin h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Menyimpan…
                    </>
                ) : submitLabel}
            </button>
        </div>
    );
}

/* ── Form field helpers ─────────────────────────────────────────── */

const FIELD_CLS = 'block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50';
const LABEL_CLS = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1';

export function FieldLabel({ children, required }) {
    return (
        <label className={LABEL_CLS}>
            {children}
            {required && <span className="ml-1 text-red-400">*</span>}
        </label>
    );
}

export function FieldError({ message }) {
    if (!message) return null;
    return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

export function FieldInput({ error, ...props }) {
    return (
        <>
            <input className={`${FIELD_CLS} ${error ? 'border-red-300 focus:ring-red-500' : ''}`} {...props} />
            <FieldError message={error} />
        </>
    );
}

export function FieldTextarea({ error, rows = 3, ...props }) {
    return (
        <>
            <textarea rows={rows} className={`${FIELD_CLS} resize-none ${error ? 'border-red-300 focus:ring-red-500' : ''}`} {...props} />
            <FieldError message={error} />
        </>
    );
}

export function FieldSelect({ error, children, ...props }) {
    return (
        <>
            <select className={`${FIELD_CLS} bg-white ${error ? 'border-red-300 focus:ring-red-500' : ''}`} {...props}>
                {children}
            </select>
            <FieldError message={error} />
        </>
    );
}
