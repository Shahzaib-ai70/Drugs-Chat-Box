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
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f0c29] text-white p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-neon-blue/10 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-neon-purple/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            </div>

            <div className="w-full max-w-md bg-[#1a1a2e]/80 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] p-8 border border-white/10 relative z-10 animate-in fade-in zoom-in-95 duration-500">
                {/* Decorative Top Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-blue to-transparent opacity-50"></div>
                
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,243,255,0.2)] ring-1 ring-white/10 border border-white/5">
                        <div className="text-neon-blue drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-center text-white tracking-wide drop-shadow-md">Welcome Back</h1>
                    <p className="text-gray-400 text-center mt-2 text-sm tracking-wide">Enter your access code to initialize system</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-neon-blue uppercase tracking-widest mb-2 drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]">Invitation Code</label>
                        <div className="relative group">
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                className="w-full h-14 bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/50 text-center tracking-[0.5em] text-2xl font-mono uppercase shadow-inner transition-all group-hover:border-white/20"
                                placeholder="XXXXXX"
                                required
                                autoFocus
                            />
                            <div className="absolute inset-0 rounded-xl pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"></div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-center text-sm py-2 rounded-lg animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-neon-blue text-black font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-white hover:shadow-[0_0_25px_rgba(0,243,255,0.6)] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                                Verifying...
                            </span>
                        ) : 'Access System'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest">
                        Protected by Secure Gateway
                    </p>
                </div>
            </div>
        </div>
    );
}
