import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Send, Languages, Loader2 } from 'lucide-react';
import type { TranslationSettings } from './TranslationPanel';

interface RemoteBrowserViewProps {
  socket: Socket | null;
  serviceId: string;
  translationSettings?: TranslationSettings;
  label?: string;
}

const RemoteBrowserView: React.FC<RemoteBrowserViewProps> = ({ socket, serviceId, translationSettings, label }) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit('fb_update_translation', {
        serviceId,
        autoTranslateIncoming: translationSettings?.autoTranslateIncoming,
        targetLang: translationSettings?.translateToLang || 'en'
    });

  }, [socket, translationSettings, serviceId, translationSettings?.autoTranslateIncoming, translationSettings?.translateToLang]);

  useEffect(() => {
    if (!socket) return;

    const handleScreenUpdate = (data: { data: string }) => {
      setImageSrc(`data:image/jpeg;base64,${data.data}`);
      setIsConnected(true);
    };

    socket.on('fb_screen_update', handleScreenUpdate);

    return () => {
      socket.off('fb_screen_update', handleScreenUpdate);
    };
  }, [socket]);

  const handleMouseEvent = (e: React.MouseEvent, type: 'click') => {
    if (!socket || !imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;

    socket.emit('fb_input_event', {
      serviceId,
      event: {
        type,
        x: x * scaleX,
        y: y * scaleY
      }
    });
  };

  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;

    if (!socket) return;
    
    if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        return;
    }

    if (e.key.length > 1) {
        socket.emit('fb_input_event', {
            serviceId,
            event: { type: 'key', key: e.key }
        });
    } else {
        socket.emit('fb_input_event', {
            serviceId,
            event: { type: 'type', text: e.key }
        });
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;

    if (!socket) return;
    e.preventDefault();

    const pastedText = e.clipboardData.getData('text');
    if (pastedText) {
        socket.emit('fb_input_event', {
            serviceId,
            event: { type: 'type', text: pastedText }
        });
    }
  };


  const handleSend = async () => {
      if (!inputValue.trim() || !socket) return;

      let textToSend = inputValue;
      
      if (translationSettings?.autoTranslateOutgoing && 
          translationSettings.translateBeforeSendingLang && 
          translationSettings.translateBeforeSendingLang !== 'auto') {
          
          setIsTranslating(true);
          try {
              const res = await fetch('/api/translate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                      text: inputValue, 
                      targetLang: translationSettings.translateBeforeSendingLang 
                  })
              });
              const data = await res.json();
              if (data.translatedText) {
                  textToSend = data.translatedText;
              }
          } catch (e) {
          } finally {
              setIsTranslating(false);
          }
      }

      socket.emit('fb_input_event', {
          serviceId,
          event: { type: 'type', text: textToSend }
      });

      setTimeout(() => {
          socket.emit('fb_input_event', {
              serviceId,
              event: { type: 'key', key: 'Enter' }
          });
      }, 100);

      setInputValue('');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
      }
      e.stopPropagation();
  };

  const displayLabel = label || 'Remote View';
  const initials = displayLabel
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div 
      className="flex-1 h-full bg-[#0f0c29] flex flex-col overflow-hidden relative"
      onKeyDown={handleContainerKeyDown}
      onPaste={handlePaste}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full bg-[#1a1a2e]/90 backdrop-blur-md border-b border-white/10 text-white p-3 text-sm flex justify-between items-center shrink-0 z-10 shadow-lg">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center border border-blue-500/30 shadow-[0_0_10px_rgba(37,99,235,0.2)]">
                <span className="font-bold text-blue-400">{initials}</span>
            </div>
            <div>
                <span className="font-semibold tracking-wide text-gray-100 block leading-tight">{displayLabel}</span>
                <span className="text-[10px] text-gray-500 font-mono tracking-wider">{serviceId}</span>
            </div>
        </div>
        <div className="flex items-center gap-4">
            {translationSettings?.autoTranslateOutgoing && (
                <div className="flex items-center gap-2 text-xs text-[#00f3ff] bg-[#00f3ff1a] border border-[#00f3ff33] px-3 py-1.5 rounded-full shadow-[0_0_10px_rgba(0,243,255,0.1)]">
                    <Languages size={12} />
                    <span>To: <span className="font-bold">{translationSettings.translateBeforeSendingLang}</span></span>
                </div>
            )}
            <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                <span className={`h-2 w-2 rounded-full shadow-[0_0_5px_currentColor] ${isConnected ? 'bg-green-500 text-green-500' : 'bg-red-500 text-red-500'}`}></span>
                <span className="text-xs text-gray-300 font-medium">{isConnected ? 'Live Stream' : 'Connecting...'}</span>
            </div>
        </div>
      </div>
      
      <div className="flex-1 w-full flex items-center justify-center overflow-auto p-4 bg-transparent relative z-0">
        {imageSrc ? (
          <div className="relative group perspective-1000">
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Remote Browser"
                className="shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 rounded-xl max-w-full max-h-full object-contain bg-white transform transition-transform duration-300"
                onClick={(e) => handleMouseEvent(e, 'click')}
                style={{ cursor: 'pointer' }}
              />
          </div>
        ) : (
          <div className="text-gray-400 flex flex-col items-center gap-6">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                </div>
            </div>
            <div className="text-center">
                <p className="text-lg font-light tracking-wide text-white">Initializing Remote Browser</p>
                <p className="text-xs text-gray-500 mt-2 tracking-widest uppercase">Secure Connection</p>
            </div>
          </div>
        )}
      </div>

      <div className="w-full bg-[#1a1a2e]/90 backdrop-blur-md p-4 border-t border-white/10 shrink-0 flex gap-3 items-center relative z-20">
          <div className="flex-1 relative group">
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={translationSettings?.autoTranslateOutgoing 
                    ? `Type here to auto-translate to ${translationSettings.translateBeforeSendingLang}...` 
                    : "Type a message to send..."}
                className="w-full bg-black/40 text-white border border-white/10 rounded-xl px-5 py-3 focus:border-[#00f3ff] focus:ring-1 focus:ring-[#00f3ff80] focus:bg-black/60 transition-all text-sm placeholder-gray-500 shadow-inner"
            />
            {isTranslating && (
                <div className="absolute right-4 top-3.5">
                    <Loader2 className="animate-spin h-4 w-4 text-[#00f3ff]" />
                </div>
            )}
          </div>
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim() || isTranslating}
            className="p-3 bg-[#00f3ff33] hover:bg-[#00f3ff66] disabled:opacity-50 disabled:hover:bg-[#00f3ff33] text-[#00f3ff] border border-[#00f3ff80] rounded-xl transition-all shadow-[0_0_15px_rgba(0,243,255,0.2)] hover:shadow-[0_0_25px_rgba(0,243,255,0.4)] active:scale-95"
          >
            <Send size={20} className="ml-0.5" />
          </button>
      </div>
    </div>
  );
};

export default RemoteBrowserView;

