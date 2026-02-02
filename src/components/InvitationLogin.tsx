import React, { useState } from 'react';

interface InvitationLoginProps {
    onLogin: (code: string) => void;
}

export default function InvitationLogin({ onLogin }: InvitationLoginProps) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const cleanCode = code.trim(); // Ensure no trailing spaces

        try {
            const res = await fetch('/api/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: cleanCode })
            });
            
            const data = await res.json();
            if (res.ok && data.valid) {
                onLogin(code);
            } else {
                setError('Invalid Invitation Code');
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

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100 relative z-10 animate-in fade-in zoom-in-95 duration-500">
                
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-blue-100">
                        <div className="text-blue-600">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-center text-gray-900 tracking-tight">Welcome Back</h1>
                    <p className="text-gray-500 text-center mt-2 text-sm">Enter your access code to initialize system</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Invitation Code</label>
                        <div className="relative group">
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                className="w-full h-14 bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 text-center tracking-[0.5em] text-2xl font-mono uppercase shadow-inner transition-all group-hover:border-gray-300"
                                placeholder="XXXXXX"
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 text-center text-sm py-2 rounded-lg animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-blue-600 text-white font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Verifying...
                            </span>
                        ) : 'Access System'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                        Protected by Secure Gateway
                    </p>
                </div>
            </div>
        </div>
    );
}
