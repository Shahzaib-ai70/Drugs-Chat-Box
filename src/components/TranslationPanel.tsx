import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Languages, Globe, Settings2, Search, Check } from 'lucide-react';

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
  { code: 'af', name: 'Afrikaans' },
  { code: 'sq', name: 'Albanian' },
  { code: 'am', name: 'Amharic' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hy', name: 'Armenian' },
  { code: 'az', name: 'Azerbaijani' },
  { code: 'eu', name: 'Basque' },
  { code: 'be', name: 'Belarusian' },
  { code: 'bn', name: 'Bengali' },
  { code: 'bs', name: 'Bosnian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'ca', name: 'Catalan' },
  { code: 'ceb', name: 'Cebuano' },
  { code: 'ny', name: 'Chichewa' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'co', name: 'Corsican' },
  { code: 'hr', name: 'Croatian' },
  { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'en', name: 'English' },
  { code: 'eo', name: 'Esperanto' },
  { code: 'et', name: 'Estonian' },
  { code: 'tl', name: 'Filipino' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' },
  { code: 'fy', name: 'Frisian' },
  { code: 'gl', name: 'Galician' },
  { code: 'ka', name: 'Georgian' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'ht', name: 'Haitian Creole' },
  { code: 'ha', name: 'Hausa' },
  { code: 'haw', name: 'Hawaiian' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hmn', name: 'Hmong' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'is', name: 'Icelandic' },
  { code: 'ig', name: 'Igbo' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ga', name: 'Irish' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'jw', name: 'Javanese' },
  { code: 'kn', name: 'Kannada' },
  { code: 'kk', name: 'Kazakh' },
  { code: 'km', name: 'Khmer' },
  { code: 'rw', name: 'Kinyarwanda' },
  { code: 'ko', name: 'Korean' },
  { code: 'ku', name: 'Kurdish (Kurmanji)' },
  { code: 'ky', name: 'Kyrgyz' },
  { code: 'lo', name: 'Lao' },
  { code: 'la', name: 'Latin' },
  { code: 'lv', name: 'Latvian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'lb', name: 'Luxembourgish' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'mg', name: 'Malagasy' },
  { code: 'ms', name: 'Malay' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'mt', name: 'Maltese' },
  { code: 'mi', name: 'Maori' },
  { code: 'mr', name: 'Marathi' },
  { code: 'mn', name: 'Mongolian' },
  { code: 'my', name: 'Myanmar (Burmese)' },
  { code: 'ne', name: 'Nepali' },
  { code: 'no', name: 'Norwegian' },
  { code: 'or', name: 'Odia (Oriya)' },
  { code: 'ps', name: 'Pashto' },
  { code: 'fa', name: 'Persian' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' },
  { code: 'sm', name: 'Samoan' },
  { code: 'gd', name: 'Scots Gaelic' },
  { code: 'sr', name: 'Serbian' },
  { code: 'st', name: 'Sesotho' },
  { code: 'sn', name: 'Shona' },
  { code: 'sd', name: 'Sindhi' },
  { code: 'si', name: 'Sinhala' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'so', name: 'Somali' },
  { code: 'es', name: 'Spanish' },
  { code: 'su', name: 'Sundanese' },
  { code: 'sw', name: 'Swahili' },
  { code: 'sv', name: 'Swedish' },
  { code: 'tg', name: 'Tajik' },
  { code: 'ta', name: 'Tamil' },
  { code: 'tt', name: 'Tatar' },
  { code: 'te', name: 'Telugu' },
  { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' },
  { code: 'tk', name: 'Turkmen' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'ug', name: 'Uyghur' },
  { code: 'uz', name: 'Uzbek' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'cy', name: 'Welsh' },
  { code: 'xh', name: 'Xhosa' },
  { code: 'yi', name: 'Yiddish' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'zu', name: 'Zulu' }
];

interface SearchableLanguageSelectProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    excludeAuto?: boolean;
}

const SearchableLanguageSelect = ({ value, onChange, label, excludeAuto = false }: SearchableLanguageSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredLanguages = LANGUAGES
        .filter(l => excludeAuto ? l.code !== 'auto' : true)
        .filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const selectedLang = LANGUAGES.find(l => l.code === value);

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</label>
            
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-xl py-3 px-4 flex items-center justify-between hover:border-blue-400 hover:shadow-sm focus:outline-none focus:border-blue-500 transition-all group"
            >
                <span className="truncate group-hover:text-blue-600 transition-colors">{selectedLang ? selectedLang.name : value}</span>
                <ChevronDown size={14} className={`text-gray-400 group-hover:text-blue-500 transition-all ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-gray-100">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search language..."
                                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    
                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar p-1">
                        {filteredLanguages.length > 0 ? (
                            filteredLanguages.map(l => (
                                <button
                                    key={l.code}
                                    onClick={() => {
                                        onChange(l.code);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between rounded-lg transition-all mb-0.5 ${
                                        value === l.code 
                                        ? 'bg-blue-50 text-blue-600 font-bold' 
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    {l.name}
                                    {value === l.code && <Check size={14} className="text-blue-600" />}
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-6 text-center text-xs text-gray-500">
                                No languages found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const TranslationPanel = ({ settings, onUpdateSettings, onClose, mode, onModeChange, activeChatId }: TranslationPanelProps) => {
  const handleChange = (key: keyof TranslationSettings, value: any) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  return (
    <div className="w-[340px] bg-white/95 backdrop-blur-2xl border-l border-gray-200 flex flex-col h-full shadow-[-5px_0_20px_rgba(0,0,0,0.05)] z-20 font-sans relative">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-blue-50 rounded-full blur-[80px] pointer-events-none opacity-50"></div>

      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 bg-gray-50/50 shrink-0 relative z-10">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                <Languages size={18} />
            </div>
            <div>
                <h3 className="font-bold text-gray-900 text-sm tracking-wide">Translation</h3>
                <p className="text-[10px] text-gray-500 font-medium">Real-time AI Language Layer</p>
            </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full transition-colors hover:rotate-90 duration-300">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar relative z-10">
        {/* Scope Selector */}
        <div className="bg-gray-100 p-1 rounded-xl flex border border-gray-200">
          <button 
            onClick={() => onModeChange('current')}
            disabled={!activeChatId}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                mode === 'current' 
                ? 'bg-white text-blue-600 shadow-sm border border-gray-200' 
                : 'text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed'
            }`}
          >
            <Settings2 size={14} />
            Current Chat
          </button>
          <button 
            onClick={() => onModeChange('global')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                mode === 'global' 
                ? 'bg-white text-purple-600 shadow-sm border border-gray-200' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Globe size={14} />
            Global Rules
          </button>
        </div>

        {/* Info Banner */}
        {mode === 'current' && activeChatId && (
            <div className="text-xs text-blue-700 bg-blue-50 border border-blue-100 px-4 py-3 rounded-xl flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="flex-1">Configuring for: <span className="font-bold text-gray-900 block truncate mt-0.5 text-sm">{activeChatId.split('@')[0]}</span></span>
            </div>
        )}

        {/* Incoming Settings */}
        <div className="space-y-5">
          <div className="flex items-center justify-between group">
            <h4 className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors">Incoming Messages</h4>
            <div className="relative inline-block w-12 h-7 transition duration-200 ease-in-out">
                <input 
                    type="checkbox" 
                    id="auto-translate-incoming" 
                    className="peer absolute opacity-0 w-0 h-0"
                    checked={settings.autoTranslateIncoming}
                    onChange={() => handleChange('autoTranslateIncoming', !settings.autoTranslateIncoming)}
                />
                <label 
                    htmlFor="auto-translate-incoming" 
                    className={`block overflow-hidden h-7 rounded-full cursor-pointer transition-all duration-300 border ${
                        settings.autoTranslateIncoming 
                        ? 'bg-blue-50 border-blue-300' 
                        : 'bg-gray-200 border-gray-300'
                    }`}
                ></label>
                <span className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 shadow-sm border border-gray-100 ${
                    settings.autoTranslateIncoming ? 'translate-x-5 bg-blue-600' : 'translate-x-0'
                }`}></span>
            </div>
          </div>
          
          <div className={`space-y-5 transition-all duration-300 ${settings.autoTranslateIncoming ? 'opacity-100 translate-y-0' : 'opacity-30 pointer-events-none translate-y-2 grayscale'}`}>
            <SearchableLanguageSelect 
                label="Translate incoming from"
                value={settings.sourceLang}
                onChange={(val) => handleChange('sourceLang', val)}
            />

            <SearchableLanguageSelect 
                label="Translate to"
                value={settings.targetLang}
                onChange={(val) => handleChange('targetLang', val)}
                excludeAuto={true}
            />
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

        {/* Outgoing Settings */}
        <div className="space-y-5">
          <div className="flex items-center justify-between group">
            <h4 className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors">Outgoing Messages</h4>
            <div className="relative inline-block w-12 h-7 transition duration-200 ease-in-out">
                <input 
                    type="checkbox" 
                    id="auto-translate-outgoing" 
                    className="peer absolute opacity-0 w-0 h-0"
                    checked={settings.autoTranslateOutgoing}
                    onChange={() => handleChange('autoTranslateOutgoing', !settings.autoTranslateOutgoing)}
                />
                <label 
                    htmlFor="auto-translate-outgoing" 
                    className={`block overflow-hidden h-7 rounded-full cursor-pointer transition-all duration-300 border ${
                        settings.autoTranslateOutgoing 
                        ? 'bg-blue-50 border-blue-300' 
                        : 'bg-gray-200 border-gray-300'
                    }`}
                ></label>
                <span className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 shadow-sm border border-gray-100 ${
                    settings.autoTranslateOutgoing ? 'translate-x-5 bg-blue-600' : 'translate-x-0'
                }`}></span>
            </div>
          </div>

          <div className={`space-y-5 transition-all duration-300 ${settings.autoTranslateOutgoing ? 'opacity-100 translate-y-0' : 'opacity-30 pointer-events-none translate-y-2 grayscale'}`}>
             <SearchableLanguageSelect 
                label="Translate my messages to"
                value={settings.translateBeforeSendingLang}
                onChange={(val) => handleChange('translateBeforeSendingLang', val)}
                excludeAuto={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationPanel;
