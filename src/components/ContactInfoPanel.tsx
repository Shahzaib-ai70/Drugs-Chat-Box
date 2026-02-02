import React, { useState, useMemo } from 'react';
import { X, Image as ImageIcon, FileText, Link as LinkIcon, Phone, Video, Ban, ThumbsDown, ChevronRight } from 'lucide-react';
import { AddedService } from '../types';

interface ContactInfoPanelProps {
  chat: {
    id: string;
    name: string;
    isGroup: boolean;
    profilePicUrl?: string;
    lastSeen?: string;
  } | null;
  messages: Array<{
    id: string;
    fromMe: boolean;
    body: string;
    timestamp: number;
    hasMedia?: boolean;
    type?: string;
    media?: { mimetype: string; data: string; filename?: string };
  }>;
  onClose: () => void;
  activeService?: AddedService;
}

const ContactInfoPanel: React.FC<ContactInfoPanelProps> = ({ chat, messages, onClose, activeService }) => {
  const [activeTab, setActiveTab] = useState<'media' | 'docs' | 'links'>('media');

  const mediaMessages = useMemo(() => {
    return messages.filter(m => m.hasMedia || m.type === 'image' || m.type === 'video' || m.type === 'audio');
  }, [messages]);

  const docMessages = useMemo(() => {
    return messages.filter(m => m.type === 'document' || (m.hasMedia && m.media?.mimetype?.includes('application')));
  }, [messages]);

  const linkMessages = useMemo(() => {
    // Simple regex for links
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    return messages.filter(m => m.body && m.body.match(linkRegex));
  }, [messages]);

  if (!chat) return null;

  const normalizeId = (id: string) => id.split('@')[0];

  return (
    <div className="w-96 h-full border-l border-white/10 bg-[#0f0f13] flex flex-col animate-in slide-in-from-right duration-300 z-20 shadow-[-5px_0_30px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="h-16 flex items-center px-4 border-b border-white/10 bg-[#1a1a2e]/50 backdrop-blur-md shrink-0">
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors mr-2"
        >
          <X size={20} className="text-gray-400" />
        </button>
        <h2 className="text-white font-medium">Contact Info</h2>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {/* Profile Section */}
        <div className="flex flex-col items-center py-8 px-4 border-b border-white/5 bg-gradient-to-b from-[#1a1a2e]/30 to-transparent">
          <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-white/5 shadow-2xl mb-4 relative group">
            <img 
              src={chat.profilePicUrl || "https://upload.wikimedia.org/wikipedia/commons/9/93/Google_Contacts_icon.svg"} 
              alt={chat.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://upload.wikimedia.org/wikipedia/commons/9/93/Google_Contacts_icon.svg";
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 text-center">{chat.name}</h1>
          <p className="text-gray-400 font-mono text-sm mb-4">{normalizeId(chat.id)}</p>
          
          {/* Action Buttons (Visual Only) */}
          <div className="flex gap-4 w-full justify-center">
            <button className="flex flex-col items-center gap-2 p-3 hover:bg-white/5 rounded-xl transition-all w-20 group">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <Phone size={20} className="text-emerald-500" />
              </div>
              <span className="text-xs text-emerald-500 font-medium">Audio</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-3 hover:bg-white/5 rounded-xl transition-all w-20 group">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <Video size={20} className="text-emerald-500" />
              </div>
              <span className="text-xs text-emerald-500 font-medium">Video</span>
            </button>
          </div>
        </div>

        {/* About Section (Placeholder) */}
        <div className="p-4 border-b border-white/5">
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">About</h3>
          <p className="text-white text-sm leading-relaxed">
            {chat.isGroup ? `Group · ${chat.id}` : 'Available'}
          </p>
        </div>

        {/* Media, Links, and Docs */}
        <div className="flex-1 bg-[#0a0a0f]/30">
          <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setActiveTab('media')}>
            <h3 className="text-gray-400 text-sm font-medium">Media, Links, and Docs</h3>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-xs">{mediaMessages.length + docMessages.length + linkMessages.length}</span>
              <ChevronRight size={16} />
            </div>
          </div>

          {/* Media Preview Strip */}
          {mediaMessages.length > 0 && (
            <div className="px-4 pb-4">
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x">
                {mediaMessages.slice(0, 6).map((msg, idx) => (
                  <div key={msg.id} className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-white/5 border border-white/10 snap-start">
                    {msg.media && msg.media.data ? (
                      msg.type === 'video' ? (
                        <video src={`data:${msg.media.mimetype};base64,${msg.media.data}`} className="w-full h-full object-cover" />
                      ) : (
                        <img src={`data:${msg.media.mimetype};base64,${msg.media.data}`} className="w-full h-full object-cover" alt="Media" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <ImageIcon size={24} />
                      </div>
                    )}
                  </div>
                ))}
                {mediaMessages.length > 6 && (
                   <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                     <span className="text-gray-400 text-sm font-medium">+{mediaMessages.length - 6}</span>
                   </div>
                )}
              </div>
            </div>
          )}
          
          {/* Additional Options */}
          <div className="mt-2">
            <button className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left group">
                <div className="w-5 h-5 flex items-center justify-center">
                    <Ban size={18} className="text-red-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1">
                    <span className="text-red-400 text-sm font-medium">Block {chat.name}</span>
                </div>
            </button>
            <button className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left group">
                <div className="w-5 h-5 flex items-center justify-center">
                    <ThumbsDown size={18} className="text-red-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1">
                    <span className="text-red-400 text-sm font-medium">Report {chat.name}</span>
                </div>
            </button>
             <button className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left group">
                <div className="w-5 h-5 flex items-center justify-center">
                    <Trash2 size={18} className="text-red-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1">
                    <span className="text-red-400 text-sm font-medium">Delete Chat</span>
                </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import { Trash2 } from 'lucide-react';

export default ContactInfoPanel;
