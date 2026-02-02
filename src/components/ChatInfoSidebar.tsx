import React, { useState, useEffect } from 'react';
import { X, Edit2, Save } from 'lucide-react';

interface ChatInfoSidebarProps {
    chat: any;
    messages: any[];
    fetchedMedia?: any[];
    onClose: () => void;
    onUpdateContactName: (chatId: string, newName: string) => void;
    isWhatsApp: boolean;
}

const ChatInfoSidebar = ({ chat, messages, fetchedMedia = [], onClose, onUpdateContactName, isWhatsApp }: ChatInfoSidebarProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(chat?.name || '');

    useEffect(() => {
        setEditedName(chat?.name || '');
    }, [chat]);

    if (!chat) return null;

    const handleSave = () => {
        onUpdateContactName(chat.id, editedName);
        setIsEditing(false);
    };

    // Combine loaded messages with fetched media history
    // Prioritize fetched media as it has more history
    // De-duplicate based on ID
    const allMedia = React.useMemo(() => {
        const loadedMedia = messages.filter(m => 
            (m.hasMedia || m.type === 'image' || m.type === 'video' || m.type === 'photo') && m.media
        ).map(m => ({
            id: m.id,
            mimetype: m.media.mimetype,
            data: m.media.data,
            timestamp: m.timestamp
        }));

        // Merge fetched media (which is already formatted)
        const combined = [...loadedMedia, ...fetchedMedia];
        
        // Dedup by ID
        const seen = new Set();
        return combined.filter(m => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
        }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }, [messages, fetchedMedia]);

    // Helper to get display ID (Phone or Username)
    const getDisplayId = () => {
        if (isWhatsApp) {
            return chat.phoneNumber || chat.id.split('@')[0];
        } else {
            return chat.username ? `@${chat.username}` : chat.id;
        }
    };

    return (
        <div className="w-[320px] bg-white border-l border-gray-200 flex flex-col h-full z-20 shadow-xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-gray-50/50 backdrop-blur-sm">
                <span className="font-bold text-gray-800">Contact Info</span>
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700">
                    <X size={20} />
                </button>
            </div>

            {/* Profile Info */}
            <div className="flex flex-col items-center p-8 border-b border-gray-100 bg-white">
                <div className="w-28 h-28 rounded-full bg-gray-100 overflow-hidden ring-4 ring-gray-50 mb-6 shadow-md group relative">
                    <img 
                        src={chat.profilePicUrl || "https://upload.wikimedia.org/wikipedia/commons/9/93/Google_Contacts_icon.svg"} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://upload.wikimedia.org/wikipedia/commons/9/93/Google_Contacts_icon.svg"; }}
                    />
                </div>
                
                {/* Name Edit */}
                <div className="flex items-center gap-2 mb-2 w-full justify-center min-h-[32px]">
                    {isEditing ? (
                        <div className="flex items-center gap-1 w-full max-w-[200px]">
                            <input 
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                className="flex-1 text-center border-b-2 border-blue-500 focus:outline-none text-xl font-bold text-gray-900 bg-transparent pb-1"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            />
                            <button onClick={handleSave} className="text-blue-600 p-1.5 hover:bg-blue-50 rounded-full transition-colors"><Save size={18} /></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group">
                            <h2 className="text-xl font-bold text-gray-900 text-center">{chat.name}</h2>
                            <button onClick={() => { setEditedName(chat.name); setIsEditing(true); }} className="text-gray-300 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100">
                                <Edit2 size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Number/Username */}
                <p className="text-gray-500 text-sm font-medium bg-gray-100 px-3 py-1 rounded-full">
                    {getDisplayId()}
                </p>
            </div>

            {/* Media Gallery */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/30">
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Media</h3>
                    <span className="text-xs font-bold text-gray-300 bg-gray-100 px-2 py-0.5 rounded-full">{allMedia.length}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                    {allMedia.map((media, i) => {
                         const mediaSrc = media.data.startsWith('data:') ? media.data : `data:${media.mimetype};base64,${media.data}`;
                         const isVideo = media.mimetype?.startsWith('video');
                         
                         return (
                            <div key={media.id || i} className="aspect-square bg-gray-200 rounded-lg overflow-hidden relative group cursor-pointer border border-gray-200 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
                                {isVideo ? (
                                    <video src={mediaSrc} className="w-full h-full object-cover" />
                                ) : (
                                    <img src={mediaSrc} className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                            </div>
                         );
                    })}
                    {allMedia.length === 0 && (
                        <div className="col-span-3 flex flex-col items-center justify-center py-12 text-gray-400">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                                <span className="text-2xl opacity-50">🖼️</span>
                            </div>
                            <span className="text-sm font-medium">No shared media</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatInfoSidebar;
