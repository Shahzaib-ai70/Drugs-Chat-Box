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
    <div className="w-16 bg-white border-l border-gray-100 flex flex-col items-center py-4 gap-4 shrink-0 z-30 shadow-sm">
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
    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all w-12 h-14 group ${
      active 
        ? 'bg-blue-50 text-blue-600' 
        : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
    }`}
    onClick={onClick}
  >
    <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    <span className={`text-[9px] font-semibold tracking-tight ${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
      {label}
    </span>
  </button>
);

export default SidebarRight;
