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
        <div className="min-h-screen bg-gray-50 text-gray-800 p-8 relative overflow-hidden font-sans">
            {/* Background Effects - Subtle for Light Mode */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[100px] opacity-50"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-100 rounded-full blur-[100px] opacity-50 delay-1000"></div>
            </div>

            <div className="max-w-6xl mx-auto relative z-10">
                <header className="flex justify-between items-center mb-8 border-b border-gray-200 pb-6 bg-white/80 backdrop-blur-md rounded-2xl px-8 py-4 shadow-sm">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Admin <span className="text-blue-600">Dashboard</span></h1>
                        <p className="text-gray-500 text-sm mt-1">Manage invitation codes and monitor usage</p>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl text-gray-600 hover:text-red-600 transition-all shadow-sm hover:shadow-md active:scale-95"
                    >
                        <LogOut size={18} /> Logout
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 group hover:border-blue-300 transition-colors">
                        <h3 className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-2">Total Users</h3>
                        <p className="text-4xl font-light text-gray-900 group-hover:scale-105 transition-transform origin-left">{users.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 group hover:border-purple-300 transition-colors">
                        <h3 className="text-purple-600 text-xs font-bold uppercase tracking-widest mb-2">Active Connections</h3>
                        <p className="text-4xl font-light text-gray-900 group-hover:scale-105 transition-transform origin-left">
                            {users.reduce((acc, user) => acc + user.serviceCount, 0)}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 col-span-2 flex flex-col justify-center gap-4">
                        <div className="flex gap-3">
                            <input 
                                type="text" 
                                placeholder="Custom Code (Optional)" 
                                value={customCode} 
                                onChange={e => setCustomCode(e.target.value)}
                                className="bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 rounded-xl flex-1 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder-gray-400"
                            />
                            <input 
                                type="text" 
                                placeholder="Owner Name (Optional)" 
                                value={ownerName} 
                                onChange={e => setOwnerName(e.target.value)}
                                className="bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 rounded-xl flex-1 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder-gray-400"
                            />
                        </div>
                        <button
                            onClick={generateCode}
                            disabled={generating}
                            className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 font-bold py-3 px-6 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={20} />
                            {generating ? 'Generating...' : 'Generate New Invitation Code'}
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Registered Users</h2>
                        <button onClick={fetchUsers} className="p-2 hover:bg-gray-200 rounded-full transition text-blue-600 hover:shadow-sm">
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Invitation Code</th>
                                    <th className="px-6 py-4 font-semibold">Owner Name</th>
                                    <th className="px-6 py-4 font-semibold">Created At</th>
                                    <th className="px-6 py-4 font-semibold">Connected Accounts</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                            No users found. Generate a code to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.code} className="hover:bg-gray-50 transition duration-200">
                                            <td className="px-6 py-4 font-mono text-lg text-blue-600 tracking-wider font-semibold">
                                                {user.code}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700">
                                                {editingCode === user.code ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={editName}
                                                            onChange={e => setEditName(e.target.value)}
                                                            className="bg-white border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 w-full text-gray-900"
                                                            autoFocus
                                                        />
                                                    </div>
                                                ) : (
                                                    user.owner_name || <span className="text-gray-400 italic">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 text-sm">
                                                {new Date(user.created_at).toLocaleDateString()} <span className="text-gray-300">|</span> {new Date(user.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${user.serviceCount > 0 ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                    {user.serviceCount} Services
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs border font-medium ${
                                                    !user.status || user.status === 'active' 
                                                        ? 'bg-green-50 text-green-600 border-green-200' 
                                                        : 'bg-red-50 text-red-600 border-red-200'
                                                }`}>
                                                    {user.status || 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                {editingCode === user.code ? (
                                                    <>
                                                        <button
                                                            onClick={saveEditing}
                                                            className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition"
                                                            title="Save"
                                                        >
                                                            <Save size={18} />
                                                        </button>
                                                        <button
                                                            onClick={cancelEditing}
                                                            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition"
                                                            title="Cancel"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => startEditing(user)}
                                                            className="text-blue-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition"
                                                            title="Edit Name"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteCode(user.code)}
                                                            className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition"
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
