import { MessageCircle, Download, Smartphone, Check, CheckCheck, Lock, RefreshCcw, Send, Mic, Smile, Clock, Search, MoreVertical, Phone, Video, X, Camera, Trash2, CornerUpLeft, Copy } from 'lucide-react';
import { IoMdAdd, IoMdRefresh } from 'react-icons/io';
import QRCode from 'react-qr-code';
import { FaWhatsapp, FaFacebookF } from 'react-icons/fa';
import RemoteBrowserView from './RemoteBrowserView';
import type { AddedService } from '../types';
import type { TranslationSettings } from './TranslationPanel';
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import { useLanguage } from '../translations';

interface MainContentProps {
  activeService?: AddedService;
  translationSettings?: TranslationSettings;
  onChatSelect?: (chatId: string | null) => void;
}

interface PendingOriginal {
    tempId: string;
    body: string;
    original: string;
    timestamp: number;
    chatId?: string;
}

const MainContent = ({ activeService, translationSettings, onChatSelect }: MainContentProps) => {
  const { t } = useLanguage();
  const isWhatsApp = !!activeService?.service.name.toLowerCase().includes('whatsapp') || !!activeService?.service.name.toLowerCase().includes('telegram');
  const serviceName = activeService?.service.name || 'Service';
  const [qrValue, setQrValue] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoginRequired, setIsLoginRequired] = useState(false); // For Facebook Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<{ percent: number; message: string } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(20);
  const socketRef = useRef<Socket | null>(null);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  const [chats, setChats] = useState<Array<{ id: string; name: string; isGroup: boolean; unreadCount: number; lastMessage: string; lastTimestamp: number; profilePicUrl?: string; lastSeen?: string; archived?: boolean; lastMessageFromMe?: boolean; lastMessageAck?: number }>>([]);
  const [myProfile, setMyProfile] = useState<{ name: string; id: string; profilePicUrl?: string } | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const activeChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Context Menu Click Outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
        if (msgMenuRef.current && !msgMenuRef.current.contains(e.target as Node)) {
            setMsgContextMenu(null);
        }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleMsgContextMenu = (e: React.MouseEvent, msg: any) => {
    e.preventDefault();
    setMsgContextMenu({ x: e.clientX, y: e.clientY, msg });
  };
  
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Array<{ 
    id: string; 
    chatId: string; 
    author?: string; 
    fromMe: boolean; 
    body: string; 
    timestamp: number; 
    originalBody?: string;
    type?: string;
    hasMedia?: boolean;
    media?: { mimetype: string; data: string; filename?: string };
    ack?: number;
    quotedMsg?: { id: string; body: string; author: string; fromMe: boolean };
  }>>>({});
  const [translations, setTranslations] = useState<Record<string, string>>({}); // msgId -> translated text
  const [outgoingOriginals, setOutgoingOriginals] = useState<Record<string, string>>(() => {
      try {
          const saved = localStorage.getItem('outgoing_originals');
          return saved ? JSON.parse(saved) : {};
      } catch (e) { return {}; }
  });
  
  const [pendingOriginals, setPendingOriginals] = useState<PendingOriginal[]>(() => {
      try {
          const saved = localStorage.getItem('pending_outgoing_originals');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });

  const outgoingOriginalsRef = useRef(outgoingOriginals);

  // Persist outgoing originals and keep Ref in sync
  useEffect(() => {
      outgoingOriginalsRef.current = outgoingOriginals;
      localStorage.setItem('outgoing_originals', JSON.stringify(outgoingOriginals));
  }, [outgoingOriginals]);

  useEffect(() => {
      localStorage.setItem('pending_outgoing_originals', JSON.stringify(pendingOriginals));
  }, [pendingOriginals]);

  // Recovery Logic: Restore original text mapping for messages that lost it (e.g. after refresh)
  useEffect(() => {
      if (pendingOriginals.length === 0) return;

      let changed = false;
      const newOutgoing = { ...outgoingOriginals };
      const remainingPending = [...pendingOriginals];
      const normalize = (s: string) => s ? s.trim().replace(/\s+/g, ' ') : '';

      // Iterate through all messages to find matches for pending originals
      Object.entries(messagesByChat).forEach(([chatId, msgs]) => {
          msgs.forEach(msg => {
              // Only look at real messages sent by me that don't have a mapping yet
              if (msg.fromMe && !msg.id.startsWith('temp_') && !newOutgoing[msg.id]) {
                  const matchIdx = remainingPending.findIndex(p => {
                      // If chatId is saved, use it for stricter matching
                      if (p.chatId && normalizeId(p.chatId) !== normalizeId(chatId)) return false;
                      
                      // Match logic
                      const timeDiff = Math.abs(p.timestamp - msg.timestamp);
                      const bodyMatch = normalize(p.body) === normalize(msg.body);
                      
                      return timeDiff <= 120 && bodyMatch;
                  });

                  if (matchIdx !== -1) {
                      console.log('Recovered original text for message:', msg.id);
                      newOutgoing[msg.id] = remainingPending[matchIdx].original;
                      remainingPending.splice(matchIdx, 1);
                      changed = true;
                  }
              }
          });
      });

      if (changed) {
          setOutgoingOriginals(newOutgoing);
          setPendingOriginals(remainingPending);
      }
  }, [messagesByChat]); // Run when messages update (e.g. load from history)

  const [loadingHistory, setLoadingHistory] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('CONNECTING');
  const [replyingTo, setReplyingTo] = useState<{ id: string; body: string; author?: string; fromMe: boolean; media?: any } | null>(null);
  const [msgContextMenu, setMsgContextMenu] = useState<{ x: number, y: number, msg: any } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ mimetype: string; data: string; filename: string }>>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const msgMenuRef = useRef<HTMLDivElement>(null);

  const [lastEventLog, setLastEventLog] = useState<string>('');
  
  // 2FA State
  const [is2FARequired, setIs2FARequired] = useState(false);
  const [password2FA, setPassword2FA] = useState('');
  const [passwordHint, setPasswordHint] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to normalize Chat IDs (strip suffixes)
  const normalizeId = (id: string) => {
    if (!id) return '';
    return id.split('@')[0];
  };

  // Helper to sort chats: Unread first, then by timestamp
  const sortChats = (chatsList: typeof chats) => {
      return [...chatsList].sort((a, b) => {
          const aUnread = (a.unreadCount || 0) > 0;
          const bUnread = (b.unreadCount || 0) > 0;
          if (aUnread && !bUnread) return -1;
          if (!aUnread && bUnread) return 1;
          return (b.lastTimestamp || 0) - (a.lastTimestamp || 0);
      });
  };

  const translateText = async (text: string, targetLang: string) => {
    if (!text || !text.trim()) return null;
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang })
      });
      const data = await res.json();
      if (data.error || !data.translatedText) return null; // Fallback to original
      return data.translatedText;
    } catch (e) {
      console.error('Translation failed', e);
      return null;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messagesByChat, activeChatId]);

  // Auto-translate history/existing messages when settings change or chat changes
  useEffect(() => {
      if (!activeChatId || !translationSettings?.autoTranslateIncoming || translationSettings.targetLang === 'auto') return;

      const normId = normalizeId(activeChatId);
      const messages = messagesByChat[normId] || [];

      // Find messages that need translation
      const messagesToTranslate = messages.filter(m => !m.fromMe && !translations[m.id]);

      if (messagesToTranslate.length === 0) return;

      console.log(`Auto-translating ${messagesToTranslate.length} messages to ${translationSettings.targetLang}`);

      messagesToTranslate.forEach(async (msg) => {
          const translated = await translateText(msg.body, translationSettings.targetLang);
          if (translated) {
              setTranslations(prev => ({ ...prev, [msg.id]: translated }));
          }
      });
  }, [activeChatId, translationSettings, messagesByChat]); // messagesByChat dependency ensures history load triggers this

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && pendingAttachments.length === 0) || !activeChatId || !activeService?.id) return;
    
    if (!socketRef.current) {
        console.error('CRITICAL: Socket not connected when trying to send message');
        alert(t.connectionLost);
        return;
    }

    const baseTimestamp = Math.floor(Date.now() / 1000);
    let textToSend = messageInput;
    let originalText: string | undefined = undefined;

    // Outgoing Translation
    if (textToSend.trim() && translationSettings?.autoTranslateOutgoing && 
        translationSettings.translateBeforeSendingLang && 
        translationSettings.translateBeforeSendingLang !== 'auto') {
        
        setIsTranslating(true);
        const translated = await translateText(textToSend, translationSettings.translateBeforeSendingLang);
        setIsTranslating(false);
        
        if (translated) {
            originalText = textToSend;
            textToSend = translated;
        }
    }

    // Helper to send a single message
    const sendSingleMessage = (content: string, media?: { mimetype: string; data: string; filename: string }) => {
        const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const timestamp = baseTimestamp;

        // Optimistic UI Update
        const optimisticMsg = {
            id: tempId,
            chatId: activeChatId,
            author: myProfile?.name || 'Me',
            fromMe: true,
            body: content,
            timestamp: timestamp,
            type: media ? (media.mimetype.startsWith('image/') ? 'image' : 'document') : 'chat',
            ack: 0,
            hasMedia: !!media,
            media: media,
            originalBody: (!media && originalText) ? originalText : undefined,
            quotedMsg: replyingTo ? {
                id: replyingTo.id,
                body: replyingTo.body,
                author: replyingTo.author || '',
                fromMe: replyingTo.fromMe
            } : undefined
        };

        if (originalText && !media) {
             outgoingOriginalsRef.current = { ...outgoingOriginalsRef.current, [tempId]: originalText };
             setOutgoingOriginals(prev => ({ ...prev, [tempId]: originalText! }));
             
             // Add to pending queue for recovery
             setPendingOriginals(prev => [...prev, {
                tempId,
                body: content,
                original: originalText!,
                timestamp,
                chatId: activeChatId
            }]);
        }

        setMessagesByChat(prev => {
            const normId = normalizeId(activeChatId);
            const current = prev[normId] || [];
            return { ...prev, [normId]: [...current, optimisticMsg].sort((a, b) => a.timestamp - b.timestamp) };
        });

        // Update Chat List Preview
        setChats(prevChats => {
            const updated = prevChats.map(chat => {
                if (normalizeId(chat.id) === normalizeId(activeChatId)) {
                    return {
                        ...chat,
                        lastMessage: media ? (media.mimetype.startsWith('image/') ? '📷 Photo' : '📁 File') : content,
                        lastTimestamp: timestamp
                    };
                }
                return chat;
            });
            return sortChats(updated);
        });

        // Emit Socket Event
        socketRef.current?.emit('sendMessage', {
            type: 'sendMessage',
            serviceId: activeService.id,
            chatId: activeChatId,
            body: content,
            quotedMessageId: replyingTo?.id,
            media: media
        }, (response: any) => {
            if (response?.status === 'error') {
                console.error('Failed to send:', response.error);
            } else if (response?.messageId) {
                // Update temp ID to real ID
                if (originalText && !media) {
                     setOutgoingOriginals(prev => ({ ...prev, [response.messageId]: originalText! }));
                }
                
                setMessagesByChat(prev => {
                    const normId = normalizeId(activeChatId);
                    const current = prev[normId] || [];
                    const updated = current.map(m => m.id === tempId ? { ...m, id: response.messageId } : m);
                    return { ...prev, [normId]: updated };
                });
            }
        });
    };

    // 1. Send Text Message (if any)
    if (textToSend.trim()) {
        sendSingleMessage(textToSend.trim());
    }

    // 2. Send Attachments
    const sendAttachments = async () => {
        for (let i = 0; i < pendingAttachments.length; i++) {
            const att = pendingAttachments[i];
            await new Promise(r => setTimeout(r, 200 + (i * 50))); 
            // Send media without filename as caption (empty string)
            sendSingleMessage('', att);
        }
    };

    if (pendingAttachments.length > 0) {
        sendAttachments();
    }

    setMessageInput('');
    setPendingAttachments([]);
    setReplyingTo(null);
  };

  useEffect(() => {
    // Sync read status when opening a chat
    if (activeChatId && activeService?.id && socketRef.current) {
        // Emit mark_read to backend
        socketRef.current.emit('mark_read', { 
            serviceId: activeService.id, 
            chatId: activeChatId 
        });

        // Optimistically clear unread count in UI
        setChats(prev => {
            const updated = prev.map(c => {
                if (normalizeId(c.id) === normalizeId(activeChatId)) {
                    return { ...c, unreadCount: 0 };
                }
                return c;
            });
            return sortChats(updated);
        });
    }
  }, [activeChatId, activeService]);

  useEffect(() => {
    // Clear state immediately when switching services to prevent data leak
    setChats([]);
    setMyProfile(null);
    setMessagesByChat({});
    setQrValue('');
    setIsConnected(false);
    setIsAuthenticating(false);
    setLoadingStatus(null);
    setConnectionStatus('CONNECTING');

    // Allow socket connection for WhatsApp, Telegram, AND Facebook
    // The previous check (!isWhatsApp) excluded Facebook, preventing socket connection
    if (!activeService?.id) return;

    // Connect to Gateway (Master Server)
    const socketUrl = undefined; // Connects to window.location.origin
      
    console.log(`Connecting to socket at: ${socketUrl || 'default (Gateway)'}`);

    const socket = io(socketUrl);
    socketRef.current = socket;
    setSocketInstance(socket);

    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

    // Handle connection logic
    const handleJoin = () => {
        console.log('Joining service room:', activeService.id);
        socket.emit('join_service', activeService.id);
    };

    if (socket.connected) {
        handleJoin();
    } else {
        socket.on('connect', handleJoin);
    }

    socket.on('status', (status) => {
        console.log('Status update:', status);
        setConnectionStatus(status);
        
        // If status indicates we are already connected, update state immediately
        if (status === 'CONNECTED' || status === 'AUTHENTICATED' || status === 'READY') {
            setIsConnected(true);
            setIsAuthenticating(false);
            setQrValue(''); // Clear QR code if connected
            // Don't clear chats here, as we might already have them or be about to receive them
        }
    });

    socket.on('qr', (qr) => {
      console.log('Received QR');
      if (qr === 'CONNECTED') {
        setIsConnected(true);
        setIsAuthenticating(false);
        setQrValue(''); // Clear QR code
      } else {
        setQrValue(qr);
        setSecondsLeft(20);
        setIsAuthenticating(false);
        setIsConnected(false); // Ensure we are not showing as connected if we get a QR
      }
    });

    socket.on('authenticated', () => {
        console.log('Authenticated');
        setIsAuthenticating(true);
        setQrValue(''); // Clear QR code on authentication
        // Start showing loading state
        setLoadingStatus({ percent: 0, message: t.authenticating });
        setIsLoadingChats(true);
    });

    socket.on('ready', () => {
      console.log('WhatsApp Ready');
      setIsConnected(true);
      setIsAuthenticating(false);
      setQrValue(''); // Clear QR code
      setIsLoadingChats(true);
    });
    socket.on('wa_chats', (list) => {
      setChats(Array.isArray(list) ? sortChats(list) : []);
      setIsLoadingChats(false);
      setLoadingStatus(null);
      // If we receive chats, we are definitely connected
      setIsConnected(true);
      setIsAuthenticating(false);

      // Frontend Auto-Retry: If chats are empty, try again after a delay
      if (Array.isArray(list) && list.length === 0 && isWhatsApp && activeService?.id) {
          console.log('Received empty chat list, scheduling auto-retry...');
          setTimeout(() => {
              if (socketRef.current) {
                  console.log('Auto-retrying chat sync...');
                  socketRef.current.emit('force_sync_chats', activeService.id);
              }
          }, 3000); // Retry after 3 seconds
      }
    });
    
    socket.on('wa_user_info', (info) => {
        console.log('User info received:', info);
        setMyProfile(info);
    });
    
    socket.on('wa_chat_update', (update) => {
        setChats(prev => {
            const updated = prev.map(c => {
                if (c.id === update.id) {
                    return { ...c, ...update };
                }
                return c;
            });
            return sortChats(updated);
        });
    });

    socket.on('wa_loading', ({ percent, message }) => {
        console.log(`Loading: ${percent}% - ${message}`);
        setLoadingStatus({ percent, message });
    });

    socket.on('wa_error', (err) => {
        console.error('WhatsApp Error:', err);
        // Only alert for critical auth errors, suppress transient engine errors
        if (typeof err === 'string' && (err.includes('evaluate') || err.includes('context') || err.includes('null'))) {
            return;
        }
        if (err.includes('Two-Step Verification')) {
             // Handled by tg_2fa_required
             return;
        }
        alert(t.whatsappError + ': ' + err);
    });
    
    socket.on('fb_login_required', () => {
        console.log('Facebook Login Required');
        setIsLoginRequired(true);
        setIsConnected(false);
        setIsAuthenticating(false);
        setLoadingStatus(null);
    });

    socket.on('fb_login_error', ({ message }) => {
        console.error('Facebook Login Error:', message);
        alert(t.loginFailed + ': ' + message);
        setIsAuthenticating(false);
        setLoadingStatus(null);
        setIsLoginRequired(true); // Ensure form is visible
    });

    socket.on('fb_2fa_required', () => {
        console.log('Facebook 2FA Required');
        setIs2FARequired(true);
        setIsAuthenticating(false);
        setIsConnected(false);
        setLoadingStatus(null);
    });
    
    socket.on('tg_2fa_required', ({ hint }) => {
        console.log('2FA Required, hint:', hint);
        setPasswordHint(hint || 'No hint provided');
        setIs2FARequired(true);
        setIsAuthenticating(false);
        setIsConnected(false);
        setLoadingStatus(null);
    });

    socket.on('wa_chat_history', ({ chatId, messages }) => {
      console.log(`Received history for ${chatId}: ${messages.length} msgs`);
      setLoadingHistory(false);
      
      // Hydrate messages with original bodies from local storage
      const hydratedMessages = messages.map((m: any) => {
          if (outgoingOriginalsRef.current[m.id]) {
              return { ...m, originalBody: outgoingOriginalsRef.current[m.id] };
          }
          return m;
      });

      setMessagesByChat(prev => ({
        ...prev,
        [normalizeId(chatId)]: hydratedMessages.sort((a: any, b: any) => a.timestamp - b.timestamp)
      }));
    });

    socket.on('newMessage', async (msg) => {
      console.log('New message received:', msg);
      setLastEventLog(`New Msg: ${msg.body?.substring(0, 20)}... from ${msg.chatId}`);

      // If this message belongs to the currently active chat, mark it as read immediately
      if (activeChatIdRef.current && normalizeId(activeChatIdRef.current) === normalizeId(msg.chatId)) {
           socketRef.current?.emit('mark_read', {
               serviceId: activeService.id,
               chatId: msg.chatId
           });
      }

      // Incoming Translation Logic
      if (translationSettings?.autoTranslateIncoming && translationSettings.targetLang !== 'auto') {
          if (!msg.fromMe) {
              const translated = await translateText(msg.body, translationSettings.targetLang);
              if (translated) {
                  setTranslations(prev => ({ ...prev, [msg.id]: translated }));
              }
          }
      }
      
      // Update messages for the specific chat
      setMessagesByChat(prev => {
        const normChatId = normalizeId(msg.chatId);
        const currentMessages = prev[normChatId] ? [...prev[normChatId]] : [];
        
        // Robust Deduplication & Optimistic Replacement
        if (msg.fromMe) {
            const normalize = (s: string) => s ? s.trim().replace(/\s+/g, ' ') : '';
            
            // Find if there is a pending temporary message that matches this real one
            const tempMatchIndex = currentMessages.findIndex(m => 
                m.id.startsWith('temp_') && 
                normalize(m.body) === normalize(msg.body) &&
                // Allow 120s timestamp variance for network/processing delay
                Math.abs(m.timestamp - msg.timestamp) <= 120
            );

            if (tempMatchIndex !== -1) {
                console.log('Replacing optimistic message with real message:', msg.id);
                // Replace the temp message with the real one
                const tempId = currentMessages[tempMatchIndex].id;
                
                // Copy originalBody from temp message
                if (currentMessages[tempMatchIndex].originalBody) {
                    msg.originalBody = currentMessages[tempMatchIndex].originalBody;
                    
                    // CRITICAL: Update localStorage mapping from tempId to realId immediately
                    // This ensures persistence even if callback hasn't returned yet
                    const currentOutgoingOriginals = outgoingOriginalsRef.current;
                    if (currentOutgoingOriginals[tempId]) {
                        setOutgoingOriginals(prev => {
                            const newState = { ...prev, [msg.id]: currentOutgoingOriginals[tempId] };
                            // Optional: Clean up old temp ID to save space, but keeping it is safer for race conditions
                            return newState;
                        });
                    }
                }
                
                currentMessages[tempMatchIndex] = msg;
                // Re-sort to be safe, though usually timestamp shouldn't change much
                currentMessages.sort((a, b) => a.timestamp - b.timestamp);
                return { ...prev, [normChatId]: currentMessages };
            }
        }
        
        // Standard Deduplication for incoming or already-synced messages
        // Check by ID first
        if (currentMessages.some(m => m.id === msg.id)) {
            return prev;
        }
        
        // Check by content + timestamp (fallback)
        if (currentMessages.some(m => m.timestamp === msg.timestamp && m.body === msg.body)) {
            return prev;
        }

        const updatedMessages = [...currentMessages, msg];
        updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
        
        return { ...prev, [normChatId]: updatedMessages };
      });
      
      // Update last message in chat list
      setChats(prevChats => {
          const currentActiveChatId = activeChatIdRef.current;
          
          const updated = prevChats.map(chat => {
              // Robust ID Matching Logic using normalizeId
              const isMatch = normalizeId(chat.id) === normalizeId(msg.chatId);

              if (isMatch) {
                  // Determine if we should increment unread count
                  const isActive = currentActiveChatId && normalizeId(currentActiveChatId) === normalizeId(chat.id);
                  
                  return {
                      ...chat,
                      lastMessage: msg.body,
                      lastTimestamp: msg.timestamp,
                      unreadCount: !msg.fromMe && !isActive ? (chat.unreadCount + 1) : chat.unreadCount
                  };
              }
              return chat;
          });
          return sortChats(updated);
      });

      // Show notifications and play sound
      const currentActiveChatId = activeChatIdRef.current;
      const isChatActive = currentActiveChatId && normalizeId(currentActiveChatId) === normalizeId(msg.chatId);

      if (!msg.fromMe && (document.hidden || !isChatActive)) {
         // Play sound
         const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Simple pop sound
         audio.play().catch(e => console.log('Audio play failed:', e));
         
         // Update title
         document.title = `(${msg.author || '1'}) New Message`;

         if (Notification.permission === 'granted') {
             new Notification(`New message from ${msg.author || msg.chatId}`, {
                 body: msg.body,
                 icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/1200px-WhatsApp.svg.png'
             });
         }
      }
    });

    // Listen for lazy-loaded media updates
    socket.on('media_loaded', ({ chatId, msgId, media }: { chatId: string, msgId: string, media: any }) => {
      setMessagesByChat(prev => {
        const normId = normalizeId(chatId);
        const current = prev[normId] || [];
        const updated = current.map(m => {
          if (m.id === msgId) {
            return { ...m, media };
          }
          return m;
        });
        return { ...prev, [normId]: updated };
      });
    });

    // Listen for message status updates (ticks)
    socket.on('wa_message_ack', ({ chatId, id, ack }: { chatId: string, id: string, ack: number }) => {
        setMessagesByChat(prev => {
            const normId = normalizeId(chatId);
            const current = prev[normId] || [];
            
            // Check if we have the message with this ID
            const exists = current.some(m => m.id === id);
            
            // If not found, it might be a race condition where we still have the temp ID
            // But we can't easily match real ID to temp ID here without more info.
            // However, usually the callback updates the ID first.
            
            if (!exists) {
                console.warn(`Received ack for unknown message ${id} in chat ${chatId}`);
                return prev;
            }

            const updated = current.map(m => {
                if (m.id === id) {
                    return { ...m, ack };
                }
                return m;
            });
            return { ...prev, [normId]: updated };
        });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isWhatsApp, activeService?.id]);

  useEffect(() => {
    if (!qrValue) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [qrValue]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const processFile = (file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
          const base64 = event.target?.result as string;
          const base64Data = base64.split(',')[1];
          setPendingAttachments(prev => [...prev, {
              mimetype: file.type || 'application/octet-stream',
              data: base64Data,
              filename: file.name
          }]);
      };
      reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    files.forEach(processFile);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      let hasFile = false;
      
      Array.from(items).forEach(item => {
          const blob = item.getAsFile();
          if (blob) {
              hasFile = true;
              processFile(blob);
          }
      });

      if (hasFile) {
          e.preventDefault();
      }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        Array.from(e.target.files).forEach(processFile);
        // Reset input value to allow selecting same file again
        e.target.value = '';
    }
  };

  const handleFacebookLogin = () => {
    if (!loginEmail || !loginPassword || !activeService?.id) return;
    setLoadingStatus({ percent: 10, message: t.loggingIn });
    socketRef.current?.emit('fb_login_submit', { serviceId: activeService.id, email: loginEmail, password: loginPassword });
  };

  // Render Remote Browser for Facebook
    if (activeService?.service.id.startsWith('fb')) {
        return (
            <RemoteBrowserView 
                socket={socketInstance} 
                serviceId={activeService.id} 
                translationSettings={translationSettings}
            />
        );
    }

  if (isWhatsApp) {
    if (isConnected || isLoadingChats) {
      return (
        <div className="flex-1 flex h-full overflow-hidden glass-panel border-l-0 border-r-0">
          {/* Left Sidebar - Chat List */}
          <div className="w-[360px] border-r border-white/5 flex flex-col h-full bg-transparent z-10">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 bg-black/20 shrink-0 border-b border-white/5 backdrop-blur-md">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-black/40 overflow-hidden ring-2 ring-neon-blue/30 shadow-[0_0_10px_rgba(0,243,255,0.2)]">
                   <img 
                      src={myProfile?.profilePicUrl || "https://upload.wikimedia.org/wikipedia/commons/9/93/Google_Contacts_icon.svg"} 
                      alt="Profile" 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://upload.wikimedia.org/wikipedia/commons/9/93/Google_Contacts_icon.svg";
                      }}
                   />
                 </div>
                 <div className="flex flex-col">
                    <span className="font-bold text-white text-sm tracking-wide">{myProfile?.name || "My Chats"}</span>
                    <span className="text-xs text-neon-blue font-medium drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]">{t.online}</span>
                 </div>
               </div>
               <div className="flex gap-2 text-gray-400">
                 <button 
                    onClick={() => {
                        if (socketRef.current && activeService?.id) {
                            setIsLoadingChats(true);
                            socketRef.current.emit('force_sync_chats', activeService.id);
                        }
                    }}
                    title={t.refresh}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors hover:text-white"
                 >
                    <IoMdRefresh size={20} className={isLoadingChats ? "animate-spin text-neon-blue" : ""} />
                 </button>
                 <button className="p-2 hover:bg-white/10 rounded-full transition-colors hover:text-white"><MoreVertical size={20} /></button>
               </div>
            </div>
            
            {/* Search */}
            <div className="px-4 py-3 shrink-0 bg-transparent">
              <div className="relative group perspective-500">
                <input 
                  className="w-full h-10 rounded-xl bg-black/40 border border-white/10 px-10 text-sm text-white focus:bg-black/60 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/50 transition-all duration-300 placeholder-gray-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_15px_rgba(0,243,255,0.1)]" 
                  placeholder={t.search} 
                />
                <Search size={16} className="absolute left-3.5 top-3 text-gray-500 group-hover:text-neon-blue transition-colors duration-300" />
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto relative custom-scrollbar">
              {isLoadingChats ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                     <div className="relative">
                         <div className="w-12 h-12 border-4 border-white/10 border-t-neon-blue rounded-full animate-spin shadow-[0_0_20px_rgba(0,243,255,0.5)]"></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                             <div className="w-2 h-2 bg-neon-blue rounded-full shadow-[0_0_10px_rgba(0,243,255,0.8)]"></div>
                         </div>
                     </div>
                     <div className="mt-4 text-neon-blue text-sm font-bold tracking-widest uppercase drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]">
                        {loadingStatus ? `${t.syncing}: ${loadingStatus.percent}%` : t.loadingChats}
                     </div>
                  </div>
              ) : (
                <>
                  {chats.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
                          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 shadow-inner">
                              <MessageCircle size={32} className="text-gray-600" />
                          </div>
                          <p className="text-sm font-medium">{t.noChats}</p>
                          <p className="text-xs mt-1 opacity-50">{t.refresh}</p>
                      </div>
                  )}
                  {chats.filter(c => !c.archived).map(c => (
                    <button
                      key={c.id}
                      className={`w-full px-4 py-3.5 flex items-center gap-4 transition-all duration-300 border-l-[3px] group relative overflow-hidden ${
                        activeChatId === c.id 
                          ? 'bg-gradient-to-r from-neon-blue/10 to-transparent border-neon-blue shadow-[inset_0_0_20px_rgba(0,243,255,0.1)] translate-x-1' 
                          : 'bg-[#1a1a2e]/40 border-white/5 hover:bg-[#1a1a2e]/60 hover:border-neon-blue/30 hover:translate-x-1'
                      }`}
                      onClick={() => {
                        setActiveChatId(c.id);
                        if (onChatSelect) onChatSelect(c.id);
                        document.title = 'UniChat';
                        setChats(prev => prev.map(chat => chat.id === c.id ? { ...chat, unreadCount: 0 } : chat));
                        
                        if (socketRef.current && activeService?.id) {
                          setLoadingHistory(true);
                          socketRef.current.emit('get_chat_history', { chatId: c.id, limit: 50, serviceId: activeService.id });
                        }
                      }}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-r from-neon-blue/5 to-transparent opacity-0 transition-opacity duration-300 ${activeChatId === c.id ? 'opacity-100' : 'group-hover:opacity-100'}`}></div>
                      
                      <div className="w-12 h-12 rounded-full bg-black/40 overflow-hidden shrink-0 border border-white/10 relative z-10 group-hover:border-neon-blue/30 transition-colors">
                        <img 
                            src={c.profilePicUrl || "https://upload.wikimedia.org/wikipedia/commons/9/93/Google_Contacts_icon.svg"} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://upload.wikimedia.org/wikipedia/commons/9/93/Google_Contacts_icon.svg";
                            }}
                        />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-sm truncate ${c.unreadCount > 0 ? 'font-bold text-white' : 'font-semibold text-gray-300'}`}>{c.name || t.unknown}</span>
                          <span className={`text-[11px] ${c.unreadCount > 0 ? 'text-neon-blue font-bold drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]' : 'text-gray-500'}`}>
                            {c.lastTimestamp ? new Date(c.lastTimestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                           <div className={`text-sm truncate flex-1 pr-4 ${c.unreadCount > 0 ? 'text-gray-200 font-medium' : 'text-gray-500'} flex items-center gap-1`}>
                               {c.lastMessageFromMe && (
                                   <span className="shrink-0">
                                       {c.lastMessageAck === 3 ? (
                                           <CheckCheck size={14} className="text-neon-blue" />
                                       ) : c.lastMessageAck === 2 ? (
                                           <CheckCheck size={14} className="text-gray-400" />
                                       ) : c.lastMessageAck === 1 ? (
                                           <Check size={14} className="text-gray-400" />
                                       ) : (
                                           <Clock size={14} className="text-gray-500" />
                                       )}
                                   </span>
                               )}
                               <span className="truncate">{c.lastMessage}</span>
                           </div>
                           {c.unreadCount > 0 && (
                             <div className="min-w-[18px] h-[18px] px-1.5 bg-neon-purple rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-[0_0_10px_rgba(188,19,254,0.6)] animate-pulse">
                               {c.unreadCount}
                             </div>
                           )}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Right Area - Chat Window */}
          <div 
            className="flex-1 bg-transparent flex flex-col h-full overflow-hidden relative"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onPaste={handlePaste}
          >
            
            {/* 2FA Modal */}
            {is2FARequired && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#1a1a2e]/90 backdrop-blur-xl w-full max-w-md rounded-2xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden">
                        {/* Decorative background elements */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-blue to-transparent opacity-50"></div>
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-neon-blue/20 rounded-full blur-3xl"></div>
                        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-neon-purple/20 rounded-full blur-3xl"></div>

                        <div className="flex flex-col items-center text-center gap-4 relative z-10">
                            <div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center text-neon-blue mb-2 shadow-[0_0_20px_rgba(0,243,255,0.2)] border border-white/5 ring-1 ring-white/10">
                                <Lock size={36} className="drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white tracking-wide drop-shadow-md">{t.twoStepVerification}</h3>
                                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                                    {t.twoStepDescription}
                                </p>
                                {passwordHint && (
                                    <p className="text-sm text-neon-blue mt-3 bg-neon-blue/10 border border-neon-blue/20 px-4 py-1.5 rounded-full inline-block font-medium shadow-[0_0_10px_rgba(0,243,255,0.1)]">
                                        {t.hint}: {passwordHint}
                                    </p>
                                )}
                            </div>
                            
                            <div className="w-full mt-4">
                                <input
                                    type="password"
                                    value={password2FA}
                                    onChange={(e) => setPassword2FA(e.target.value)}
                                    placeholder={t.enterPassword}
                                    className="w-full h-14 px-6 rounded-xl border border-white/10 bg-black/50 focus:bg-black/70 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/50 outline-none transition-all text-center text-xl tracking-[0.5em] text-white placeholder-gray-600 shadow-inner"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && password2FA) {
                                            if (serviceName.toLowerCase().includes('facebook')) {
                                                socketRef.current?.emit('fb_2fa_submit', { serviceId: activeService?.id, code: password2FA });
                                            } else {
                                                socketRef.current?.emit('tg_2fa_submit', { password: password2FA });
                                            }
                                            setIs2FARequired(false);
                                            setLoadingStatus({ percent: 50, message: t.verifyingPassword });
                                        }
                                    }}
                                />
                            </div>

                            <button
                                onClick={() => {
                                    if (password2FA) {
                                        if (serviceName.toLowerCase().includes('facebook')) {
                                            socketRef.current?.emit('fb_2fa_submit', { serviceId: activeService?.id, code: password2FA });
                                        } else {
                                            socketRef.current?.emit('tg_2fa_submit', { password: password2FA });
                                        }
                                        setIs2FARequired(false);
                                        setLoadingStatus({ percent: 50, message: t.verifyingPassword });
                                    }
                                }}
                                disabled={!password2FA}
                                className={`w-full h-12 rounded-xl font-bold text-base transition-all shadow-lg mt-2 flex items-center justify-center gap-2
                                    ${password2FA 
                                        ? 'bg-neon-blue text-black hover:bg-white hover:shadow-[0_0_20px_rgba(0,243,255,0.5)] active:scale-[0.98]' 
                                        : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'}`}
                            >
                                {t.verifyPassword}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Header */}
            {activeChatId ? (
                <>
                <div className="h-16 bg-[#1a1a2e]/80 border-b border-white/10 flex items-center justify-between px-6 shrink-0 backdrop-blur-xl z-10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-gray-400 overflow-hidden ring-2 ring-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)] group cursor-pointer transition-all hover:ring-neon-blue/50 hover:shadow-[0_0_20px_rgba(0,243,255,0.3)]">
                             {(() => {
                                const activeChat = chats.find(c => c.id === activeChatId);
                                return (
                                    <img 
                                        src={activeChat?.profilePicUrl || "https://upload.wikimedia.org/wikipedia/commons/9/93/Google_Contacts_icon.svg"} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = "https://upload.wikimedia.org/wikipedia/commons/9/93/Google_Contacts_icon.svg";
                                        }}
                                    />
                                );
                             })()}
                        </div>
                        <div>
                            <div className="text-white font-bold text-sm tracking-wide drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                                {chats.find(c => c.id === activeChatId)?.name || normalizeId(activeChatId || '')}
                            </div>
                            {chats.find(c => c.id === activeChatId)?.lastSeen && (
                                <div className="text-neon-blue text-xs font-medium flex items-center gap-1 drop-shadow-[0_0_5px_rgba(0,243,255,0.5)] mt-0.5">
                                    <span className="w-1.5 h-1.5 bg-neon-blue rounded-full shadow-[0_0_5px_rgba(0,243,255,1)] animate-pulse"></span>
                                    {chats.find(c => c.id === activeChatId)?.lastSeen}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-gray-400">
                        <button className="hover:text-neon-blue transition-all hover:scale-110 hover:drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]"><Search size={20} /></button>
                        <button className="hover:text-neon-blue transition-all hover:scale-110 hover:drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]"><Phone size={20} /></button>
                        <button className="hover:text-white transition-all hover:scale-110"><MoreVertical size={20} /></button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
                    {loadingHistory && (
                        <div className="flex justify-center py-4">
                            <div className="relative">
                                <div className="w-6 h-6 border-2 border-white/10 border-t-neon-blue rounded-full animate-spin shadow-[0_0_10px_rgba(0,243,255,0.5)]"></div>
                            </div>
                        </div>
                    )}
                    
                    {(messagesByChat[normalizeId(activeChatId || '')] || []).map(m => {
                        const isTranslated = !m.fromMe && translations[m.id];
                        
                        return (
                        <div key={m.id} className={`flex flex-col max-w-[70%] ${m.fromMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                            <div 
                                onDoubleClick={() => setReplyingTo(m)}
                                onContextMenu={(e) => handleMsgContextMenu(e, m)}
                                className={`px-4 py-2.5 rounded-2xl text-[15px] shadow-lg relative group cursor-pointer transition-all duration-300 active:scale-[0.98] select-none backdrop-blur-md border hover:shadow-2xl hover:-translate-y-0.5
                                ${m.fromMe 
                                    ? 'bg-gradient-to-br from-[#4a0072]/90 to-[#240046]/95 text-white border-purple-500/30 rounded-tr-none shadow-[0_0_15px_rgba(188,19,254,0.2)]' 
                                    : 'bg-[#2a2a35]/95 text-white border-white/20 rounded-tl-none hover:bg-[#323242]'
                                }`}
                            >
                                {/* Quoted Message */}
                                {m.quotedMsg && (
                                    <div className={`mb-2 p-2 rounded-lg border-l-[4px] text-xs ${m.fromMe ? 'bg-black/20 border-white/50' : 'bg-black/20 border-purple-500'}`}>
                                        <div className={`font-bold mb-0.5 ${m.fromMe ? 'text-white' : 'text-purple-400'}`}>
                                            {m.quotedMsg.fromMe ? t.you : (m.quotedMsg.author || t.contact)}
                                        </div>
                                        <div className="truncate text-gray-400 line-clamp-2">
                                            {m.quotedMsg.body}
                                        </div>
                                    </div>
                                )}

                                {/* Media Rendering */}
                                {m.media && (
                                    <div className="mb-2 rounded-lg overflow-hidden relative border border-white/10">
                                        {m.media.mimetype.startsWith('image/') && (
                                            <div 
                                                className="cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent message click/context menu
                                                    setLightboxImage(`data:${m.media!.mimetype};base64,${m.media!.data}`);
                                                }}
                                            >
                                                <img 
                                                    src={`data:${m.media.mimetype};base64,${m.media.data}`} 
                                                    alt="Media" 
                                                    className="max-w-[250px] max-h-[250px] object-cover rounded-lg"
                                                />
                                            </div>
                                        )}
                                        {m.media.mimetype.startsWith('video/') && (
                                            <video 
                                                src={`data:${m.media.mimetype};base64,${m.media.data}`} 
                                                controls
                                                className="max-w-[250px] max-h-[250px] rounded-lg"
                                            />
                                        )}
                                        {!m.media.mimetype.startsWith('image/') && !m.media.mimetype.startsWith('video/') && (
                                            <div className="flex items-center gap-2 p-3 bg-black/20 rounded-lg">
                                                <Download size={20} className="text-gray-400" />
                                                <span className="text-sm truncate max-w-[200px] text-gray-200">{m.media.filename || t.attachment}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {m.hasMedia && !m.media && (
                                    <div className="mb-2 p-3 bg-white/5 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-colors border border-white/10"
                                         onClick={(e) => {
                                             e.stopPropagation();
                                             if (socketRef.current && activeService?.id) {
                                                 socketRef.current.emit('download_media', { 
                                                     serviceId: activeService.id, 
                                                     chatId: m.chatId, 
                                                     messageId: m.id 
                                                 });
                                                 // Optional: Show loading state locally
                                             }
                                         }}
                                    >
                                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-gray-400">
                                             <Download size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-300">{t.mediaOmitted}</span>
                                            <span className="text-xs text-gray-500">{t.clickToDownload}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Message Body */}
                                {(m.body || isTranslated) && (
                                    <div className="leading-relaxed whitespace-pre-wrap break-words">
                                        {isTranslated ? translations[m.id] : m.body}
                                    </div>
                                )}
                                
                                {/* Translation Original Text */}
                                {isTranslated && (
                                    <div className="mt-1 pt-1 border-t border-white/10 text-xs text-gray-500 italic">
                                        {t.original}: {m.body}
                                    </div>
                                )}
                                {(m.originalBody || outgoingOriginals[m.id]) && (
                                    <div className="mt-1 pt-1 border-t border-white/10 text-xs text-gray-500 italic">
                                        {t.original}: {m.originalBody || outgoingOriginals[m.id]}
                                    </div>
                                )}

                                {/* Metadata (Time & Ticks) */}
                                <div className={`flex items-center justify-end gap-1 mt-1 select-none ${m.fromMe ? 'text-gray-300' : 'text-gray-500'}`}>
                                    <span className="text-[10px] font-medium opacity-80">
                                        {new Date((m.timestamp || Date.now()) * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                    {m.fromMe && (
                                        <span className="ml-0.5">
                                            {(!m.ack || m.ack <= 0) && <Clock size={13} className="text-gray-400" />}
                                            {m.ack === 1 && <Check size={14} className="text-gray-300" />}
                                            {m.ack === 2 && <CheckCheck size={14} className="text-gray-300" />}
                                            {m.ack && m.ack >= 3 && <CheckCheck size={14} className="text-[#00f3ff] drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]" />}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-transparent shrink-0 backdrop-blur-sm">
                    {replyingTo && (
                        <div className="flex items-center justify-between bg-[#1a1a2e]/80 border-l-[4px] border-neon-blue rounded-lg p-3 mb-3 shadow-xl animate-in slide-in-from-bottom-2 mx-1 backdrop-blur-md border-t border-r border-b border-white/10 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="flex-1 min-w-0 px-2 py-1 bg-white/5 rounded relative z-10">
                                <div className="text-neon-blue text-xs font-bold mb-0.5 drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]">
                                    {replyingTo.fromMe ? t.you : (replyingTo.author || t.contact)}
                                </div>
                                <div className="text-gray-400 text-sm truncate flex items-center gap-1">
                                    {replyingTo.media ? (
                                        <>
                                            <Camera size={14} /> 
                                            {replyingTo.media.mimetype.startsWith('image/') ? t.photo : t.media}
                                        </>
                                    ) : (
                                        replyingTo.body
                                    )}
                                </div>
                            </div>
                            <button 
                                onClick={() => setReplyingTo(null)}
                                className="p-2 ml-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors relative z-10"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}
                    <div className="flex items-end gap-2 bg-[#1a1a2e]/60 p-2 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-md transition-all duration-300 focus-within:border-neon-blue/50 focus-within:shadow-[0_0_15px_rgba(0,243,255,0.1)]">
                        <div className="flex gap-2 pb-2 pl-2 text-gray-400">
                            <button className="hover:text-neon-blue transition-all duration-300 p-1.5 hover:bg-white/5 rounded-full hover:drop-shadow-[0_0_5px_rgba(0,243,255,0.5)] hover:scale-110">
                                <Smile size={22} onClick={() => setShowEmojiPicker(!showEmojiPicker)} />
                            </button>
                            <button 
                                className="hover:text-neon-blue transition-all duration-300 p-1.5 hover:bg-white/5 rounded-full hover:drop-shadow-[0_0_5px_rgba(0,243,255,0.5)] hover:scale-110"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <IoMdAdd size={22} />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                multiple 
                                onChange={handleFileInputChange}
                            />
                        </div>
                        
                        <div className="flex-1 relative">

                             {showEmojiPicker && (
                                <div className="absolute bottom-14 left-0 z-50 shadow-2xl rounded-xl border border-white/10 bg-[#1a1a2e] overflow-hidden">
                                    <EmojiPicker theme="dark" onEmojiClick={(emojiData) => setMessageInput(prev => prev + emojiData.emoji)} />
                                </div>
                            )}
                            {pendingAttachments.length > 0 && (
                                <div className="absolute bottom-16 left-0 right-0 z-40 px-4">
                                    <div className="bg-[#1a1a2e]/95 backdrop-blur-xl rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/10 p-3 animate-in slide-in-from-bottom-2">
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="text-xs font-bold text-neon-blue uppercase tracking-wide drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]">
                                                {pendingAttachments.length} {t.attachment}
                                            </span>
                                            <button 
                                                onClick={() => setPendingAttachments([])}
                                                className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                            {pendingAttachments.map((att, idx) => (
                                                <div key={idx} className="relative shrink-0 group">
                                                    {att.mimetype.startsWith('image/') ? (
                                                        <img 
                                                            src={`data:${att.mimetype};base64,${att.data}`} 
                                                            className="h-20 w-20 object-cover rounded-lg border border-white/20"
                                                            alt="Preview"
                                                        />
                                                    ) : (
                                                        <div className="h-20 w-20 flex flex-col items-center justify-center bg-white/5 rounded-lg border border-white/10 text-gray-400 text-xs p-1 text-center break-all">
                                                            <Download size={20} className="mb-1 text-neon-blue" />
                                                            <span className="line-clamp-2">{att.filename || t.file}</span>
                                                        </div>
                                                    )}
                                                    <button 
                                                        onClick={() => setPendingAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <textarea
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder={t.typeMessage}
                                className="w-full max-h-[100px] py-2.5 px-2 text-white placeholder-gray-500 bg-transparent resize-none focus:outline-none custom-scrollbar font-medium"
                                rows={1}
                            />
                        </div>

                        <div className="pb-1 pr-1">
                            {messageInput.trim() || pendingAttachments.length > 0 ? (
                                <button 
                                    onClick={handleSendMessage}
                                    className="p-2.5 bg-neon-blue/20 hover:bg-neon-blue/40 text-neon-blue border border-neon-blue/50 rounded-xl transition-all shadow-[0_0_10px_rgba(0,243,255,0.3)] active:scale-95 hover:shadow-[0_0_15px_rgba(0,243,255,0.5)]"
                                >
                                    <Send size={18} className="ml-0.5" />
                                </button>
                            ) : (
                                <button className="p-2.5 text-gray-500 hover:text-neon-purple hover:bg-white/5 rounded-xl transition-colors hover:drop-shadow-[0_0_5px_rgba(188,19,254,0.5)]">
                                    <Mic size={22} />
                                </button>
                            )}
                        </div>
                    </div>
                    {isTranslating && (
                        <div className="text-[10px] text-neon-blue text-center mt-1 animate-pulse">{t.translated}...</div>
                    )}
                </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-transparent text-center p-8">
                    <div className="w-32 h-32 bg-black/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,243,255,0.1)] border border-white/5 backdrop-blur-sm animate-pulse">
                        <Smartphone size={50} className="text-neon-blue drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]" />
                    </div>
                    <h2 className="text-3xl font-light text-white mb-2 tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">UniChat <span className="text-neon-purple font-bold">AI</span> Web</h2>
                    <p className="text-gray-400 max-w-md mt-4 leading-relaxed">Send and receive messages without keeping your phone online.<br/>Experience the future of communication.</p>
                    <div className="mt-8 flex items-center gap-2 text-neon-blue/70 text-xs tracking-wider border border-neon-blue/20 px-4 py-2 rounded-full bg-black/20">
                        <Lock size={12} /> End-to-end encrypted
                    </div>
                </div>
            )}
          </div>
            {/* Context Menu */}
            {msgContextMenu && (
                <div 
                    ref={msgMenuRef}
                    className="fixed z-50 bg-[#1a1a2e]/95 backdrop-blur-xl rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/10 py-1.5 min-w-[180px] animate-in fade-in zoom-in-95 duration-100 overflow-hidden ring-1 ring-white/5"
                    style={{ 
                        top: Math.min(msgContextMenu.y, window.innerHeight - 200), 
                        left: Math.min(msgContextMenu.x, window.innerWidth - 200) 
                    }}
                >
                    <button 
                        onClick={() => {
                            setReplyingTo(msgContextMenu.msg);
                            setMsgContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm text-gray-200 flex items-center gap-3 transition-colors group"
                    >
                        <CornerUpLeft size={16} className="text-gray-400 group-hover:text-neon-blue transition-colors" /> {t.reply}
                    </button>
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(msgContextMenu.msg.body || '');
                            setMsgContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm text-gray-200 flex items-center gap-3 transition-colors group"
                    >
                        <Copy size={16} className="text-gray-400 group-hover:text-neon-blue transition-colors" /> {t.copy}
                    </button>
                    <div className="h-px bg-white/10 my-1 mx-2" />
                    <button 
                        onClick={() => {
                            if (socketRef.current && activeService?.id) {
                                socketRef.current.emit('deleteMessage', { 
                                    serviceId: activeService.id, 
                                    msgId: msgContextMenu.msg.id,
                                    chatId: msgContextMenu.msg.chatId,
                                    everyone: true 
                                });

                                // Optimistic UI update
                                setMessagesByChat(prev => {
                                    const normId = normalizeId(msgContextMenu.msg.chatId);
                                    const current = prev[normId] || [];
                                    return {
                                        ...prev,
                                        [normId]: current.filter(m => m.id !== msgContextMenu.msg.id)
                                    };
                                });
                            }
                            setMsgContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-red-500/10 text-sm text-red-400 flex items-center gap-3 transition-colors group"
                    >
                        <Trash2 size={16} className="text-red-400 group-hover:text-red-300 transition-colors" /> Delete
                    </button>
                </div>
            )}

            {/* Lightbox / Image Popup */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewImage(null)}
                >
                    <button 
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        onClick={() => setPreviewImage(null)}
                    >
                        <X size={24} />
                    </button>
                    <img 
                        src={previewImage} 
                        className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain" 
                        onClick={e => e.stopPropagation()} 
                    />
                </div>
            )}

            {/* Lightbox Modal */}
            {lightboxImage && (
                <div 
                    className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-8 animate-in fade-in duration-200"
                    onClick={() => setLightboxImage(null)}
                >
                    <button 
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        onClick={() => setLightboxImage(null)}
                    >
                        <X size={24} />
                    </button>
                    <img 
                        src={lightboxImage} 
                        className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain" 
                        onClick={e => e.stopPropagation()} 
                    />
                </div>
            )}
        </div>
      );
    }

    // Facebook Login Screen
    if (isLoginRequired) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-transparent p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-radial from-neon-blue/5 via-transparent to-transparent opacity-50"></div>
                <div className="bg-[#1a1a2e]/80 backdrop-blur-xl p-10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-md w-full border border-white/10 relative z-10">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white mb-6 shadow-[0_0_20px_rgba(37,99,235,0.5)] ring-2 ring-white/10">
                            <FaFacebookF size={40} />
                        </div>
                        <h2 className="text-3xl font-bold text-white tracking-wide">{t.loginToFacebook}</h2>
                        <p className="text-gray-400 text-center mt-3 leading-relaxed">{t.enterCredentials}</p>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">{t.emailOrPhone}</label>
                            <input 
                                type="text" 
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                className="w-full h-14 px-6 rounded-xl border border-white/10 bg-black/40 text-white placeholder-gray-600 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/50 outline-none transition-all shadow-inner"
                                placeholder="email@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">{t.password}</label>
                            <input 
                                type="password" 
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                className="w-full h-14 px-6 rounded-xl border border-white/10 bg-black/40 text-white placeholder-gray-600 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/50 outline-none transition-all shadow-inner"
                                placeholder="••••••••"
                                onKeyDown={(e) => e.key === 'Enter' && handleFacebookLogin()}
                            />
                        </div>
                        <button 
                            onClick={handleFacebookLogin}
                            disabled={!loginEmail || !loginPassword}
                            className={`w-full h-14 rounded-xl font-bold text-lg text-white transition-all shadow-lg mt-4
                                ${loginEmail && loginPassword 
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] active:scale-[0.98]' 
                                    : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'}`}
                        >
                            {t.login}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // QR Code Screen - Only show if we actually have a QR code or status says so
    if (qrValue || connectionStatus === 'QR_READY') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-transparent p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-radial from-neon-purple/5 via-transparent to-transparent opacity-50"></div>
                
                <div className="bg-[#1a1a2e]/80 backdrop-blur-xl p-12 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-5xl w-full flex gap-16 items-center border border-white/10 relative z-10">
                    <div className="flex-1">
                        <h1 className="text-4xl font-light text-white mb-10 tracking-wide drop-shadow-md">
                            {t.useServiceOnComputer} <span className="text-neon-blue font-bold">Web</span>
                        </h1>
                        {serviceName.toLowerCase().includes('telegram') || activeService?.service?.id?.startsWith('tg') ? (
                            <ol className="space-y-8 text-gray-300 text-lg">
                                <li className="flex gap-6 items-center group">
                                    <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.2)] group-hover:bg-neon-blue/10 transition-colors">1</span>
                                    <span className="group-hover:text-white transition-colors">{t.openAppOnPhone}</span>
                                </li>
                                <li className="flex gap-6 items-center group">
                                    <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.2)] group-hover:bg-neon-blue/10 transition-colors">2</span>
                                    <span className="group-hover:text-white transition-colors">{t.goToSettings}</span>
                                </li>
                                <li className="flex gap-6 items-center group">
                                    <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.2)] group-hover:bg-neon-blue/10 transition-colors">3</span>
                                    <span className="group-hover:text-white transition-colors">{t.tapLinkDevice}</span>
                                </li>
                                <li className="flex gap-6 items-center group">
                                    <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.2)] group-hover:bg-neon-blue/10 transition-colors">4</span>
                                    <span className="group-hover:text-white transition-colors">{t.pointPhone}</span>
                                </li>
                            </ol>
                        ) : (
                            <ol className="space-y-8 text-gray-300 text-lg">
                                <li className="flex gap-6 items-center group">
                                    <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.2)] group-hover:bg-neon-blue/10 transition-colors">1</span>
                                    <span className="group-hover:text-white transition-colors">{t.openAppOnPhone}</span>
                                </li>
                                <li className="flex gap-6 items-center group">
                                    <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.2)] group-hover:bg-neon-blue/10 transition-colors">2</span>
                                    <span className="group-hover:text-white transition-colors">{t.goToSettings}</span>
                                </li>
                                <li className="flex gap-6 items-center group">
                                    <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.2)] group-hover:bg-neon-blue/10 transition-colors">3</span>
                                    <span className="group-hover:text-white transition-colors">{t.tapLinkDevice}</span>
                                </li>
                                <li className="flex gap-6 items-center group">
                                    <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.2)] group-hover:bg-neon-blue/10 transition-colors">4</span>
                                    <span className="group-hover:text-white transition-colors">{t.pointPhone}</span>
                                </li>
                            </ol>
                        )}
                        <div className="mt-10 text-neon-blue font-medium cursor-pointer hover:text-white transition-colors flex items-center gap-2 group">
                            <span className="w-2 h-2 bg-neon-blue rounded-full group-hover:animate-pulse"></span>
                            {t.needHelp}
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                        <div className="relative group perspective-1000">
                            <div className="absolute -inset-4 bg-gradient-to-r from-neon-blue to-neon-purple rounded-xl opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500 animate-pulse"></div>
                            <div className="bg-white p-6 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] transform transition-transform duration-500 group-hover:rotate-y-12 group-hover:rotate-x-12 group-hover:scale-105 relative z-10 border border-white/20 overflow-hidden">
                                {qrValue ? (
                                    <>
                                        <QRCode value={qrValue} size={280} />
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-blue/20 to-transparent h-[15%] w-full animate-scan pointer-events-none"></div>
                                    </>
                                ) : (
                                    <div className="w-[280px] h-[280px] bg-gray-100 flex items-center justify-center animate-pulse rounded-lg relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                                        <div className="text-gray-400 font-medium tracking-widest uppercase text-xs z-10">{t.generatingQR}</div>
                                    </div>
                                )}
                            </div>
                            {qrValue && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm cursor-pointer rounded-2xl z-20">
                                    <div className="flex flex-col items-center gap-3 text-neon-blue">
                                        <RefreshCcw size={40} className="animate-spin-slow drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]" />
                                        <span className="font-bold tracking-wide text-sm uppercase">{t.clickToReloadQR}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-8 flex items-center gap-3 bg-white/5 px-6 py-3 rounded-full border border-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-3 text-gray-300 text-sm">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-500 text-neon-blue focus:ring-neon-blue/50 bg-transparent" defaultChecked />
                                <label className="font-medium tracking-wide">{t.keepMeSignedIn}</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Connecting / Restoring Session Screen
    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-transparent p-8 relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
             <div className="absolute inset-0 bg-gradient-radial from-neon-blue/10 via-transparent to-transparent opacity-50 animate-pulse-slow"></div>
             <div className="flex flex-col items-center relative z-10">
                 <div className="relative mb-8">
                     <div className="w-24 h-24 border-4 border-white/10 border-t-neon-blue rounded-full animate-spin shadow-[0_0_30px_rgba(0,243,255,0.4)]"></div>
                     <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-16 h-16 border-4 border-white/5 border-b-neon-purple rounded-full animate-spin-reverse opacity-70"></div>
                     </div>
                     <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-2 h-2 bg-neon-blue rounded-full shadow-[0_0_15px_rgba(0,243,255,1)] animate-pulse"></div>
                     </div>
                 </div>
                 <h2 className="text-3xl font-light text-white mb-3 tracking-[0.2em] uppercase drop-shadow-lg">{t.connectingTo} <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">{serviceName}</span></h2>
                <p className="text-neon-blue text-sm tracking-widest uppercase animate-pulse font-medium">{t.restoringSession}</p>
            </div>
       </div>
   );
 }

 // Placeholder for other services
 return (
   <div className="flex-1 flex items-center justify-center bg-[#0a0a0f] text-gray-300 relative overflow-hidden">
     <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
      <div className="text-center relative z-10">
        <div className="group relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 bg-neon-blue/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50"></div>
            <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] backdrop-blur-md relative z-10 group-hover:scale-110 transition-transform duration-500">
                <MessageCircle size={64} className="text-gray-400 group-hover:text-neon-blue transition-colors duration-500 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_20px_rgba(0,243,255,0.5)]" />
            </div>
        </div>
        <p className="text-2xl font-light tracking-widest text-gray-400 group-hover:text-white transition-colors">{t.selectService}</p>
      </div>
    </div>
  );
};

export default MainContent;