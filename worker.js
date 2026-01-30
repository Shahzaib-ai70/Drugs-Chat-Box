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
            const mappedBasic = chats.map(c => ({
                id: c.id?._serialized || c.id || '',
                name: c.name || c.formattedTitle || c.pushname || (c.contact?.name) || (c.contact?.pushname) || (c.id?.user) || 'Unknown',
                isGroup: !!c.isGroup,
                unreadCount: typeof c.unreadCount === 'number' ? c.unreadCount : 0,
                lastMessage: c.lastMessage?.body || '',
                lastTimestamp: c.lastMessage?.timestamp || 0,
                profilePicUrl: '',
                lastSeen: c.lastMessage?.timestamp ? `Last active ${new Date(c.lastMessage.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''
            }));
            
            sessionState.chats = mappedBasic;
            io.to(SERVICE_ID).emit('wa_chats', mappedBasic);
            log(`Emitted ${mappedBasic.length} chats`);

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
    
    const mappedMsg = {
        id: msg.id._serialized,
        chatId: chatId,
        author: msg.author || msg.from,
        fromMe: msg.fromMe,
        body: msg.body,
        timestamp: msg.timestamp,
        type: msg.type,
        hasMedia: msg.hasMedia,
        media: null, // Don't download own media usually
        ack: msg.ack
    };
    io.to(SERVICE_ID).emit('newMessage', mappedMsg);
    fetchAndEmitChats();
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
            lastSeen: ''
        }));
        sessionState.chats = mappedChats;
        io.to(SERVICE_ID).emit('wa_chats', mappedChats);
      } catch (e) { log(`TG Fetch Error: ${e}`); }
  };

  client.addEventHandler(async (event) => {
    const message = event.message;
    const sender = await message.getSender();
    const chatId = message.chatId.toString();
    const mappedMsg = {
        id: message.id.toString(),
        chatId: chatId,
        author: sender ? (sender.username || sender.firstName) : 'Unknown',
        fromMe: message.out,
        body: message.text || '',
        timestamp: message.date,
        type: 'chat',
        hasMedia: !!message.media,
        media: null,
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
      if (SERVICE_TYPE === 'whatsapp' && sessionState.client) {
          try {
             await sessionState.client.sendMessage(data.chatId, data.message); 
          } catch(e) { log(`Send Error: ${e}`); }
      } else if (SERVICE_TYPE === 'telegram' && sessionState.client) {
          try {
             await sessionState.client.sendMessage(data.chatId, { message: data.message });
          } catch(e) { log(`Send Error: ${e}`); }
      }
  });
  
  // Handle force_sync
  socket.on('force_sync_chats', () => {
     log('Force sync requested');
     if (SERVICE_TYPE === 'whatsapp' && sessionState.client) {
         if (sessionState.client.pupPage) sessionState.client.pupPage.reload();
     } else if (SERVICE_TYPE === 'telegram') {
         // TG fetch
     }
  });
});

server.listen(PORT, () => {
  log(`Worker running on port ${PORT} (Type: ${SERVICE_TYPE})`);
});
