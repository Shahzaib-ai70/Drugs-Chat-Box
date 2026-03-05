import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Copy, Save, FileText, Check } from 'lucide-react';

interface ScriptPanelProps {
  onClose: () => void;
}

interface Script {
  id: string;
  content: string;
  createdAt: number;
}

const ScriptPanel = ({ onClose }: ScriptPanelProps) => {
  const [scripts, setScripts] = useState<Script[]>(() => {
    try {
      const saved = localStorage.getItem('saved_scripts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  const [newScript, setNewScript] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('saved_scripts', JSON.stringify(scripts));
  }, [scripts]);

  const handleAddScript = () => {
    if (!newScript.trim()) return;
    
    const script: Script = {
      id: Date.now().toString(),
      content: newScript.trim(),
      createdAt: Date.now()
    };
    
    setScripts(prev => [script, ...prev]);
    setNewScript('');
  };

  const handleDeleteScript = (id: string) => {
    setScripts(prev => prev.filter(s => s.id !== id));
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-[340px] bg-white/95 backdrop-blur-2xl border-l border-gray-200 flex flex-col h-full shadow-[-5px_0_20px_rgba(0,0,0,0.05)] z-20 font-sans relative">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-amber-50 rounded-full blur-[80px] pointer-events-none opacity-50"></div>

      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 bg-gray-50/50 shrink-0 relative z-10">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                <FileText size={18} />
            </div>
            <div>
                <h3 className="font-bold text-gray-900 text-sm tracking-wide">Saved Scripts</h3>
                <p className="text-[10px] text-gray-500 font-medium">Quick Reply Templates</p>
            </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full transition-colors hover:rotate-90 duration-300">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10">
        
        {/* Add New Script */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500 transition-all">
            <textarea 
                value={newScript}
                onChange={(e) => setNewScript(e.target.value)}
                placeholder="Type your script here..."
                className="w-full text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none min-h-[80px] bg-transparent"
            />
            <div className="flex justify-end mt-2">
                <button 
                    onClick={handleAddScript}
                    disabled={!newScript.trim()}
                    className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save size={14} />
                    Save Script
                </button>
            </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

        {/* Script List */}
        <div className="space-y-3">
            {scripts.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs">No scripts saved yet</p>
                </div>
            ) : (
                scripts.map(script => (
                    <div key={script.id} className="group bg-white border border-gray-100 hover:border-amber-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all relative">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3 leading-relaxed">{script.content}</p>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                            <span className="text-[10px] text-gray-400">
                                {new Date(script.createdAt).toLocaleDateString()}
                            </span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleDeleteScript(script.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <button 
                                    onClick={() => handleCopy(script.content, script.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        copiedId === script.id 
                                        ? 'bg-green-50 text-green-600' 
                                        : 'bg-gray-50 text-gray-600 hover:bg-amber-50 hover:text-amber-700'
                                    }`}
                                >
                                    {copiedId === script.id ? <Check size={14} /> : <Copy size={14} />}
                                    {copiedId === script.id ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default ScriptPanel;