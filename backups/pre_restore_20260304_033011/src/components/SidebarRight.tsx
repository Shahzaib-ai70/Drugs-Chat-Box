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
    <div className="w-16 bg-white/80 backdrop-blur-md border-l border-gray-200 flex flex-col items-center py-4 gap-4 shrink-0 z-30 shadow-xl">
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
        ? 'bg-blue-50 text-blue-600 shadow-sm border-blue-200' 
        : 'text-gray-500 hover:bg-gray-100 hover:text-blue-600 hover:border-gray-200'
    }`}
    onClick={onClick}
  >
    <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    <span className={`text-[9px] font-bold tracking-tight ${active ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600'}`}>
      {label}
    </span>
  </button>
);

export default SidebarRight;
