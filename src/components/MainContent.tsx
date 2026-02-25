import { MessageCircle, Download, Smartphone, Check, CheckCheck, Lock, RefreshCcw, Send, Mic, Smile, Clock, Search, MoreVertical, Phone, Video, X, Camera, Trash2, CornerUpLeft, Copy, ChevronLeft, Globe, AlertCircle } from 'lucide-react';
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
import RemoteBrowserView from './RemoteBrowserView';

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
  const serviceName = activeService?.service?.name || 'Service';
  const serviceId = activeService?.service?.id || '';
  const isWhatsApp = !!serviceName.toLowerCase().includes('whatsapp') || !!serviceName.toLowerCase().includes('telegram');
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
  const [myProfile, setMyProfile] = useState<{ name: string; id: string } | null>(null);
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
    failed?: boolean;
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

        // Update Chat List Preview (including ticks)
        setChats(prevChats => {
            const updated = prevChats.map(chat => {
                if (normalizeId(chat.id) === normalizeId(activeChatId)) {
                    return {
                        ...chat,
                        lastMessage: media ? (media.mimetype.startsWith('image/') ? '📷 Photo' : '📁 File') : content,
                        lastTimestamp: timestamp,
                        lastMessageFromMe: true,
                        lastMessageAck: 0
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
                // Mark the message as failed
                setMessagesByChat(prev => {
                    const normId = normalizeId(activeChatId);
                    const current = prev[normId] || [];
                    const updated = current.map(m => m.id === tempId ? { ...m, failed: true } : m);
                    return { ...prev, [normId]: updated };
                });
            } else if (response?.messageId) {
                // Update temp ID to real ID
                if (originalText && !media) {
                     setOutgoingOriginals(prev => ({ ...prev, [response.messageId]: originalText! }));
                }
                
                setMessagesByChat(prev => {
                    const normId = normalizeId(activeChatId);
                    const current = prev[normId] || [];
                    const updated = current.map(m => m.id === tempId ? { ...m, id: response.messageId, failed: false } : m);
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
        socketRef.current.emit('mark_read', { 
            serviceId: activeService.id, 
            chatId: activeChatId 
        });

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
    setChats([]);
    setMyProfile(null);
    setMessagesByChat({});
    setTypingStatus({});
    setQrValue('');
    setIsConnected(false);
    setIsAuthenticating(false);
    setLoadingStatus(null);
    setConnectionStatus('CONNECTING');

    if (!activeService?.id) return;

    const socketUrl = undefined;
    console.log(`Connecting to socket at: ${socketUrl || 'default (Gateway)'}`);

    const socket = io(socketUrl);
    socketRef.current = socket;
    setSocketInstance(socket);

    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

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
        
        if (status === 'CONNECTED' || status === 'AUTHENTICATED' || status === 'READY') {
            setIsConnected(true);
            setIsAuthenticating(false);
            setQrValue('');
        }
    });

    socket.on('qr', (qr) => {
      console.log('Received QR');
      if (qr === 'CONNECTED') {
        setIsConnected(true);
        setIsAuthenticating(false);
        setQrValue('');
      } else {
        setQrValue(qr);
        setSecondsLeft(20);
        setIsAuthenticating(false);
        setIsConnected(false);
      }
    });

    socket.on('authenticated', () => {
        console.log('Authenticated');
        setIsAuthenticating(true);
        setQrValue('');
        setLoadingStatus({ percent: 0, message: t.authenticating });
        setIsLoadingChats(true);
    });

    socket.on('ready', () => {
      console.log('WhatsApp Ready');
      setIsConnected(true);
      setIsAuthenticating(false);
      setQrValue('');
      setIsLoadingChats(true);
    });
    socket.on('wa_chats', (list) => {
      setChats(Array.isArray(list) ? sortChats(list) : []);
      setIsLoadingChats(false);
      setLoadingStatus(null);
      setIsConnected(true);
      setIsAuthenticating(false);

      if (Array.isArray(list) && list.length === 0 && isWhatsApp && activeService?.id) {
          console.log('Received empty chat list, scheduling auto-retry...');
          setTimeout(() => {
              if (socketRef.current) {
                  console.log('Auto-retrying chat sync...');
                  socketRef.current.emit('force_sync_chats', activeService.id);
              }
          }, 3000);
      }
    });
    
    socket.on('wa_user_info', (info) => {
        console.log('User info received:', info);
        setMyProfile({ name: info?.name || '', id: info?.id || '' });
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
        if (typeof err === 'string' && (err.includes('evaluate') || err.includes('context') || err.includes('null'))) {
            return;
        }
        if (err.includes('Two-Step Verification')) {
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

      if (activeChatIdRef.current && normalizeId(activeChatIdRef.current) === normalizeId(msg.chatId)) {
           socketRef.current?.emit('mark_read', {
               serviceId: activeService.id,
               chatId: msg.chatId
           });
      }

      if (translationSettings?.autoTranslateIncoming && translationSettings.targetLang !== 'auto') {
          if (!msg.fromMe) {
              const translated = await translateText(msg.body, translationSettings.targetLang);
              if (translated) {
                  setTranslations(prev => ({ ...prev, [msg.id]: translated }));
              }
          }
      }
      
      setMessagesByChat(prev => {
        const normChatId = normalizeId(msg.chatId);
        const currentMessages = prev[normChatId] ? [...prev[normChatId]] : [];
        
        if (msg.fromMe) {
            const normalize = (s: string) => s ? s.trim().replace(/\s+/g, ' ') : '';
            
            const tempMatchIndex = currentMessages.findIndex(m => 
                m.id.startsWith('temp_') && 
                normalize(m.body) === normalize(msg.body) &&
                Math.abs(m.timestamp - msg.timestamp) <= 120
            );

            if (tempMatchIndex !== -1) {
                console.log('Replacing optimistic message with real message:', msg.id);
                const tempId = currentMessages[tempMatchIndex].id;
                
                if (currentMessages[tempMatchIndex].originalBody) {
                    msg.originalBody = currentMessages[tempMatchIndex].originalBody;
                    
                    const currentOutgoingOriginals = outgoingOriginalsRef.current;
                    if (currentOutgoingOriginals[tempId]) {
                        setOutgoingOriginals(prev => ({ ...prev, [msg.id]: currentOutgoingOriginals[tempId] }));
                    }
                }
                
                currentMessages[tempMatchIndex] = msg;
                currentMessages.sort((a, b) => a.timestamp - b.timestamp);
                return { ...prev, [normChatId]: currentMessages };
            }
        }
        
        if (currentMessages.some(m => m.id === msg.id)) {
            return prev;
        }
        
        if (currentMessages.some(m => m.timestamp === msg.timestamp && m.body === msg.body)) {
            return prev;
        }

        const updatedMessages = [...currentMessages, msg];
        updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
        
        return { ...prev, [normChatId]: updatedMessages };
      });
      
      setChats(prevChats => {
          const currentActiveChatId = activeChatIdRef.current;
          
          const updated = prevChats.map(chat => {
              const isMatch = normalizeId(chat.id) === normalizeId(msg.chatId);

              if (isMatch) {
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

      const currentActiveChatId = activeChatIdRef.current;
      const isChatActive = currentActiveChatId && normalizeId(currentActiveChatId) === normalizeId(msg.chatId);

      if (!msg.fromMe && (document.hidden || !isChatActive)) {
         const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
         audio.play().catch(e => console.log('Audio play failed:', e));
         
         document.title = `(${msg.author || '1'}) New Message`;

         if (Notification.permission === 'granted') {
             new Notification(`New message from ${msg.author || msg.chatId}`, {
                 body: msg.body,
                 icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/1200px-WhatsApp.svg.png'
             });
         }
      }
    });

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

    socket.on('wa_message_ack', ({ chatId, id, ack }: { chatId: string, id: string, ack: number }) => {
        setMessagesByChat(prev => {
            const normId = normalizeId(chatId);
            const current = prev[normId] || [];
            
            const exists = current.some(m => m.id === id);
            
            if (!exists) {
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

        setChats(prev => prev.map(c => {
            if (normalizeId(c.id) === normalizeId(chatId)) {
                if (c.lastMessageFromMe && ack >= 3) {
                    return { ...c, lastMessageAck: 3 };
                }
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

  // QR Code Timer
  useEffect(() => {
    if (!qrValue) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [qrValue]);

  // Fetch chat history when activeChatId changes
  useEffect(() => {
    if (activeChatId && activeService?.id && socketRef.current) {
      const normId = normalizeId(activeChatId);
      // Only fetch if history is not already loaded
      if (!messagesByChat[normId]) {
        setLoadingHistory(true);
        socketRef.current.emit('get_chat_history', { 
            serviceId: activeService.id, 
            chatId: activeChatId,
            limit: 50 
        });
      }
    }
  }, [activeChatId, activeService?.id]);

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    onChatSelect?.(chatId);
    setMobileView('chat');
  };

  const handleBackToList = () => {
    setActiveChatId(null);
    onChatSelect?.(null);
    setMobileView('list');
  };

  const activeChat = chats.find(c => c.id === activeChatId);
  const messages = activeChatId ? messagesByChat[normalizeId(activeChatId)] || [] : [];

  const handleRetrySend = (msg: any) => {
    // Remove the failed message and resend
    setMessagesByChat(prev => {
        const normId = normalizeId(msg.chatId);
        const current = prev[normId] || [];
        return { ...prev, [normId]: current.filter(m => m.id !== msg.id) };
    });
    
    // A bit of a hack: set state and call send
    setMessageInput(msg.body);
    if (msg.quotedMsg) {
        setReplyingTo(msg.quotedMsg);
    }
    // This is imperfect as it doesn't re-queue attachments, but it's a start
    setTimeout(() => handleSendMessage(), 50);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setMsgContextMenu(null);
  };

  const handleDeleteMessage = (msg: any) => {
    setDeleteModal({show: true, msg});
    setMsgContextMenu(null);
  };

  const confirmDeleteMessage = () => {
    const msg = deleteModal.msg;
    if (!msg || !socketRef.current || !activeService?.id) return;

    socketRef.current.emit('delete_message', {
        serviceId: activeService.id,
        chatId: msg.chatId,
        messageId: msg.id,
        forEveryone: msg.fromMe // Only allow "for everyone" if it's my message
    });

    // Optimistic update
    setMessagesByChat(prev => {
        const normId = normalizeId(msg.chatId);
        const current = prev[normId] || [];
        return { ...prev, [normId]: current.filter(m => m.id !== msg.id) };
    });

    setDeleteModal({show: false, msg: null});
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target?.result) {
                        const base64 = (event.target.result as string).split(',')[1];
                        setPendingAttachments(prev => [...prev, {
                            mimetype: file.type,
                            data: base64,
                            filename: file.name
                        }]);
                    }
                };
                reader.readAsDataURL(file);
            }
        }
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    const base64 = (event.target.result as string).split(',')[1];
                    setPendingAttachments(prev => [...prev, {
                        mimetype: file.type,
                        data: base64,
                        filename: file.name
                    }]);
                }
            };
            reader.readAsDataURL(file);
        });
    }
  };

  const renderMessageBody = (msg: any) => {
    const text = translations[msg.id] || msg.body;
    const original = msg.originalBody || outgoingOriginals[msg.id];

    const formatText = (txt: string) => {
        // Basic formatting: *bold*, _italic_, ~strike~
        const parts = txt.split(/(\*.*?\*|_.*?_|~.*?~)/g);
        return parts.map((part, i) => {
            if (part.startsWith('*') && part.endsWith('*')) {
                return <strong key={i}>{part.slice(1, -1)}</strong>;
            }
            if (part.startsWith('_') && part.endsWith('_')) {
                return <em key={i}>{part.slice(1, -1)}</em>;
            }
            if (part.startsWith('~') && part.endsWith('~')) {
                return <s key={i}>{part.slice(1, -1)}</s>;
            }
            return part;
        });
    };

    return (
        <div>
            {formatText(text)}
            {original && (
                <span className="text-xs text-gray-400 block mt-1 opacity-80">
                    ({t.original || 'Original'}: {original})
                </span>
            )}
        </div>
    );
  };

  const renderContent = () => {
    if (!activeService) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <MessageCircle className="w-24 h-24 mb-4" />
          <p className="text-lg">{t.selectService}</p>
        </div>
      );
    }

    if (connectionStatus === 'CONNECTING' || isAuthenticating) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-lg">{loadingStatus ? `${loadingStatus.message} (${loadingStatus.percent}%)` : (t.connecting || 'Connecting...')}</p>
          <p className="text-sm text-gray-400 mt-2">Service: {serviceName} ({serviceId})</p>
        </div>
      );
    }

    if (connectionStatus === 'INIT_FAILED') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
                <AlertCircle className="w-24 h-24 mb-4" />
                <p className="text-lg font-bold">{t.initFailed || 'Initialization Failed'}</p>
                <p className="text-sm text-gray-300 max-w-md text-center mt-2">
                    {t.initFailedDesc || 'The service worker failed to start. This can happen on resource-constrained servers. Please try again in a few moments.'}
                </p>
                <button 
                    onClick={() => socketRef.current?.emit('command', { serviceId, command: 'force_sync_chats' })}
                    className="mt-6 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center"
                >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    {t.tryAgain || 'Try Again'}
                </button>
            </div>
        );
    }

    if (is2FARequired) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
                <Lock className="w-16 h-16 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t.twoFactorAuth || 'Two-Factor Authentication Required'}</h3>
                <p className="text-sm mb-4">{passwordHint ? `${t.passwordHint || 'Hint'}: ${passwordHint}` : t.enterPassword}</p>
                <input 
                    type="password"
                    value={password2FA}
                    onChange={(e) => setPassword2FA(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && password2FA) {
                            socketRef.current?.emit('command', { serviceId, command: 'tg_password', data: password2FA });
                            setIs2FARequired(false);
                        }
                    }}
                    className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 mb-4 w-64 text-center"
                    placeholder={t.yourPassword || "Your Password"}
                />
                <button
                    onClick={() => {
                        if (password2FA) {
                            socketRef.current?.emit('command', { serviceId, command: 'tg_password', data: password2FA });
                            setIs2FARequired(false);
                        }
                    }}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                    {t.submit || 'Submit'}
                </button>
            </div>
        );
    }

    if (qrValue) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-800 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <QRCode value={qrValue} size={qrSize} />
          </div>
          <div className="mt-6 text-center text-white">
            <h2 className="text-2xl font-bold">{t.scanToConnect}</h2>
            <p className="mt-2">{t.scanInstructions.replace('{service}', serviceName)}</p>
            <div className="mt-4 text-lg font-mono bg-gray-900 px-3 py-1 rounded-md inline-block">
              {secondsLeft}s
            </div>
          </div>
        </div>
      );
    }

    if (isLoginRequired) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
                <h3 className="text-xl font-semibold mb-4">Facebook Login Required</h3>
                <input 
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 mb-2 w-72"
                    placeholder="Email or Phone Number"
                />
                <input 
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 mb-4 w-72"
                    placeholder="Password"
                />
                <button
                    onClick={() => {
                        socketRef.current?.emit('fb_login', { serviceId, email: loginEmail, password: loginPassword });
                        setIsLoginRequired(false);
                        setIsAuthenticating(true);
                    }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                    Log In
                </button>
            </div>
        );
    }

    if (connectionStatus !== 'AUTHENTICATED' && connectionStatus !== 'READY' && !isLoadingChats) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Smartphone className="w-24 h-24 mb-4" />
                <p className="text-lg">{t.waitingForDevice}</p>
                <p className="text-sm mt-2">{t.status}: <span className="font-semibold text-yellow-400">{connectionStatus}</span></p>
            </div>
        );
    }

    return (
      <div className={`flex h-full bg-gray-900 text-white ${activeService ? '' : 'items-center justify-center'}`}>
        {/* Chat List */}
        <div className={`w-full md:w-1/3 lg:w-1/4 border-r border-gray-700 flex flex-col ${mobileView === 'chat' ? 'hidden md:flex' : ''}`}>
          {/* Header */}
          <header className="p-3 border-b border-gray-700 flex items-center justify-between bg-gray-800">
            <div className="flex items-center">
                <button onClick={onOpenMobileMenu} className="md:hidden mr-3 p-1 rounded-full hover:bg-gray-700">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gray-600 mr-3 relative">
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-500 to-green-400 flex items-center justify-center text-lg font-bold">
                        {myProfile?.name ? myProfile.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>
                <div>
                    <h2 className="font-semibold text-lg">{myProfile?.name || serviceName}</h2>
                    <p className="text-xs text-gray-400">{connectionStatus}</p>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={() => socketRef.current?.emit('command', { serviceId, command: 'force_sync_chats' })} className="p-2 rounded-full hover:bg-gray-700">
                    <RefreshCcw className="w-5 h-5" />
                </button>
            </div>
          </header>

          {/* Search and Tabs */}
          <div className="p-2 bg-gray-800 border-b border-gray-700">
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" placeholder={t.search || "Search chats..."} className="w-full bg-gray-900 rounded-full pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="mt-2 flex border border-gray-700 rounded-md">
                  <button 
                      onClick={() => setActiveTab('chats')}
                      className={`w-1/2 py-1 text-sm rounded-l-md ${activeTab === 'chats' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                  >
                      {t.chats || 'Chats'}
                  </button>
                  <button 
                      onClick={() => setActiveTab('archived')}
                      className={`w-1/2 py-1 text-sm rounded-r-md ${activeTab === 'archived' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                  >
                      {t.archived || 'Archived'}
                  </button>
              </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingChats ? (
                <div className="flex items-center justify-center h-full text-gray-400">{t.loadingChats}...</div>
            ) : (
                chats.filter(c => activeTab === 'archived' ? c.archived : !c.archived).map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => handleSelectChat(chat.id)}
                    onContextMenu={(e) => handleContextMenu(e, chat.id, chat.archived || false)}
                    className={`p-3 flex items-center cursor-pointer hover:bg-gray-700 ${activeChatId === chat.id ? 'bg-blue-800' : ''}`}
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-600 mr-3 relative flex-shrink-0">
                        {chat.profilePicUrl ? (
                            <img src={chat.profilePicUrl} alt={chat.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xl font-bold">
                                {chat.name ? chat.name.charAt(0).toUpperCase() : '#'}
                            </div>
                        )}
                        {typingStatus[chat.id] && (
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800 animate-pulse"></div>
                        )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold truncate">{chat.name}</h3>
                        <p className="text-xs text-gray-400 whitespace-nowrap">{new Date((chat.lastTimestamp || 0) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="flex justify-between items-start">
                        <p className="text-sm text-gray-400 truncate flex items-center">
                            {chat.lastMessageFromMe && (
                                <span className="mr-1">
                                    {chat.lastMessageAck === 3 ? <CheckCheck className="w-4 h-4 text-blue-400" /> :
                                     chat.lastMessageAck === 2 ? <CheckCheck className="w-4 h-4" /> :
                                     chat.lastMessageAck === 1 ? <Check className="w-4 h-4" /> :
                                     <Clock className="w-3 h-3" />}
                                </span>
                            )}
                            {typingStatus[chat.id] ? <span className="text-green-400 italic">{t.typing}...</span> : chat.lastMessage}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ml-2">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col bg-gray-800 ${mobileView === 'list' ? 'hidden md:flex' : ''}`}>
          {activeChat ? (
            <>
              {/* Chat Header */}
              <header className="p-3 border-b border-gray-700 flex items-center justify-between bg-gray-800">
                <div className="flex items-center">
                    <button onClick={handleBackToList} className="md:hidden mr-3 p-1 rounded-full hover:bg-gray-700">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gray-600 mr-3 cursor-pointer" onClick={() => setShowContactInfo(true)}>
                        {activeChat.profilePicUrl ? (
                            <img src={activeChat.profilePicUrl} alt={activeChat.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                             <div className="w-full h-full rounded-full bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center text-xl font-bold">
                                {activeChat.name ? activeChat.name.charAt(0).toUpperCase() : '#'}
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="font-semibold cursor-pointer" onClick={() => setShowContactInfo(true)}>{activeChat.name}</h2>
                        <p className="text-xs text-gray-400">{typingStatus[activeChat.id] ? <span className="italic text-green-400">{t.typing}...</span> : activeChat.lastSeen || 'online'}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 rounded-full hover:bg-gray-700">
                    <Search className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full hover:bg-gray-700">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full hover:bg-gray-700">
                    <Video className="w-5 h-5" />
                  </button>
                  <button onClick={onToggleTranslation} className={`p-2 rounded-full ${isTranslationOpen ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                    <Globe className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full hover:bg-gray-700">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </header>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 bg-cover bg-center" style={{ backgroundImage: "url('/bg-chat.jpg')" }}>
                {loadingHistory ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const prevMsg = messages[index - 1];
                        const showAuthor = !msg.fromMe && (!prevMsg || prevMsg.fromMe || msg.author !== prevMsg.author);
                        return (
                            <div key={msg.id} className={`flex mb-2 ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                                <div 
                                    onContextMenu={(e) => handleMsgContextMenu(e, msg)}
                                    className={`rounded-lg px-3 py-2 max-w-lg relative group ${msg.fromMe ? 'bg-green-900' : 'bg-gray-700'}`}
                                >
                                    {activeChat.isGroup && showAuthor && (
                                        <p className="text-xs font-semibold text-pink-400 mb-1">{msg.author}</p>
                                    )}
                                    
                                    {msg.quotedMsg && (
                                        <div className="border-l-2 border-blue-400 pl-2 mb-2 text-sm opacity-80">
                                            <p className="font-semibold">{msg.quotedMsg.fromMe ? (myProfile?.name || 'Me') : (msg.quotedMsg.author || 'Someone')}</p>
                                            <p className="truncate">{msg.quotedMsg.body}</p>
                                        </div>
                                    )}

                                    {msg.hasMedia && !msg.media && (
                                        <div className="flex flex-col items-center justify-center p-4">
                                            <Download className="w-6 h-6 mb-2 animate-pulse" />
                                            <p className="text-xs">{t.loadingMedia || 'Loading media...'}</p>
                                        </div>
                                    )}

                                    {msg.media && (
                                        msg.media.mimetype.startsWith('image/') ? (
                                            <img 
                                                src={`data:${msg.media.mimetype};base64,${msg.media.data}`} 
                                                alt={msg.media.filename || 'Image'}
                                                className="rounded-md max-w-xs max-h-80 mb-1 cursor-pointer"
                                                onClick={() => setLightboxImage(`data:${msg.media.mimetype};base64,${msg.media.data}`)}
                                            />
                                        ) : (
                                            <div className="flex items-center bg-gray-800 p-2 rounded-md">
                                                <Download className="w-6 h-6 mr-3" />
                                                <div>
                                                    <p className="font-semibold">{msg.media.filename || 'File'}</p>
                                                    <p className="text-xs text-gray-400">{msg.media.mimetype}</p>
                                                </div>
                                            </div>
                                        )
                                    )}
                                    
                                    {renderMessageBody(msg)}

                                    <div className="text-xs text-gray-400 text-right mt-1 flex items-center justify-end">
                                        {new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {msg.fromMe && (
                                            <span className="ml-1">
                                                {msg.failed ? <AlertCircle className="w-4 h-4 text-red-500 cursor-pointer" onClick={() => handleRetrySend(msg)} /> :
                                                 msg.ack === 3 ? <CheckCheck className="w-4 h-4 text-blue-400" /> :
                                                 msg.ack === 2 ? <CheckCheck className="w-4 h-4" /> :
                                                 msg.ack === 1 ? <Check className="w-4 h-4" /> :
                                                 <Clock className="w-3 h-3" />}
                                            </span>
                                        )}
                                    </div>
                                    <div className="absolute top-0 -right-8 hidden group-hover:flex items-center">
                                        <button onClick={() => setReplyingTo(msg)} className="p-1 bg-gray-600 rounded-full hover:bg-gray-500">
                                            <CornerUpLeft className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-3 bg-gray-800 border-t border-gray-700">
                {replyingTo && (
                    <div className="bg-gray-700 p-2 rounded-t-md flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-sm text-blue-400">{t.replyingTo} {replyingTo.fromMe ? (myProfile?.name || 'Me') : (replyingTo.author || activeChat.name)}</p>
                            <p className="text-xs truncate text-gray-300">{replyingTo.body}</p>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="p-1 rounded-full hover:bg-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                {pendingAttachments.length > 0 && (
                    <div className="p-2 border-b border-gray-700">
                        <p className="text-sm font-semibold mb-2">{t.attachments || 'Attachments'}:</p>
                        <div className="flex flex-wrap gap-2">
                            {pendingAttachments.map((att, i) => (
                                <div key={i} className="bg-gray-700 p-2 rounded-md flex items-center">
                                    <p className="text-xs truncate max-w-xs">{att.filename}</p>
                                    <button onClick={() => setPendingAttachments(p => p.filter((_, idx) => idx !== i))} className="ml-2 p-1 rounded-full hover:bg-gray-600">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="flex items-center" onPaste={handlePaste}>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 rounded-full hover:bg-gray-700">
                      <Smile className="w-6 h-6" />
                    </button>
                    {showEmojiPicker && (
                        <div className="absolute bottom-20">
                            <EmojiPicker onEmojiClick={(emoji) => setMessageInput(prev => prev + emoji.emoji)} />
                        </div>
                    )}
                    <label htmlFor="attachment-input" className="p-2 rounded-full hover:bg-gray-700 cursor-pointer">
                      <Camera className="w-6 h-6" />
                      <input id="attachment-input" type="file" multiple onChange={handleAttachmentChange} className="hidden" />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    onContextMenu={handleInputContextMenu}
                    placeholder={t.typeMessage || "Type a message..."}
                    className="flex-1 bg-gray-700 rounded-full px-4 py-2 mx-2 focus:outline-none"
                    disabled={isTranslating}
                  />
                  <button onClick={handleSendMessage} className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600" disabled={isTranslating}>
                    {isTranslating ? <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"></div> : <Send className="w-6 h-6" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageCircle className="w-24 h-24 mb-4" />
              <p className="text-lg">{t.selectChat}</p>
            </div>
          )}
        </div>

        {/* Contact Info Sidebar */}
        {activeChat && (
            <ChatInfoSidebar 
                isOpen={showContactInfo} 
                onClose={() => setShowContactInfo(false)}
                chat={activeChat}
                media={currentChatMedia}
                onUpdateName={handleUpdateContactName}
            />
        )}

        {/* Context Menus */}
        {contextMenu && (
            <div 
                className="absolute bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 z-50"
                style={{ top: contextMenu.y, left: contextMenu.x }}
                onClick={() => setContextMenu(null)}
            >
                <button onClick={() => handleArchiveChat(contextMenu.chatId, !contextMenu.archived)} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-700">
                    {contextMenu.archived ? t.unarchive : t.archive}
                </button>
                <button onClick={() => handleDeleteChat(contextMenu.chatId)} className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-700">
                    {t.delete}
                </button>
            </div>
        )}

        {msgContextMenu && (
            <div 
                ref={msgMenuRef}
                className="absolute bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 z-50"
                style={{ top: msgContextMenu.y, left: msgContextMenu.x }}
            >
                <button onClick={() => { setReplyingTo(msgContextMenu.msg); setMsgContextMenu(null); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-700">{t.reply}</button>
                <button onClick={() => handleCopyText(msgContextMenu.msg.body)} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-700">{t.copy}</button>
                <button onClick={() => handleDeleteMessage(msgContextMenu.msg)} className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-700">{t.delete}</button>
            </div>
        )}

        {inputContextMenu && (
            <div
                ref={inputMenuRef}
                className="absolute bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 z-50"
                style={{ top: inputContextMenu.y, left: inputContextMenu.x }}
            >
                <button 
                    onClick={async () => {
                        const text = await navigator.clipboard.readText();
                        setMessageInput(prev => prev + text);
                        setInputContextMenu(null);
                    }} 
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-700"
                >
                    {t.paste || 'Paste'}
                </button>
            </div>
        )}

        {/* Modals */}
        {deleteModal.show && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
                    <h3 className="text-lg font-bold mb-4">{t.deleteMessageConfirm || 'Delete Message?'}</h3>
                    <p className="text-sm mb-6">{t.deleteMessageBody || 'Are you sure you want to delete this message?'}</p>
                    <div className="flex justify-end space-x-4">
                        <button onClick={() => setDeleteModal({show: false, msg: null})} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700">{t.cancel || 'Cancel'}</button>
                        <button onClick={confirmDeleteMessage} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700">{t.delete || 'Delete'}</button>
                    </div>
                </div>
            </div>
        )}

        {lightboxImage && (
            <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" onClick={() => setLightboxImage(null)}>
                <img src={lightboxImage} alt="Lightbox" className="max-w-full max-h-full" />
            </div>
        )}

      </div>
    );
  };

  return renderContent();
};

export default MainContent;
