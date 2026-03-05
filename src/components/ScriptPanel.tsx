import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Copy, Save, FileText, Check, Upload, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ScriptPanelProps {
  onClose: () => void;
  userCode: string;
}

interface Script {
  id: string;
  content: string;
  createdAt: number;
}

interface Folder {
    id: string;
    name: string;
    scripts: Script[];
    isOpen: boolean;
}

const ScriptPanel = ({ onClose, userCode }: ScriptPanelProps) => {
  const storageKeyImported = `imported_scripts_${userCode}`;
  const storageKeyManual = `saved_scripts_${userCode}`;

  // Main state for folders (imported from Excel)
  const [folders, setFolders] = useState<Folder[]>(() => {
    try {
        const saved = localStorage.getItem(storageKeyImported);
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
  });

  // Legacy state for manually added scripts (kept for backward compatibility)
  const [manualScripts, setManualScripts] = useState<Script[]>(() => {
    try {
      const saved = localStorage.getItem(storageKeyManual);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  const [newScript, setNewScript] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    localStorage.setItem(storageKeyManual, JSON.stringify(manualScripts));
  }, [manualScripts, storageKeyManual]);

  useEffect(() => {
    localStorage.setItem(storageKeyImported, JSON.stringify(folders));
  }, [folders, storageKeyImported]);

  const handleAddManualScript = () => {
    if (!newScript.trim()) return;
    
    const script: Script = {
      id: Date.now().toString(),
      content: newScript.trim(),
      createdAt: Date.now()
    };
    
    setManualScripts(prev => [script, ...prev]);
    setNewScript('');
  };

  const handleDeleteManualScript = (id: string) => {
    setManualScripts(prev => prev.filter(s => s.id !== id));
  };

  const handleDeleteFolder = (id: string) => {
      setFolders(prev => prev.filter(f => f.id !== id));
  };

  const toggleFolder = (id: string) => {
      setFolders(prev => prev.map(f => f.id === id ? { ...f, isOpen: !f.isOpen } : f));
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsImporting(true);
      const reader = new FileReader();
      
      reader.onload = (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              
              const newFolders: Folder[] = [];

              // Iterate through each sheet
              wb.SheetNames.forEach(sheetName => {
                  const ws = wb.Sheets[sheetName];
                  // Convert sheet to JSON array of arrays (rows)
                  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                  
                  // Group scripts by "Category" (Column A or Column B) -> "Script" (Column C)
                  const categoryMap = new Map<string, Script[]>();
                  
                  data.forEach(row => {
                      // Logic:
                      // 1. Content is ALWAYS in Column C (Index 2)
                      // 2. Category is in Column B (Index 1) if present
                      // 3. If Column B is empty, Category is in Column A (Index 0)
                      
                      const colA = (row[0] && typeof row[0] === 'string') ? row[0].trim() : '';
                      const colB = (row[1] && typeof row[1] === 'string') ? row[1].trim() : '';
                      const colC = (row[2] && typeof row[2] === 'string') ? row[2].trim() : '';

                      // Determine Category
                      let category = 'General';
                      if (colB) {
                          category = colB;
                      } else if (colA) {
                          category = colA;
                      }

                      // Only add if there is content in Column C
                      if (colC) {
                          if (!categoryMap.has(category)) {
                              categoryMap.set(category, []);
                          }
                          categoryMap.get(category)?.push({
                              id: Math.random().toString(36).substr(2, 9),
                              content: colC,
                              createdAt: Date.now()
                          });
                      }
                  });

                  // Create folders from categories
                  categoryMap.forEach((scripts, category) => {
                       newFolders.push({
                          id: Math.random().toString(36).substr(2, 9),
                          name: category,
                          scripts: scripts,
                          isOpen: false
                      });
                  });
              });

              setFolders(prev => [...newFolders, ...prev]);
              setIsImporting(false);
          } catch (error) {
              console.error("Error reading excel:", error);
              setIsImporting(false);
              alert("Failed to read Excel file. Please ensure it's a valid .xlsx or .xls file.");
          }
      };

      reader.readAsBinaryString(file);
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
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
        
        {/* Import Button */}
        <div className="flex justify-center">
            <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls"
                className="hidden"
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50 transition-all group font-medium text-sm"
            >
                <Upload size={18} className="group-hover:scale-110 transition-transform" />
                {isImporting ? 'Importing...' : 'Import Excel File'}
            </button>
        </div>

        {/* Folders List (Imported from Excel) */}
        {folders.length > 0 && (
            <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Imported Scripts</h4>
                <div className="grid grid-cols-2 gap-2">
                    {folders.map(folder => (
                        <button 
                            key={folder.id}
                            onClick={() => toggleFolder(folder.id)}
                            className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                                folder.isOpen 
                                ? 'bg-amber-50 border-amber-200 shadow-sm' 
                                : 'bg-white border-gray-100 hover:border-amber-200 hover:shadow-sm'
                            }`}
                        >
                            <div className="flex flex-col gap-1 relative z-10">
                                <div className="flex justify-between items-start">
                                    <span className={`text-xs font-bold ${folder.isOpen ? 'text-amber-700' : 'text-gray-700'} line-clamp-1`}>
                                        {folder.name}
                                    </span>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteFolder(folder.id);
                                        }}
                                        className={`p-1 -mr-1 -mt-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                                            folder.isOpen ? 'text-amber-400 hover:bg-amber-100' : 'text-gray-300 hover:bg-gray-100 hover:text-red-500'
                                        }`}
                                        title="Delete Folder"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                                <span className="text-[10px] text-gray-400">
                                    {folder.scripts.length} lines
                                </span>
                            </div>
                            
                            {/* Decorative background icon */}
                            <Folder 
                                className={`absolute -bottom-2 -right-2 w-12 h-12 transition-colors opacity-10 ${
                                    folder.isOpen ? 'text-amber-500' : 'text-gray-400 group-hover:text-amber-500'
                                }`} 
                            />
                            
                            {folder.isOpen && (
                                <div className="absolute top-2 right-2">
                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Expanded Folder Content */}
                {folders.map(folder => (
                    folder.isOpen && (
                        <div key={`content-${folder.id}`} className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                             <div className="flex items-center justify-between px-1 mb-2">
                                <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                                    <Folder size={12} />
                                    {folder.name}
                                </span>
                                <button 
                                    onClick={() => handleDeleteFolder(folder.id)}
                                    className="text-[10px] text-red-400 hover:text-red-600 flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                                >
                                    <Trash2 size={10} />
                                    Delete Folder
                                </button>
                             </div>
                             
                            {folder.scripts.map(script => (
                                <div key={script.id} className="group flex items-start justify-between gap-2 p-3 bg-white border border-gray-100 rounded-xl hover:border-amber-200 hover:shadow-sm transition-all text-sm">
                                    <p className="text-gray-700 leading-snug flex-1 cursor-pointer" onClick={() => handleCopy(script.content, script.id)}>{script.content}</p>
                                    <button 
                                        onClick={() => handleCopy(script.content, script.id)}
                                        className={`shrink-0 p-1.5 rounded-md transition-all ${
                                            copiedId === script.id 
                                            ? 'bg-green-100 text-green-600' 
                                            : 'text-gray-300 hover:text-amber-600 hover:bg-amber-50'
                                        }`}
                                    >
                                        {copiedId === script.id ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )
                ))}
            </div>
        )}

        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

        {/* Manual Script Input */}
        <div className="space-y-3">
             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Manual Scripts</h4>
             <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500 transition-all">
                <textarea 
                    value={newScript}
                    onChange={(e) => setNewScript(e.target.value)}
                    placeholder="Type your script here..."
                    className="w-full text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none min-h-[80px] bg-transparent"
                />
                <div className="flex justify-end mt-2">
                    <button 
                        onClick={handleAddManualScript}
                        disabled={!newScript.trim()}
                        className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={14} />
                        Save Script
                    </button>
                </div>
            </div>
        </div>

        {/* Manual Script List */}
        <div className="space-y-3">
            {manualScripts.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                    <p className="text-xs">No manual scripts saved</p>
                </div>
            ) : (
                manualScripts.map(script => (
                    <div key={script.id} className="group bg-white border border-gray-100 hover:border-amber-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all relative">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3 leading-relaxed">{script.content}</p>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                            <span className="text-[10px] text-gray-400">
                                {new Date(script.createdAt).toLocaleDateString()}
                            </span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleDeleteManualScript(script.id)}
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