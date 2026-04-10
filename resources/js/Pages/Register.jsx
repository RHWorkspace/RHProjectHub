import React from 'react';
import { useForm } from '@inertiajs/react';
import { Head } from '@inertiajs/react';

export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/register');
    };

    return (
        <>
            <Head title="Register" />
            <div className="min-h-screen flex">

                {/* Left branding panel */}
                <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-blue-600 px-12">
                    <div className="text-white text-center max-w-sm">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-white text-2xl font-black mx-auto mb-6 select-none">
                            PH
                        </div>
                        <h1 className="text-4xl font-extrabold mb-3">Project Hub</h1>
                        <p className="text-blue-100 text-lg leading-relaxed">
                            Join your team and start collaborating on projects today.
                        </p>
                    </div>
                </div>

                {/* Right form panel */}
                <div className="flex flex-1 flex-col justify-center items-center bg-gray-50 px-4 sm:px-8 py-12">
                    <div className="w-full max-w-sm">
                        <div className="lg:hidden flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-lg mx-auto mb-6 select-none">
                            PH
                        </div>
                        <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Create account</h2>
                        <p className="text-sm text-gray-500 mb-8">Fill in the details below to get started.</p>

                        <form className="space-y-5" onSubmit={submit}>
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    id="name"
                                    type="text"
                                    required
                                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                />
                                {errors.name && <p className="mt-1.5 text-xs text-red-600">{errors.name}</p>}
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                />
                                {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                />
                                {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>}
                            </div>
                            <div>
                                <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                <input
                                    id="password_confirmation"
                                    type="password"
                                    required
                                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                            >
                                {processing ? 'Creating account…' : 'Create account'}
                            </button>

                            <p className="text-center text-sm text-gray-500">
                                Already have an account?{' '}
                                <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">Sign in</a>
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
