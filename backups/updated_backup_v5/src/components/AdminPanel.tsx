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
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-emerald-400">Admin Dashboard</h1>
                        <p className="text-gray-400">Manage invitation codes and monitor usage</p>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 transition"
                    >
                        <LogOut size={18} /> Logout
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                        <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Total Users</h3>
                        <p className="text-3xl font-bold text-white">{users.length}</p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                        <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Active Connections</h3>
                        <p className="text-3xl font-bold text-blue-400">
                            {users.reduce((acc, user) => acc + user.serviceCount, 0)}
                        </p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 col-span-2 flex flex-col justify-center gap-4">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Custom Code (Optional)" 
                                value={customCode} 
                                onChange={e => setCustomCode(e.target.value)}
                                className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded flex-1 focus:outline-none focus:border-emerald-500"
                            />
                            <input 
                                type="text" 
                                placeholder="Owner Name (Optional)" 
                                value={ownerName} 
                                onChange={e => setOwnerName(e.target.value)}
                                className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded flex-1 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <button
                            onClick={generateCode}
                            disabled={generating}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg shadow transition disabled:opacity-50"
                        >
                            <Plus size={20} />
                            {generating ? 'Generating...' : 'Generate New Invitation Code'}
                        </button>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
                    <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-white">Registered Users</h2>
                        <button onClick={fetchUsers} className="p-2 hover:bg-gray-700 rounded-full transition text-gray-400">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900/50 text-gray-400 text-sm uppercase">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Invitation Code</th>
                                    <th className="px-6 py-4 font-medium">Owner Name</th>
                                    <th className="px-6 py-4 font-medium">Created At</th>
                                    <th className="px-6 py-4 font-medium">Connected Accounts</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            No users found. Generate a code to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.code} className="hover:bg-gray-750 transition">
                                            <td className="px-6 py-4 font-mono text-lg text-emerald-400 tracking-wider">
                                                {user.code}
                                            </td>
                                            <td className="px-6 py-4 text-gray-300">
                                                {editingCode === user.code ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={editName}
                                                            onChange={e => setEditName(e.target.value)}
                                                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500 w-full"
                                                        />
                                                    </div>
                                                ) : (
                                                    user.owner_name || '-'
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-300">
                                                {new Date(user.created_at).toLocaleDateString()} {new Date(user.created_at).toLocaleTimeString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.serviceCount > 0 ? 'bg-blue-900/50 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
                                                    {user.serviceCount} Services
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs border ${
                                                    !user.status || user.status === 'active' 
                                                        ? 'bg-green-900/30 text-green-400 border-green-900/50' 
                                                        : 'bg-red-900/30 text-red-400 border-red-900/50'
                                                }`}>
                                                    {user.status || 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                {editingCode === user.code ? (
                                                    <>
                                                        <button
                                                            onClick={saveEditing}
                                                            className="text-emerald-400 hover:text-emerald-300 p-2 hover:bg-emerald-900/20 rounded transition"
                                                            title="Save"
                                                        >
                                                            <Save size={18} />
                                                        </button>
                                                        <button
                                                            onClick={cancelEditing}
                                                            className="text-gray-400 hover:text-gray-300 p-2 hover:bg-gray-700/50 rounded transition"
                                                            title="Cancel"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => startEditing(user)}
                                                            className="text-blue-400 hover:text-blue-300 p-2 hover:bg-blue-900/20 rounded transition"
                                                            title="Edit Name"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteCode(user.code)}
                                                            className="text-red-400 hover:text-red-300 p-2 hover:bg-red-900/20 rounded transition"
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
