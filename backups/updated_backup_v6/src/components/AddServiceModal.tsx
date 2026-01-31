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

const AddServiceModal = ({ onClose, onAdd }: { onClose: () => void, onAdd: (service: ServiceItem, name: string, quantity: number) => void }) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-300">
      <div className="w-[850px] h-[550px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="h-14 bg-white flex items-center justify-between px-6 border-b border-gray-100 select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-lg ring-1 ring-black/5">
              <MessageCircle size={18} fill="currentColor" className="text-white/90" />
            </div>
            <span className="text-base font-bold text-gray-800 tracking-tight">Add Service</span>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <button className="hover:bg-gray-100 p-2 rounded-full transition-colors"><Minus size={18} /></button>
            <button className="hover:bg-gray-100 p-2 rounded-full transition-colors"><Square size={16} /></button>
            <button className="hover:bg-red-500 hover:text-white p-2 rounded-full transition-colors" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col gap-6 bg-gray-50/50">
          
          {/* Controls Section */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
             <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    {selectedService ? (
                        <div style={{ color: selectedService.color }}>{selectedService.icon}</div>
                    ) : (
                        <Plus size={20} />
                    )}
                </div>
                <div className="flex-1 flex gap-4">
                    <div className="flex-1">
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Service Name</label>
                        <input 
                            type="text" 
                            value={appName}
                            onChange={(e) => setAppName(e.target.value)}
                            placeholder="Select a service below..."
                            className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                        />
                    </div>
                    <div className="w-24">
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Qty</label>
                        <input 
                            type="number" 
                            value={quantity}
                            min={1}
                            onChange={(e) => setQuantity(parseInt(e.target.value))}
                            className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                        />
                    </div>
                </div>
             </div>
             
             <button 
              className={`h-10 px-6 rounded-lg font-medium text-sm transition-all shadow-sm flex items-center gap-2 ${
                selectedService && appName
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!selectedService || !appName}
              onClick={handleAddClick}
            >
              <Plus size={16} />
              Add to Workspace
            </button>
          </div>

          {/* Grid Section */}
          <div className="flex-1 flex flex-col gap-4 min-h-0">
             <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-gray-800 text-sm tracking-tight flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                    Available Services
                </h3>
                <div className="relative group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search services..." 
                        className="h-9 pl-9 pr-4 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none w-56 transition-all" 
                    />
                </div>
             </div>
             
             <div className="flex-1 bg-gray-50/50 rounded-2xl border border-gray-100 p-5 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-5 gap-4">
                {services.map((service) => (
                    <button 
                    key={service.id} 
                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300 group relative border ${
                        selectedService?.id === service.id 
                            ? 'bg-white border-blue-500 ring-4 ring-blue-500/10 shadow-lg scale-[1.02] z-10' 
                            : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md hover:-translate-y-1'
                    }`}
                    onClick={() => handleServiceClick(service)}
                    >
                    <div 
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                            selectedService?.id === service.id 
                                ? 'bg-blue-50 shadow-inner' 
                                : 'bg-gray-50 group-hover:bg-blue-50/50'
                        }`}
                        style={{ color: service.color }}
                    >
                        <div className="transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                             {service.icon}
                        </div>
                    </div>
                    <span className={`text-xs font-bold text-center leading-tight whitespace-pre-line transition-colors ${
                        selectedService?.id === service.id ? 'text-blue-700' : 'text-gray-600 group-hover:text-gray-900'
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
