import { useState, useEffect, useRef } from 'react';
import { ChevronsLeft, Plus, RotateCw, ExternalLink, Trash2, RefreshCcw } from 'lucide-react';
import type { ServiceItem } from '../types';
import { io } from 'socket.io-client';

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
  onRefreshService
}: { 
  onAddNewClick: () => void, 
  addedServices?: AddedService[],
  activeServiceId?: string | null,
  onServiceClick?: (id: string) => void,
  onDeleteService?: (id: string) => void,
  onRefreshService?: (id: string) => void
}) => {
  const [activeTab, setActiveTab] = useState('Normal');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, id: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Unread Count Logic
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const socketRef = useRef<any>(null);

  // FIXME: Socket connection in Sidebar interferes with MainContent socket. 
  // Temporarily disabled unread counts to restore messaging.
  // Will need to lift socket state to App.tsx to support both.
  /*
  useEffect(() => {
    // Connect to Master Gateway
    const socket = io(); // Connects to current host/port, proxied to 3005 in dev or direct in prod
    socketRef.current = socket;
    
    socket.on('connect', () => {
        console.log('SidebarLeft: Socket connected', socket.id);
    });

    socket.on('unread_total', (data: { serviceId: string, count: number }) => {
        console.log('SidebarLeft: Received unread_total', data);
        setUnreadCounts(prev => {
            const newState = {
                ...prev,
                [data.serviceId]: data.count
            };
            console.log('SidebarLeft: Updated unreadCounts', newState);
            return newState;
        });
    });

    return () => {
        socket.disconnect();
    };
  }, []);

  // Join service rooms to receive notifications
  useEffect(() => {
      const joinRooms = () => {
        if (socketRef.current && addedServices.length > 0) {
            addedServices.forEach(s => {
                socketRef.current.emit('join_service', s.id);
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
  */

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
    <div className="w-[280px] bg-white border-r border-gray-100 flex flex-col h-full font-sans relative">
      {/* Tabs */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex bg-gray-100/50 p-1 rounded-lg">
          <button
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'Normal'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('Normal')}
          >
            All Chats
          </button>
          <button
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'Pinned'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('Pinned')}
          >
            Pinned
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
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all select-none ${
                isActive 
                  ? 'bg-gray-100' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onServiceClick?.(item.id)}
              onContextMenu={(e) => handleContextMenu(e, item.id)}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform ${isActive ? 'scale-105' : ''}`}
                  style={{ 
                    backgroundColor: isActive ? 'white' : '#f3f4f6',
                    color: item.service.color,
                    boxShadow: isActive ? '0 2px 5px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  {item.service.icon}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={`text-sm truncate ${isActive ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {item.customName}
                  </span>
                  <span className="text-[10px] text-gray-400 truncate">
                    {item.service.name}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Badge */}
                {unreadCounts[item.id] > 0 && (
                  <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm animate-in zoom-in-50">
                      {unreadCounts[item.id]}
                  </div>
                )}
                
                {isActive && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      className="p-1.5 hover:bg-white rounded-md text-gray-400 hover:text-gray-600 transition-colors" 
                      title="Refresh"
                      onClick={(e) => {
                          e.stopPropagation();
                          onRefreshService?.(item.id);
                      }}
                    >
                      <RotateCw size={14} />
                    </button>
                    <button className="p-1.5 hover:bg-white rounded-md text-gray-400 hover:text-gray-600 transition-colors" title="Open External">
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
      <div className="p-4 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
        <button 
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
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
            className="fixed z-50 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={{ left: contextMenu.x, top: contextMenu.y }}
        >
            <button 
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                onClick={() => {
                    onRefreshService?.(contextMenu.id);
                    setContextMenu(null);
                }}
            >
                <RefreshCcw size={14} className="text-gray-500" />
                Refresh
            </button>
            <div className="h-px bg-gray-100 my-1"></div>
            <button 
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
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
