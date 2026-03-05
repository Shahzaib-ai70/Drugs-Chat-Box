import { useState } from 'react';
import { X, Bot, Heart, Moon, Sun, Sparkles, Copy, Check, MessageCircle } from 'lucide-react';

interface AiAssistantPanelProps {
  onClose: () => void;
}

type Category = 'romantic' | 'loving' | 'sexy' | 'good_night' | 'good_morning';

const CATEGORIES: { id: Category; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'loving', label: 'Loving Chat', icon: <Heart size={18} />, color: 'text-pink-500 bg-pink-50 border-pink-200' },
  { id: 'romantic', label: 'Romantic', icon: <Sparkles size={18} />, color: 'text-purple-500 bg-purple-50 border-purple-200' },
  { id: 'sexy', label: 'Flirty/Sexy', icon: <MessageCircle size={18} />, color: 'text-red-500 bg-red-50 border-red-200' },
  { id: 'good_night', label: 'Good Night', icon: <Moon size={18} />, color: 'text-indigo-500 bg-indigo-50 border-indigo-200' },
  { id: 'good_morning', label: 'Good Morning', icon: <Sun size={18} />, color: 'text-amber-500 bg-amber-50 border-amber-200' },
];

// Mock AI generated responses (In a real app, this would call an AI API)
const MOCK_SCRIPTS: Record<Category, string[]> = {
  loving: [
    "Just thinking about you makes my day brighter. I'm so lucky to have you in my life.",
    "You are the best thing that's ever happened to me. I love you more than words can say.",
    "Every moment with you is a treasure. I can't wait to see you again.",
    "My heart beats faster whenever I see your name pop up on my phone.",
    "You make everything better just by being you. Thank you for being amazing."
  ],
  romantic: [
    "If I could give you one thing in life, I would give you the ability to see yourself through my eyes, only then would you realize how special you are to me.",
    "I fell in love with the way you touched me without using your hands.",
    "You are my sun, my moon, and all my stars.",
    "In a sea of people, my eyes will always search for you.",
    "I want to be the reason behind your smile because you are the reason behind mine."
  ],
  sexy: [
    "I can't stop thinking about the last time we were together...",
    "You looked absolutely incredible in that photo. Left me speechless.",
    "I had a dream about you last night, and I woke up wishing it was real.",
    "Just so you know, you're looking dangerously good today.",
    "I wish you were here right now... I have some ideas."
  ],
  good_night: [
    "Good night, my love. Dream of me, because I'll definitely be dreaming of you.",
    "Sleep tight! Can't wait to talk to you tomorrow.",
    "Sending you a virtual hug and a kiss goodnight. Sweet dreams!",
    "May your dreams be as sweet and beautiful as you are. Good night.",
    "Rest well. The world is a better place with you in it."
  ],
  good_morning: [
    "Good morning! Hope your day is as wonderful as your smile.",
    "Wakey wakey! Sending you some morning sunshine and love.",
    "Good morning beautiful/handsome. Thinking of you as I start my day.",
    "Rise and shine! The world is waiting for your awesomeness.",
    "Just wanted to be the first one to say good morning to you."
  ]
};

const AiAssistantPanel = ({ onClose }: AiAssistantPanelProps) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [generatedScripts, setGeneratedScripts] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = (category: Category) => {
    setSelectedCategory(category);
    setIsGenerating(true);
    setGeneratedScripts([]);

    // Simulate AI generation delay
    setTimeout(() => {
      // Shuffle and pick 3 random scripts from the category
      const scripts = [...MOCK_SCRIPTS[category]].sort(() => 0.5 - Math.random()).slice(0, 3);
      setGeneratedScripts(scripts);
      setIsGenerating(false);
    }, 800);
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="w-[340px] bg-white/95 backdrop-blur-2xl border-l border-gray-200 flex flex-col h-full shadow-[-5px_0_20px_rgba(0,0,0,0.05)] z-20 font-sans relative">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-blue-50 rounded-full blur-[80px] pointer-events-none opacity-50"></div>

      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 bg-gray-50/50 shrink-0 relative z-10">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                <Bot size={20} />
            </div>
            <div>
                <h3 className="font-bold text-gray-900 text-sm tracking-wide">AI Assistant</h3>
                <p className="text-[10px] text-gray-500 font-medium">Script Generator</p>
            </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full transition-colors hover:rotate-90 duration-300">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative z-10">
        
        {!selectedCategory ? (
            <div className="space-y-4">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-500 animate-pulse">
                        <Sparkles size={32} />
                    </div>
                    <h4 className="font-bold text-gray-800">Choose a Topic</h4>
                    <p className="text-xs text-gray-500 mt-1">Select a category to generate scripts</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => handleGenerate(cat.id)}
                            className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md active:scale-[0.98] text-left group bg-white hover:bg-gray-50 ${cat.color}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm group-hover:scale-110 transition-transform`}>
                                {cat.icon}
                            </div>
                            <div>
                                <span className="font-bold text-sm block text-gray-800">{cat.label}</span>
                                <span className="text-[10px] text-gray-500">Generate scripts</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        ) : (
            <div className="space-y-6">
                <button 
                    onClick={() => setSelectedCategory(null)}
                    className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-blue-600 transition-colors mb-2"
                >
                    ← Back to Topics
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${CATEGORIES.find(c => c.id === selectedCategory)?.color.split(' ')[1]} ${CATEGORIES.find(c => c.id === selectedCategory)?.color.split(' ')[0]}`}>
                        {CATEGORIES.find(c => c.id === selectedCategory)?.icon}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">{CATEGORIES.find(c => c.id === selectedCategory)?.label}</h3>
                        <p className="text-xs text-gray-500">AI Generated Suggestions</p>
                    </div>
                </div>

                {isGenerating ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm animate-pulse">
                                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2"></div>
                                <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {generatedScripts.map((script, idx) => (
                            <div key={idx} className="group bg-white border border-gray-100 hover:border-blue-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all relative">
                                <p className="text-sm text-gray-700 leading-relaxed pr-8">{script}</p>
                                <button 
                                    onClick={() => handleCopy(script, idx)}
                                    className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all ${
                                        copiedIndex === idx 
                                        ? 'bg-green-50 text-green-600' 
                                        : 'text-gray-400 hover:bg-blue-50 hover:text-blue-600 opacity-0 group-hover:opacity-100'
                                    }`}
                                    title="Copy to clipboard"
                                >
                                    {copiedIndex === idx ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                        ))}
                        
                        <button
                            onClick={() => handleGenerate(selectedCategory)}
                            className="w-full py-3 mt-4 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 border border-gray-200 border-dashed"
                        >
                            <Sparkles size={16} />
                            Generate More
                        </button>
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};

export default AiAssistantPanel;