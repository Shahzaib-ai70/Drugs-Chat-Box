import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import fs from 'fs';
import path from 'path';
import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
const { Client, LocalAuth, MessageMedia } = pkg;
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';

// Environment Variables
const PORT = process.env.PORT || 3006;
const SERVICE_ID = process.env.SERVICE_ID;
const SERVICE_TYPE = process.env.SERVICE_TYPE || 'whatsapp'; // 'whatsapp' | 'telegram'
const API_ID = 2040; // Telegram API ID
const API_HASH = "b18441a1ff607e10a989891a5462e627"; // Telegram API Hash

if (!SERVICE_ID) {
    console.error('SERVICE_ID environment variable is required');
    process.exit(1);
}

// Enhanced Logging
const logFile = fs.createWriteStream(`worker_${SERVICE_ID}.log`, { flags: 'a' });
const log = (msg) => {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] [${SERVICE_ID}] ${msg}`;
  console.log(logMsg);
  try { logFile.write(logMsg + '\n'); } catch(e){}
};

process.on('uncaughtException', (err) => {
  log('Uncaught Exception: ' + err.toString() + '\n' + err.stack);
});
process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled Rejection at: ' + promise + ' reason: ' + reason);
});

// Express & Socket Setup
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Monkey-patch io.to to relay events to Master via IPC
const originalTo = io.to.bind(io);
io.to = (room) => {
    const originalObj = originalTo(room);
    const originalEmit = originalObj.emit.bind(originalObj);
    return {
        ...originalObj,
        emit: (event, data) => {
            // Send to Master via IPC
            if (process.send) {
                process.send({ type: 'event', event, data, serviceId: SERVICE_ID });
            }
            // Emit locally as well
            originalEmit(event, data);
        }
    };
};

// IPC Command Handler
process.on('message', async (msg) => {
    if (msg.type !== 'command') return;
    const { command, data } = msg;

    if (command === 'request_state') {
        log('IPC: State requested');
        if (sessionState.qr) io.to(SERVICE_ID).emit('qr', sessionState.qr);
        io.to(SERVICE_ID).emit('status', sessionState.status);
        if (sessionState.chats.length > 0) {
             io.to(SERVICE_ID).emit('wa_chats', sessionState.chats);
             const totalUnread = sessionState.chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
             io.to(SERVICE_ID).emit('unread_total', { serviceId: SERVICE_ID, count: totalUnread });
        }
    } else if (command === 'request_unread') {
        // Lightweight request for just unread counts (for Sidebar)
        if (sessionState.chats.length > 0) {
             const totalUnread = sessionState.chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
             io.to(SERVICE_ID).emit('unread_total', { serviceId: SERVICE_ID, count: totalUnread });
        }
    } else if (command === 'sendMessage') {
        handleSendMessage(data);
    } else if (command === 'mark_read') {
        const { chatId } = data;
        try {
            log(`Marking chat ${chatId} as read`);
            if (SERVICE_TYPE === 'telegram') {
                const client = sessionState.client;
                if (client) await client.markAsRead(chatId);
            } else {
                const client = sessionState.client;
                if (client) {
                     const chat = await client.getChatById(chatId);
                     await chat.sendSeen();
                }
            }
            
            // Update local state immediately for responsiveness
            const chat = sessionState.chats.find(c => c.id === chatId);
            if (chat) {
                chat.unreadCount = 0;
                // Re-emit chats and unread count
                const totalUnread = sessionState.chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
                io.to(SERVICE_ID).emit('unread_total', { serviceId: SERVICE_ID, count: totalUnread });
                io.to(SERVICE_ID).emit('wa_chats', sessionState.chats);
            }

            // Trigger full sync to be safe
            if (SERVICE_TYPE === 'whatsapp') setTimeout(fetchAndEmitChats, 1000);
            else setTimeout(() => handleForceSync(), 1000);

        } catch(e) { log(`Error marking read: ${e}`); }
    } else if (command === 'get_chat_history') {
        handleGetChatHistory(data);
    } else if (command === 'force_sync_chats') {
        handleForceSync();
    } else if (command === 'tg_password') {
        if (sessionState.passwordResolver) {
            sessionState.passwordResolver(data);
            sessionState.passwordResolver = null;
        }
    } else if (command === 'download_media') {
        handleDownloadMedia(data);
    }
});

const handleDownloadMedia = async (data) => {
    const { messageId, chatId } = data;
    // log(`Downloading media for ${messageId} in ${chatId}`);

    if (SERVICE_TYPE === 'whatsapp' && sessionState.client) {
        try {
            // Try to find in recent chats first to avoid network fetch if possible
            const chat = await sessionState.client.getChatById(chatId);
            const messages = await chat.fetchMessages({ limit: 20 }); 
            const msg = messages.find(m => m.id._serialized === messageId);
            
            if (msg && msg.hasMedia) {
                const downloaded = await msg.downloadMedia();
                if (downloaded) {
                     io.to(SERVICE_ID).emit('media_loaded', {
                        msgId: messageId,
                        chatId,
                        media: { mimetype: downloaded.mimetype, data: downloaded.data, filename: downloaded.filename }
                     });
                }
            }
        } catch (e) { log(`WA Media Download Error: ${e}`); }
    } else if (SERVICE_TYPE === 'telegram' && sessionState.client) {
         try {
             const messages = await sessionState.client.getMessages(chatId, { ids: [parseInt(messageId) || 0] }); // Telegram IDs are integers usually
             if (messages && messages.length > 0) {
                 const msg = messages[0];
                 if (msg.media) {
                     const buffer = await sessionState.client.downloadMedia(msg, {});
                     const base64 = buffer.toString('base64');
                     let mimetype = 'application/octet-stream';
                     if (msg.media.photo) mimetype = 'image/jpeg';
                     else if (msg.media.document) mimetype = msg.media.document.mimeType || 'application/octet-stream';
                     
                     io.to(SERVICE_ID).emit('media_loaded', {
                        msgId: messageId,
                        chatId,
                        media: { mimetype, data: base64, filename: 'media' }
                     });
                 }
             }
         } catch (e) { log(`TG Media Download Error: ${e}`); }
    }
};

const handleSendMessage = async (data) => {
    const body = data.message || data.body;
    if (SERVICE_TYPE === 'whatsapp' && sessionState.client) {
        try {
            if (data.media) {
                const media = new MessageMedia(data.media.mimetype, data.media.data, data.media.filename);
                await sessionState.client.sendMessage(data.chatId, media, { caption: body });
            } else {
                await sessionState.client.sendMessage(data.chatId, body); 
            }
        } catch(e) { log(`Send Error: ${e}`); }
    } else if (SERVICE_TYPE === 'telegram' && sessionState.client) {
        try {
            if (data.media) {
                const buffer = Buffer.from(data.media.data, 'base64');
                // GramJS expects 'file' parameter. Buffer works.
                // We can also try to infer mimetype or name if needed, but Buffer is usually enough.
                await sessionState.client.sendMessage(data.chatId, { message: body, file: buffer });
            } else {
                await sessionState.client.sendMessage(data.chatId, { message: body });
            }
        } catch(e) { log(`Send Error: ${e}`); }
    }
};

const handleGetChatHistory = async (data) => {
    const { chatId, limit } = data;
    log(`Fetching history for ${chatId}`);

    if (SERVICE_TYPE === 'whatsapp' && sessionState.client) {
        try {
            const chat = await sessionState.client.getChatById(chatId);
            const messages = await chat.fetchMessages({ limit: limit || 50 });
            
            const mapped = messages.map((msg) => ({
                id: msg.id._serialized,
                chatId: chatId,
                author: msg.author || msg.from,
                fromMe: msg.fromMe,
                body: msg.body,
                timestamp: msg.timestamp,
                type: msg.type,
                hasMedia: msg.hasMedia,
                media: null, // Media is lazy loaded or fetched on demand
                ack: msg.ack
            }));

            io.to(SERVICE_ID).emit('wa_chat_history', { chatId, messages: mapped });
        } catch (e) {
            log(`History Error: ${e}`);
            io.to(SERVICE_ID).emit('wa_chat_history', { chatId, messages: [] });
        }
    } else if (SERVICE_TYPE === 'telegram' && sessionState.client) {
        try {
             const messages = await sessionState.client.getMessages(chatId, { limit: limit || 50 });
             const mapped = messages.map(msg => ({
                id: msg.id.toString(),
                chatId: chatId,
                author: msg.sender ? (msg.sender.username || msg.sender.firstName) : 'Unknown',
                fromMe: msg.out,
                body: msg.text || '',
                timestamp: msg.date,
                type: 'chat',
                hasMedia: !!msg.media,
                media: null,
                ack: 1
             }));
             io.to(SERVICE_ID).emit('wa_chat_history', { chatId, messages: mapped });
        } catch (e) {
             log(`TG History Error: ${e}`);
             io.to(SERVICE_ID).emit('wa_chat_history', { chatId, messages: [] });
        }
    }
};

const handleForceSync = () => {
     log('Force sync requested');
     if (SERVICE_TYPE === 'whatsapp' && sessionState.client) {
         if (sessionState.client.pupPage) sessionState.client.pupPage.reload();
         // Also trigger fetch
         // fetchAndEmitChats is defined inside initializeWhatsApp, so we can't call it easily here unless we expose it.
         // But reloading page usually triggers ready/auth events which trigger fetch.
     }
};


// State
const sessionState = {
    client: null,
    qr: '',
    status: 'INITIALIZING',
    chats: []
};

// Resource Queue (Local to this process)
class ResourceQueue {
  constructor(concurrency = 1, delay = 0) {
    this.concurrency = concurrency;
    this.delay = delay;
    this.queue = [];
    this.active = 0;
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.active >= this.concurrency || this.queue.length === 0) return;
    this.active++;
    const { fn, resolve, reject } = this.queue.shift();
    try {
      const result = await fn();
      resolve(result);
    } catch (e) {
      reject(e);
    } finally {
      if (this.delay > 0) await new Promise(r => setTimeout(r, this.delay));
      this.active--;
      this.process();
    }
  }
}

// Queues for this specific account
const syncQueue = new ResourceQueue(1, 500); // Serialize sync operations

// --- WHATSAPP LOGIC ---
const initializeWhatsApp = async () => {
  log(`Initializing WhatsApp Worker for ${SERVICE_ID}`);
  
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: SERVICE_ID }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage', 
        '--disable-accelerated-2d-canvas', 
        '--no-first-run', 
        '--no-zygote', 
        '--disable-gpu',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--mute-audio',
        '--no-default-browser-check',
        '--autoplay-policy=user-gesture-required',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-features=TranslateUI,site-per-process,AudioServiceOutOfProcess,IsolateOrigins', 
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-notifications',
        '--disable-offer-store-unmasked-wallet-cards',
        '--disable-popup-blocking',
        '--disable-print-preview',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-speech-api',
        '--disable-sync',
        '--hide-scrollbars',
        '--ignore-gpu-blacklist',
        '--metrics-recording-only',
        '--no-pings',
        '--password-store=basic',
        '--use-gl=swiftshader',
        '--use-mock-keychain',
        '--block-new-web-contents'
      ]
    }
  });

  sessionState.client = client;

  client.on('qr', (qr) => {
    log(`QR Code received`);
    sessionState.qr = qr;
    sessionState.status = 'QR_READY';
    io.to(SERVICE_ID).emit('qr', qr);
    io.to(SERVICE_ID).emit('status', 'QR_READY');
  });

  const fetchAndEmitChats = async () => {
    if (!client || (client.pupPage && client.pupPage.isClosed())) return;

    syncQueue.add(async () => {
        try {
            log('Fetching chats...');
            const getChatsPromise = client.getChats();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 60000));
            const chats = await Promise.race([getChatsPromise, timeoutPromise]);
            
            // 1. User Info
            if (client.info) {
                let myProfilePic = null;
                try {
                    if (client.info.wid) myProfilePic = await client.getProfilePicUrl(client.info.wid._serialized);
                } catch (e) {}
                io.to(SERVICE_ID).emit('wa_user_info', {
                    name: client.info.pushname,
                    id: client.info.wid._serialized,
                    profilePicUrl: myProfilePic
                });
            }

            // 2. Map Chats
            // To improve speed, we map basic info first, then fetch profile pics asynchronously
            const mappedBasic = await Promise.all(chats.map(async c => {
                let profilePicUrl = '';
                // Try to get profile pic for top 20 chats or just do it for all if fast enough. 
                // For now, let's try to get it, but catch errors to not block.
                try {
                   // Only fetch for non-groups or if needed. Actually getProfilePicUrl is a network call.
                   // Let's do it lazily or just for top chats?
                   // User specifically asked for profile pics.
                   // NOTE: Calling getProfilePicUrl for ALL chats will be slow and might rate limit.
                   // Strategy: Send chats first without pics, then update with pics?
                   // Or just try for the first few.
                } catch(e) {}

                return {
                    id: c.id?._serialized || c.id || '',
                    name: c.name || c.formattedTitle || c.pushname || (c.contact?.name) || (c.contact?.pushname) || (c.id?.user) || 'Unknown',
                    isGroup: !!c.isGroup,
                    unreadCount: typeof c.unreadCount === 'number' ? c.unreadCount : 0,
                    lastMessage: c.lastMessage?.body || '',
                    lastTimestamp: c.lastMessage?.timestamp || 0,
                    profilePicUrl: '', // Will be updated later or we can try fetching here
                    lastSeen: c.lastMessage?.timestamp ? `Last active ${new Date(c.lastMessage.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : '',
                    archived: c.archived || false
                };
            }));
            
            // Sort by timestamp
            mappedBasic.sort((a, b) => b.lastTimestamp - a.lastTimestamp);

            // Calculate total unread
            const totalUnread = mappedBasic.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
            io.to(SERVICE_ID).emit('unread_total', { serviceId: SERVICE_ID, count: totalUnread });

            sessionState.chats = mappedBasic;
            io.to(SERVICE_ID).emit('wa_chats', mappedBasic);
            log(`Emitted ${mappedBasic.length} chats (basic info)`);
            
            // Background fetch profile pics
            (async () => {
                for (const chat of mappedBasic.slice(0, 50)) { // Limit to top 50 for performance
                     try {
                        const contact = await client.getContactById(chat.id);
                        const picUrl = await contact.getProfilePicUrl();
                        if (picUrl) {
                            chat.profilePicUrl = picUrl;
                            // Emit update for single chat or batch?
                            // For now, let's just update the local state and maybe re-emit periodically or send a specific event
                            io.to(SERVICE_ID).emit('wa_chat_update', { id: chat.id, profilePicUrl: picUrl });
                        }
                     } catch(e) {}
                     await new Promise(r => setTimeout(r, 200)); // Throttle
                }
            })();

            // Store Fallback
            if (mappedBasic.length === 0 && client.pupPage) {
                try {
                    const storeMapped = await client.pupPage.evaluate(async () => {
                        const start = Date.now();
                        while (Date.now() - start < 5000) {
                            if (window.Store && window.Store.Chats && window.Store.Chats.models && window.Store.Chats.models.length > 0) break;
                            await new Promise(r => setTimeout(r, 500));
                        }
                        const models = window.Store?.Chats?.models || [];
                        return models.map((c) => ({
                            id: c.id?._serialized || c.id || (c.__x_id && c.__x_id._serialized) || '',
                            name: c.formattedTitle || c.name || c.__x_name || (c.contact && (c.contact.name || c.contact.pushname)) || 'Unknown',
                            isGroup: !!c.isGroup || !!c.__x_isGroup,
                            unreadCount: typeof c.unreadCount === 'number' ? c.unreadCount : (c.__x_unreadCount || 0),
                            lastMessage: (c.lastMessage || c.__x_lastMessage || {}).body || '',
                            lastTimestamp: (c.lastMessage || c.__x_lastMessage || {}).timestamp || 0,
                            profilePicUrl: '',
                            lastSeen: ''
                        }));
                    });
                    if (storeMapped.length > 0) {
                        sessionState.chats = storeMapped;
                        io.to(SERVICE_ID).emit('wa_chats', storeMapped);
                        log(`Store fallback found ${storeMapped.length} chats`);
                    }
                } catch(e) { log(`Store fallback error: ${e}`); }
            }

            // Retry Logic (Simplified for Worker)
            if (mappedBasic.length === 0) {
                setTimeout(() => {
                   if (sessionState.chats.length === 0) {
                       log('Retry 1...');
                       client.getChats().then(c => {
                           if(c.length > 0) fetchAndEmitChats();
                           else if (client.pupPage) client.pupPage.reload().catch(e=>log('Reload fail:'+e));
                       }).catch(e=>{});
                   }
                }, 10000);
            }

        } catch (err) {
            log(`Error fetching chats: ${err}`);
        }
    });
  };

  client.on('ready', () => {
    log(`WhatsApp Connected!`);
    sessionState.status = 'CONNECTED';
    sessionState.qr = 'CONNECTED';
    io.to(SERVICE_ID).emit('ready', 'WhatsApp Client is ready!');
    io.to(SERVICE_ID).emit('status', 'CONNECTED');
    fetchAndEmitChats();
    setTimeout(fetchAndEmitChats, 5000);
  });

  client.on('message', async (msg) => {
    let chatId = msg.from; 
    try { chatId = (await msg.getChat()).id._serialized; } catch (e) { chatId = msg.id.remote || msg.from; }
    
    let media = null;
    if (msg.hasMedia) {
        try {
            const downloaded = await msg.downloadMedia();
            if (downloaded) media = { mimetype: downloaded.mimetype, data: downloaded.data, filename: downloaded.filename };
        } catch (e) {}
    }

    const mappedMsg = {
      id: msg.id._serialized,
      chatId: chatId,
      author: msg.author || msg.from,
      fromMe: msg.fromMe,
      body: msg.body,
      timestamp: msg.timestamp,
      type: msg.type,
      hasMedia: msg.hasMedia,
      media: media,
      ack: msg.ack
    };
    
    io.to(SERVICE_ID).emit('newMessage', mappedMsg);
    fetchAndEmitChats();
  });

  client.on('message_create', async (msg) => {
    if (!msg.fromMe) return;
    let chatId = msg.to;
    try { chatId = (await msg.getChat()).id._serialized; } catch (e) { chatId = msg.id.remote || msg.to; }
    
    let media = null;
    if (msg.hasMedia) {
        try {
            const downloaded = await msg.downloadMedia();
            if (downloaded) media = { mimetype: downloaded.mimetype, data: downloaded.data, filename: downloaded.filename };
        } catch (e) {}
    }

    const mappedMsg = {
        id: msg.id._serialized,
        chatId: chatId,
        author: msg.author || msg.from,
        fromMe: msg.fromMe,
        body: msg.body,
        timestamp: msg.timestamp,
        type: msg.type,
        hasMedia: msg.hasMedia,
        media: media, 
        ack: msg.ack
    };
    io.to(SERVICE_ID).emit('newMessage', mappedMsg);
    fetchAndEmitChats();
  });

  client.on('message_ack', async (msg, ack) => {
    /*
        ACK Values:
        1: Sent
        2: Received
        3: Read
        0: Pending/Error
    */
    const chatId = msg.to || msg.from; // For outgoing, usually 'to'. For group, might be different.
    // robust chatId resolution
    let resolvedChatId = chatId;
    try { resolvedChatId = (await msg.getChat()).id._serialized; } catch (e) { resolvedChatId = msg.id.remote || chatId; }

    log(`Message ACK: ${msg.id._serialized} -> ${ack}`);
    io.to(SERVICE_ID).emit('wa_message_ack', {
        chatId: resolvedChatId,
        id: msg.id._serialized,
        ack: ack
    });
  });

  client.on('authenticated', () => {
    log(`Authenticated`);
    sessionState.status = 'AUTHENTICATED';
    io.to(SERVICE_ID).emit('status', 'AUTHENTICATED');
  });

  client.on('auth_failure', msg => {
    log(`Auth Failure: ${msg}`);
    io.to(SERVICE_ID).emit('auth_failure', msg);
  });

  try {
    await client.initialize();
  } catch (err) {
    log(`Init Failed: ${err}`);
  }
};

