import { X, ChevronDown, Languages, Globe, Settings2 } from 'lucide-react';

export interface TranslationSettings {
  sourceLang: string;
  targetLang: string;
  translateBeforeSendingLang: string;
  autoTranslateIncoming: boolean;
  autoTranslateOutgoing: boolean;
}

interface TranslationPanelProps {
  settings: TranslationSettings;
  onUpdateSettings: (newSettings: TranslationSettings) => void;
  onClose: () => void;
  mode: 'current' | 'global';
  onModeChange: (mode: 'current' | 'global') => void;
  activeChatId?: string | null;
}

const LANGUAGES = [
  { code: 'auto', name: 'Auto Detect' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'he', name: 'Hebrew' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'tr', name: 'Turkish' },
];

const TranslationPanel = ({ settings, onUpdateSettings, onClose, mode, onModeChange, activeChatId }: TranslationPanelProps) => {
  const handleChange = (key: keyof TranslationSettings, value: any) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  return (
    <div className="w-[320px] bg-white border-l border-gray-100 flex flex-col h-full shadow-2xl z-20 font-sans">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Languages size={18} />
            </div>
            <div>
                <h3 className="font-semibold text-gray-800 text-sm">Translation</h3>
                <p className="text-[10px] text-gray-400">Real-time chat translation</p>
            </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-full transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Scope Selector */}
        <div className="bg-gray-50 p-1 rounded-xl flex">
          <button 
            onClick={() => onModeChange('current')}
            disabled={!activeChatId}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                mode === 'current' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            <Settings2 size={12} />
            Current Chat
          </button>
          <button 
            onClick={() => onModeChange('global')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                mode === 'global' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Globe size={12} />
            Global Rules
          </button>
        </div>

        {/* Info Banner */}
        {mode === 'current' && activeChatId && (
            <div className="text-xs text-blue-600 bg-blue-50/50 border border-blue-100 px-3 py-2.5 rounded-lg flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                Configuring for: <span className="font-semibold truncate max-w-[150px]">{activeChatId.split('@')[0]}</span>
            </div>
        )}

        {/* Incoming Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-800">Incoming Messages</h4>
            <div className="relative inline-block w-11 h-6 transition duration-200 ease-in-out">
                <input 
                    type="checkbox" 
                    id="auto-translate-incoming" 
                    className="peer absolute opacity-0 w-0 h-0"
                    checked={settings.autoTranslateIncoming}
                    onChange={() => handleChange('autoTranslateIncoming', !settings.autoTranslateIncoming)}
                />
                <label 
                    htmlFor="auto-translate-incoming" 
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ${
                        settings.autoTranslateIncoming ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                ></label>
                <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 shadow-sm ${
                    settings.autoTranslateIncoming ? 'translate-x-5' : 'translate-x-0'
                }`}></span>
            </div>
          </div>
          
          <div className={`space-y-4 transition-opacity duration-200 ${settings.autoTranslateIncoming ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Translate incoming from</label>
              <div className="relative">
                <select 
                    value={settings.sourceLang}
                    onChange={(e) => handleChange('sourceLang', e.target.value)}
                    className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-xl py-2.5 px-3 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Translate to</label>
              <div className="relative">
                <select 
                    value={settings.targetLang}
                    onChange={(e) => handleChange('targetLang', e.target.value)}
                    className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-xl py-2.5 px-3 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  {LANGUAGES.filter(l => l.code !== 'auto').map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-100"></div>

        {/* Outgoing Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-800">Outgoing Messages</h4>
            <div className="relative inline-block w-11 h-6 transition duration-200 ease-in-out">
                <input 
                    type="checkbox" 
                    id="auto-translate-outgoing" 
                    className="peer absolute opacity-0 w-0 h-0"
                    checked={settings.autoTranslateOutgoing}
                    onChange={() => handleChange('autoTranslateOutgoing', !settings.autoTranslateOutgoing)}
                />
                <label 
                    htmlFor="auto-translate-outgoing" 
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ${
                        settings.autoTranslateOutgoing ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                ></label>
                <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 shadow-sm ${
                    settings.autoTranslateOutgoing ? 'translate-x-5' : 'translate-x-0'
                }`}></span>
            </div>
          </div>

          <div className={`space-y-4 transition-opacity duration-200 ${settings.autoTranslateOutgoing ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
             <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Translate my messages to</label>
              <div className="relative">
                <select 
                    value={settings.translateBeforeSendingLang}
                    onChange={(e) => handleChange('translateBeforeSendingLang', e.target.value)}
                    className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-xl py-2.5 px-3 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                   {LANGUAGES.filter(l => l.code !== 'auto').map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationPanel;