import { 
  MessageSquareQuote, 
  Globe, 
  Bookmark, 
  Type, 
  Server 
} from 'lucide-react';

interface SidebarRightProps {
  onLangClick?: () => void;
  isLangActive?: boolean;
}

const SidebarRight = ({ onLangClick, isLangActive }: SidebarRightProps) => {
  return (
    <div className="w-16 glass-panel border-l border-white/5 flex flex-col items-center py-4 gap-4 shrink-0 z-30 shadow-2xl">
      <SideTool icon={<MessageSquareQuote size={20} />} label="Reply" active={false} />
      
      <SideTool 
        icon={<Globe size={20} />} 
        label="Lang" 
        active={isLangActive} 
        onClick={onLangClick}
      />
      
      <SideTool icon={<Bookmark size={20} />} label="Mark" active={false} />
      <SideTool icon={<Type size={20} />} label="AI Asst" active={false} />
      <SideTool icon={<Server size={20} />} label="Proxy" active={false} />
    </div>
  );
};

const SideTool = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) => (
  <button 
    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all w-12 h-14 group border border-transparent ${
      active 
        ? 'bg-neon-blue/10 text-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.3)] border-neon-blue/30' 
        : 'text-gray-500 hover:bg-white/5 hover:text-white hover:border-white/10'
    }`}
    onClick={onClick}
  >
    <div className={`transition-transform duration-200 ${active ? 'scale-110 drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    <span className={`text-[9px] font-bold tracking-tight ${active ? 'text-neon-blue' : 'text-gray-500 group-hover:text-gray-300'}`}>
      {label}
    </span>
  </button>
);

export default SidebarRight;
