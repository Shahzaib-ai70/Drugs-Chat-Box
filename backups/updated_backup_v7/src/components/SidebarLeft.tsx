import { useState, useEffect, useRef } from 'react';
import { ChevronsLeft, Plus, RotateCw, ExternalLink, Trash2, RefreshCcw, Edit2, Check, X } from 'lucide-react';
import type { ServiceItem } from '../types';
import { io } from 'socket.io-client';
import { useLanguage } from '../translations';

interface AddedService {
  id: string;
  service: ServiceItem;
  customName: string;
}

const SidebarLeft = ({ 
  onAddNewClick, 
  addedServices = [], 
  activeServiceId, 
  onServiceClick,
  onDeleteService,
  onRefreshService,
  onUpdateName
}: { 
  onAddNewClick: () => void, 
  addedServices?: AddedService[],
  activeServiceId?: string | null,
  onServiceClick?: (id: string) => void,
  onDeleteService?: (id: string) => void,
  onRefreshService?: (id: string) => void,
  onUpdateName?: (id: string, name: string) => void
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('Normal');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, id: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  const startEditing = (e: React.MouseEvent, id: string, currentName: string) => {
    e.stopPropagation();
    setEditingId(id);
    setTempName(currentName);
  };

  const saveName = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tempName.trim()) {
        onUpdateName?.(id, tempName.trim());
    }
    setEditingId(null);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };
  
  // Unread Count Logic
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [serviceProfilePics, setServiceProfilePics] = useState<Record<string, string>>({});
  const socketRef = useRef<any>(null);

  useEffect(() => {
    // Connect to Master Gateway
    const socket = io(); // Connects to current host/port
    socketRef.current = socket;
    
    socket.on('connect', () => {
        console.log('SidebarLeft: Socket connected (Passive Mode)', socket.id);
    });

    socket.on('unread_total', (data: { serviceId: string, count: number }) => {
        console.log('SidebarLeft: Received unread_total', data);
        setUnreadCounts(prev => {
            const newState = {
                ...prev,
                [data.serviceId]: data.count
            };
            return newState;
        });
    });

    socket.on('wa_user_info', (data: { id: string, name: string, profilePicUrl?: string, serviceId?: string }) => {
        if (data.serviceId && data.profilePicUrl) {
            setServiceProfilePics(prev => ({
                ...prev,
                [data.serviceId!]: data.profilePicUrl!
            }));
        }
    });

    return () => {
        socket.disconnect();
    };
  }, []);

  // Join service rooms PASSIVELY to receive notifications without resetting worker state
  useEffect(() => {
      const joinRooms = () => {
        if (socketRef.current && addedServices.length > 0) {
            addedServices.forEach(s => {
                // Use passive: true to avoid triggering 'request_state' which breaks MainContent
                socketRef.current.emit('join_service', { serviceId: s.id, passive: true });
            });
        }
      };

      if (socketRef.current) {
          joinRooms();
          socketRef.current.on('connect', joinRooms);
      }

      return () => {
          if (socketRef.current) {
              socketRef.current.off('connect', joinRooms);
          }
      };
  }, [addedServices]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, id });
  };

  return (
    <div className="w-[280px] glass-panel flex flex-col h-full font-sans relative border-r-0">
      {/* Tabs */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex bg-black/30 p-1 rounded-lg border border-white/5">
          <button
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'Normal'
                ? 'bg-neon-blue/20 text-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.2)] border border-neon-blue/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            onClick={() => setActiveTab('Normal')}
          >
            {t.allChats}
          </button>
          <button
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'Pinned'
                ? 'bg-neon-blue/20 text-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.2)] border border-neon-blue/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            onClick={() => setActiveTab('Pinned')}
          >
            {t.pinned}
          </button>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {addedServices.map((item) => {
          const isActive = item.id === activeServiceId;
          return (
            <div 
              key={item.id}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all select-none border border-transparent ${
                isActive 
                  ? 'bg-white/10 border-neon-blue/30 shadow-[0_0_15px_rgba(0,243,255,0.1)]' 
                  : 'hover:bg-white/5 hover:border-white/5'
              }`}
              onClick={() => onServiceClick?.(item.id)}
              onContextMenu={(e) => handleContextMenu(e, item.id)}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div 
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${isActive ? 'scale-105' : ''} overflow-hidden relative`}
                  style={{ 
                    backgroundColor: isActive ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)',
                    color: item.service.color,
                    boxShadow: isActive ? '0 0 10px ' + item.service.color : 'none',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  {serviceProfilePics[item.id] ? (
                      <img src={serviceProfilePics[item.id]} alt="" className="w-full h-full object-cover" />
                  ) : (
                      item.service.icon
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  {editingId === item.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <input 
                              type="text" 
                              value={tempName} 
                              onChange={e => setTempName(e.target.value)}
                              className="w-full bg-black/50 text-white text-xs px-1 py-0.5 rounded border border-neon-blue/50 focus:outline-none"
                              autoFocus
                              onClick={e => e.stopPropagation()}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveName(e as any, item.id);
                                if (e.key === 'Escape') cancelEditing(e as any);
                              }}
                          />
                          <button onClick={(e) => saveName(e, item.id)} className="text-green-400 hover:text-green-300 p-0.5"><Check size={12} /></button>
                          <button onClick={cancelEditing} className="text-red-400 hover:text-red-300 p-0.5"><X size={12} /></button>
                      </div>
                  ) : (
                      <>
                          <div className="flex items-center justify-between group/name pr-1">
                              <span className={`text-sm truncate ${isActive ? 'font-bold text-white tracking-wide' : 'font-medium text-gray-400 group-hover:text-gray-200'}`}>
                                {item.customName}
                              </span>
                              <button 
                                  className={`opacity-0 group-hover/name:opacity-100 text-gray-500 hover:text-neon-blue transition-opacity p-0.5 ml-1`}
                                  onClick={(e) => startEditing(e, item.id, item.customName)}
                                  title="Edit Name"
                              >
                                  <Edit2 size={10} />
                              </button>
                          </div>
                          <span className="text-[10px] text-gray-500 truncate group-hover:text-gray-400 font-mono tracking-tight opacity-80">
                            {item.accountIdentifier || item.service.name}
                          </span>
                      </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Badge */}
                {unreadCounts[item.id] > 0 && (
                  <div className="bg-neon-purple text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-[0_0_10px_rgba(188,19,254,0.6)] animate-pulse">
                      {unreadCounts[item.id]}
                  </div>
                )}
                
                {isActive && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors" 
                      title={t.refresh}
                      onClick={(e) => {
                          e.stopPropagation();
                          onRefreshService?.(item.id);
                      }}
                    >
                      <RotateCw size={14} />
                    </button>
                    <button className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors" title={t.openExternal}>
                      <ExternalLink size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-sm">
        <button 
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-neon-purple/50 active:scale-[0.98] border border-white/10"
          onClick={onAddNewClick}
        >
          <Plus size={16} />
          <span>Add Service</span>
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
            ref={menuRef}
            className="fixed z-50 w-48 bg-[#1a1a24] rounded-xl shadow-2xl border border-white/10 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 backdrop-blur-xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
        >
            <button 
                className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2 transition-colors hover:text-white"
                onClick={() => {
                    onRefreshService?.(contextMenu.id);
                    setContextMenu(null);
                }}
            >
                <RefreshCcw size={14} className="text-gray-400" />
                Refresh
            </button>
            <div className="h-px bg-white/10 my-1"></div>
            <button 
                className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                onClick={() => {
                    onDeleteService?.(contextMenu.id);
                    setContextMenu(null);
                }}
            >
                <Trash2 size={14} />
                Delete Account
            </button>
        </div>
      )}
    </div>
  );
};

export default SidebarLeft;
