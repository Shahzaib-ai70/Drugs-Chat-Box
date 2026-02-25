import { useState, useRef, useEffect } from 'react';
import { 
  User, 
  Minus,
  Square,
  X,
  Wifi, 
  Bot, 
  Sun, 
  Moon,
  Image as ImageIcon, 
  Settings, 
  Bell,
  Globe,
  LogOut,
  MessageSquare,
  ChevronRight,
  Check,
  WifiOff
} from 'lucide-react';
import { useLanguage, LANGUAGES } from '../translations';

interface TopBarProps {
  onLogout?: () => void;
  invitationCode?: string | null;
}

const TopBar = ({ onLogout, invitationCode }: TopBarProps) => {
  const { language, setLanguage, t, theme, setTheme } = useLanguage();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isServerConnected, setIsServerConnected] = useState(true);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
        setIsLangOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Server Status Polling
  useEffect(() => {
    const checkServer = async () => {
        try {
            const res = await fetch('/api/health'); // Assuming this endpoint exists or will return 404 but server is up
            if (res.ok || res.status === 404) {
                setIsServerConnected(true);
            } else {
                setIsServerConnected(false);
            }
        } catch (e) {
            setIsServerConnected(false);
        }
    };
    
    // Initial check
    checkServer();
    
    // Poll every 30 seconds
    const interval = setInterval(checkServer, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-14 bg-white dark:bg-gray-900 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800 shadow-sm select-none z-40 transition-colors">
      {/* Logo Area */}
      <div className="flex items-center gap-3 w-auto min-w-[180px]">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-200">
          <MessageSquare size={18} className="text-white" />
        </div>
        <span className="font-bold text-gray-800 dark:text-gray-100 text-lg tracking-tight">Drugs Chat Box</span>
      </div>

      {/* Center Actions */}
      <div className="flex items-center gap-1 bg-gray-50/80 dark:bg-gray-800/80 p-1.5 rounded-full border border-gray-100 dark:border-gray-700">
        <ActionButton 
            icon={isServerConnected ? <Wifi size={14} /> : <WifiOff size={14} />} 
            label={t.server} 
            active={isServerConnected}
            className={!isServerConnected ? 'text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20' : ''}
        />
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
        
        {invitationCode && (
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
              <User size={14} />
              <span>{t.code}: {invitationCode}</span>
           </div>
        )}

        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
        <ActionButton icon={<Bot size={14} />} label={t.ai} />
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
        <ActionButton icon={<ImageIcon size={14} />} label={t.image} />
        <ActionButton icon={<User size={14} />} label={t.profile} />
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
        
        {/* Settings Dropdown */}
        <div className="relative" ref={settingsRef}>
            <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isSettingsOpen
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-100 dark:border-gray-600' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
            >
                <Settings size={14} />
                <span>{t.settings}</span>
            </button>

            {isSettingsOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    
                    {/* Theme Toggle */}
                    <button 
                        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                        className="w-full px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">
                            {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                            <span className="text-sm font-medium">{theme === 'light' ? t.lightMode : t.darkMode}</span>
                        </div>
                    </button>

                    {/* Language Selector */}
                    <div className="relative">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsLangOpen(!isLangOpen);
                            }}
                            className="w-full px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">
                                <Globe size={16} />
                                <span className="text-sm font-medium">{t.language}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">{LANGUAGES.find(l => l.code === language)?.name}</span>
                                <ChevronRight size={14} className="text-gray-400" />
                            </div>
                        </button>

                        {/* Language Submenu */}
                        {isLangOpen && (
                            <div className="absolute right-full top-0 mr-2 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 overflow-hidden">
                                {LANGUAGES.map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => {
                                            setLanguage(lang.code);
                                            setIsLangOpen(false);
                                        }}
                                        className="w-full px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between text-left"
                                    >
                                        <span className={`text-sm ${language === lang.code ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                            {lang.name}
                                        </span>
                                        {language === lang.code && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-2"></div>

                    {/* Logout */}
                    {onLogout && (
                        <button 
                            onClick={onLogout}
                            className="w-full px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 text-red-600 dark:text-red-400 transition-colors"
                        >
                            <LogOut size={16} />
                            <span className="text-sm font-medium">{t.logout}</span>
                        </button>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* Window Controls */}
      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 transition-colors">
            <Bell size={18} />
        </button>
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
        <div className="flex items-center gap-1">
          <div className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full cursor-pointer text-gray-500 dark:text-gray-400 transition-colors">
            <Minus size={18} />
          </div>
          <div className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full cursor-pointer text-gray-500 dark:text-gray-400 transition-colors">
            <Square size={14} />
          </div>
          <div className="w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white rounded-full cursor-pointer text-gray-500 dark:text-gray-400 transition-colors">
            <X size={18} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ActionButton = ({ icon, label, active = false, className = '' }: { icon: React.ReactNode, label: string, active?: boolean, className?: string }) => (
    <button className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        active 
            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-100 dark:border-gray-600' 
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
    } ${className}`}>
        {icon}
        <span>{label}</span>
    </button>
);

export default TopBar;
