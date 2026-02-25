import React, { useState } from 'react';

interface AdminLoginProps {
    onLogin: (token: string) => void;
    onBack: () => void;
}

export default function AdminLogin({ onLogin, onBack }: AdminLoginProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await res.json();
            if (data.success) {
                onLogin(data.token);
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (e) {
            setError('Connection Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900 p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-white opacity-50 pointer-events-none"></div>

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100 relative z-10 animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">Admin <span className="text-blue-600">Portal</span></h1>
                    <p className="text-gray-500 text-sm">Secure Access</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                            placeholder="Enter admin username"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm text-center animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 font-bold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? 'Authenticating...' : 'Login to Dashboard'}
                    </button>
                </form>

                <div className="mt-8 text-center pt-6 border-t border-gray-100">
                    <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center justify-center gap-2 mx-auto group">
                        <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to User Login
                    </button>
                </div>
            </div>
        </div>
    );
}
