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
  WifiOff,
  Menu
} from 'lucide-react';
import { useLanguage, LANGUAGES } from '../translations';

interface TopBarProps {
  onLogout?: () => void;
  invitationCode?: string | null;
  onMenuClick?: () => void;
  onToggleTranslation?: () => void;
  isTranslationOpen?: boolean;
}

const TopBar = ({ onLogout, invitationCode, onMenuClick, onToggleTranslation, isTranslationOpen }: TopBarProps) => {
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
    <div className="h-14 bg-[#0f0c29]/90 backdrop-blur-md flex items-center justify-between px-4 border-b border-white/10 shadow-lg select-none z-40 transition-colors relative">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-blue to-transparent opacity-50"></div>
      
      {/* Logo Area */}
      <div className="flex items-center gap-3 w-auto relative z-10 shrink-0">
        <button 
            className="md:hidden p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg -ml-2 mr-1 transition-colors"
            onClick={onMenuClick}
        >
            <Menu size={24} />
        </button>
        <div className="w-9 h-9 bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-[0_0_15px_rgba(0,243,255,0.3)] border border-white/10 ring-1 ring-white/5 group cursor-pointer hover:scale-105 transition-transform duration-300">
          <MessageSquare size={18} className="text-neon-blue drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]" />
        </div>
        <span className="font-bold text-white text-lg tracking-wide drop-shadow-[0_0_10px_rgba(0,243,255,0.3)] hidden sm:block">
            Drugs <span className="text-neon-blue">Chat Box</span>
        </span>
      </div>

      {/* Center Actions */}
      <div className="flex items-center gap-2 shrink-0 max-w-[70vw] md:max-w-none">
          {/* Status & Info Pill */}
          <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-full border border-white/10 shadow-inner backdrop-blur-sm overflow-x-auto no-scrollbar">
            <ActionButton 
                icon={isServerConnected ? <Wifi size={14} className="text-neon-blue drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]" /> : <WifiOff size={14} className="text-red-500" />} 
                label={t.server} 
                active={isServerConnected}
                className={!isServerConnected ? 'text-red-500 hover:text-red-400 bg-red-900/20 border-red-500/30' : ''}
                hideLabelOnMobile
            />
            <div className="w-px h-4 bg-white/10 mx-1"></div>
            
            {invitationCode && (
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-neon-blue/10 text-neon-blue border border-neon-blue/30 shadow-[0_0_10px_rgba(0,243,255,0.1)] shrink-0">
                  <User size={14} />
                  <span className="tracking-wider hidden sm:inline">{t.code}:</span>
                  <span className="tracking-wider">{invitationCode}</span>
               </div>
            )}

            <div className="w-px h-4 bg-white/10 mx-1"></div>

            {/* Mobile Translation Toggle */}
            <button 
                onClick={onToggleTranslation}
                className={`md:hidden flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                    isTranslationOpen
                        ? 'bg-neon-blue/20 text-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.2)] border border-neon-blue/30' 
                        : 'text-gray-400 hover:text-white hover:bg-white/10 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] border border-transparent'
                }`}
            >
                <Globe size={14} />
                <span className="hidden sm:inline">{t.language}</span>
            </button>
          </div>
        
          {/* Settings Pill - Fixed & No Overflow Clipping */}
          <div className="relative bg-black/40 p-1.5 rounded-full border border-white/10 shadow-inner backdrop-blur-sm shrink-0 z-50" ref={settingsRef}>
            <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                    isSettingsOpen
                        ? 'bg-neon-blue/20 text-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.2)] border border-neon-blue/30' 
                        : 'text-gray-400 hover:text-white hover:bg-white/10 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] border border-transparent'
                }`}
            >
                <Settings size={14} />
                <span className="uppercase tracking-wider hidden sm:inline">{t.settings}</span>
            </button>

            {isSettingsOpen && (
                <div className="absolute right-0 top-full mt-3 w-64 bg-[#1a1a2e]/95 backdrop-blur-xl rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/10 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-purple via-neon-blue to-neon-purple opacity-50 rounded-t-2xl"></div>
                    
                    {/* Theme Toggle */}
                    <button 
                        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                        className="w-full px-5 py-3 hover:bg-white/5 flex items-center justify-between group transition-colors"
                    >
                        <div className="flex items-center gap-3 text-gray-300 group-hover:text-white transition-colors">
                            {theme === 'light' ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-neon-blue" />}
                            <span className="text-sm font-medium tracking-wide">{theme === 'light' ? t.lightMode : t.darkMode}</span>
                        </div>
                    </button>

                    {/* Language Selector */}
                    <div className="relative">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsLangOpen(!isLangOpen);
                            }}
                            className="w-full px-5 py-3 hover:bg-white/5 flex items-center justify-between group transition-colors"
                        >
                            <div className="flex items-center gap-3 text-gray-300 group-hover:text-white transition-colors">
                                <Globe size={18} className="text-neon-purple" />
                                <span className="text-sm font-medium tracking-wide">{t.language}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 font-mono">{LANGUAGES.find(l => l.code === language)?.name}</span>
                                <ChevronRight size={14} className="text-gray-500 group-hover:text-white transition-colors" />
                            </div>
                        </button>

                        {/* Language Submenu */}
                        {isLangOpen && (
                            <div className="max-md:relative max-md:w-full max-md:mt-2 max-md:border-t max-md:border-white/10 md:absolute md:right-full md:top-0 md:mr-2 md:w-48 bg-[#1a1a2e]/95 backdrop-blur-xl rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/10 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 md:slide-in-from-right-2 duration-200">
                                {LANGUAGES.map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => {
                                            setLanguage(lang.code);
                                            setIsLangOpen(false);
                                        }}
                                        className="w-full px-4 py-2 hover:bg-white/10 flex items-center justify-between text-left group"
                                    >
                                        <span className={`text-sm tracking-wide ${language === lang.code ? 'font-bold text-neon-blue drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]' : 'text-gray-300 group-hover:text-white'}`}>
                                            {lang.name}
                                        </span>
                                        {language === lang.code && <Check size={14} className="text-neon-blue drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-white/10 my-1 mx-4"></div>

                    {/* Logout */}
                    {onLogout && (
                        <button 
                            onClick={onLogout}
                            className="w-full px-5 py-3 hover:bg-red-500/10 flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors group"
                        >
                            <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium tracking-wide">{t.logout}</span>
                        </button>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* Window Controls */}
      <div className="hidden md:flex items-center gap-3">
        <button className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors hover:shadow-[0_0_10px_rgba(255,255,255,0.1)]">
            <Bell size={18} />
        </button>
        <div className="h-6 w-px bg-white/10"></div>
        <div className="flex items-center gap-1">
          <div className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full cursor-pointer text-gray-400 hover:text-white transition-colors">
            <Minus size={18} />
          </div>
          <div className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full cursor-pointer text-gray-400 hover:text-white transition-colors">
            <Square size={14} />
          </div>
          <div className="w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white rounded-full cursor-pointer text-gray-400 hover:text-white transition-colors hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            <X size={18} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ActionButton = ({ icon, label, active = false, className = '', hideLabelOnMobile = false }: { icon: React.ReactNode, label: string, active?: boolean, className?: string, hideLabelOnMobile?: boolean }) => (
    <button className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
        active 
            ? 'bg-neon-blue/20 text-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.2)] border border-neon-blue/30' 
            : 'text-gray-400 hover:text-white hover:bg-white/10 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] border border-transparent'
    } ${className}`}>
        <span className="group-hover:scale-110 transition-transform duration-300">{icon}</span>
        <span className={`uppercase tracking-wider ${hideLabelOnMobile ? 'hidden sm:inline' : ''}`}>{label}</span>
    </button>
);

export default TopBar;
