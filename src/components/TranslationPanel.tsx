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
            <label className="block text-xs font-medium text-gray-500 mb-2">{label}</label>
            
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-xl py-2.5 px-3 flex items-center justify-between hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
                <span className="truncate">{selectedLang ? selectedLang.name : value}</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-gray-50">
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search language..."
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border-none rounded-lg focus:ring-0 text-gray-700 placeholder-gray-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    
                    <div className="max-h-[200px] overflow-y-auto">
                        {filteredLanguages.length > 0 ? (
                            filteredLanguages.map(l => (
                                <button
                                    key={l.code}
                                    onClick={() => {
                                        onChange(l.code);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-blue-50 transition-colors ${
                                        value === l.code ? 'bg-blue-50/50 text-blue-600 font-medium' : 'text-gray-700'
                                    }`}
                                >
                                    {l.name}
                                    {value === l.code && <Check size={14} className="text-blue-600" />}
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center text-xs text-gray-400">
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
