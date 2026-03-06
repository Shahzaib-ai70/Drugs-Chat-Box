import { useState } from 'react';
import { 
  X, 
  Minus, 
  Square,
  Search,
  Plus,
  MessageCircle,
  LayoutGrid
} from 'lucide-react';
import { AVAILABLE_SERVICES } from '../constants/services';
import type { ServiceItem } from '../types';
import { useLanguage } from '../translations';

const AddServiceModal = ({ onClose, onAdd }: { onClose: () => void, onAdd: (service: ServiceItem, name: string, quantity: number) => void }) => {
  const { t } = useLanguage();
  const [appName, setAppName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const services: ServiceItem[] = AVAILABLE_SERVICES.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-300 p-4 animate-in fade-in">
      <div className="w-full max-w-[900px] h-[85vh] md:h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200 relative font-sans">
        
        {/* Header */}
        <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 select-none shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <LayoutGrid size={20} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">{t.addService}</h2>
                <p className="text-xs text-gray-500 font-medium">Select a platform to connect</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
                <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col gap-6 bg-gray-50/50 overflow-hidden">
          
          {/* Configuration Bar */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-end md:items-center gap-5 shrink-0">
             
             {/* Selected Icon Preview */}
             <div className="hidden md:flex w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 items-center justify-center shrink-0">
                {selectedService ? (
                    <div style={{ color: selectedService.color }} className="transform scale-125 transition-all duration-300">
                        {selectedService.icon}
                    </div>
                ) : (
                    <Plus size={24} className="text-gray-300" />
                )}
             </div>

             {/* Inputs */}
             <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-[1fr_100px] gap-4 text-gray-900">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t.serviceName}</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={appName}
                            onChange={(e) => setAppName(e.target.value)}
                            placeholder={t.selectServicePlaceholder}
                            className="w-full h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        />
                        {!selectedService && (
                            <div className="absolute inset-0 bg-gray-50/50 cursor-not-allowed rounded-lg" title="Please select a service first" />
                        )}
                    </div>
                </div>
                
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t.qty}</label>
                    <input 
                        type="number" 
                        value={quantity}
                        min={1}
                        max={10}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full h-11 px-3 text-center rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
                    />
                </div>
             </div>
             
             {/* Add Button */}
             <button 
              className={`h-11 px-8 rounded-lg font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 uppercase tracking-wide min-w-[120px] ${
                selectedService && appName
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              }`}
              disabled={!selectedService || !appName}
              onClick={handleAddClick}
            >
              <Plus size={18} />
              {t.add}
            </button>
          </div>

          {/* Service Grid Section */}
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
             {/* Toolbar */}
             <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                <h3 className="font-bold text-gray-800 text-sm tracking-wide flex items-center gap-2">
                    Available Services
                    <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs font-medium">{services.length}</span>
                </h3>
                <div className="relative group">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search..." 
                        className="h-9 pl-9 pr-4 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none w-48 transition-all" 
                    />
                </div>
             </div>
             
             {/* Grid */}
             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {services.map((service) => (
                    <button 
                    key={service.id} 
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl transition-all duration-200 group relative border ${
                        selectedService?.id === service.id 
                            ? 'bg-blue-50/50 border-blue-500 ring-1 ring-blue-500 shadow-sm' 
                            : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5'
                    }`}
                    onClick={() => handleServiceClick(service)}
                    >
                    <div 
                        className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${
                            selectedService?.id === service.id 
                                ? 'bg-white shadow-sm' 
                                : 'bg-gray-50 group-hover:bg-white group-hover:shadow-inner'
                        }`}
                        style={{ color: service.color }}
                    >
                        <div className="transform transition-transform duration-300 group-hover:scale-110 drop-shadow-sm">
                             {service.icon}
                        </div>
                    </div>
                    <span className={`text-xs font-bold text-center leading-tight whitespace-pre-line transition-colors ${
                        selectedService?.id === service.id ? 'text-blue-700' : 'text-gray-600 group-hover:text-gray-900'
                    }`}>
                        {service.name}
                    </span>
                    
                    {/* Checkmark for selected state */}
                    {selectedService?.id === service.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-sm animate-in zoom-in duration-200">
                            <Plus size={12} className="rotate-45" />
                        </div>
                    )}
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
