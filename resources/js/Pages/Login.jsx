import React, { useState } from 'react';
import { useForm, Head } from '@inertiajs/react';

const features = [
    {
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
        ),
        title: 'Kanban Board',
        desc: 'Visualisasi alur kerja tim dengan board interaktif',
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
        ),
        title: 'Manajemen Task',
        desc: 'Buat, assign, dan pantau progres task & subtask',
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
            </svg>
        ),
        title: 'Kolaborasi Tim',
        desc: 'Kelola anggota, peran, dan proyek lintas tim',
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
        title: 'Laporan & Analitik',
        desc: 'Dashboard eksekutif, workload, dan kalender proyek',
    },
];

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });
    const [showPassword, setShowPassword] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <>
            <Head title="Sign In — Project Hub" />
            <div className="min-h-screen flex bg-white">

                {/* ── Left branding panel ── */}
                <div className="hidden lg:flex flex-col justify-between w-[52%] bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-600 px-14 py-12 overflow-hidden relative">
                    {/* decorative circles */}
                    <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/5" />
                    <div className="absolute -bottom-24 -right-16 w-96 h-96 rounded-full bg-white/5" />
                    <div className="absolute top-1/2 right-0 w-48 h-48 rounded-full bg-white/5" />

                    {/* logo */}
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white font-black text-base select-none">
                            PH
                        </div>
                        <span className="text-white font-bold text-lg tracking-tight">Project Hub</span>
                    </div>

                    {/* headline */}
                    <div className="relative z-10 my-auto">
                        <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-4">
                            Satu platform,<br />semua kebutuhan<br />proyek tim Anda.
                        </h1>
                        <p className="text-violet-200 text-base leading-relaxed max-w-sm mb-10">
                            Dari perencanaan hingga pelaporan — kelola task, board, dan anggota tim dalam satu tempat yang terintegrasi.
                        </p>

                        {/* feature list */}
                        <div className="grid grid-cols-1 gap-3">
                            {features.map((f) => (
                                <div key={f.title} className="flex items-start gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                                        {f.icon}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{f.title}</p>
                                        <p className="text-xs text-violet-200 mt-0.5">{f.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* footer note */}
                    <p className="relative z-10 text-xs text-violet-300">
                        © {new Date().getFullYear()} Project Hub · Internal Use Only
                    </p>
                </div>

                {/* ── Right form panel ── */}
                <div className="flex flex-1 flex-col justify-center items-center bg-gray-50 px-6 sm:px-12 py-12">
                    <div className="w-full max-w-[360px]">

                        {/* mobile logo */}
                        <div className="lg:hidden flex items-center gap-2.5 mb-8">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white font-black text-sm select-none">
                                PH
                            </div>
                            <span className="font-bold text-gray-900 text-base">Project Hub</span>
                        </div>

                        <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Selamat datang!</h2>
                        <p className="text-sm text-gray-500 mb-8">Masuk untuk melanjutkan ke workspace Anda.</p>

                        <form className="space-y-5" onSubmit={submit}>
                            {/* email */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition"
                                    placeholder="nama@perusahaan.com"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                />
                                {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
                            </div>

                            {/* password */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        required
                                        className="block w-full rounded-xl border border-gray-300 px-4 py-2.5 pr-11 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition"
                                        placeholder="••••••••"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition"
                                        onClick={() => setShowPassword((v) => !v)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>}
                            </div>

                            {/* remember me */}
                            <div className="flex items-center gap-2">
                                <input
                                    id="remember"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                />
                                <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer select-none">
                                    Ingat saya
                                </label>
                            </div>

                            {/* submit */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {processing && (
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                )}
                                {processing ? 'Masuk…' : 'Masuk'}
                            </button>
                        </form>

                        {/* help note */}
                        <p className="mt-8 text-center text-xs text-gray-400">
                            Belum punya akun? Hubungi administrator Anda.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

