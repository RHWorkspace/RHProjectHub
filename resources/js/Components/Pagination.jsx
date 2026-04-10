import React from 'react';

const PER_PAGE_OPTIONS = [10, 25, 50];

/**
 * Reusable pagination bar.
 *
 * Props:
 *   page            – current page (1-based)
 *   totalPages      – total number of pages
 *   total           – total item count (used for "Showing X–Y of Z")
 *   perPage         – items per page
 *   onPageChange    – callback(newPage)
 *   onPerPageChange – optional callback(newPerPage) — shows per-page selector when provided
 *   label           – noun for item type, default "item"
 */
export default function Pagination({ page, totalPages, total, perPage, onPageChange, onPerPageChange, label = 'item' }) {
    const from = total === 0 ? 0 : (page - 1) * perPage + 1;
    const to   = Math.min(page * perPage, total);

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
        .reduce((acc, p, idx, arr) => {
            if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
            acc.push(p);
            return acc;
        }, []);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 rounded-b-xl">
            {/* Left: info + per-page selector */}
            <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                <span>
                    Menampilkan <span className="font-medium">{from}–{to}</span> dari <span className="font-medium">{total}</span> {label}
                </span>
                {onPerPageChange && (
                    <>
                        <span className="text-gray-300">|</span>
                        <span className="text-xs">Per halaman:</span>
                        <select
                            value={perPage}
                            onChange={e => onPerPageChange(Number(e.target.value))}
                            className="border border-gray-200 rounded-md px-1.5 py-0.5 text-xs text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                            {PER_PAGE_OPTIONS.map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </>
                )}
            </div>
            {/* Right: page buttons */}
            {totalPages > 1 && (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onPageChange(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        ← Prev
                    </button>
                    {pages.map((p, idx) =>
                        p === '…' ? (
                            <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-sm">…</span>
                        ) : (
                            <button
                                key={p}
                                onClick={() => onPageChange(p)}
                                className={`px-3 py-1 text-sm border rounded-md ${
                                    page === p
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                                }`}
                            >
                                {p}
                            </button>
                        )
                    )}
                    <button
                        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}
