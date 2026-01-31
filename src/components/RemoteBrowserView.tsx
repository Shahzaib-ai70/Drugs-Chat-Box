import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface RemoteBrowserViewProps {
  socket: Socket | null;
  serviceId: string;
}

const RemoteBrowserView: React.FC<RemoteBrowserViewProps> = ({ socket, serviceId }) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!socket) return;
    
    // If key length > 1, it's a special key (Enter, Backspace, etc.)
    // Otherwise it's a character to type
    if (e.key.length > 1) {
        socket.emit('fb_input_event', {
            serviceId,
            event: {
                type: 'key',
                key: e.key
            }
        });
    } else {
        socket.emit('fb_input_event', {
            serviceId,
            event: {
                type: 'type',
                text: e.key
            }
        });
    }
  };

  return (
    <div 
      className="flex-1 h-full bg-gray-900 flex flex-col items-center justify-center overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={0} // Make div focusable to capture keyboard events
      style={{ outline: 'none' }}
    >
      <div className="w-full bg-gray-800 text-white p-2 text-sm flex justify-between items-center">
        <span>Facebook Remote View ({serviceId})</span>
        <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
      </div>
      
      <div className="flex-1 w-full flex items-center justify-center overflow-auto p-4">
        {imageSrc ? (
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Remote Browser"
            className="shadow-2xl border border-gray-700"
            onClick={(e) => handleMouseEvent(e, 'click')}
            style={{ cursor: 'pointer', maxWidth: '100%', maxHeight: '100%' }}
          />
        ) : (
          <div className="text-gray-400 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p>Connecting to Facebook Browser...</p>
            <p className="text-xs text-gray-500">Please wait while the browser initializes</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RemoteBrowserView;
