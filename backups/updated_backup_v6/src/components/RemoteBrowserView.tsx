import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Send, Languages, Loader2 } from 'lucide-react';
import type { TranslationSettings } from './TranslationPanel';

interface RemoteBrowserViewProps {
  socket: Socket | null;
  serviceId: string;
  translationSettings?: TranslationSettings;
}

const RemoteBrowserView: React.FC<RemoteBrowserViewProps> = ({ socket, serviceId, translationSettings }) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!socket) return;

    // Send translation settings to worker
    socket.emit('fb_update_translation', {
        serviceId,
        autoTranslateIncoming: translationSettings?.autoTranslateIncoming,
        targetLang: translationSettings?.translateToLang || 'en'
    });

  }, [socket, translationSettings]);

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

    // Scale coordinates if image is resized via CSS
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
    // If the event came from the input field, ignore it here to prevent double typing
    if ((e.target as HTMLElement).tagName === 'INPUT') return;

    if (!socket) return;
    
    // Check for Ctrl+V (Paste)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        // Allow default behavior to trigger onPaste
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
    // If pasting into the input field, let it handle it normally
    if ((e.target as HTMLElement).tagName === 'INPUT') return;

    if (!socket) return;
    e.preventDefault();

    const pastedText = e.clipboardData.getData('text');
    if (pastedText) {
        console.log('Pasting text to remote:', pastedText);
        socket.emit('fb_input_event', {
            serviceId,
            event: { type: 'type', text: pastedText }
        });
    }
  };


  const handleSend = async () => {
      if (!inputValue.trim() || !socket) return;

      let textToSend = inputValue;
      
      // Outgoing Translation Logic
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
              console.error('Translation failed', e);
          } finally {
              setIsTranslating(false);
          }
      }

      // Send Type Event (Types the full text)
      socket.emit('fb_input_event', {
          serviceId,
          event: { type: 'type', text: textToSend }
      });

      // Send Enter Key to submit
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
      // Stop propagation to prevent the container from catching this key
      e.stopPropagation();
  };

  return (
    <div 
      className="flex-1 h-full bg-gray-900 flex flex-col overflow-hidden"
      onKeyDown={handleContainerKeyDown}
      onPaste={handlePaste}
      tabIndex={0} // Make div focusable to capture keyboard events
      style={{ outline: 'none' }}
    >
      {/* Header */}
      <div className="w-full bg-gray-800 text-white p-2 text-sm flex justify-between items-center shrink-0 z-10 shadow-md">
        <div className="flex items-center gap-2">
            <span className="font-semibold">Facebook Remote View</span>
            <span className="text-xs text-gray-400">({serviceId})</span>
        </div>
        <div className="flex items-center gap-3">
            {translationSettings?.autoTranslateOutgoing && (
                <div className="flex items-center gap-1 text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded">
                    <Languages size={12} />
                    <span>Translating to: {translationSettings.translateBeforeSendingLang}</span>
                </div>
            )}
            <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-xs text-gray-300">{isConnected ? 'Live' : 'Connecting'}</span>
            </div>
        </div>
      </div>
      
      {/* Main Viewport */}
      <div className="flex-1 w-full flex items-center justify-center overflow-auto p-4 bg-gray-900/50">
        {imageSrc ? (
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Remote Browser"
            className="shadow-2xl border border-gray-700 max-w-full max-h-full object-contain"
            onClick={(e) => handleMouseEvent(e, 'click')}
            style={{ cursor: 'pointer' }}
          />
        ) : (
          <div className="text-gray-400 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
            <p>Connecting to Facebook Browser...</p>
            <p className="text-xs text-gray-500">Please wait while the browser initializes</p>
          </div>
        )}
      </div>

      {/* Input Bar for Translation */}
      <div className="w-full bg-white p-3 border-t border-gray-200 shrink-0 flex gap-2 items-center">
          <div className="flex-1 relative">
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={translationSettings?.autoTranslateOutgoing 
                    ? `Type here to auto-translate to ${translationSettings.translateBeforeSendingLang}...` 
                    : "Type a message..."}
                className="w-full bg-gray-100 text-gray-800 border-0 rounded-full px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
            />
            {isTranslating && (
                <div className="absolute right-3 top-2.5">
                    <Loader2 className="animate-spin h-4 w-4 text-blue-500" />
                </div>
            )}
          </div>
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim() || isTranslating}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-full transition-colors shadow-sm"
          >
            <Send size={18} />
          </button>
      </div>
    </div>
  );
};

export default RemoteBrowserView;
