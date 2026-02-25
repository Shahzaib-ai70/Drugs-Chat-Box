import React, { useState, useEffect } from 'react';
import { RefreshCw, Trash2, Plus, LogOut, Edit2, Save, X } from 'lucide-react';

interface AdminPanelProps {
    onLogout: () => void;
}

interface UserCode {
    code: string;
    created_at: number;
    status: string;
    serviceCount: number;
    owner_name?: string;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
    const [users, setUsers] = useState<UserCode[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [customCode, setCustomCode] = useState('');
    const [ownerName, setOwnerName] = useState('');
    
    // Editing state
    const [editingCode, setEditingCode] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const generateCode = async () => {
        setGenerating(true);
        try {
            const res = await fetch('/api/admin/generate-code', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customCode, ownerName })
            });
            const data = await res.json();
            if (data.success) {
                setCustomCode('');
                setOwnerName('');
                fetchUsers();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setGenerating(false);
        }
    };

    const deleteCode = async (code: string) => {
        if (!confirm('Are you sure you want to revoke this code? User will lose access.')) return;
        try {
            await fetch(`/api/admin/code/${code}`, { method: 'DELETE' });
            fetchUsers();
        } catch (e) {
            console.error(e);
        }
    };

    const startEditing = (user: UserCode) => {
        setEditingCode(user.code);
        setEditName(user.owner_name || '');
    };

    const cancelEditing = () => {
        setEditingCode(null);
        setEditName('');
    };

    const saveEditing = async () => {
        if (!editingCode) return;
        try {
            await fetch(`/api/admin/code/${editingCode}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerName: editName })
            });
            setEditingCode(null);
            fetchUsers();
        } catch (e) {
            console.error(e);
            alert('Failed to update');
        }
    };

    return (
        <div className="min-h-screen bg-[#0f0c29] text-white p-8 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-blue/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-purple/10 rounded-full blur-[100px] animate-pulse-slow delay-1000"></div>
            </div>

            <div className="max-w-6xl mx-auto relative z-10">
                <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-6 bg-[#1a1a2e]/50 backdrop-blur-md rounded-2xl px-8 py-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-wide drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Admin <span className="text-neon-blue">Dashboard</span></h1>
                        <p className="text-gray-400 text-sm mt-1">Manage invitation codes and monitor usage</p>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-neon-red/50 rounded-xl text-gray-300 hover:text-neon-red transition-all shadow-lg hover:shadow-[0_0_15px_rgba(255,0,0,0.2)] active:scale-95"
                    >
                        <LogOut size={18} /> Logout
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-[#1a1a2e]/80 backdrop-blur-xl p-6 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.3)] border border-white/10 group hover:border-neon-blue/30 transition-colors">
                        <h3 className="text-neon-blue text-xs font-bold uppercase tracking-widest mb-2 drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]">Total Users</h3>
                        <p className="text-4xl font-light text-white group-hover:scale-105 transition-transform origin-left">{users.length}</p>
                    </div>
                    <div className="bg-[#1a1a2e]/80 backdrop-blur-xl p-6 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.3)] border border-white/10 group hover:border-neon-purple/30 transition-colors">
                        <h3 className="text-neon-purple text-xs font-bold uppercase tracking-widest mb-2 drop-shadow-[0_0_5px_rgba(188,19,254,0.5)]">Active Connections</h3>
                        <p className="text-4xl font-light text-white group-hover:scale-105 transition-transform origin-left">
                            {users.reduce((acc, user) => acc + user.serviceCount, 0)}
                        </p>
                    </div>
                    <div className="bg-[#1a1a2e]/80 backdrop-blur-xl p-6 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.3)] border border-white/10 col-span-2 flex flex-col justify-center gap-4">
                        <div className="flex gap-3">
                            <input 
                                type="text" 
                                placeholder="Custom Code (Optional)" 
                                value={customCode} 
                                onChange={e => setCustomCode(e.target.value)}
                                className="bg-black/30 border border-white/10 text-white px-4 py-3 rounded-xl flex-1 focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/50 transition-all placeholder-gray-600 shadow-inner"
                            />
                            <input 
                                type="text" 
                                placeholder="Owner Name (Optional)" 
                                value={ownerName} 
                                onChange={e => setOwnerName(e.target.value)}
                                className="bg-black/30 border border-white/10 text-white px-4 py-3 rounded-xl flex-1 focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/50 transition-all placeholder-gray-600 shadow-inner"
                            />
                        </div>
                        <button
                            onClick={generateCode}
                            disabled={generating}
                            className="w-full flex items-center justify-center gap-2 bg-neon-blue/20 hover:bg-neon-blue/40 text-neon-blue border border-neon-blue/50 font-bold py-3 px-6 rounded-xl shadow-[0_0_15px_rgba(0,243,255,0.1)] hover:shadow-[0_0_25px_rgba(0,243,255,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={20} />
                            {generating ? 'Generating...' : 'Generate New Invitation Code'}
                        </button>
                    </div>
                </div>

                <div className="bg-[#1a1a2e]/80 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden">
                    <div className="p-6 bg-white/5 border-b border-white/10 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white tracking-wide">Registered Users</h2>
                        <button onClick={fetchUsers} className="p-2 hover:bg-white/10 rounded-full transition text-neon-blue hover:shadow-[0_0_10px_rgba(0,243,255,0.5)]">
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-black/20 text-gray-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Invitation Code</th>
                                    <th className="px-6 py-4 font-semibold">Owner Name</th>
                                    <th className="px-6 py-4 font-semibold">Created At</th>
                                    <th className="px-6 py-4 font-semibold">Connected Accounts</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            No users found. Generate a code to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.code} className="hover:bg-white/5 transition duration-200">
                                            <td className="px-6 py-4 font-mono text-lg text-neon-blue tracking-wider drop-shadow-[0_0_5px_rgba(0,243,255,0.3)]">
                                                {user.code}
                                            </td>
                                            <td className="px-6 py-4 text-gray-300">
                                                {editingCode === user.code ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={editName}
                                                            onChange={e => setEditName(e.target.value)}
                                                            className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-neon-blue w-full text-white"
                                                            autoFocus
                                                        />
                                                    </div>
                                                ) : (
                                                    user.owner_name || <span className="text-gray-600 italic">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-400 text-sm">
                                                {new Date(user.created_at).toLocaleDateString()} <span className="text-gray-600">|</span> {new Date(user.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${user.serviceCount > 0 ? 'bg-neon-blue/10 text-neon-blue border-neon-blue/30 shadow-[0_0_10px_rgba(0,243,255,0.1)]' : 'bg-white/5 text-gray-500 border-white/5'}`}>
                                                    {user.serviceCount} Services
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs border font-medium ${
                                                    !user.status || user.status === 'active' 
                                                        ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                                                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                                                }`}>
                                                    {user.status || 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                {editingCode === user.code ? (
                                                    <>
                                                        <button
                                                            onClick={saveEditing}
                                                            className="text-neon-blue hover:text-white p-2 hover:bg-neon-blue/20 rounded-lg transition"
                                                            title="Save"
                                                        >
                                                            <Save size={18} />
                                                        </button>
                                                        <button
                                                            onClick={cancelEditing}
                                                            className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition"
                                                            title="Cancel"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => startEditing(user)}
                                                            className="text-blue-400 hover:text-blue-300 p-2 hover:bg-blue-500/10 rounded-lg transition"
                                                            title="Edit Name"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteCode(user.code)}
                                                            className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-lg transition"
                                                            title="Revoke Access"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
