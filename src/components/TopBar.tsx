import { 
  User, 
  Minus,
  Square,
  X,
  Wifi, 
  Lock, 
  Bot, 
  Sun, 
  Image as ImageIcon, 
  Phone, 
  Settings, 
  Bell,
  Globe,
  LogOut,
  MessageSquare
} from 'lucide-react';

interface TopBarProps {
  onLogout?: () => void;
  invitationCode?: string | null;
}

const TopBar = ({ onLogout, invitationCode }: TopBarProps) => {
  return (
    <div className="h-14 bg-white flex items-center justify-between px-4 border-b border-gray-100 shadow-sm select-none z-40">
      {/* Logo Area */}
      <div className="flex items-center gap-3 w-auto min-w-[180px]">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-200">
          <MessageSquare size={18} className="text-white" />
        </div>
        <span className="font-bold text-gray-800 text-lg tracking-tight">Drugs Chat Box</span>
      </div>

      {/* Center Actions */}
      <div className="flex items-center gap-1 bg-gray-50/80 p-1.5 rounded-full border border-gray-100">
        <ActionButton icon={<Wifi size={14} />} label="Server" active />
        <div className="w-px h-4 bg-gray-200 mx-1"></div>
        
        {invitationCode && (
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
              <User size={14} />
              <span>Code: {invitationCode}</span>
           </div>
        )}

        {onLogout && (
            <button onClick={onLogout} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all text-gray-500 hover:text-red-600 hover:bg-red-50">
                <LogOut size={14} />
                <span>Logout</span>
            </button>
        )}
        {!onLogout && <ActionButton icon={<Lock size={14} />} label="Lock" />}
        <div className="w-px h-4 bg-gray-200 mx-1"></div>
        <ActionButton icon={<Bot size={14} />} label="AI" />
        <ActionButton icon={<Sun size={14} />} label="Light" />
        <div className="w-px h-4 bg-gray-200 mx-1"></div>
        <ActionButton icon={<ImageIcon size={14} />} label="Image" />
        <ActionButton icon={<User size={14} />} label="Profile" />
        <div className="w-px h-4 bg-gray-200 mx-1"></div>
        <ActionButton icon={<Settings size={14} />} label="Settings" />
      </div>

      {/* Window Controls */}
      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <Bell size={18} />
        </button>
        <div className="h-6 w-px bg-gray-200"></div>
        <div className="flex items-center gap-1">
          <div className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full cursor-pointer text-gray-500 transition-colors">
            <Minus size={18} />
          </div>
          <div className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full cursor-pointer text-gray-500 transition-colors">
            <Square size={14} />
          </div>
          <div className="w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white rounded-full cursor-pointer text-gray-500 transition-colors">
            <X size={18} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ActionButton = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) => (
    <button className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        active 
            ? 'bg-white text-blue-600 shadow-sm border border-gray-100' 
            : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
    }`}>
        {icon}
        <span>{label}</span>
    </button>
);

export default TopBar;
