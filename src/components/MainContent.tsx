import { MessageCircle, Download, Smartphone, Check, CheckCheck, Lock, RefreshCcw, Send, Mic, Smile, Clock, Search, MoreVertical, Phone, Video, X, Camera, Trash2, CornerUpLeft, Copy, ChevronLeft, Globe } from 'lucide-react';
import { IoMdAdd, IoMdRefresh } from 'react-icons/io';
import QRCode from 'react-qr-code';
import { FaWhatsapp } from 'react-icons/fa';
import type { AddedService } from '../types';
import type { TranslationSettings } from './TranslationPanel';
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import { useLanguage } from '../translations';
import ChatInfoSidebar from './ChatInfoSidebar';

interface MainContentProps {
  activeService?: AddedService;
  translationSettings?: TranslationSettings;
  onChatSelect?: (chatId: string | null) => void;
  onToggleTranslation?: () => void;
  isTranslationOpen?: boolean;
  onOpenMobileMenu?: () => void;
}

interface PendingOriginal {
    tempId: string;
    body: string;
    original: string;
    timestamp: number;
    chatId?: string;
}

const MainContent = ({ activeService, translationSettings, onChatSelect, onToggleTranslation, isTranslationOpen, onOpenMobileMenu }: MainContentProps) => {
  const { t } = useLanguage();
  const isWhatsApp = !!activeService?.service.name.toLowerCase().includes('whatsapp') || !!activeService?.service.name.toLowerCase().includes('telegram');
  const serviceName = activeService?.service.name || 'Service';
  const [qrValue, setQrValue] = useState<string>('');
  const [qrSize, setQrSize] = useState(280);
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
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  useEffect(() => {
    if (activeService) setMobileView('list');
  }, [activeService]);

  useEffect(() => {
    const updateQrSize = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      if (width < 400) {
        setQrSize(220);
      } else if (width < 640) {
        setQrSize(260);
      } else {
        setQrSize(280);
      }
    };

    updateQrSize();
    window.addEventListener('resize', updateQrSize);
    return () => window.removeEventListener('resize', updateQrSize);
  }, []);

  const [currentChatMedia, setCurrentChatMedia] = useState<any[]>([]);

    useEffect(() => {
        if (!socketRef.current) return;

        socketRef.current.on('chat_media_history', (data: { chatId: string, media: any[] }) => {
            if (data.chatId === activeChatId) {
                setCurrentChatMedia(data.media);
            }
        });

        return () => {
            socketRef.current?.off('chat_media_history');
        };
    }, [activeChatId]);

    // Handle fetching media when sidebar opens
    useEffect(() => {
        if (showContactInfo && activeChatId && socketRef.current && activeService) {
             socketRef.current.emit('command', {
                 serviceId: activeService.id,
                 command: 'get_chat_media',
                 data: { chatId: activeChatId }
             });
        }
    }, [showContactInfo, activeChatId]);

    // ... existing functions ...
    
    const handleUpdateContactName = (chatId: string, newName: string) => {
        if (socketRef.current && activeService?.id) {
            socketRef.current.emit('command', {
                serviceId: activeService.id,
                command: 'update_contact_name',
                data: { chatId, newName }
            });
            // Optimistic update
            setChats(prev => prev.map(c => c.id === chatId ? { ...c, name: newName } : c));
        }
  };

  const [activeTab, setActiveTab] = useState<'chats' | 'archived'>('chats');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, chatId: string, archived: boolean } | null>(null);
  const [msgContextMenu, setMsgContextMenu] = useState<{ x: number, y: number, msg: any } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{show: boolean, msg: any | null}>({show: false, msg: null});
  const msgMenuRef = useRef<HTMLDivElement>(null);
  const [typingStatus, setTypingStatus] = useState<Record<string, boolean>>({});

  const handleArchiveChat = (chatId: string, archive: boolean) => {
      if (socketRef.current && activeService?.id) {
          socketRef.current.emit('archive_chat', { 
              serviceId: activeService.id, 
              chatId, 
              archive 
          });
          setChats(prev => prev.map(c => c.id === chatId ? { ...c, archived: archive } : c));
          setContextMenu(null);
      }
  };

  const handleDeleteChat = (chatId: string) => {
      if (window.confirm(t.deleteChatConfirm || 'Are you sure you want to delete this chat?')) {
          if (socketRef.current && activeService?.id) {
              socketRef.current.emit('delete_chat', { 
                  serviceId: activeService.id, 
                  chatId 
              });
              // Optimistic update
              setChats(prev => prev.filter(c => c.id !== chatId));
              if (activeChatId === chatId) setActiveChatId(null);
          }
      }
      setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, chatId: string, archived: boolean) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, chatId, archived });
  };

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Context Menu Click Outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
        if (msgMenuRef.current && !msgMenuRef.current.contains(e.target as Node)) {
            setMsgContextMenu(null);
        }
        if (inputMenuRef.current && !inputMenuRef.current.contains(e.target as Node)) {
            setInputContextMenu(null);
        }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleMsgContextMenu = (e: React.MouseEvent, msg: any) => {
    e.preventDefault();
    setMsgContextMenu({ x: e.clientX, y: e.clientY, msg });
  };

  const handleInputContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setInputContextMenu({ x: e.clientX, y: e.clientY });
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ mimetype: string; data: string; filename: string }>>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [inputContextMenu, setInputContextMenu] = useState<{ x: number, y: number } | null>(null);
  const inputMenuRef = useRef<HTMLDivElement>(null);

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
    setTypingStatus({});
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

    socket.on('chat_typing', ({ chatId, isTyping }) => {
        setTypingStatus(prev => ({ ...prev, [chatId]: isTyping }));
        if (isTyping) {
            setTimeout(() => {
                setTypingStatus(prev => ({ ...prev, [chatId]: false }));
            }, 5000);
        }
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
        // 1. Update Messages Bubble
        setMessagesByChat(prev => {
            const normId = normalizeId(chatId);
            const current = prev[normId] || [];
            
            const exists = current.some(m => m.id === id);
            
            if (!exists) {
                return prev;
            }

            const updated = current.map(m => {
                // For Telegram, a Read (3) ack on a newer message implies older ones are read too.
                // But typically the event is per-message or batch. 
                // We'll update exact match.
                if (m.id === id) {
                    return { ...m, ack };
                }
                return m;
            });
            return { ...prev, [normId]: updated };
        });

        // 2. Update Sidebar Chat List (Real-time tick update on chat bar)
        setChats(prev => prev.map(c => {
            if (normalizeId(c.id) === normalizeId(chatId)) {
                // If the ACK is 'Read' (3), we update the sidebar tick.
                // Since we don't have exact lastMessageId match easily here without extra state,
                // we assume if it's a 'Read' ACK for a chat where the last message is from me,
                // it likely means the last message is read.
                if (c.lastMessageFromMe && ack >= 3) {
                    return { ...c, lastMessageAck: 3 };
                }
                // If it's a sent ACK (1), and current status is pending (0), update it.
                if (c.lastMessageFromMe && ack === 1 && (!c.lastMessageAck || c.lastMessageAck === 0)) {
                    return { ...c, lastMessageAck: 1 };
                }
            }
            return c;
        }));
    });

    socket.on('message_deleted', ({ chatId, messageId }: { chatId: string, messageId: string }) => {
        setMessagesByChat(prev => {
            const normId = normalizeId(chatId);
            const current = prev[normId] || [];
            return {
                ...prev,
                [normId]: current.filter(m => m.id !== messageId)
            };
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

  if (isWhatsApp) {
    if (isConnected || isLoadingChats) {
      return (
        <div className="flex-1 flex h-full overflow-hidden bg-white border-l border-r border-gray-200">
          {/* Left Sidebar - Chat List */}
          <div className={`w-full md:w-[360px] border-r border-gray-200 flex flex-col h-full bg-white z-10 ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 bg-gray-50/80 shrink-0 border-b border-gray-200 backdrop-blur-md">
               <div className="flex items-center gap-3">
                 {/* Back to Accounts Button (Mobile Only) */}
                 <button 
                    className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                    onClick={onOpenMobileMenu}
                 >
                    <ChevronLeft size={24} />
                 </button>
                 <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden ring-2 ring-blue-500/10 shadow-sm">
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
                    <span className="font-bold text-gray-900 text-sm tracking-wide">{myProfile?.name || "My Chats"}</span>
                    <span className="text-xs text-blue-600 font-medium">{t.online}</span>
                 </div>
               </div>
               <div className="flex gap-2 text-gray-500">
                 <button 
                    onClick={() => {
                        if (socketRef.current && activeService?.id) {
                            setIsLoadingChats(true);
                            socketRef.current.emit('force_sync_chats', activeService.id);
                        }
                    }}
                    title={t.refresh}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors hover:text-blue-600"
                 >
                    <IoMdRefresh size={20} className={isLoadingChats ? "animate-spin text-blue-600" : ""} />
                 </button>
                 <button className="p-2 hover:bg-gray-100 rounded-full transition-colors hover:text-blue-600"><MoreVertical size={20} /></button>
               </div>
            </div>
            
            {/* Search */}
            <div className="px-4 py-3 shrink-0 bg-white">
              <div className="relative group">
                <input 
                  className="w-full h-10 rounded-xl bg-gray-100 border border-transparent px-10 text-sm text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-300 placeholder-gray-500 shadow-sm group-hover:shadow-md" 
                  placeholder={t.search} 
                />
                <Search size={16} className="absolute left-3.5 top-3 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 px-4 pb-2">
                <button 
                    onClick={() => setActiveTab('chats')}
                    className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                        activeTab === 'chats' 
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                    }`}
                >
                    {t.chats || 'Chats'}
                </button>
                <button 
                    onClick={() => setActiveTab('archived')}
                    className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                        activeTab === 'archived' 
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                    }`}
                >
                    {t.archived || 'Archived'}
                </button>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto relative custom-scrollbar">
              {isLoadingChats ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md z-10">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                    <div className="mt-4 text-blue-600 text-sm font-bold tracking-widest uppercase">
                        {loadingStatus ? `${t.syncing}: ${loadingStatus.percent}%` : t.loadingChats}
                    </div>
                </div>
              ) : (
                <>
                  {chats.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                              <MessageCircle size={32} className="text-gray-400" />
                          </div>
                          <p className="text-sm font-medium">{t.noChats}</p>
                          <p className="text-xs mt-1 opacity-50">{t.refresh}</p>
                      </div>
                  )}
                  {chats.filter(c => activeTab === 'archived' ? c.archived : !c.archived).map(c => (
                    <button
                      key={c.id}
                      onContextMenu={(e) => handleContextMenu(e, c.id, !!c.archived)}
                      className={`w-full px-4 py-3.5 flex items-center gap-4 transition-all duration-300 border-l-[3px] group relative overflow-hidden ${
                        activeChatId === c.id 
                          ? 'bg-blue-50 border-blue-500 shadow-sm translate-x-1' 
                          : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-300 hover:translate-x-1'
                      }`}
                      onClick={() => {
                        setActiveChatId(c.id);
                        if (onChatSelect) onChatSelect(c.id);
                        setMobileView('chat');
                        document.title = 'UniChat';
                        setChats(prev => prev.map(chat => chat.id === c.id ? { ...chat, unreadCount: 0 } : chat));
                        
                        if (socketRef.current && activeService?.id) {
                          setLoadingHistory(true);
                          socketRef.current.emit('get_chat_history', { chatId: c.id, limit: 50, serviceId: activeService.id });
                        }
                      }}
                    >
                      <div className={`absolute inset-0 bg-blue-50 opacity-0 transition-opacity duration-300 ${activeChatId === c.id ? 'opacity-100' : 'group-hover:opacity-100'}`}></div>
                      
                      <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-gray-200 relative z-10 group-hover:border-blue-300 transition-colors">
                        <img 
                            src={c.profilePicUrl || "https://upload.wikimedia.org/wikipedia/commons/9/93/Google_Contacts_icon.svg"} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://upload.wikimedia.org/wikipedia/commons/9/93/Google_Contacts_icon.svg";
                            }}
                        />
                      </div>
                      <div className="flex-1 text-left min-w-0 z-10 relative">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-sm truncate ${c.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>{c.name || t.unknown}</span>
                          <span className={`text-[11px] ${c.unreadCount > 0 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                            {c.lastTimestamp ? new Date(c.lastTimestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                           <div className={`text-sm truncate flex-1 pr-4 ${c.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'} flex items-center gap-1`}>
                               {c.lastMessageFromMe && (
                                   <span className="shrink-0">
                                       {c.lastMessageAck === 3 ? (
                                           <CheckCheck size={14} className="text-blue-500" />
                                       ) : c.lastMessageAck === 2 ? (
                                           <CheckCheck size={14} className="text-gray-400" />
                                       ) : c.lastMessageAck === 1 ? (
                                           <Check size={14} className="text-gray-400" />
                                       ) : (
                                           <Clock size={14} className="text-gray-400" />
                                       )}
                                   </span>
                               )}
                               {typingStatus[c.id] ? (
                                   <span className="text-blue-600 font-bold animate-pulse">Typing...</span>
                               ) : (
                                   <span className="truncate">{c.lastMessage}</span>
                               )}
                           </div>
                           {c.unreadCount > 0 && (
                             <div className="min-w-[18px] h-[18px] px-1.5 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm animate-pulse">
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
            className={`flex-1 bg-transparent flex-col h-full overflow-hidden relative ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onPaste={handlePaste}
          >
            
            {/* 2FA Modal */}
            {is2FARequired && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white/95 backdrop-blur-xl w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-200 relative overflow-hidden">
                        {/* Decorative background elements */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
                        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-50"></div>

                        <div className="flex flex-col items-center text-center gap-4 relative z-10">
                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2 shadow-sm border border-blue-100 ring-1 ring-blue-50">
                                <Lock size={36} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 tracking-wide">{t.twoStepVerification}</h3>
                                <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                                    {t.twoStepDescription}
                                </p>
                                {passwordHint && (
                                    <p className="text-sm text-blue-600 mt-3 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full inline-block font-medium">
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
                                    className="w-full h-14 px-6 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all text-center text-xl tracking-[0.5em] text-gray-900 placeholder-gray-400 shadow-inner"
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
                                className={`w-full h-12 rounded-xl font-bold text-base transition-all shadow-md mt-2 flex items-center justify-center gap-2
                                    ${password2FA 
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]' 
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'}`}
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
                <div 
                    onClick={() => setShowContactInfo(prev => !prev)}
                    className="h-16 bg-white/90 border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0 backdrop-blur-md z-10 shadow-sm cursor-pointer transition-colors hover:bg-gray-50"
                >
                    <div className="flex items-center gap-2 md:gap-4">
                        <button 
                            className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setMobileView('list');
                            }}
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 overflow-hidden ring-2 ring-gray-100 shadow-sm group cursor-pointer transition-all hover:ring-blue-200 hover:shadow-md">
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
                            <div className="text-gray-900 font-bold text-sm tracking-wide">
                                {chats.find(c => c.id === activeChatId)?.name || normalizeId(activeChatId || '')}
                            </div>
                            {typingStatus[activeChatId] ? (
                                <div className="text-blue-600 text-xs font-medium flex items-center gap-1 mt-0.5 animate-pulse">
                                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                                    Typing...
                                </div>
                            ) : chats.find(c => c.id === activeChatId)?.lastSeen && (
                                <div className="text-blue-600 text-xs font-medium flex items-center gap-1 mt-0.5">
                                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                                    {chats.find(c => c.id === activeChatId)?.lastSeen}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-gray-400">
                        {/* Translation Toggle for Mobile Chat View */}
                        <button 
                            onClick={onToggleTranslation}
                            className={`md:hidden p-2 rounded-full transition-all hover:scale-110 ${
                                isTranslationOpen 
                                ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-200' 
                                : 'hover:bg-blue-50 hover:text-blue-600'
                            }`}
                        >
                            <Globe size={20} />
                        </button>
                        
                        <button className="hover:text-blue-600 transition-all hover:scale-110 hover:bg-blue-50 p-2 rounded-full"><Search size={20} /></button>
                        <button className="hover:text-blue-600 transition-all hover:scale-110 hover:bg-blue-50 p-2 rounded-full"><Phone size={20} /></button>
                        <button className="hover:text-gray-900 transition-all hover:scale-110 hover:bg-gray-100 p-2 rounded-full"><MoreVertical size={20} /></button>
                    </div>
                </div>

                <div className="flex flex-1 min-h-0 relative overflow-hidden bg-[#f0f2f5]">
                    <div className="flex-1 flex flex-col min-w-0 relative">

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {loadingHistory && (
                        <div className="flex justify-center py-4">
                            <div className="relative">
                                <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
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
                                className={`px-4 py-2.5 rounded-2xl text-[15px] shadow-sm relative group cursor-pointer transition-all duration-300 active:scale-[0.98] select-none border hover:shadow-md hover:-translate-y-0.5
                                ${m.fromMe 
                                    ? 'bg-blue-100 text-gray-900 border-blue-200 rounded-tr-none' 
                                    : 'bg-white text-gray-800 border-gray-200 rounded-tl-none hover:bg-gray-50'
                                }`}
                            >
                                {/* Quoted Message */}
                                {m.quotedMsg && (
                                    <div className={`mb-2 p-2 rounded-lg border-l-[4px] text-xs ${m.fromMe ? 'bg-white/50 border-blue-400' : 'bg-gray-100 border-blue-500'}`}>
                                        <div className={`font-bold mb-0.5 ${m.fromMe ? 'text-blue-700' : 'text-blue-600'}`}>
                                            {m.quotedMsg.fromMe ? t.you : (m.quotedMsg.author || t.contact)}
                                        </div>
                                        <div className="truncate text-gray-500 line-clamp-2">
                                            {m.quotedMsg.body}
                                        </div>
                                    </div>
                                )}

                                {/* Media Rendering */}
                                {m.media && (
                                    <div className="mb-2 rounded-lg overflow-hidden relative border border-gray-200/50">
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
                                            <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                                                <Download size={20} className="text-gray-500" />
                                                <span className="text-sm truncate max-w-[200px] text-gray-700">{m.media.filename || t.attachment}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {m.hasMedia && !m.media && (
                                    <div className="mb-2 p-3 bg-gray-50 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200"
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
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                                             <Download size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-700">{t.mediaOmitted}</span>
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
                                    <div className="mt-1 pt-1 border-t border-gray-300 text-xs opacity-70 italic">
                                        {t.original}: {m.body}
                                    </div>
                                )}
                                {(m.originalBody || outgoingOriginals[m.id]) && (
                                    <div className="mt-1 pt-1 border-t border-gray-300 text-xs opacity-70 italic">
                                        {t.original}: {m.originalBody || outgoingOriginals[m.id]}
                                    </div>
                                )}

                                {/* Metadata (Time & Ticks) */}
                                <div className={`flex items-center justify-end gap-1 mt-1 select-none ${m.fromMe ? 'text-gray-600' : 'text-gray-400'}`}>
                                    <span className="text-[10px] font-medium opacity-80">
                                        {new Date((m.timestamp || Date.now()) * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                    {m.fromMe && (
                                        <span className="ml-0.5">
                                            {(!m.ack || m.ack <= 0) && <Clock size={13} className="text-gray-500" />}
                                            {m.ack === 1 && <Check size={14} className="text-gray-500" />}
                                            {m.ack === 2 && <CheckCheck size={14} className="text-gray-500" />}
                                            {m.ack && m.ack >= 3 && <CheckCheck size={14} className="text-blue-600" />}
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
                <div className="p-4 bg-white/90 shrink-0 backdrop-blur-sm border-t border-gray-200">
                    {replyingTo && (
                        <div className="flex items-center justify-between bg-gray-50 border-l-[4px] border-blue-500 rounded-lg p-3 mb-3 shadow-sm animate-in slide-in-from-bottom-2 mx-1 backdrop-blur-md border border-gray-200 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="flex-1 min-w-0 px-2 py-1 bg-white rounded relative z-10 border border-gray-100">
                                <div className="text-blue-600 text-xs font-bold mb-0.5">
                                    {replyingTo.fromMe ? t.you : (replyingTo.author || t.contact)}
                                </div>
                                <div className="text-gray-500 text-sm truncate flex items-center gap-1">
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
                                className="p-2 ml-2 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors relative z-10"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}
                    <div className="flex items-end gap-2 bg-[#f0f2f5] px-4 py-2 border-t border-gray-200">
                        <div className="flex gap-3 pb-3 text-gray-500">
                            <button className="hover:text-gray-700 transition-colors">
                                <Smile size={24} onClick={() => setShowEmojiPicker(!showEmojiPicker)} />
                            </button>
                            <button 
                                className="hover:text-gray-700 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <IoMdAdd size={24} />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                multiple 
                                onChange={handleFileInputChange}
                            />
                        </div>
                        
                        <div className="flex-1 relative bg-white rounded-lg px-2 py-1 shadow-sm">
                             {showEmojiPicker && (
                                <div className="absolute bottom-14 left-0 z-50 shadow-2xl rounded-xl border border-gray-200 bg-white overflow-hidden">
                                    <EmojiPicker theme="light" onEmojiClick={(emojiData) => setMessageInput(prev => prev + emojiData.emoji)} />
                                </div>
                            )}
                            {pendingAttachments.length > 0 && (
                                <div className="absolute bottom-16 left-0 right-0 z-40 px-4">
                                    <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200 p-3 animate-in slide-in-from-bottom-2">
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                                                {pendingAttachments.length} {t.attachment}
                                            </span>
                                            <button 
                                                onClick={() => setPendingAttachments([])}
                                                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
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
                                                            className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                                                            alt="Preview"
                                                        />
                                                    ) : (
                                                        <div className="h-20 w-20 flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-200 text-gray-500 text-xs p-1 text-center break-all">
                                                            <Download size={20} className="mb-1 text-blue-500" />
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
                                onChange={(e) => {
                                    setMessageInput(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                onContextMenu={handleInputContextMenu}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                        const target = e.target as HTMLTextAreaElement;
                                        setTimeout(() => {
                                            target.style.height = 'auto';
                                        }, 0);
                                    }
                                }}
                                placeholder={t.typeMessage}
                                className="w-full py-2 px-2 text-gray-900 placeholder-gray-500 bg-white resize-none focus:outline-none font-normal max-h-[120px] overflow-y-auto"
                                rows={1}
                            />
                        </div>

                        <div className="pb-1 pl-1">
                            {messageInput.trim() || pendingAttachments.length > 0 ? (
                                <button 
                                    onClick={handleSendMessage}
                                    className="p-3 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-full transition-all shadow-sm active:scale-95"
                                >
                                    <Send size={20} className="ml-0.5" />
                                </button>
                            ) : (
                                <button className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors">
                                    <Mic size={24} />
                                </button>
                            )}
                        </div>
                    </div>
                    {isTranslating && (
                        <div className="text-[10px] text-blue-600 text-center mt-1 animate-pulse">{t.translated}...</div>
                    )}
                </div>
                {showContactInfo && activeChatId && (
                    <ChatInfoSidebar 
                        chat={chats.find(c => c.id === activeChatId)}
                        messages={messagesByChat[normalizeId(activeChatId)] || []}
                        fetchedMedia={currentChatMedia}
                        onClose={() => setShowContactInfo(false)}
                        onUpdateContactName={handleUpdateContactName}
                        isWhatsApp={isWhatsApp}
                    />
                )}
                </div>
                </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-center p-8">
                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-200 animate-pulse">
                        <Smartphone size={50} className="text-blue-500" />
                    </div>
                    <h2 className="text-3xl font-light text-gray-800 mb-2 tracking-widest">UniChat <span className="text-blue-600 font-bold">AI</span> Web</h2>
                    <p className="text-gray-500 max-w-md mt-4 leading-relaxed">Send and receive messages without keeping your phone online.<br/>Experience the future of communication.</p>
                    <div className="mt-8 flex items-center gap-2 text-blue-600 text-xs tracking-wider border border-blue-200 px-4 py-2 rounded-full bg-blue-50">
                        <Lock size={12} /> End-to-end encrypted
                    </div>
                </div>
            )}
          </div>
            {/* Context Menu */}
            {inputContextMenu && (
                <div 
                    ref={inputMenuRef}
                    className="fixed z-50 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200 py-1.5 min-w-[200px] animate-in fade-in zoom-in-95 duration-100 overflow-hidden ring-1 ring-gray-100"
                    style={{ 
                        top: inputContextMenu.y > window.innerHeight / 2 ? 'auto' : inputContextMenu.y,
                        bottom: inputContextMenu.y > window.innerHeight / 2 ? window.innerHeight - inputContextMenu.y : 'auto',
                        left: inputContextMenu.x > window.innerWidth / 2 ? 'auto' : inputContextMenu.x,
                        right: inputContextMenu.x > window.innerWidth / 2 ? window.innerWidth - inputContextMenu.x : 'auto'
                    }}
                >
                    <button 
                        onClick={() => {
                            navigator.clipboard.readText().then(text => setMessageInput(prev => prev + text));
                            setInputContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm text-gray-800 flex items-center gap-3 transition-colors group"
                    >
                        <Copy size={16} className="text-gray-500 group-hover:text-blue-600 transition-colors" /> {t.paste || 'Paste'}
                    </button>
                    <button 
                        onClick={() => {
                            if (messageInput) {
                                navigator.clipboard.writeText(messageInput);
                            }
                            setInputContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm text-gray-800 flex items-center gap-3 transition-colors group"
                    >
                        <Copy size={16} className="text-gray-500 group-hover:text-blue-600 transition-colors" /> {t.copy || 'Copy'}
                    </button>
                    <button 
                        onClick={() => {
                            setShowEmojiPicker(true);
                            setInputContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm text-gray-800 flex items-center gap-3 transition-colors group"
                    >
                        <Smile size={16} className="text-gray-500 group-hover:text-blue-600 transition-colors" /> {t.emoji || 'Emoji'}
                    </button>
                    <div className="h-px bg-gray-200 my-1 mx-2" />
                    <button 
                        onClick={() => {
                            setMessageInput('');
                            setInputContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-red-50 text-sm text-red-600 flex items-center gap-3 transition-colors group"
                    >
                        <Trash2 size={16} className="text-red-500 group-hover:text-red-600 transition-colors" /> {t.clear || 'Clear'}
                    </button>
                </div>
            )}

            {msgContextMenu && (
                <div 
                    ref={msgMenuRef}
                    className="fixed z-50 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200 py-1.5 min-w-[200px] animate-in fade-in zoom-in-95 duration-100 overflow-hidden ring-1 ring-gray-100"
                    style={{ 
                        top: msgContextMenu.y > window.innerHeight / 2 ? 'auto' : msgContextMenu.y,
                        bottom: msgContextMenu.y > window.innerHeight / 2 ? window.innerHeight - msgContextMenu.y : 'auto',
                        left: msgContextMenu.x > window.innerWidth / 2 ? 'auto' : msgContextMenu.x,
                        right: msgContextMenu.x > window.innerWidth / 2 ? window.innerWidth - msgContextMenu.x : 'auto'
                    }}
                >
                    {/* Quick Reactions */}
                    <div className="flex justify-between px-3 py-2 border-b border-gray-200 mb-1">
                        {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                            <button 
                                key={emoji} 
                                className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (socketRef.current && activeService?.id) {
                                        socketRef.current.emit('react_message', { 
                                            serviceId: activeService.id, 
                                            messageId: msgContextMenu.msg.id,
                                            chatId: msgContextMenu.msg.chatId,
                                            reaction: emoji
                                        });
                                    }
                                    setMsgContextMenu(null);
                                }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={() => {
                            setReplyingTo(msgContextMenu.msg);
                            setMsgContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm text-gray-800 flex items-center gap-3 transition-colors group"
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
                    
                    {/* Delete Option - Opens Modal */}
                    <button 
                        onClick={() => {
                            setDeleteModal({ show: true, msg: msgContextMenu.msg });
                            setMsgContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-red-500/10 text-sm text-red-400 flex items-center gap-3 transition-colors group"
                    >
                        <Trash2 size={16} className="text-red-400 group-hover:text-red-300 transition-colors" /> {t.delete || 'Delete'}
                    </button>
                </div>
            )}

            {/* Delete Message Modal */}
            {deleteModal.show && deleteModal.msg && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-semibold text-white mb-2">{t.deleteMessage || 'Delete message?'}</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            {deleteModal.msg.fromMe 
                                ? (t.deleteMessageConfirm || 'You can delete this message for yourself or for everyone.')
                                : (t.deleteMessageConfirmMe || 'This will delete the message from your chat history.')}
                        </p>
                        
                        <div className="flex flex-col gap-3">
                            {deleteModal.msg.fromMe && (
                                <button 
                                    onClick={() => {
                                        if (socketRef.current && activeService?.id) {
                                            socketRef.current.emit('delete_message', { 
                                                serviceId: activeService.id, 
                                                messageId: deleteModal.msg.id,
                                                chatId: deleteModal.msg.chatId,
                                                everyone: true 
                                            });
                                            // Optimistic UI update
                                            setMessagesByChat(prev => {
                                                const normId = normalizeId(deleteModal.msg.chatId);
                                                const current = prev[normId] || [];
                                                return { ...prev, [normId]: current.filter(m => m.id !== deleteModal.msg.id) };
                                            });
                                        }
                                        setDeleteModal({ show: false, msg: null });
                                    }}
                                    className="w-full py-3 bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue rounded-xl font-medium transition-colors border border-neon-blue/20"
                                >
                                    {t.deleteForEveryone || 'Delete for everyone'}
                                </button>
                            )}
                            
                            <button 
                                onClick={() => {
                                    if (socketRef.current && activeService?.id) {
                                        socketRef.current.emit('delete_message', { 
                                            serviceId: activeService.id, 
                                            messageId: deleteModal.msg.id,
                                            chatId: deleteModal.msg.chatId,
                                            everyone: false 
                                        });
                                        // Optimistic UI update
                                        setMessagesByChat(prev => {
                                            const normId = normalizeId(deleteModal.msg.chatId);
                                            const current = prev[normId] || [];
                                            return { ...prev, [normId]: current.filter(m => m.id !== deleteModal.msg.id) };
                                        });
                                    }
                                    setDeleteModal({ show: false, msg: null });
                                }}
                                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors border border-white/5"
                            >
                                {t.deleteForMe || 'Delete for me'}
                            </button>

                            <button 
                                onClick={() => setDeleteModal({ show: false, msg: null })}
                                className="w-full py-3 text-gray-400 hover:text-white transition-colors mt-2"
                            >
                                {t.cancel || 'Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat List Context Menu */}
            {contextMenu && (
                <>
                    <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)}></div>
                    <div 
                        className="fixed z-50 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl py-1 w-48 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
                        style={{ 
                        top: contextMenu.y > window.innerHeight / 2 ? 'auto' : contextMenu.y,
                        bottom: contextMenu.y > window.innerHeight / 2 ? window.innerHeight - contextMenu.y : 'auto',
                        left: contextMenu.x > window.innerWidth / 2 ? 'auto' : contextMenu.x,
                        right: contextMenu.x > window.innerWidth / 2 ? window.innerWidth - contextMenu.x : 'auto'
                    }}
                    >
                        <button 
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 hover:text-neon-blue transition-colors flex items-center gap-2"
                            onClick={() => handleArchiveChat(contextMenu.chatId, !contextMenu.archived)}
                        >
                            <Download size={14} className={contextMenu.archived ? "rotate-180" : ""} />
                            {contextMenu.archived ? (t.unarchive || 'Unarchive') : (t.archive || 'Archive')}
                        </button>
                        <button 
                            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-2"
                            onClick={() => handleDeleteChat(contextMenu.chatId)}
                        >
                            <Trash2 size={14} />
                            {t.deleteChat || 'Delete Chat'}
                        </button>
                    </div>
                </>
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

    // QR Code Screen - Only show if we actually have a QR code or status says so
    if (qrValue || connectionStatus === 'QR_READY') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-4 md:p-8 relative overflow-y-auto">
                <div className="absolute inset-0 bg-gradient-radial from-blue-100/50 via-transparent to-transparent opacity-50"></div>
                
                <div className="bg-white/90 backdrop-blur-xl p-6 md:p-12 rounded-3xl shadow-xl max-w-5xl w-full flex flex-col md:flex-row gap-8 md:gap-16 items-center border border-gray-200 relative z-10 my-auto">
                    <div className="flex-1 w-full">
                        <h1 className="text-2xl md:text-4xl font-light text-gray-800 mb-6 md:mb-10 tracking-wide text-center md:text-left">
                            {t.useServiceOnComputer} <span className="text-blue-600 font-bold">Web</span>
                        </h1>
                        {serviceName.toLowerCase().includes('telegram') || activeService?.service?.id?.startsWith('tg') ? (
                            <ol className="space-y-8 text-gray-600 text-lg">
                                <li className="flex gap-6 items-center group">
                                    <span className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 shadow-sm group-hover:bg-blue-100 transition-colors">1</span>
                                    <span className="group-hover:text-gray-900 transition-colors">{t.openAppOnPhone}</span>
                                </li>
                                <li className="flex gap-6 items-center group">
                                    <span className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 shadow-sm group-hover:bg-blue-100 transition-colors">2</span>
                                    <span className="group-hover:text-gray-900 transition-colors">{t.goToSettings}</span>
                                </li>
                                <li className="flex gap-6 items-center group">
                                    <span className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 shadow-sm group-hover:bg-blue-100 transition-colors">3</span>
                                    <span className="group-hover:text-gray-900 transition-colors">{t.tapLinkDevice}</span>
                                </li>
                                <li className="flex gap-6 items-center group">
                                    <span className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 shadow-sm group-hover:bg-blue-100 transition-colors">4</span>
                                    <span className="group-hover:text-gray-900 transition-colors">{t.pointPhone}</span>
                                </li>
                            </ol>
                        ) : (
                            <ol className="space-y-8 text-gray-600 text-lg">
                                <li className="flex gap-6 items-center group">
                                    <span className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 shadow-sm group-hover:bg-blue-100 transition-colors">1</span>
                                    <span className="group-hover:text-gray-900 transition-colors">{t.openAppOnPhone}</span>
                                </li>
                                <li className="flex gap-6 items-center group">
                                    <span className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 shadow-sm group-hover:bg-blue-100 transition-colors">2</span>
                                    <span className="group-hover:text-gray-900 transition-colors">{t.goToSettings}</span>
                                </li>
                                <li className="flex gap-6 items-center group">
                                    <span className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 shadow-sm group-hover:bg-blue-100 transition-colors">3</span>
                                    <span className="group-hover:text-gray-900 transition-colors">{t.tapLinkDevice}</span>
                                </li>
                                <li className="flex gap-6 items-center group">
                                    <span className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 shadow-sm group-hover:bg-blue-100 transition-colors">4</span>
                                    <span className="group-hover:text-gray-900 transition-colors">{t.pointPhone}</span>
                                </li>
                            </ol>
                        )}
                        <div className="mt-10 text-blue-600 font-medium cursor-pointer hover:text-blue-800 transition-colors flex items-center gap-2 group">
                            <span className="w-2 h-2 bg-blue-600 rounded-full group-hover:animate-pulse"></span>
                            {t.needHelp}
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                        <div className="relative group perspective-1000">
                            <div className="absolute -inset-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-xl opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500 animate-pulse"></div>
                            <div className="bg-white p-6 rounded-2xl shadow-lg transform transition-transform duration-500 group-hover:rotate-y-12 group-hover:rotate-x-12 group-hover:scale-105 relative z-10 border border-gray-100 overflow-hidden flex items-center justify-center">
                                {qrValue ? (
                                    <>
                                        <QRCode value={qrValue} size={qrSize} />
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent h-[15%] w-full animate-scan pointer-events-none"></div>
                                    </>
                                ) : (
                                    <div
                                        className="bg-gray-50 flex items-center justify-center animate-pulse rounded-lg relative overflow-hidden border border-gray-200"
                                        style={{ width: qrSize, height: qrSize }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                                        <div className="text-gray-400 font-medium tracking-widest uppercase text-xs z-10">{t.generatingQR}</div>
                                    </div>
                                )}
                            </div>
                            {qrValue && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm cursor-pointer rounded-2xl z-20">
                                    <div className="flex flex-col items-center gap-3 text-blue-600">
                                        <RefreshCcw size={40} className="animate-spin-slow drop-shadow-sm" />
                                        <span className="font-bold tracking-wide text-sm uppercase">{t.clickToReloadQR}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-8 flex items-center gap-3 bg-white px-6 py-3 rounded-full border border-gray-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center gap-3 text-gray-600 text-sm">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white" defaultChecked />
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
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-radial from-blue-100/50 via-transparent to-transparent opacity-50"></div>
             <div className="flex flex-col items-center relative z-10">
                 <div className="relative mb-8">
                     <div className="w-24 h-24 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin shadow-sm"></div>
                     <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-16 h-16 border-4 border-gray-100 border-b-blue-400 rounded-full animate-spin-reverse opacity-70"></div>
                     </div>
                     <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-2 h-2 bg-blue-600 rounded-full shadow-sm animate-pulse"></div>
                     </div>
                 </div>
                 <h2 className="text-3xl font-light text-gray-800 mb-3 tracking-[0.2em] uppercase">{t.connectingTo} <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">{serviceName}</span></h2>
                <p className="text-blue-600 text-sm tracking-widest uppercase animate-pulse font-medium">{t.restoringSession}</p>
            </div>
       </div>
   );
 }

 // Placeholder for other services
 return (
   <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-500 relative overflow-hidden">
      <div className="text-center relative z-10">
        <div className="group relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50"></div>
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm backdrop-blur-md relative z-10 group-hover:scale-110 transition-transform duration-500">
                <MessageCircle size={64} className="text-gray-300 group-hover:text-blue-500 transition-colors duration-500" />
            </div>
        </div>
        <p className="text-2xl font-light tracking-widest text-gray-400 group-hover:text-gray-600 transition-colors">{t.selectService}</p>
      </div>
    </div>
  );
};

export default MainContent;
