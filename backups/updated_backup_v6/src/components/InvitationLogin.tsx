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
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-xl p-8">
                <h1 className="text-3xl font-bold text-center mb-6 text-blue-400">Welcome</h1>
                <p className="text-gray-400 text-center mb-8">Please enter your invitation code to continue.</p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Invitation Code</label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-widest text-xl uppercase"
                            placeholder="XXXXXX"
                            required
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-center text-sm">{error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition duration-200 disabled:opacity-50"
                    >
                        {loading ? 'Verifying...' : 'Enter'}
                    </button>
                </form>
            </div>
        </div>
    );
}
