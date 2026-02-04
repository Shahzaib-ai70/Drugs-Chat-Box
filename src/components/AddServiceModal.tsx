import { useState } from 'react';
import { 
  X, 
  Minus, 
  Square,
  Search,
  Plus,
  MessageCircle
} from 'lucide-react';
import { AVAILABLE_SERVICES } from '../constants/services';
import type { ServiceItem } from '../types';
import { useLanguage } from '../translations';

const AddServiceModal = ({ onClose, onAdd }: { onClose: () => void, onAdd: (service: ServiceItem, name: string, quantity: number) => void }) => {
  const { t } = useLanguage();
  const [appName, setAppName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);

  const services: ServiceItem[] = AVAILABLE_SERVICES;

  const handleServiceClick = (service: ServiceItem) => {
    setSelectedService(service);
    // Extract plain name without newlines for the input
    setAppName(service.name.replace(/\n/g, ' '));
  };

  const handleAddClick = () => {
    if (selectedService && appName) {
      onAdd(selectedService, appName, quantity);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 p-4">
      <div className="w-full max-w-[850px] h-[90vh] md:h-[550px] bg-[#1a1a2e]/90 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden border border-white/10 animate-in fade-in zoom-in-95 duration-200 relative">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-neon-blue/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2"></div>
        
        {/* Header */}
        <div className="h-16 bg-white/5 border-b border-white/10 flex items-center justify-between px-6 select-none relative z-10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 rounded-xl flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,243,255,0.3)] ring-1 ring-white/10 border border-white/5">
              <MessageCircle size={20} fill="currentColor" className="text-neon-blue drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]" />
            </div>
            <span className="text-lg font-bold text-white tracking-wide drop-shadow-md">{t.addService}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <button className="hover:bg-white/10 p-2 rounded-full transition-colors hover:text-white"><Minus size={18} /></button>
            <button className="hover:bg-white/10 p-2 rounded-full transition-colors hover:text-white"><Square size={16} /></button>
            <button className="hover:bg-red-500/80 hover:text-white p-2 rounded-full transition-colors hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col gap-6 bg-transparent relative z-10">
          
          {/* Controls Section */}
          <div className="bg-white/5 p-4 md:p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-5 backdrop-blur-sm shrink-0">
             <div className="flex flex-col md:flex-row items-center gap-4 flex-1">
                <div className="hidden md:flex w-12 h-12 rounded-full bg-black/40 items-center justify-center text-neon-blue border border-white/10 shadow-inner shrink-0">
                    {selectedService ? (
                        <div style={{ color: selectedService.color }} className="drop-shadow-[0_0_5px_currentColor] scale-125 transition-transform">{selectedService.icon}</div>
                    ) : (
                        <Plus size={24} className="text-gray-500" />
                    )}
                </div>
                <div className="flex-1 flex flex-col md:flex-row gap-4 w-full">
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-neon-blue/80 uppercase tracking-widest mb-1.5 drop-shadow-[0_0_2px_rgba(0,243,255,0.5)]">{t.serviceName}</label>
                        <input 
                            type="text" 
                            value={appName}
                            onChange={(e) => setAppName(e.target.value)}
                            placeholder={t.selectServicePlaceholder}
                            className="w-full h-11 px-4 rounded-xl border border-white/10 bg-black/40 focus:bg-black/60 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/50 outline-none transition-all text-sm text-white placeholder-gray-600 shadow-inner"
                        />
                    </div>
                    <div className="w-full md:w-24">
                        <label className="block text-[10px] font-bold text-neon-blue/80 uppercase tracking-widest mb-1.5 drop-shadow-[0_0_2px_rgba(0,243,255,0.5)]">{t.qty}</label>
                        <input 
                            type="number" 
                            value={quantity}
                            min={1}
                            onChange={(e) => setQuantity(parseInt(e.target.value))}
                            className="w-full h-11 px-4 rounded-xl border border-white/10 bg-black/40 focus:bg-black/60 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/50 outline-none transition-all text-sm text-white placeholder-gray-600 text-center shadow-inner"
                        />
                    </div>
                </div>
             </div>
             
             <button 
              className={`h-11 px-8 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-wide shrink-0 ${
                selectedService && appName
                  ? 'bg-neon-blue text-black hover:bg-white hover:shadow-[0_0_20px_rgba(0,243,255,0.6)] active:scale-95' 
                  : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
              }`}
              disabled={!selectedService || !appName}
              onClick={handleAddClick}
            >
              <Plus size={18} />
              {t.add}
            </button>
          </div>

          {/* Grid Section */}
          <div className="flex-1 flex flex-col gap-4 min-h-0">
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-2">
                <h3 className="font-bold text-white text-sm tracking-wide flex items-center gap-2 drop-shadow-md">
                    <div className="w-1 h-5 bg-neon-purple rounded-full shadow-[0_0_10px_#bc13fe]"></div>
                    AVAILABLE SERVICES
                </h3>
                <div className="relative group w-full md:w-auto">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-blue transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search services..." 
                        className="h-10 pl-10 pr-4 rounded-xl border border-white/10 text-sm bg-black/40 text-white focus:bg-black/60 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/50 outline-none w-full md:w-64 transition-all shadow-inner placeholder-gray-600" 
                    />
                </div>
             </div>
             
             <div className="flex-1 bg-black/20 rounded-2xl border border-white/5 p-3 md:p-5 overflow-y-auto custom-scrollbar shadow-inner">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {services.map((service) => (
                    <button 
                    key={service.id} 
                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300 group relative border backdrop-blur-sm ${
                        selectedService?.id === service.id 
                            ? 'bg-white/10 border-neon-blue ring-1 ring-neon-blue/50 shadow-[0_0_20px_rgba(0,243,255,0.15)] scale-[1.02] z-10' 
                            : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10 hover:shadow-lg hover:-translate-y-1'
                    }`}
                    onClick={() => handleServiceClick(service)}
                    >
                    <div 
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg border border-white/5 ${
                            selectedService?.id === service.id 
                                ? 'bg-black/40 shadow-inner' 
                                : 'bg-black/30 group-hover:bg-black/50'
                        }`}
                        style={{ color: service.color }}
                    >
                        <div className="transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 drop-shadow-[0_0_10px_currentColor]">
                             {service.icon}
                        </div>
                    </div>
                    <span className={`text-xs font-bold text-center leading-tight whitespace-pre-line transition-colors tracking-wide ${
                        selectedService?.id === service.id ? 'text-neon-blue drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]' : 'text-gray-400 group-hover:text-white'
                    }`}>
                        {service.name}
                    </span>
                    </button>
                ))}
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AddServiceModal;