// --- TELEGRAM LOGIC ---
const initializeTelegram = async () => {
  log(`Initializing Telegram Worker for ${SERVICE_ID}`);
  const sessionFile = `session_telegram_${SERVICE_ID}.txt`;
  let stringSession = new StringSession('');
  if (fs.existsSync(sessionFile)) {
      stringSession = new StringSession(fs.readFileSync(sessionFile, 'utf8'));
  }

  const client = new TelegramClient(stringSession, API_ID, API_HASH, { connectionRetries: 5 });
  sessionState.client = client;

  const fetchChats = async () => {
      try {
        if (!client.connected) await client.connect();
        const me = await client.getMe();
        if (me) io.to(SERVICE_ID).emit('wa_user_info', { name: me.username || me.firstName, id: me.id.toString(), profilePicUrl: '' });
        
        const dialogs = await client.getDialogs({});
        const mappedChats = dialogs.map(d => ({
            id: d.id.toString(),
            name: d.title || 'Unknown',
            isGroup: d.isGroup,
            unreadCount: d.unreadCount,
            lastMessage: d.message?.text || '',
            lastTimestamp: d.date,
            profilePicUrl: '',
            lastSeen: '',
            archived: d.archived || d.folderId === 1 || false
        }));

        const totalUnread = mappedChats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        io.to(SERVICE_ID).emit('unread_total', { serviceId: SERVICE_ID, count: totalUnread });

        sessionState.chats = mappedChats;
        io.to(SERVICE_ID).emit('wa_chats', mappedChats);
      } catch (e) { log(`TG Fetch Error: ${e}`); }
  };

  client.addEventHandler(async (event) => {
    const message = event.message;
    const sender = await message.getSender();
    const chatId = message.chatId.toString();
    
    let media = null;
    if (message.media) {
         try {
             const buffer = await client.downloadMedia(message, {});
             const base64 = buffer.toString('base64');
             let mimetype = 'application/octet-stream';
             if (message.media.photo) mimetype = 'image/jpeg';
             else if (message.media.document) mimetype = message.media.document.mimeType || 'application/octet-stream';
             
             media = { mimetype, data: base64, filename: 'media' };
         } catch(e) { log(`TG Media Download Error: ${e}`); }
    }

    const mappedMsg = {
        id: message.id.toString(),
        chatId: chatId,
        author: sender ? (sender.username || sender.firstName) : 'Unknown',
        fromMe: message.out,
        body: message.text || '',
        timestamp: message.date,
        type: 'chat',
        hasMedia: !!message.media,
        media: media,
        ack: 1
    };
    io.to(SERVICE_ID).emit('newMessage', mappedMsg);
    fetchChats();
  }, new NewMessage({}));

  try {
    await client.connect();
    if (!fs.existsSync(sessionFile)) {
        await client.signInUserWithQrCode({ apiId: API_ID, apiHash: API_HASH }, { 
            qrCode: async (code) => {
                const tokenBase64 = code.token.toString('base64url');
                const qrUrl = `tg://login?token=${tokenBase64}`;
                sessionState.qr = qrUrl;
                sessionState.status = 'QR_READY';
                io.to(SERVICE_ID).emit('qr', qrUrl);
                io.to(SERVICE_ID).emit('status', 'QR_READY');
            }, 
            password: async (hint) => {
                io.to(SERVICE_ID).emit('tg_2fa_required', { hint });
                return new Promise((resolve, reject) => {
                    sessionState.passwordResolver = resolve;
                    setTimeout(() => reject(new Error('TIMEOUT')), 300000);
                });
            },
            onError: (err) => { log(`TG Error: ${err}`); return true; }
        });
        fs.writeFileSync(sessionFile, client.session.save());
    }
    sessionState.status = 'CONNECTED';
    io.to(SERVICE_ID).emit('ready', 'Telegram Ready');
    io.to(SERVICE_ID).emit('status', 'CONNECTED');
    fetchChats();
    setTimeout(fetchChats, 5000);
  } catch (e) {
    log(`TG Init Failed: ${e}`);
  }
};

// Start Service
if (SERVICE_TYPE === 'whatsapp') {
    initializeWhatsApp();
} else {
    initializeTelegram();
}

// Socket Connection Handler
io.on('connection', (socket) => {
  log(`Client connected to worker port ${PORT}`);
  socket.on('join_service', (id) => {
      if (id === SERVICE_ID) {
          socket.join(SERVICE_ID);
          // Emit current state
          if (sessionState.qr && sessionState.qr !== 'CONNECTED') socket.emit('qr', sessionState.qr);
          socket.emit('status', sessionState.status);
          if (sessionState.chats.length > 0) socket.emit('wa_chats', sessionState.chats);
      }
  });
  
  socket.on('tg_password', (password) => {
      if (sessionState.passwordResolver) {
          sessionState.passwordResolver(password);
          sessionState.passwordResolver = null;
      }
  });

  socket.on('sendMessage', async (data) => {
      handleSendMessage(data);
  });
  
  // Handle force_sync
  socket.on('force_sync_chats', () => {
     handleForceSync();
  });
});

server.listen(PORT, () => {
  log(`Worker running on port ${PORT} (Type: ${SERVICE_TYPE})`);
});
